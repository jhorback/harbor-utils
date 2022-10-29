import { LitElement, ReactiveController, ReactiveControllerHost } from "lit";



export class RootStateChangeEvent extends Event {
    static eventType = "rootstate-change";
    event:Event|string;
    rootState:RootStateContainer;
    controller:any;
    statePath:string;
    state:any;
    constructor(event:Event|string, rootState:RootStateContainer,
        controller:any, statePath:string, state:any) {
        super(RootStateChangeEvent.eventType)
        this.event = event;
        this.rootState = {...rootState};
        this.controller = controller;
        this.statePath = statePath;
        this.state = {...state};
    }
};

class StatePathChangeEvent extends Event {
    controller:any;
    statePath:string;
    state:any;
    constructor(controller:any, statePath:string, state:any) {
        super(statePath);
        this.controller = controller;
        this.statePath = statePath;
        this.state = state;
    }
}

type RootStateContainer = {[key:string]: any};
type StateChangeEventListener = (event:StatePathChangeEvent) => void;
type RootStateChangeEventListener = (event:RootStateChangeEvent) => void;


const rootState:RootStateContainer = {};

export class RootState {

    private static bus = new EventTarget();

    private static listenerCounts:{[statePath:string]:number|undefined} = {};

    static addStateChangeEventListener(statePath:string, listener:StateChangeEventListener, signal:AbortSignal) {
        this.bus.addEventListener(statePath, listener as EventListener, {signal} as AddEventListenerOptions);
        const count = this.listenerCounts[statePath];
        this.listenerCounts[statePath] = count === undefined ? 1 : count + 1;

        // delete state path when aborted
        signal.addEventListener("abort", () => {
            const count = this.listenerCounts[statePath]! - 1;
            this.listenerCounts[statePath] = count;
            if (count === 0) {
                delete rootState[statePath];
            }
        });
    }

    static addRootStateChangeEventListener(listener:RootStateChangeEventListener, signal?:AbortSignal) {
        this.bus.addEventListener(RootStateChangeEvent.eventType,
            listener as EventListener,
            {signal} as AddEventListenerOptions);
        signal && signal.addEventListener("abort", () => {
            const test = "this should be called";
        });
    }

    static get<T>(name:string):T|null {
        const value = rootState[name];
        return value === undefined ? null : value as T;
    }

    static change<T>(controller:any, event:Event|string, statePath:string, state:T):true {
        rootState[statePath] = state;
        this.bus.dispatchEvent(new StatePathChangeEvent(controller, statePath, state));
        this.bus.dispatchEvent(new RootStateChangeEvent(event, rootState, controller, statePath, state));
        return true;
    }

    static get current():RootStateContainer { return rootState; };
}



const stateControllerIndexedProxyHandler:ProxyHandler<StateController> = {
    get: (target:StateController, property:string) => target[property],
    set: (target:StateController, property:string, value:any) =>
        target[property] = value
};



export class StateController implements ReactiveController {
    [name:string]: any;

    get stateId():string|null { return this.host.stateId !== undefined ? 
        this.host.stateId : null };

    constructor(host: LitElement) {
        (this.host = host).addController(this);
        return new Proxy(this, stateControllerIndexedProxyHandler);
    }

    host: LitElement & {stateId?:string};

    stateProperties:Array<string> = [];
    abortController:AbortController = new AbortController();

    trackState(name:string):void {
        this.stateProperties.push(name);
    }

    hostConnected() {
        this.stateProperties.forEach(name => this.initState(name));
    }

    requestUpdate(event:Event|string) {
        this.stateProperties.forEach(name =>
            RootState.change(this, event, this.getStateName(name), this[name]));
        this.host.requestUpdate();
    }

    hostDisconnected() {
        this.abortController.abort();
        this.abortController = new AbortController();
    }

    private initState(name:string) {
        this.syncStateValue(name);
        this.addStateListeners(name);
    }

    private syncStateValue(name:string) {
        const statePath = this.getStateName(name);
        const initialState = RootState.get(statePath);
        if (initialState === null) {
            RootState.change(this, `${this.constructor.name}.trackState(${name})`, statePath, this[name]);
        } else {
            this[name] = initialState;
        }
    }

    private addStateListeners(name:string) {
        const statePath = this.getStateName(name);
        RootState.addStateChangeEventListener(statePath, (event:StatePathChangeEvent) => {
            if (event.controller !== this) {
                this[name] = event.state;
                this.host.requestUpdate();
            }
        }, this.abortController.signal);
    }

    private getStateName(name:string) {
        const stateIdPath = this.stateId ? `.${this.stateId}` : "";
        return `${this.constructor.name}${stateIdPath}.${name}`;
    }
}

