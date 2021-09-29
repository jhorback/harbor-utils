import { LitElement, html, css } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { applyDataElementRdtLogging, applyEventMapLogging } from "@domx/dataelement/middleware";
import { Route } from "@domx/router";
import { DomxRoute, RouteActiveChangedEvent } from "@domx/router/domx-route";
import "@domx/router/domx-route-not-found";
import "./dx-pages";
import { dxStyles } from "./dxStyles";


// applyEventMapLogging();
applyDataElementRdtLogging();

/**
 * 
 */
@customElement('dx-router-demo')
export class DxRouterDemo extends LitElement {
  static styles = dxStyles;

  @property({type:Object, attribute: false})
  parentRoute:Route;

  @query("#subroute")
  $subroute:DomxRoute;

  render() {
    return html`
      <a class="nav-link" href="/">README</a>
      <h1>Router Demo</h1>
      <div>
        <a href="/demo/page1">Page 1</a> | 
        <a href="/demo/page1?a=b&c=some value" replace-state>page1?a=b&c=some value</a> | 
        <a href="/demo/page2">Page 2</a> |
        <a href="/demo/page2/testValue">page2/testValue</a> |
        <a href="/demo/page2/page3">Page 3</a>
        <a href="/demo/not/found/link">Not Found</a>
      </div>
      <div style="padding:1rem 0;">
        <button @click="${this.testNavigate}">Test.navigate</button>
      </div>
      <domx-route-not-found
        append-to="body"
        element="dx-page-not-found"
      ></domx-route-not-found>
      <domx-route
        .parentRoute="${this.parentRoute}"
        pattern="/(page1)"
        element="dx-p1"
      ></domx-route>
      <domx-route
        .parentRoute="${this.parentRoute}"
        pattern="/page2(/:testParam)"
        element="dx-p2"
      ></domx-route>
      <domx-route      
        .parentRoute="${this.parentRoute}"
        pattern="/page2(/*routeTail)"
        element="dx-p2"
        @route-active="${this.routeActive}"
        @route-inactive="${this.routeInactive}"
      >
        <domx-route
            id="subroute"
            pattern="/page3"
            element="dx-p4"
          ></domx-route>
      </domx-route>
      <domx-route
        .parentRoute="${this.parentRoute}"
        pattern="/page2/page3"
        element="dx-p3"
        append-to=".highlight">
      </domx-route>
      <div class="highlight">
        <h3>Container</h3>
      </div>
    `
  }

  testNavigate() {
    this.$subroute.navigate({
      replaceState: true,
      routeParams: {
        "testParam": "foo"
      }
    });
  }

  routeActive(event:RouteActiveChangedEvent) {
    console.log(">>> route-active: /page2(/*routeTail):ACTIVE", event.detail);
  }

  routeInactive(event:RouteActiveChangedEvent) {
    console.log(">>> route-inactive: /page2(/*routeTail):INACTIVE", event.detail);
  }
}


@customElement("dx-page-not-found")
class PageNotFound extends LitElement {

    static styles= [
      dxStyles, 
      css`
        :host{
          opacity: 70%;
          display: block;
          max-width: 100%;
          margin: 0;
          background: red;
          color: white;
          width: 100%;
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          right: 0;
        }
      `
    ];

    pageName:string|null = null;

    render() {
      return html`
        <h1>Page Not Found</h1>
        <p>
          The page you are looking for was not found.
          ${this.pageName ? html`
            <b>Page name: ${this.pageName}</b>
          `: html``}
          <button @click="${this.closeButtonClicked}">Close</button>
        </p>
      `;
    }
    closeButtonClicked() {
      window.history.back();
      // this.remove();
    }
}


declare global {
  interface HTMLElementTagNameMap {
    'dx-router-demo': DxRouterDemo
  }
}
