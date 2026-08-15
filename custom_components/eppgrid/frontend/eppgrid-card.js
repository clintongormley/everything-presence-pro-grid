function e(e,t,o,r){var n,i=arguments.length,a=i<3?t:null===r?r=Object.getOwnPropertyDescriptor(t,o):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(n=e[s])&&(a=(i<3?n(a):i>3?n(t,o,a):n(t,o))||a);return i>3&&a&&Object.defineProperty(t,o,a),a}"function"==typeof SuppressedError&&SuppressedError;
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const t=globalThis,o=t.ShadowRoot&&(void 0===t.ShadyCSS||t.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,r=Symbol(),n=new WeakMap;let i=class{constructor(e,t,o){if(this._$cssResult$=!0,o!==r)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o;const t=this.t;if(o&&void 0===e){const o=void 0!==t&&1===t.length;o&&(e=n.get(t)),void 0===e&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),o&&n.set(t,e))}return e}toString(){return this.cssText}};const a=(e,...t)=>{const o=1===e.length?e[0]:t.reduce((t,o,r)=>t+(e=>{if(!0===e._$cssResult$)return e.cssText;if("number"==typeof e)return e;throw Error("Value passed to 'css' function must be a 'css' function result: "+e+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(o)+e[r+1],e[0]);return new i(o,e,r)},s=o?e=>e:e=>e instanceof CSSStyleSheet?(e=>{let t="";for(const o of e.cssRules)t+=o.cssText;return(e=>new i("string"==typeof e?e:e+"",void 0,r))(t)})(e):e,{is:l,defineProperty:c,getOwnPropertyDescriptor:d,getOwnPropertyNames:h,getOwnPropertySymbols:u,getPrototypeOf:p}=Object,m=globalThis,_=m.trustedTypes,f=_?_.emptyScript:"",g=m.reactiveElementPolyfillSupport,v=(e,t)=>e,b={toAttribute(e,t){switch(t){case Boolean:e=e?f:null;break;case Object:case Array:e=null==e?e:JSON.stringify(e)}return e},fromAttribute(e,t){let o=e;switch(t){case Boolean:o=null!==e;break;case Number:o=null===e?null:Number(e);break;case Object:case Array:try{o=JSON.parse(e)}catch(e){o=null}}return o}},y=(e,t)=>!l(e,t),w={attribute:!0,type:String,converter:b,reflect:!1,useDefault:!1,hasChanged:y};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */Symbol.metadata??=Symbol("metadata"),m.litPropertyMetadata??=new WeakMap;let k=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=w){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){const o=Symbol(),r=this.getPropertyDescriptor(e,o,t);void 0!==r&&c(this.prototype,e,r)}}static getPropertyDescriptor(e,t,o){const{get:r,set:n}=d(this.prototype,e)??{get(){return this[t]},set(e){this[t]=e}};return{get:r,set(t){const i=r?.call(this);n?.call(this,t),this.requestUpdate(e,i,o)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??w}static _$Ei(){if(this.hasOwnProperty(v("elementProperties")))return;const e=p(this);e.finalize(),void 0!==e.l&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(v("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(v("properties"))){const e=this.properties,t=[...h(e),...u(e)];for(const o of t)this.createProperty(o,e[o])}const e=this[Symbol.metadata];if(null!==e){const t=litPropertyMetadata.get(e);if(void 0!==t)for(const[e,o]of t)this.elementProperties.set(e,o)}this._$Eh=new Map;for(const[e,t]of this.elementProperties){const o=this._$Eu(e,t);void 0!==o&&this._$Eh.set(o,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){const t=[];if(Array.isArray(e)){const o=new Set(e.flat(1/0).reverse());for(const e of o)t.unshift(s(e))}else void 0!==e&&t.push(s(e));return t}static _$Eu(e,t){const o=t.attribute;return!1===o?void 0:"string"==typeof o?o:"string"==typeof e?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),void 0!==this.renderRoot&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){const e=new Map,t=this.constructor.elementProperties;for(const o of t.keys())this.hasOwnProperty(o)&&(e.set(o,this[o]),delete this[o]);e.size>0&&(this._$Ep=e)}createRenderRoot(){const e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((e,r)=>{if(o)e.adoptedStyleSheets=r.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(const o of r){const r=document.createElement("style"),n=t.litNonce;void 0!==n&&r.setAttribute("nonce",n),r.textContent=o.cssText,e.appendChild(r)}})(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,o){this._$AK(e,o)}_$ET(e,t){const o=this.constructor.elementProperties.get(e),r=this.constructor._$Eu(e,o);if(void 0!==r&&!0===o.reflect){const n=(void 0!==o.converter?.toAttribute?o.converter:b).toAttribute(t,o.type);this._$Em=e,null==n?this.removeAttribute(r):this.setAttribute(r,n),this._$Em=null}}_$AK(e,t){const o=this.constructor,r=o._$Eh.get(e);if(void 0!==r&&this._$Em!==r){const e=o.getPropertyOptions(r),n="function"==typeof e.converter?{fromAttribute:e.converter}:void 0!==e.converter?.fromAttribute?e.converter:b;this._$Em=r;const i=n.fromAttribute(t,e.type);this[r]=i??this._$Ej?.get(r)??i,this._$Em=null}}requestUpdate(e,t,o,r=!1,n){if(void 0!==e){const i=this.constructor;if(!1===r&&(n=this[e]),o??=i.getPropertyOptions(e),!((o.hasChanged??y)(n,t)||o.useDefault&&o.reflect&&n===this._$Ej?.get(e)&&!this.hasAttribute(i._$Eu(e,o))))return;this.C(e,t,o)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(e,t,{useDefault:o,reflect:r,wrapped:n},i){o&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,i??t??this[e]),!0!==n||void 0!==i)||(this._$AL.has(e)||(this.hasUpdated||o||(t=void 0),this._$AL.set(e,t)),!0===r&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}const e=this.scheduleUpdate();return null!=e&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[e,t]of this._$Ep)this[e]=t;this._$Ep=void 0}const e=this.constructor.elementProperties;if(e.size>0)for(const[t,o]of e){const{wrapped:e}=o,r=this[t];!0!==e||this._$AL.has(t)||void 0===r||this.C(t,void 0,o,r)}}let e=!1;const t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(e=>e.hostUpdate?.()),this.update(t)):this._$EM()}catch(t){throw e=!1,this._$EM(),t}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(e){}firstUpdated(e){}};k.elementStyles=[],k.shadowRootOptions={mode:"open"},k[v("elementProperties")]=new Map,k[v("finalized")]=new Map,g?.({ReactiveElement:k}),(m.reactiveElementVersions??=[]).push("2.1.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const x=globalThis,z=e=>e,C=x.trustedTypes,E=C?C.createPolicy("lit-html",{createHTML:e=>e}):void 0,P="$lit$",S=`lit$${Math.random().toFixed(9).slice(2)}$`,A="?"+S,$=`<${A}>`,T=document,H=()=>T.createComment(""),B=e=>null===e||"object"!=typeof e&&"function"!=typeof e,M=Array.isArray,N="[ \t\n\f\r]",R=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,L=/-->/g,I=/>/g,D=RegExp(`>|${N}(?:([^\\s"'>=/]+)(${N}*=${N}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),O=/'/g,j=/"/g,F=/^(?:script|style|textarea|title)$/i,U=e=>(t,...o)=>({_$litType$:e,strings:t,values:o}),G=U(1),W=U(2),V=Symbol.for("lit-noChange"),Z=Symbol.for("lit-nothing"),q=new WeakMap,K=T.createTreeWalker(T,129);function Q(e,t){if(!M(e)||!e.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==E?E.createHTML(t):t}const X=(e,t)=>{const o=e.length-1,r=[];let n,i=2===t?"<svg>":3===t?"<math>":"",a=R;for(let t=0;t<o;t++){const o=e[t];let s,l,c=-1,d=0;for(;d<o.length&&(a.lastIndex=d,l=a.exec(o),null!==l);)d=a.lastIndex,a===R?"!--"===l[1]?a=L:void 0!==l[1]?a=I:void 0!==l[2]?(F.test(l[2])&&(n=RegExp("</"+l[2],"g")),a=D):void 0!==l[3]&&(a=D):a===D?">"===l[0]?(a=n??R,c=-1):void 0===l[1]?c=-2:(c=a.lastIndex-l[2].length,s=l[1],a=void 0===l[3]?D:'"'===l[3]?j:O):a===j||a===O?a=D:a===L||a===I?a=R:(a=D,n=void 0);const h=a===D&&e[t+1].startsWith("/>")?" ":"";i+=a===R?o+$:c>=0?(r.push(s),o.slice(0,c)+P+o.slice(c)+S+h):o+S+(-2===c?t:h)}return[Q(e,i+(e[o]||"<?>")+(2===t?"</svg>":3===t?"</math>":"")),r]};class Y{constructor({strings:e,_$litType$:t},o){let r;this.parts=[];let n=0,i=0;const a=e.length-1,s=this.parts,[l,c]=X(e,t);if(this.el=Y.createElement(l,o),K.currentNode=this.el.content,2===t||3===t){const e=this.el.content.firstChild;e.replaceWith(...e.childNodes)}for(;null!==(r=K.nextNode())&&s.length<a;){if(1===r.nodeType){if(r.hasAttributes())for(const e of r.getAttributeNames())if(e.endsWith(P)){const t=c[i++],o=r.getAttribute(e).split(S),a=/([.?@])?(.*)/.exec(t);s.push({type:1,index:n,name:a[2],strings:o,ctor:"."===a[1]?re:"?"===a[1]?ne:"@"===a[1]?ie:oe}),r.removeAttribute(e)}else e.startsWith(S)&&(s.push({type:6,index:n}),r.removeAttribute(e));if(F.test(r.tagName)){const e=r.textContent.split(S),t=e.length-1;if(t>0){r.textContent=C?C.emptyScript:"";for(let o=0;o<t;o++)r.append(e[o],H()),K.nextNode(),s.push({type:2,index:++n});r.append(e[t],H())}}}else if(8===r.nodeType)if(r.data===A)s.push({type:2,index:n});else{let e=-1;for(;-1!==(e=r.data.indexOf(S,e+1));)s.push({type:7,index:n}),e+=S.length-1}n++}}static createElement(e,t){const o=T.createElement("template");return o.innerHTML=e,o}}function J(e,t,o=e,r){if(t===V)return t;let n=void 0!==r?o._$Co?.[r]:o._$Cl;const i=B(t)?void 0:t._$litDirective$;return n?.constructor!==i&&(n?._$AO?.(!1),void 0===i?n=void 0:(n=new i(e),n._$AT(e,o,r)),void 0!==r?(o._$Co??=[])[r]=n:o._$Cl=n),void 0!==n&&(t=J(e,n._$AS(e,t.values),n,r)),t}class ee{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){const{el:{content:t},parts:o}=this._$AD,r=(e?.creationScope??T).importNode(t,!0);K.currentNode=r;let n=K.nextNode(),i=0,a=0,s=o[0];for(;void 0!==s;){if(i===s.index){let t;2===s.type?t=new te(n,n.nextSibling,this,e):1===s.type?t=new s.ctor(n,s.name,s.strings,this,e):6===s.type&&(t=new ae(n,this,e)),this._$AV.push(t),s=o[++a]}i!==s?.index&&(n=K.nextNode(),i++)}return K.currentNode=T,r}p(e){let t=0;for(const o of this._$AV)void 0!==o&&(void 0!==o.strings?(o._$AI(e,o,t),t+=o.strings.length-2):o._$AI(e[t])),t++}}class te{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,o,r){this.type=2,this._$AH=Z,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=o,this.options=r,this._$Cv=r?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode;const t=this._$AM;return void 0!==t&&11===e?.nodeType&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=J(this,e,t),B(e)?e===Z||null==e||""===e?(this._$AH!==Z&&this._$AR(),this._$AH=Z):e!==this._$AH&&e!==V&&this._(e):void 0!==e._$litType$?this.$(e):void 0!==e.nodeType?this.T(e):(e=>M(e)||"function"==typeof e?.[Symbol.iterator])(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==Z&&B(this._$AH)?this._$AA.nextSibling.data=e:this.T(T.createTextNode(e)),this._$AH=e}$(e){const{values:t,_$litType$:o}=e,r="number"==typeof o?this._$AC(e):(void 0===o.el&&(o.el=Y.createElement(Q(o.h,o.h[0]),this.options)),o);if(this._$AH?._$AD===r)this._$AH.p(t);else{const e=new ee(r,this),o=e.u(this.options);e.p(t),this.T(o),this._$AH=e}}_$AC(e){let t=q.get(e.strings);return void 0===t&&q.set(e.strings,t=new Y(e)),t}k(e){M(this._$AH)||(this._$AH=[],this._$AR());const t=this._$AH;let o,r=0;for(const n of e)r===t.length?t.push(o=new te(this.O(H()),this.O(H()),this,this.options)):o=t[r],o._$AI(n),r++;r<t.length&&(this._$AR(o&&o._$AB.nextSibling,r),t.length=r)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){const t=z(e).nextSibling;z(e).remove(),e=t}}setConnected(e){void 0===this._$AM&&(this._$Cv=e,this._$AP?.(e))}}class oe{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,o,r,n){this.type=1,this._$AH=Z,this._$AN=void 0,this.element=e,this.name=t,this._$AM=r,this.options=n,o.length>2||""!==o[0]||""!==o[1]?(this._$AH=Array(o.length-1).fill(new String),this.strings=o):this._$AH=Z}_$AI(e,t=this,o,r){const n=this.strings;let i=!1;if(void 0===n)e=J(this,e,t,0),i=!B(e)||e!==this._$AH&&e!==V,i&&(this._$AH=e);else{const r=e;let a,s;for(e=n[0],a=0;a<n.length-1;a++)s=J(this,r[o+a],t,a),s===V&&(s=this._$AH[a]),i||=!B(s)||s!==this._$AH[a],s===Z?e=Z:e!==Z&&(e+=(s??"")+n[a+1]),this._$AH[a]=s}i&&!r&&this.j(e)}j(e){e===Z?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}}class re extends oe{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===Z?void 0:e}}class ne extends oe{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==Z)}}class ie extends oe{constructor(e,t,o,r,n){super(e,t,o,r,n),this.type=5}_$AI(e,t=this){if((e=J(this,e,t,0)??Z)===V)return;const o=this._$AH,r=e===Z&&o!==Z||e.capture!==o.capture||e.once!==o.once||e.passive!==o.passive,n=e!==Z&&(o===Z||r);r&&this.element.removeEventListener(this.name,this,o),n&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}}class ae{constructor(e,t,o){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=o}get _$AU(){return this._$AM._$AU}_$AI(e){J(this,e)}}const se=x.litHtmlPolyfillSupport;se?.(Y,te),(x.litHtmlVersions??=[]).push("3.3.2");const le=globalThis;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let ce=class extends k{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){const t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=((e,t,o)=>{const r=o?.renderBefore??t;let n=r._$litPart$;if(void 0===n){const e=o?.renderBefore??null;r._$litPart$=n=new te(t.insertBefore(H(),e),e,void 0,o??{})}return n._$AI(e),n})(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return V}};ce._$litElement$=!0,ce.finalized=!0,le.litElementHydrateSupport?.({LitElement:ce});const de=le.litElementPolyfillSupport;de?.({LitElement:ce}),(le.litElementVersions??=[]).push("4.2.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const he={attribute:!0,type:String,converter:b,reflect:!1,hasChanged:y},ue=(e=he,t,o)=>{const{kind:r,metadata:n}=o;let i=globalThis.litPropertyMetadata.get(n);if(void 0===i&&globalThis.litPropertyMetadata.set(n,i=new Map),"setter"===r&&((e=Object.create(e)).wrapped=!0),i.set(o.name,e),"accessor"===r){const{name:r}=o;return{set(o){const n=t.get.call(this);t.set.call(this,o),this.requestUpdate(r,n,e,!0,o)},init(t){return void 0!==t&&this.C(r,void 0,e,t),t}}}if("setter"===r){const{name:r}=o;return function(o){const n=this[r];t.call(this,o),this.requestUpdate(r,n,e,!0,o)}}throw Error("Unsupported decorator location: "+r)};function pe(e){return(t,o)=>"object"==typeof o?ue(e,t,o):((e,t,o)=>{const r=t.hasOwnProperty(o);return t.constructor.createProperty(o,e),r?Object.getOwnPropertyDescriptor(t,o):void 0})(e,t,o)}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function me(e){return pe({...e,state:!0,attribute:!1})}class _e extends ce{constructor(){super(...arguments),this.open=!1,this.heading="",this.label="",this._onKeydown=e=>{this.open&&"Escape"===e.key&&this.dispatchEvent(new CustomEvent("dialog-dismiss",{bubbles:!0,composed:!0}))}}connectedCallback(){super.connectedCallback(),document.addEventListener("keydown",this._onKeydown)}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("keydown",this._onKeydown)}render(){return this.open?G`
      <div class="overlay">
        <div
          class="card"
          role="dialog"
          aria-modal="true"
          aria-label=${this.heading||this.label||Z}
        >
          ${this.heading?G`<h3>${this.heading}</h3>`:Z}
          <div class="body"><slot></slot></div>
          <div class="actions"><slot name="actions"></slot></div>
        </div>
      </div>
    `:Z}}_e.styles=a`
    :host { display: contents; }
    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }
    .card {
      background: var(--epp-surface, var(--card-background-color, #fff));
      border-radius: var(--epp-radius-lg, 16px);
      padding: var(--epp-space-5, 24px);
      min-width: 320px;
      max-width: 440px;
      max-height: 85vh;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: var(--epp-space-4, 16px);
      box-shadow: var(--epp-elevation-2, 0 6px 20px rgba(0, 0, 0, 0.18));
    }
    h3 {
      margin: 0;
      flex-shrink: 0;
      font-size: var(--epp-font-xl, 18px);
      font-weight: var(--epp-weight-medium, 500);
      color: var(--epp-text, var(--primary-text-color, #212121));
    }
    .body {
      flex: 1 1 auto;
      overflow-y: auto;
      min-height: 0;
    }
    .actions {
      display: flex;
      flex-shrink: 0;
      justify-content: flex-end;
      gap: var(--epp-space-3, 12px);
    }
  `,e([pe({type:Boolean})],_e.prototype,"open",void 0),e([pe({type:String})],_e.prototype,"heading",void 0),e([pe({type:String})],_e.prototype,"label",void 0),customElements.get("epp-dialog")||customElements.define("epp-dialog",_e);class fe extends ce{constructor(){super(...arguments),this.variant="neutral",this.disabled=!1,this.type="button",this.icon=""}render(){return G`
      <button
        class=${this.variant}
        type=${this.type}
        ?disabled=${this.disabled}
      >
        ${this.icon?G`<ha-icon icon=${this.icon}></ha-icon>`:Z}
        <slot></slot>
      </button>
    `}}fe.styles=a`
    :host { display: inline-block; }
    button {
      font: inherit;
      cursor: pointer;
      border: 1px solid transparent;
      border-radius: var(--epp-radius-md, 10px);
      min-height: var(--epp-control-height, 40px);
      padding: 0 var(--epp-space-4, 16px);
      font-size: var(--epp-font-base, 14px);
      font-weight: var(--epp-weight-semibold, 600);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--epp-space-2, 8px);
    }
    button:focus-visible {
      outline: var(--epp-focus-ring, 2px solid var(--primary-color, #03a9f4));
      outline-offset: 2px;
    }
    button:disabled { opacity: 0.4; cursor: not-allowed; }
    .primary { background: var(--epp-accent, var(--primary-color, #03a9f4)); color: var(--epp-accent-text, #fff); }
    .neutral {
      background: var(--epp-surface, var(--card-background-color, #fff));
      color: var(--epp-text, var(--primary-text-color, #212121));
      border-color: var(--epp-border, var(--divider-color, #e0e0e0));
    }
    .danger { background: var(--epp-danger, var(--error-color, #f44336)); color: #fff; }
    .text { background: transparent; color: var(--epp-text-muted, var(--secondary-text-color, #757575)); }
    ha-icon { --mdc-icon-size: 18px; }
  `,e([pe({type:String})],fe.prototype,"variant",void 0),e([pe({type:Boolean})],fe.prototype,"disabled",void 0),e([pe({type:String})],fe.prototype,"type",void 0),e([pe({type:String})],fe.prototype,"icon",void 0),customElements.get("epp-button")||customElements.define("epp-button",fe);class ge extends ce{constructor(){super(...arguments),this.open=!1,this.heading="",this.message="",this.confirmLabel="Confirm",this.cancelLabel="Cancel",this.danger=!1,this.hideCancel=!1}render(){return G`
			<epp-dialog
				?open=${this.open}
				.heading=${this.heading}
				.label=${this.heading||this.confirmLabel}
				@dialog-dismiss=${this._cancel}
			>
				${this.message?G`<p class="message">${this.message}</p>`:Z}
				${this.hideCancel?Z:G`<epp-button
								slot="actions"
								variant="text"
								data-testid="dialog-cancel"
								@click=${this._cancel}
								>${this.cancelLabel}</epp-button
							>`}
				<epp-button
					slot="actions"
					variant=${this.danger?"danger":"primary"}
					data-testid="dialog-confirm"
					@click=${this._confirm}
					>${this.confirmLabel}</epp-button
				>
			</epp-dialog>
		`}_confirm(){this.dispatchEvent(new CustomEvent("confirm",{bubbles:!0,composed:!0}))}_cancel(){this.dispatchEvent(new CustomEvent("cancel",{bubbles:!0,composed:!0}))}}ge.styles=a`
		.message {
			margin: 0;
			font-size: var(--epp-font-base, 14px);
			color: var(--epp-text-muted, var(--secondary-text-color, #757575));
		}
	`,e([pe({type:Boolean})],ge.prototype,"open",void 0),e([pe()],ge.prototype,"heading",void 0),e([pe()],ge.prototype,"message",void 0),e([pe()],ge.prototype,"confirmLabel",void 0),e([pe()],ge.prototype,"cancelLabel",void 0),e([pe({type:Boolean})],ge.prototype,"danger",void 0),e([pe({type:Boolean})],ge.prototype,"hideCancel",void 0),customElements.get("epp-confirm-dialog")||customElements.define("epp-confirm-dialog",ge);const ve=1,be=2,ye=3,we=20,ke=20,xe=400,ze=300,Ce=6e3;const Ee=e=>!!(1&e),Pe=e=>e>>1&7,Se=e=>e>>4&3;function Ae(e){let t=we,o=0,r=ke,n=0;for(let i=0;i<xe;i++)if(Ee(e[i])){const e=i%we,a=Math.floor(i/we);e<t&&(t=e),e>o&&(o=e),a<r&&(r=a),a>n&&(n=a)}return{minCol:t,maxCol:o,minRow:r,maxRow:n}}function $e(e){const t=Math.ceil(e/ze);return Math.floor((we-t)/2)}function Te(e,t,o){return{x:(e-$e(o)+.5)*ze,y:(t+.5)*ze}}const He={armchair:{viewBox:"4 4 92 82",content:'<path d="M 15,10 Q 15,5 20,5 L 80,5 Q 85,5 85,10 L 85,25 L 15,25 Z" stroke="currentColor" stroke-width="2" fill="none"/><path d="M 10,15 Q 5,15 5,20 L 5,80 Q 5,85 10,85 L 20,85 L 20,15 Z" stroke="currentColor" stroke-width="2" fill="none"/><path d="M 80,15 L 80,85 L 90,85 Q 95,85 95,80 L 95,20 Q 95,15 90,15 Z" stroke="currentColor" stroke-width="2" fill="none"/><rect x="20" y="25" width="60" height="60" rx="3" ry="3" stroke="currentColor" stroke-width="2" fill="none"/>'},car:{viewBox:"-1 4 82 152",content:'<rect x="8" y="5" width="64" height="150" rx="20" ry="20" stroke="currentColor" stroke-width="2" fill="none"/><path d="M 14,35 L 14,50 Q 14,55 20,55 L 60,55 Q 66,55 66,50 L 66,35" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M 14,125 L 14,115 Q 14,110 20,110 L 60,110 Q 66,110 66,115 L 66,125" stroke="currentColor" stroke-width="1.5" fill="none"/><rect x="14" y="55" width="52" height="55" rx="3" ry="3" stroke="currentColor" stroke-width="1.5" fill="none"/><ellipse cx="4" cy="48" rx="4" ry="3" stroke="currentColor" stroke-width="2" fill="none"/><ellipse cx="76" cy="48" rx="4" ry="3" stroke="currentColor" stroke-width="2" fill="none"/><rect x="2" y="25" width="6" height="16" rx="2" ry="2" fill="currentColor"/><rect x="72" y="25" width="6" height="16" rx="2" ry="2" fill="currentColor"/><rect x="2" y="118" width="6" height="16" rx="2" ry="2" fill="currentColor"/><rect x="72" y="118" width="6" height="16" rx="2" ry="2" fill="currentColor"/><circle cx="22" cy="12" r="4" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="58" cy="12" r="4" stroke="currentColor" stroke-width="2" fill="none"/>'},carpet:{viewBox:"4 0.25 132 89.5",content:'<rect x="5" y="5" width="130" height="80" rx="2" ry="2" stroke="currentColor" stroke-width="2" fill="none"/><rect x="15" y="15" width="110" height="60" rx="1" ry="1" stroke="currentColor" stroke-width="1" fill="none"/><line x1="15" y1="5" x2="15" y2="1" stroke="currentColor" stroke-width="1.5"/><line x1="25" y1="5" x2="25" y2="1" stroke="currentColor" stroke-width="1.5"/><line x1="35" y1="5" x2="35" y2="1" stroke="currentColor" stroke-width="1.5"/><line x1="45" y1="5" x2="45" y2="1" stroke="currentColor" stroke-width="1.5"/><line x1="55" y1="5" x2="55" y2="1" stroke="currentColor" stroke-width="1.5"/><line x1="65" y1="5" x2="65" y2="1" stroke="currentColor" stroke-width="1.5"/><line x1="75" y1="5" x2="75" y2="1" stroke="currentColor" stroke-width="1.5"/><line x1="85" y1="5" x2="85" y2="1" stroke="currentColor" stroke-width="1.5"/><line x1="95" y1="5" x2="95" y2="1" stroke="currentColor" stroke-width="1.5"/><line x1="105" y1="5" x2="105" y2="1" stroke="currentColor" stroke-width="1.5"/><line x1="115" y1="5" x2="115" y2="1" stroke="currentColor" stroke-width="1.5"/><line x1="125" y1="5" x2="125" y2="1" stroke="currentColor" stroke-width="1.5"/><line x1="15" y1="85" x2="15" y2="89" stroke="currentColor" stroke-width="1.5"/><line x1="25" y1="85" x2="25" y2="89" stroke="currentColor" stroke-width="1.5"/><line x1="35" y1="85" x2="35" y2="89" stroke="currentColor" stroke-width="1.5"/><line x1="45" y1="85" x2="45" y2="89" stroke="currentColor" stroke-width="1.5"/><line x1="55" y1="85" x2="55" y2="89" stroke="currentColor" stroke-width="1.5"/><line x1="65" y1="85" x2="65" y2="89" stroke="currentColor" stroke-width="1.5"/><line x1="75" y1="85" x2="75" y2="89" stroke="currentColor" stroke-width="1.5"/><line x1="85" y1="85" x2="85" y2="89" stroke="currentColor" stroke-width="1.5"/><line x1="95" y1="85" x2="95" y2="89" stroke="currentColor" stroke-width="1.5"/><line x1="105" y1="85" x2="105" y2="89" stroke="currentColor" stroke-width="1.5"/><line x1="115" y1="85" x2="115" y2="89" stroke="currentColor" stroke-width="1.5"/><line x1="125" y1="85" x2="125" y2="89" stroke="currentColor" stroke-width="1.5"/>'},"cat-bed":{viewBox:"4 4 62 62",content:'<circle cx="35" cy="35" r="30" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="35" cy="35" r="20" stroke="currentColor" stroke-width="2" fill="none"/><path d="M 38,30 Q 45,28 44,35 Q 43,42 35,41 Q 28,40 30,34" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M 36,28 L 38,23 L 41,27" stroke="currentColor" stroke-width="1.5" fill="none"/>'},"ceiling-fan":{viewBox:"6.8107 5.5095 86.3786 83.5837",content:'<g transform="translate(50,50)"><path d="M -4,-10 L 4,-10 L 7,-42 Q 0,-45 -7,-42 Z" stroke="currentColor" stroke-width="2" fill="none"/><path d="M -4,-10 L 4,-10 L 7,-42 Q 0,-45 -7,-42 Z" transform="rotate(72)" stroke="currentColor" stroke-width="2" fill="none"/><path d="M -4,-10 L 4,-10 L 7,-42 Q 0,-45 -7,-42 Z" transform="rotate(144)" stroke="currentColor" stroke-width="2" fill="none"/><path d="M -4,-10 L 4,-10 L 7,-42 Q 0,-45 -7,-42 Z" transform="rotate(216)" stroke="currentColor" stroke-width="2" fill="none"/><path d="M -4,-10 L 4,-10 L 7,-42 Q 0,-45 -7,-42 Z" transform="rotate(288)" stroke="currentColor" stroke-width="2" fill="none"/></g><circle cx="50" cy="50" r="10" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="50" cy="50" r="4" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="50" cy="50" r="1.5" fill="currentColor" stroke="none"/>'},"dog-bed":{viewBox:"4 4 92 72",content:'<ellipse cx="50" cy="40" rx="45" ry="35" stroke="currentColor" stroke-width="2" fill="none"/><ellipse cx="50" cy="40" rx="32" ry="22" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="46" cy="36" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="40" cy="29" r="2" stroke="currentColor" stroke-width="1" fill="none"/><circle cx="47" cy="27" r="2" stroke="currentColor" stroke-width="1" fill="none"/><circle cx="53" cy="29" r="2" stroke="currentColor" stroke-width="1" fill="none"/>'},bath:{viewBox:"4 4 192 82",content:'<rect x="5" y="5" width="190" height="80" rx="20" ry="20" stroke="currentColor" stroke-width="2" fill="none"/><rect x="15" y="15" width="170" height="60" rx="14" ry="14" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="32" cy="38" r="5" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="32" cy="52" r="5" stroke="currentColor" stroke-width="2" fill="none"/><rect x="28" y="40" width="8" height="10" rx="2" ry="2" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="170" cy="45" r="4" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="170" cy="45" r="1.5" fill="currentColor" stroke="none"/>'},"bed-double":{viewBox:"4 4 142 192",content:'<rect x="5" y="5" width="140" height="190" rx="3" ry="3" stroke="currentColor" stroke-width="2" fill="none"/><rect x="5" y="5" width="140" height="20" rx="3" ry="3" stroke="currentColor" stroke-width="2" fill="none"/><rect x="12" y="30" width="58" height="28" rx="6" ry="6" stroke="currentColor" stroke-width="2" fill="none"/><rect x="80" y="30" width="58" height="28" rx="6" ry="6" stroke="currentColor" stroke-width="2" fill="none"/><line x1="15" y1="70" x2="135" y2="70" stroke="currentColor" stroke-width="2"/>'},"bed-single":{viewBox:"4 4 82 192",content:'<rect x="5" y="5" width="80" height="190" rx="3" ry="3" stroke="currentColor" stroke-width="2" fill="none"/><rect x="5" y="5" width="80" height="20" rx="3" ry="3" stroke="currentColor" stroke-width="2" fill="none"/><rect x="12" y="30" width="66" height="28" rx="6" ry="6" stroke="currentColor" stroke-width="2" fill="none"/><line x1="15" y1="70" x2="75" y2="70" stroke="currentColor" stroke-width="2"/>'},"door-left":{viewBox:"-2.5 9.75 105 89.75",content:'<line x1="0" y1="97" x2="7" y2="97" stroke="currentColor" stroke-width="5"/><line x1="93" y1="97" x2="100" y2="97" stroke="currentColor" stroke-width="5"/><line x1="7" y1="97" x2="7" y2="11" stroke="currentColor" stroke-width="2.5"/><path d="M 7,11 A 86,86 0 0,1 93,97" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="4 3"/>'},"door-right":{viewBox:"-2.5 9.75 105 89.75",content:'<line x1="0" y1="97" x2="7" y2="97" stroke="currentColor" stroke-width="5"/><line x1="93" y1="97" x2="100" y2="97" stroke="currentColor" stroke-width="5"/><line x1="93" y1="97" x2="93" y2="11" stroke="currentColor" stroke-width="2.5"/><path d="M 93,11 A 86,86 0 0,0 7,97" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="4 3"/>'},"hot-tub":{viewBox:"7 7 86 86",content:'<circle cx="50" cy="50" r="42" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="50" cy="50" r="35" stroke="currentColor" stroke-width="2" fill="none"/><path d="M 30,40 Q 33,36 36,40 Q 39,44 42,40" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M 50,35 Q 53,31 56,35 Q 59,39 62,35" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M 38,55 Q 41,51 44,55 Q 47,59 50,55" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M 56,50 Q 59,46 62,50 Q 65,54 68,50" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="50" cy="15" r="2" fill="currentColor" stroke="none"/><circle cx="50" cy="85" r="2" fill="currentColor" stroke="none"/><circle cx="15" cy="50" r="2" fill="currentColor" stroke="none"/><circle cx="85" cy="50" r="2" fill="currentColor" stroke="none"/>'},"floor-lamp":{viewBox:"7 1 34 56",content:'<path d="M 8,56 Q 18,52 28,56" stroke="currentColor" stroke-width="2" fill="none"/><line x1="18" y1="54" x2="18" y2="12" stroke="currentColor" stroke-width="2"/><path d="M 18,12 Q 18,6 24,6 L 30,6" stroke="currentColor" stroke-width="2" fill="none"/><rect x="24" y="2" width="16" height="14" rx="2" ry="2" stroke="currentColor" stroke-width="2" fill="none"/>'},oven:{viewBox:"4 4 92 92",content:'<rect x="5" y="5" width="90" height="90" rx="3" ry="3" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="30" cy="30" r="14" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="30" cy="30" r="7" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="70" cy="30" r="14" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="70" cy="30" r="7" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="30" cy="70" r="14" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="30" cy="70" r="7" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="70" cy="70" r="14" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="70" cy="70" r="7" stroke="currentColor" stroke-width="2" fill="none"/>'},plant:{viewBox:"4.25 4.25 51.5 51.5",content:'<circle cx="30" cy="30" r="25" stroke="currentColor" stroke-width="1.5" fill="none"/><g transform="translate(30,30)"><path d="M 0,0 C -5,-10 -3,-18 0,-20 C 3,-18 5,-10 0,0 Z" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M 0,0 C -5,-10 -3,-18 0,-20 C 3,-18 5,-10 0,0 Z" transform="rotate(72)" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M 0,0 C -5,-10 -3,-18 0,-20 C 3,-18 5,-10 0,0 Z" transform="rotate(144)" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M 0,0 C -5,-10 -3,-18 0,-20 C 3,-18 5,-10 0,0 Z" transform="rotate(216)" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M 0,0 C -5,-10 -3,-18 0,-20 C 3,-18 5,-10 0,0 Z" transform="rotate(288)" stroke="currentColor" stroke-width="1.5" fill="none"/></g>'},pool:{viewBox:"4 4 172 92",content:'<rect x="5" y="5" width="170" height="90" rx="20" ry="20" stroke="currentColor" stroke-width="2" fill="none"/><rect x="12" y="12" width="156" height="76" rx="16" ry="16" stroke="currentColor" stroke-width="2" fill="none"/><line x1="25" y1="30" x2="155" y2="30" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"/><line x1="25" y1="50" x2="155" y2="50" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"/><line x1="25" y1="70" x2="155" y2="70" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"/><path d="M 20,12 L 20,25 L 35,25 L 35,18 L 28,18 L 28,12" stroke="currentColor" stroke-width="1.5" fill="none"/>'},shower:{viewBox:"4 4 92 92",content:'<rect x="5" y="5" width="90" height="90" rx="5" ry="5" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="22" cy="22" r="9" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="22" cy="22" r="4" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="50" cy="50" r="5" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="50" cy="50" r="2" fill="currentColor" stroke="none"/>'},"sofa-two-seater":{viewBox:"4 4 152 82",content:'<path d="M 15,10 Q 15,5 20,5 L 140,5 Q 145,5 145,10 L 145,25 L 15,25 Z" stroke="currentColor" stroke-width="2" fill="none"/><path d="M 10,15 Q 5,15 5,20 L 5,80 Q 5,85 10,85 L 20,85 L 20,15 Z" stroke="currentColor" stroke-width="2" fill="none"/><path d="M 140,15 L 140,85 L 150,85 Q 155,85 155,80 L 155,20 Q 155,15 150,15 Z" stroke="currentColor" stroke-width="2" fill="none"/><rect x="20" y="25" width="120" height="60" rx="3" ry="3" stroke="currentColor" stroke-width="2" fill="none"/><line x1="80" y1="28" x2="80" y2="82" stroke="currentColor" stroke-width="2"/>'},"sofa-three-seater":{viewBox:"4 4 212 82",content:'<path d="M 15,10 Q 15,5 20,5 L 200,5 Q 205,5 205,10 L 205,25 L 15,25 Z" stroke="currentColor" stroke-width="2" fill="none"/><path d="M 10,15 Q 5,15 5,20 L 5,80 Q 5,85 10,85 L 20,85 L 20,15 Z" stroke="currentColor" stroke-width="2" fill="none"/><path d="M 200,15 L 200,85 L 210,85 Q 215,85 215,80 L 215,20 Q 215,15 210,15 Z" stroke="currentColor" stroke-width="2" fill="none"/><rect x="20" y="25" width="180" height="60" rx="3" ry="3" stroke="currentColor" stroke-width="2" fill="none"/><line x1="80" y1="28" x2="80" y2="82" stroke="currentColor" stroke-width="2"/><line x1="140" y1="28" x2="140" y2="82" stroke="currentColor" stroke-width="2"/>'},"table-dining-room":{viewBox:"7 4 166 112",content:'<rect x="35" y="28" width="110" height="64" rx="3" ry="3" stroke="currentColor" stroke-width="2" fill="none"/><rect x="52" y="5" width="30" height="16" rx="4" ry="4" stroke="currentColor" stroke-width="2" fill="none"/><rect x="98" y="5" width="30" height="16" rx="4" ry="4" stroke="currentColor" stroke-width="2" fill="none"/><rect x="52" y="99" width="30" height="16" rx="4" ry="4" stroke="currentColor" stroke-width="2" fill="none"/><rect x="98" y="99" width="30" height="16" rx="4" ry="4" stroke="currentColor" stroke-width="2" fill="none"/><rect x="8" y="45" width="16" height="30" rx="4" ry="4" stroke="currentColor" stroke-width="2" fill="none"/><rect x="156" y="45" width="16" height="30" rx="4" ry="4" stroke="currentColor" stroke-width="2" fill="none"/>'},"table-dining-room-round":{viewBox:"7 7 106 106",content:'<circle cx="60" cy="60" r="30" stroke="currentColor" stroke-width="2" fill="none"/><rect x="42" y="8" width="36" height="14" rx="4" ry="4" stroke="currentColor" stroke-width="2" fill="none"/><rect x="42" y="98" width="36" height="14" rx="4" ry="4" stroke="currentColor" stroke-width="2" fill="none"/><rect x="8" y="42" width="14" height="36" rx="4" ry="4" stroke="currentColor" stroke-width="2" fill="none"/><rect x="98" y="42" width="14" height="36" rx="4" ry="4" stroke="currentColor" stroke-width="2" fill="none"/>'},television:{viewBox:"4 1 152 17",content:'<rect x="5" y="2" width="150" height="8" rx="1" ry="1" stroke="currentColor" stroke-width="2" fill="none"/><rect x="60" y="10" width="40" height="7" rx="2" ry="2" stroke="currentColor" stroke-width="2" fill="none"/>'},"bedside-table":{viewBox:"4 4 42 42",content:'<rect x="5" y="5" width="40" height="40" rx="2" ry="2" stroke="currentColor" stroke-width="2" fill="none"/><line x1="5" y1="25" x2="45" y2="25" stroke="currentColor" stroke-width="2"/>'},bidet:{viewBox:"9 9 62 82",content:'<ellipse cx="40" cy="50" rx="30" ry="40" stroke="currentColor" stroke-width="2" fill="none"/><ellipse cx="40" cy="53" rx="20" ry="28" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="40" cy="18" r="4" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="40" cy="18" r="1.5" fill="currentColor" stroke="none"/>'},cabinet:{viewBox:"4 4 72 32",content:'<rect x="5" y="5" width="70" height="30" rx="2" ry="2" stroke="currentColor" stroke-width="2" fill="none"/><line x1="8" y1="15" x2="72" y2="15" stroke="currentColor" stroke-width="1" stroke-dasharray="3 2"/><line x1="8" y1="25" x2="72" y2="25" stroke="currentColor" stroke-width="1" stroke-dasharray="3 2"/>'},counter:{viewBox:"4 4 192 32",content:'<rect x="5" y="5" width="190" height="30" rx="2" ry="2" stroke="currentColor" stroke-width="2" fill="none"/>'},cupboard:{viewBox:"4 4 92 42",content:'<rect x="5" y="5" width="90" height="40" rx="2" ry="2" stroke="currentColor" stroke-width="2" fill="none"/><line x1="50" y1="5" x2="50" y2="45" stroke="currentColor" stroke-width="2"/><circle cx="43" cy="25" r="2" fill="currentColor" stroke="none"/><circle cx="57" cy="25" r="2" fill="currentColor" stroke="none"/>'},desk:{viewBox:"4 4 132 87.2485",content:'<rect x="30" y="64" width="66" height="14" rx="4" ry="4" stroke="currentColor" stroke-width="2" fill="none"/><line x1="33" y1="78" x2="30" y2="86" stroke="currentColor" stroke-width="2"/><line x1="93" y1="78" x2="96" y2="86" stroke="currentColor" stroke-width="2"/><path d="M 30,86 Q 63,94 96,86" stroke="currentColor" stroke-width="2.5" fill="none"/><rect x="5" y="5" width="130" height="55" rx="2" ry="2" stroke="currentColor" stroke-width="2" fill="none"/><rect x="40" y="12" width="42" height="12" rx="1" ry="1" stroke="currentColor" stroke-width="2" fill="none"/><rect x="40" y="26" width="42" height="26" rx="2" ry="2" stroke="currentColor" stroke-width="2" fill="none"/><line x1="45" y1="32" x2="77" y2="32" stroke="currentColor" stroke-width="1"/><line x1="45" y1="37" x2="77" y2="37" stroke="currentColor" stroke-width="1"/><line x1="45" y1="42" x2="77" y2="42" stroke="currentColor" stroke-width="1"/><rect x="54" y="44" width="14" height="6" rx="1" ry="1" stroke="currentColor" stroke-width="1" fill="none"/><circle cx="110" cy="22" r="10" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="110" cy="22" r="4" stroke="currentColor" stroke-width="2" fill="none"/>'},fridge:{viewBox:"4 4 62 62",content:'<rect x="5" y="5" width="60" height="60" rx="3" ry="3" stroke="currentColor" stroke-width="2" fill="none"/><rect x="9" y="9" width="52" height="52" rx="2" ry="2" stroke="currentColor" stroke-width="2" fill="none"/><line x1="14" y1="22" x2="14" y2="48" stroke="currentColor" stroke-width="2.5"/><circle cx="57" cy="20" r="1.5" fill="currentColor" stroke="none"/><circle cx="57" cy="50" r="1.5" fill="currentColor" stroke="none"/>'},"kitchen-island":{viewBox:"4 4 192 72",content:'<rect x="5" y="5" width="190" height="70" rx="3" ry="3" stroke="currentColor" stroke-width="2" fill="none"/><rect x="20" y="35" width="35" height="25" rx="5" ry="5" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="37" cy="47" r="3" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="37" cy="47" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="32" r="3" stroke="currentColor" stroke-width="2" fill="none"/><path d="M 16,32 Q 28,32 28,42" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="130" cy="25" r="10" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="130" cy="25" r="5" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="165" cy="25" r="10" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="165" cy="25" r="5" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="130" cy="55" r="10" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="130" cy="55" r="5" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="165" cy="55" r="10" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="165" cy="55" r="5" stroke="currentColor" stroke-width="2" fill="none"/>'},"side-table":{viewBox:"7.2513 3.5 39.4975 40.5",content:'<circle cx="27" cy="25" r="18" stroke="currentColor" stroke-width="2" fill="none"/><path d="M 21,8 Q 27,1 33,8" stroke="currentColor" stroke-width="2" fill="none"/><path d="M 9,28 Q 6,37 15,39" stroke="currentColor" stroke-width="2" fill="none"/><path d="M 39,39 Q 48,37 45,28" stroke="currentColor" stroke-width="2" fill="none"/>'},"sliding-door":{viewBox:"-2.5 4.75 105 10.5",content:'<line x1="0" y1="10" x2="8" y2="10" stroke="currentColor" stroke-width="5"/><line x1="92" y1="10" x2="100" y2="10" stroke="currentColor" stroke-width="5"/><line x1="8" y1="6" x2="52" y2="6" stroke="currentColor" stroke-width="2.5"/><line x1="48" y1="14" x2="92" y2="14" stroke="currentColor" stroke-width="2.5"/>'},speaker:{viewBox:"2.25 2.25 25.5 35.5",content:'<rect x="3" y="3" width="24" height="34" rx="3" ry="3" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="15" cy="25" r="8" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="15" cy="25" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="15" cy="11" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="15" cy="11" r="1.5" fill="currentColor" stroke="none"/>'},"washing-machine":{viewBox:"4 4 72 72",content:'<rect x="5" y="5" width="70" height="70" rx="5" ry="5" stroke="currentColor" stroke-width="2" fill="none"/><line x1="5" y1="20" x2="75" y2="20" stroke="currentColor" stroke-width="2"/><circle cx="22" cy="13" r="5" stroke="currentColor" stroke-width="2" fill="none"/><line x1="22" y1="13" x2="22" y2="9" stroke="currentColor" stroke-width="1.5"/><circle cx="55" cy="13" r="2.5" fill="currentColor" stroke="none"/><circle cx="65" cy="13" r="2.5" fill="currentColor" stroke="none"/><circle cx="40" cy="48" r="20" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="40" cy="48" r="14" stroke="currentColor" stroke-width="2" fill="none"/>'},window:{viewBox:"-1 1 102 12",content:'<line x1="0" y1="2" x2="100" y2="2" stroke="currentColor" stroke-width="2"/><line x1="0" y1="12" x2="100" y2="12" stroke="currentColor" stroke-width="2"/><line x1="0" y1="7" x2="100" y2="7" stroke="currentColor" stroke-width="1"/><line x1="50" y1="2" x2="50" y2="12" stroke="currentColor" stroke-width="1.5"/>'},toilet:{viewBox:"17 3 66 103",content:'<rect x="18" y="4" width="64" height="24" rx="4" ry="4" stroke="currentColor" stroke-width="2" fill="none"/><rect x="22" y="7" width="56" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2" fill="none"/><ellipse cx="50" cy="16" rx="6" ry="4" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="30" cy="30" r="2.5" fill="currentColor" stroke="none"/><circle cx="70" cy="30" r="2.5" fill="currentColor" stroke="none"/><path d="M 20,32 L 20,60 Q 20,100 50,105 Q 80,100 80,60 L 80,32" stroke="currentColor" stroke-width="2" fill="none"/><path d="M 24,34 L 24,58 Q 24,94 50,99 Q 76,94 76,58 L 76,34" stroke="currentColor" stroke-width="2" fill="none"/><path d="M 32,40 L 32,58 Q 32,86 50,90 Q 68,86 68,58 L 68,40 Q 68,36 50,36 Q 32,36 32,40 Z" stroke="currentColor" stroke-width="2" fill="none"/><line x1="24" y1="34" x2="76" y2="34" stroke="currentColor" stroke-width="2"/>'},washbasin:{viewBox:"4 4 92 62",content:'<rect x="5" y="5" width="90" height="60" rx="8" ry="8" stroke="currentColor" stroke-width="2" fill="none"/><ellipse cx="50" cy="40" rx="35" ry="20" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="50" cy="12" r="3.5" stroke="currentColor" stroke-width="2" fill="none"/><rect x="48.5" y="13" width="3" height="6" rx="1" ry="1" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="50" cy="40" r="3" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="50" cy="40" r="1" fill="currentColor" stroke="none"/>'}},Be=["#2196F3","#FF5722","#4CAF50"];if(3!==Be.length)throw new Error(`TARGET_COLORS palette (${Be.length}) must match MAX_TARGETS (3)`);function Me(e,t,o,r){if(o<=0||r<=0)return null;return{col:$e(o)+e/ze,row:t/ze}}function Ne(e){const t=Math.floor(e.col),o=Math.floor(e.row);return t<0||t>=we||o<0||o>=ke?null:o*we+t}const Re={light:{color:"var(--epp-furniture-on-dark, #eef2f7)",halo:"var(--epp-furniture-halo-on-dark, rgba(0, 0, 0, 0.85))"},dark:{color:"var(--epp-furniture-on-light, #28303c)",halo:"var(--epp-furniture-halo-on-light, rgba(255, 255, 255, 0.95))"}};function Le([e,t,o]){const r=e=>{const t=Math.min(1,Math.max(0,e/255));return t<=.03928?t/12.92:((t+.055)/1.055)**2.4};return.2126*r(e)+.7152*r(t)+.0722*r(o)}function Ie(e,t){return(Math.max(e,t)+.05)/(Math.min(e,t)+.05)}function De(e){return!(!Array.isArray(e)||3!==e.length)&&("number"==typeof e[0]&&Number.isFinite(e[0])&&"number"==typeof e[1]&&Number.isFinite(e[1])&&"number"==typeof e[2]&&Number.isFinite(e[2]))}function Oe(e){const t=/^#([0-9a-fA-F]{6})$/.exec(e);if(!t)return null;const o=Number.parseInt(t[1],16);return[o>>16&255,o>>8&255,255&o]}const je=Le([238,242,247]),Fe=Le([40,48,60]);function Ue(e){const t=Le(e),o=Ie(t,je)>=Ie(t,Fe)?"light":"dark";return{tone:o,...Re[o]}}const Ge="var(--card-background-color, #fff)";const We="var(--error-color, #cc3333)";function Ve(e,t,o){return`repeating-linear-gradient(${e}deg, transparent, transparent ${o}px, ${t} ${o}px, ${t} ${o+2}px)`}function Ze(e,t){switch(e){case 1:return Ve(45,"rgba(60,60,60,0.7)",t);case 2:return Ve(-45,We,t);case 3:return`${Ve(-45,We,t)}, ${Ve(45,We,t)}`;default:return""}}const qe=[[255,224,130],[255,138,0],[221,44,0]];function Ke(e){if(e<=0)return"transparent";const t=Math.min(1,Math.max(0,e/255)),o=Math.log1p(9*t)/Math.log(10),r=o>=.5?1:0,n=1===r?2*(o-.5):2*o,[i,a,s]=qe[r],[l,c,d]=qe[r+1];return`rgba(${Math.round(i+(l-i)*n)}, ${Math.round(a+(c-a)*n)}, ${Math.round(s+(d-s)*n)}, ${Math.min(1,.15+.7*o).toFixed(3)})`}function Qe(e,t,o){const r=e[6]*t+e[7]*o+1;return{x:(e[0]*t+e[1]*o+e[2])/r,y:(e[3]*t+e[4]*o+e[5])/r}}function Xe(e,t,o,r,n){if(!o)return"in_range";const{x:i,y:a}=Te(e,t,r),s=i-o.sensorPos.x,l=a-o.sensorPos.y,c=s*s+l*l;if(c<1)return"in_range";const d=s*o.dirX+l*o.dirY;return d<=0||d*d<.25*c||c>36e6?"out_of_cone":c>n*n?"beyond_max_range":"in_range"}function Ye(e,t,o,r,n){let i=we,a=0,s=ke,l=0;for(let c=0;c<xe;c++){if(!Ee(e[c]))continue;const d=c%we,h=Math.floor(c/we);"out_of_cone"!==Xe(d,h,t,o,r)&&(d<i&&(i=d),d>a&&(a=d),h<s&&(s=h),h>l&&(l=h),n?.(d,h))}return{minCol:i,maxCol:a,minRow:s,maxRow:l}}function Je(e,t,o,r){const n=Ye(e,t,o,r),{minCol:i,maxCol:a,minRow:s,maxRow:l}=n;return i>a?n:{minCol:Math.max(0,i-1),maxCol:Math.min(19,a+1),minRow:Math.max(0,s-1),maxRow:Math.min(19,l+1)}}function et(e,t,o,r,n){const i=r&&null!=n?r:null,a=n??0,s=r?.sensorPos??function(e){return e?Qe(e,0,0):null}(o);let l=0;const c=(e,o)=>(r,n)=>{const{x:i,y:a}=Te(r,n,t),s=i-e,c=a-o,d=s*s+c*c;d>l&&(l=d)},d=Ye(e,i,t,a,s?c(s.x,s.y):void 0);if(d.minCol>d.maxCol)return null;const h=(d.maxCol-d.minCol+1)*ze,u=(d.maxRow-d.minRow+1)*ze;return s||Ye(e,i,t,a,c(h/2,0)),{widthM:h/1e3,depthM:u/1e3,furthestM:Math.sqrt(l)/1e3}}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const tt=2,ot=e=>(...t)=>({_$litDirective$:e,values:t});let rt=class{constructor(e){}get _$AU(){return this._$AM._$AU}_$AT(e,t,o){this._$Ct=e,this._$AM=t,this._$Ci=o}_$AS(e,t){return this.update(e,t)}update(e,t){return this.render(...t)}};
/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const nt={},it=ot(class extends rt{constructor(){super(...arguments),this.ot=nt}render(e,t){return t()}update(e,[t,o]){if(Array.isArray(t)){if(Array.isArray(this.ot)&&this.ot.length===t.length&&t.every((e,t)=>e===this.ot[t]))return V}else if(this.ot===t)return V;return this.ot=Array.isArray(t)?Array.from(t):t,this.render(t,o)}});
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class at extends rt{constructor(e){if(super(e),this.it=Z,e.type!==tt)throw Error(this.constructor.directiveName+"() can only be used in child bindings")}render(e){if(e===Z||null==e)return this._t=void 0,this.it=e;if(e===V)return e;if("string"!=typeof e)throw Error(this.constructor.directiveName+"() called with a non-string value");if(e===this.it)return this._t;this.it=e;const t=[e];return t.raw=t,this._t={_$litType$:this.constructor.resultType,strings:t,values:[]}}}at.directiveName="unsafeHTML",at.resultType=1;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
class st extends at{}st.directiveName="unsafeSVG",st.resultType=2;const lt=ot(st);function ct(e){const t=e.includes("e")||e.includes("w"),o=e.includes("n")||e.includes("s");return t&&o}const dt=["n","s","e","w","ne","nw","se","sw"],ht=dt.filter(ct);const ut=[{key:"arial",label:"Arial",stack:"Arial, Helvetica, sans-serif"},{key:"verdana",label:"Verdana",stack:"Verdana, Geneva, sans-serif"},{key:"tahoma",label:"Tahoma",stack:"Tahoma, 'Segoe UI', sans-serif"},{key:"georgia",label:"Georgia",stack:"Georgia, 'Times New Roman', serif"},{key:"times",label:"Times New Roman",stack:"'Times New Roman', Times, serif"},{key:"courier",label:"Courier New",stack:"'Courier New', Courier, monospace"},{key:"trebuchet",label:"Trebuchet MS",stack:"'Trebuchet MS', Verdana, sans-serif"},{key:"comic",label:"Comic Sans MS",stack:"'Comic Sans MS', 'Comic Sans', cursive"}],pt="arial",mt="center";function _t(e,t){const o=t&&t.cache?t.cache:kt,r=t&&t.serializer?t.serializer:yt;return(t&&t.strategy?t.strategy:bt)(e,{cache:o,serializer:r})}function ft(e,t,o,r){const n=null==(i=r)||"number"==typeof i||"boolean"==typeof i?r:o(r);var i;let a=t.get(n);return void 0===a&&(a=e.call(this,r),t.set(n,a)),a}function gt(e,t,o){const r=Array.prototype.slice.call(arguments,3),n=o(r);let i=t.get(n);return void 0===i&&(i=e.apply(this,r),t.set(n,i)),i}function vt(e,t,o,r,n){return o.bind(t,e,r,n)}function bt(e,t){return vt(e,this,1===e.length?ft:gt,t.cache.create(),t.serializer)}const yt=function(){return JSON.stringify(arguments)};class wt{cache;constructor(){this.cache=Object.create(null)}get(e){return this.cache[e]}set(e,t){this.cache[e]=t}}const kt={create:function(){return new wt}},xt={variadic:function(e,t){return vt(e,this,gt,t.cache.create(),t.serializer)}},zt=/(?:[Eec]{1,6}|G{1,5}|[Qq]{1,5}|(?:[yYur]+|U{1,5})|[ML]{1,5}|d{1,2}|D{1,3}|F{1}|[abB]{1,5}|[hkHK]{1,2}|w{1,2}|W{1}|m{1,2}|s{1,2}|[zZOvVxX]{1,4})(?=([^']*'[^']*')*[^']*$)/g;function Ct(e){const t={};return e.replace(zt,e=>{const o=e.length;switch(e[0]){case"G":t.era=4===o?"long":5===o?"narrow":"short";break;case"y":t.year=2===o?"2-digit":"numeric";break;case"Y":case"u":case"U":case"r":throw new RangeError("`Y/u/U/r` (year) patterns are not supported, use `y` instead");case"q":case"Q":throw new RangeError("`q/Q` (quarter) patterns are not supported");case"M":case"L":t.month=["numeric","2-digit","short","long","narrow"][o-1];break;case"w":case"W":throw new RangeError("`w/W` (week) patterns are not supported");case"d":t.day=["numeric","2-digit"][o-1];break;case"D":case"F":case"g":throw new RangeError("`D/F/g` (day) patterns are not supported, use `d` instead");case"E":t.weekday=4===o?"long":5===o?"narrow":"short";break;case"e":if(o<4)throw new RangeError("`e..eee` (weekday) patterns are not supported");t.weekday=["short","long","narrow","short"][o-4];break;case"c":if(o<4)throw new RangeError("`c..ccc` (weekday) patterns are not supported");t.weekday=["short","long","narrow","short"][o-4];break;case"a":t.hour12=!0;break;case"b":case"B":throw new RangeError("`b/B` (period) patterns are not supported, use `a` instead");case"h":t.hourCycle="h12",t.hour=["numeric","2-digit"][o-1];break;case"H":t.hourCycle="h23",t.hour=["numeric","2-digit"][o-1];break;case"K":t.hourCycle="h11",t.hour=["numeric","2-digit"][o-1];break;case"k":t.hourCycle="h24",t.hour=["numeric","2-digit"][o-1];break;case"j":case"J":case"C":throw new RangeError("`j/J/C` (hour) patterns are not supported, use `h/H/K/k` instead");case"m":t.minute=["numeric","2-digit"][o-1];break;case"s":t.second=["numeric","2-digit"][o-1];break;case"S":case"A":throw new RangeError("`S/A` (second) patterns are not supported, use `s` instead");case"z":t.timeZoneName=o<4?"short":"long";break;case"Z":case"O":case"v":case"V":case"X":case"x":throw new RangeError("`Z/O/v/V/X/x` (timeZone) patterns are not supported, use `z` instead")}return""}),t}const Et=/[\t-\r \x85\u200E\u200F\u2028\u2029]/i;function Pt(e){return e.replace(/^(.*?)-/,"")}const St=/^\.(?:(0+)(\*)?|(#+)|(0+)(#+))$/g,At=/^(@+)?(\+|#+)?[rs]?$/g,$t=/(\*)(0+)|(#+)(0+)|(0+)/g,Tt=/^(0+)$/;function Ht(e){const t={};return"r"===e[e.length-1]?t.roundingPriority="morePrecision":"s"===e[e.length-1]&&(t.roundingPriority="lessPrecision"),e.replace(At,function(e,o,r){return"string"!=typeof r?(t.minimumSignificantDigits=o.length,t.maximumSignificantDigits=o.length):"+"===r?t.minimumSignificantDigits=o.length:"#"===o[0]?t.maximumSignificantDigits=o.length:(t.minimumSignificantDigits=o.length,t.maximumSignificantDigits=o.length+("string"==typeof r?r.length:0)),""}),t}function Bt(e){switch(e){case"sign-auto":return{signDisplay:"auto"};case"sign-accounting":case"()":return{currencySign:"accounting"};case"sign-always":case"+!":return{signDisplay:"always"};case"sign-accounting-always":case"()!":return{signDisplay:"always",currencySign:"accounting"};case"sign-except-zero":case"+?":return{signDisplay:"exceptZero"};case"sign-accounting-except-zero":case"()?":return{signDisplay:"exceptZero",currencySign:"accounting"};case"sign-never":case"+_":return{signDisplay:"never"}}}function Mt(e){let t;if("E"===e[0]&&"E"===e[1]?(t={notation:"engineering"},e=e.slice(2)):"E"===e[0]&&(t={notation:"scientific"},e=e.slice(1)),t){const o=e.slice(0,2);if("+!"===o?(t.signDisplay="always",e=e.slice(2)):"+?"===o&&(t.signDisplay="exceptZero",e=e.slice(2)),!Tt.test(e))throw new Error("Malformed concise eng/scientific notation");t.minimumIntegerDigits=e.length}return t}function Nt(e){const t=Bt(e);return t||{}}function Rt(e){let t={};for(const o of e){switch(o.stem){case"percent":case"%":t.style="percent";continue;case"%x100":t.style="percent",t.scale=100;continue;case"currency":t.style="currency",t.currency=o.options[0];continue;case"group-off":case",_":t.useGrouping=!1;continue;case"precision-integer":case".":t.maximumFractionDigits=0;continue;case"measure-unit":case"unit":t.style="unit",t.unit=Pt(o.options[0]);continue;case"compact-short":case"K":t.notation="compact",t.compactDisplay="short";continue;case"compact-long":case"KK":t.notation="compact",t.compactDisplay="long";continue;case"scientific":t={...t,notation:"scientific",...o.options.reduce((e,t)=>({...e,...Nt(t)}),{})};continue;case"engineering":t={...t,notation:"engineering",...o.options.reduce((e,t)=>({...e,...Nt(t)}),{})};continue;case"notation-simple":t.notation="standard";continue;case"unit-width-narrow":t.currencyDisplay="narrowSymbol",t.unitDisplay="narrow";continue;case"unit-width-short":t.currencyDisplay="code",t.unitDisplay="short";continue;case"unit-width-full-name":t.currencyDisplay="name",t.unitDisplay="long";continue;case"unit-width-iso-code":t.currencyDisplay="symbol";continue;case"scale":t.scale=parseFloat(o.options[0]);continue;case"rounding-mode-floor":t.roundingMode="floor";continue;case"rounding-mode-ceiling":t.roundingMode="ceil";continue;case"rounding-mode-down":t.roundingMode="trunc";continue;case"rounding-mode-up":t.roundingMode="expand";continue;case"rounding-mode-half-even":t.roundingMode="halfEven";continue;case"rounding-mode-half-down":t.roundingMode="halfTrunc";continue;case"rounding-mode-half-up":t.roundingMode="halfExpand";continue;case"integer-width":if(o.options.length>1)throw new RangeError("integer-width stems only accept a single optional option");o.options[0].replace($t,function(e,o,r,n,i,a){if(o)t.minimumIntegerDigits=r.length;else{if(n&&i)throw new Error("We currently do not support maximum integer digits");if(a)throw new Error("We currently do not support exact integer digits")}return""});continue}if(Tt.test(o.stem)){t.minimumIntegerDigits=o.stem.length;continue}if(St.test(o.stem)){if(o.options.length>1)throw new RangeError("Fraction-precision stems only accept a single optional option");o.stem.replace(St,function(e,o,r,n,i,a){return"*"===r?t.minimumFractionDigits=o.length:n&&"#"===n[0]?t.maximumFractionDigits=n.length:i&&a?(t.minimumFractionDigits=i.length,t.maximumFractionDigits=i.length+a.length):(t.minimumFractionDigits=o.length,t.maximumFractionDigits=o.length),""});const e=o.options[0];"w"===e?t={...t,trailingZeroDisplay:"stripIfInteger"}:e&&(t={...t,...Ht(e)});continue}if(At.test(o.stem)){t={...t,...Ht(o.stem)};continue}const e=Bt(o.stem);e&&(t={...t,...e});const r=Mt(o.stem);r&&(t={...t,...r})}return t}let Lt=function(e){return e[e.literal=0]="literal",e[e.argument=1]="argument",e[e.number=2]="number",e[e.date=3]="date",e[e.time=4]="time",e[e.select=5]="select",e[e.plural=6]="plural",e[e.pound=7]="pound",e[e.tag=8]="tag",e}({}),It=function(e){return e[e.number=0]="number",e[e.dateTime=1]="dateTime",e}({});function Dt(e){return e.type===Lt.literal}function Ot(e){return e.type===Lt.argument}function jt(e){return e.type===Lt.number}function Ft(e){return e.type===Lt.date}function Ut(e){return e.type===Lt.time}function Gt(e){return e.type===Lt.select}function Wt(e){return e.type===Lt.plural}function Vt(e){return e.type===Lt.pound}function Zt(e){return e.type===Lt.tag}function qt(e){return!(!e||"object"!=typeof e||e.type!==It.number)}function Kt(e){return!(!e||"object"!=typeof e||e.type!==It.dateTime)}let Qt=function(e){return e[e.EXPECT_ARGUMENT_CLOSING_BRACE=1]="EXPECT_ARGUMENT_CLOSING_BRACE",e[e.EMPTY_ARGUMENT=2]="EMPTY_ARGUMENT",e[e.MALFORMED_ARGUMENT=3]="MALFORMED_ARGUMENT",e[e.EXPECT_ARGUMENT_TYPE=4]="EXPECT_ARGUMENT_TYPE",e[e.INVALID_ARGUMENT_TYPE=5]="INVALID_ARGUMENT_TYPE",e[e.EXPECT_ARGUMENT_STYLE=6]="EXPECT_ARGUMENT_STYLE",e[e.INVALID_NUMBER_SKELETON=7]="INVALID_NUMBER_SKELETON",e[e.INVALID_DATE_TIME_SKELETON=8]="INVALID_DATE_TIME_SKELETON",e[e.EXPECT_NUMBER_SKELETON=9]="EXPECT_NUMBER_SKELETON",e[e.EXPECT_DATE_TIME_SKELETON=10]="EXPECT_DATE_TIME_SKELETON",e[e.UNCLOSED_QUOTE_IN_ARGUMENT_STYLE=11]="UNCLOSED_QUOTE_IN_ARGUMENT_STYLE",e[e.EXPECT_SELECT_ARGUMENT_OPTIONS=12]="EXPECT_SELECT_ARGUMENT_OPTIONS",e[e.EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE=13]="EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE",e[e.INVALID_PLURAL_ARGUMENT_OFFSET_VALUE=14]="INVALID_PLURAL_ARGUMENT_OFFSET_VALUE",e[e.EXPECT_SELECT_ARGUMENT_SELECTOR=15]="EXPECT_SELECT_ARGUMENT_SELECTOR",e[e.EXPECT_PLURAL_ARGUMENT_SELECTOR=16]="EXPECT_PLURAL_ARGUMENT_SELECTOR",e[e.EXPECT_SELECT_ARGUMENT_SELECTOR_FRAGMENT=17]="EXPECT_SELECT_ARGUMENT_SELECTOR_FRAGMENT",e[e.EXPECT_PLURAL_ARGUMENT_SELECTOR_FRAGMENT=18]="EXPECT_PLURAL_ARGUMENT_SELECTOR_FRAGMENT",e[e.INVALID_PLURAL_ARGUMENT_SELECTOR=19]="INVALID_PLURAL_ARGUMENT_SELECTOR",e[e.DUPLICATE_PLURAL_ARGUMENT_SELECTOR=20]="DUPLICATE_PLURAL_ARGUMENT_SELECTOR",e[e.DUPLICATE_SELECT_ARGUMENT_SELECTOR=21]="DUPLICATE_SELECT_ARGUMENT_SELECTOR",e[e.MISSING_OTHER_CLAUSE=22]="MISSING_OTHER_CLAUSE",e[e.INVALID_TAG=23]="INVALID_TAG",e[e.INVALID_TAG_NAME=25]="INVALID_TAG_NAME",e[e.UNMATCHED_CLOSING_TAG=26]="UNMATCHED_CLOSING_TAG",e[e.UNCLOSED_TAG=27]="UNCLOSED_TAG",e}({});const Xt=/[ \xA0\u1680\u2000-\u200A\u202F\u205F\u3000]/,Yt={"001":["H","h"],419:["h","H","hB","hb"],AC:["H","h","hb","hB"],AD:["H","hB"],AE:["h","hB","hb","H"],AF:["H","hb","hB","h"],AG:["h","hb","H","hB"],AI:["H","h","hb","hB"],AL:["h","H","hB"],AM:["H","hB"],AO:["H","hB"],AR:["h","H","hB","hb"],AS:["h","H"],AT:["H","hB"],AU:["h","hb","H","hB"],AW:["H","hB"],AX:["H"],AZ:["H","hB","h"],BA:["H","hB","h"],BB:["h","hb","H","hB"],BD:["h","hB","H"],BE:["H","hB"],BF:["H","hB"],BG:["H","hB","h"],BH:["h","hB","hb","H"],BI:["H","h"],BJ:["H","hB"],BL:["H","hB"],BM:["h","hb","H","hB"],BN:["hb","hB","h","H"],BO:["h","H","hB","hb"],BQ:["H"],BR:["H","hB"],BS:["h","hb","H","hB"],BT:["h","H"],BW:["H","h","hb","hB"],BY:["H","h"],BZ:["H","h","hb","hB"],CA:["h","hb","H","hB"],CC:["H","h","hb","hB"],CD:["hB","H"],CF:["H","h","hB"],CG:["H","hB"],CH:["H","hB","h"],CI:["H","hB"],CK:["H","h","hb","hB"],CL:["h","H","hB","hb"],CM:["H","h","hB"],CN:["H","hB","hb","h"],CO:["h","H","hB","hb"],CP:["H"],CR:["h","H","hB","hb"],CU:["h","H","hB","hb"],CV:["H","hB"],CW:["H","hB"],CX:["H","h","hb","hB"],CY:["h","H","hb","hB"],CZ:["H"],DE:["H","hB"],DG:["H","h","hb","hB"],DJ:["h","H"],DK:["H"],DM:["h","hb","H","hB"],DO:["h","H","hB","hb"],DZ:["h","hB","hb","H"],EA:["H","h","hB","hb"],EC:["h","H","hB","hb"],EE:["H","hB"],EG:["h","hB","hb","H"],EH:["h","hB","hb","H"],ER:["h","H"],ES:["H","hB","h","hb"],ET:["hB","hb","h","H"],FI:["H"],FJ:["h","hb","H","hB"],FK:["H","h","hb","hB"],FM:["h","hb","H","hB"],FO:["H","h"],FR:["H","hB"],GA:["H","hB"],GB:["H","h","hb","hB"],GD:["h","hb","H","hB"],GE:["H","hB","h"],GF:["H","hB"],GG:["H","h","hb","hB"],GH:["h","H"],GI:["H","h","hb","hB"],GL:["H","h"],GM:["h","hb","H","hB"],GN:["H","hB"],GP:["H","hB"],GQ:["H","hB","h","hb"],GR:["h","H","hb","hB"],GS:["H","h","hb","hB"],GT:["h","H","hB","hb"],GU:["h","hb","H","hB"],GW:["H","hB"],GY:["h","hb","H","hB"],HK:["h","hB","hb","H"],HN:["h","H","hB","hb"],HR:["H","hB"],HU:["H","h"],IC:["H","h","hB","hb"],ID:["H"],IE:["H","h","hb","hB"],IL:["H","hB"],IM:["H","h","hb","hB"],IN:["h","H"],IO:["H","h","hb","hB"],IQ:["h","hB","hb","H"],IR:["hB","H"],IS:["H"],IT:["H","hB"],JE:["H","h","hb","hB"],JM:["h","hb","H","hB"],JO:["h","hB","hb","H"],JP:["H","K","h"],KE:["hB","hb","H","h"],KG:["H","h","hB","hb"],KH:["hB","h","H","hb"],KI:["h","hb","H","hB"],KM:["H","h","hB","hb"],KN:["h","hb","H","hB"],KP:["h","H","hB","hb"],KR:["h","H","hB","hb"],KW:["h","hB","hb","H"],KY:["h","hb","H","hB"],KZ:["H","hB"],LA:["H","hb","hB","h"],LB:["h","hB","hb","H"],LC:["h","hb","H","hB"],LI:["H","hB","h"],LK:["H","h","hB","hb"],LR:["h","hb","H","hB"],LS:["h","H"],LT:["H","h","hb","hB"],LU:["H","h","hB"],LV:["H","hB","hb","h"],LY:["h","hB","hb","H"],MA:["H","h","hB","hb"],MC:["H","hB"],MD:["H","hB"],ME:["H","hB","h"],MF:["H","hB"],MG:["H","h"],MH:["h","hb","H","hB"],MK:["H","h","hb","hB"],ML:["H"],MM:["hB","hb","H","h"],MN:["H","h","hb","hB"],MO:["h","hB","hb","H"],MP:["h","hb","H","hB"],MQ:["H","hB"],MR:["h","hB","hb","H"],MS:["H","h","hb","hB"],MT:["H","h"],MU:["H","h"],MV:["H","h"],MW:["h","hb","H","hB"],MX:["h","H","hB","hb"],MY:["hb","hB","h","H"],MZ:["H","hB"],NA:["h","H","hB","hb"],NC:["H","hB"],NE:["H"],NF:["H","h","hb","hB"],NG:["H","h","hb","hB"],NI:["h","H","hB","hb"],NL:["H","hB"],NO:["H","h"],NP:["H","h","hB"],NR:["H","h","hb","hB"],NU:["H","h","hb","hB"],NZ:["h","hb","H","hB"],OM:["h","hB","hb","H"],PA:["h","H","hB","hb"],PE:["h","H","hB","hb"],PF:["H","h","hB"],PG:["h","H"],PH:["h","hB","hb","H"],PK:["h","hB","H"],PL:["H","h"],PM:["H","hB"],PN:["H","h","hb","hB"],PR:["h","H","hB","hb"],PS:["h","hB","hb","H"],PT:["H","hB"],PW:["h","H"],PY:["h","H","hB","hb"],QA:["h","hB","hb","H"],RE:["H","hB"],RO:["H","hB"],RS:["H","hB","h"],RU:["H"],RW:["H","h"],SA:["h","hB","hb","H"],SB:["h","hb","H","hB"],SC:["H","h","hB"],SD:["h","hB","hb","H"],SE:["H"],SG:["h","hb","H","hB"],SH:["H","h","hb","hB"],SI:["H","hB"],SJ:["H"],SK:["H"],SL:["h","hb","H","hB"],SM:["H","h","hB"],SN:["H","h","hB"],SO:["h","H"],SR:["H","hB"],SS:["h","hb","H","hB"],ST:["H","hB"],SV:["h","H","hB","hb"],SX:["H","h","hb","hB"],SY:["h","hB","hb","H"],SZ:["h","hb","H","hB"],TA:["H","h","hb","hB"],TC:["h","hb","H","hB"],TD:["h","H","hB"],TF:["H","h","hB"],TG:["H","hB"],TH:["H","h"],TJ:["H","h"],TL:["H","hB","hb","h"],TM:["H","h"],TN:["h","hB","hb","H"],TO:["h","H"],TR:["H","hB"],TT:["h","hb","H","hB"],TW:["hB","hb","h","H"],TZ:["hB","hb","H","h"],UA:["H","hB","h"],UG:["hB","hb","H","h"],UM:["h","hb","H","hB"],US:["h","hb","H","hB"],UY:["h","H","hB","hb"],UZ:["H","hB","h"],VA:["H","h","hB"],VC:["h","hb","H","hB"],VE:["h","H","hB","hb"],VG:["h","hb","H","hB"],VI:["h","hb","H","hB"],VN:["H","h"],VU:["h","H"],WF:["H","hB"],WS:["h","H"],XK:["H","hB","h"],YE:["h","hB","hb","H"],YT:["H","hB"],ZA:["H","h","hb","hB"],ZM:["h","hb","H","hB"],ZW:["H","h"],"af-ZA":["H","h","hB","hb"],"ar-001":["h","hB","hb","H"],"ca-ES":["H","h","hB"],"en-001":["h","hb","H","hB"],"en-HK":["h","hb","H","hB"],"en-IL":["H","h","hb","hB"],"en-MY":["h","hb","H","hB"],"es-BR":["H","h","hB","hb"],"es-ES":["H","h","hB","hb"],"es-GQ":["H","h","hB","hb"],"fr-CA":["H","h","hB"],"gl-ES":["H","h","hB"],"gu-IN":["hB","hb","h","H"],"hi-IN":["hB","h","H"],"it-CH":["H","h","hB"],"it-IT":["H","h","hB"],"kn-IN":["hB","h","H"],"ku-SY":["H","hB"],"ml-IN":["hB","h","H"],"mr-IN":["hB","hb","h","H"],"pa-IN":["hB","hb","h","H"],"ta-IN":["hB","h","hb","H"],"te-IN":["hB","h","H"],"zu-ZA":["H","hB","hb","h"]};function Jt(e){let t=e.hourCycle;if(void 0===t&&e.hourCycles&&e.hourCycles.length&&(t=e.hourCycles[0]),t)switch(t){case"h24":return"k";case"h23":return"H";case"h12":return"h";case"h11":return"K";default:throw new Error("Invalid hourCycle")}const o=e.language;let r;"root"!==o&&(r=e.maximize().region);return(Yt[r||""]||Yt[o||""]||Yt[`${o}-001`]||Yt["001"])[0]}const eo=new RegExp(`^${Xt.source}*`),to=new RegExp(`${Xt.source}*$`);function oo(e,t){return{start:e,end:t}}const ro=!!Object.fromEntries,no=!!String.prototype.trimStart,io=!!String.prototype.trimEnd,ao=ro?Object.fromEntries:function(e){const t={};for(const[o,r]of e)t[o]=r;return t},so=no?function(e){return e.trimStart()}:function(e){return e.replace(eo,"")},lo=io?function(e){return e.trimEnd()}:function(e){return e.replace(to,"")},co=new RegExp("([^\\p{White_Space}\\p{Pattern_Syntax}]*)","yu");class ho{message;position;locale;ignoreTag;requiresOtherClause;shouldParseSkeletons;constructor(e,t={}){this.message=e,this.position={offset:0,line:1,column:1},this.ignoreTag=!!t.ignoreTag,this.locale=t.locale,this.requiresOtherClause=!!t.requiresOtherClause,this.shouldParseSkeletons=!!t.shouldParseSkeletons}parse(){if(0!==this.offset())throw Error("parser can only be used once");return this.parseMessage(0,"",!1)}parseMessage(e,t,o){let r=[];for(;!this.isEOF();){const n=this.char();if(123===n){const t=this.parseArgument(e,o);if(t.err)return t;r.push(t.val)}else{if(125===n&&e>0)break;if(35!==n||"plural"!==t&&"selectordinal"!==t){if(60===n&&!this.ignoreTag&&47===this.peek()){if(o)break;return this.error(Qt.UNMATCHED_CLOSING_TAG,oo(this.clonePosition(),this.clonePosition()))}if(60===n&&!this.ignoreTag&&uo(this.peek()||0)){const o=this.parseTag(e,t);if(o.err)return o;r.push(o.val)}else{const o=this.parseLiteral(e,t);if(o.err)return o;r.push(o.val)}}else{const e=this.clonePosition();this.bump(),r.push({type:Lt.pound,location:oo(e,this.clonePosition())})}}}return{val:r,err:null}}parseTag(e,t){const o=this.clonePosition();this.bump();const r=this.parseTagName();if(this.bumpSpace(),this.bumpIf("/>"))return{val:{type:Lt.literal,value:`<${r}/>`,location:oo(o,this.clonePosition())},err:null};if(this.bumpIf(">")){const n=this.parseMessage(e+1,t,!0);if(n.err)return n;const i=n.val,a=this.clonePosition();if(this.bumpIf("</")){if(this.isEOF()||!uo(this.char()))return this.error(Qt.INVALID_TAG,oo(a,this.clonePosition()));const e=this.clonePosition();return r!==this.parseTagName()?this.error(Qt.UNMATCHED_CLOSING_TAG,oo(e,this.clonePosition())):(this.bumpSpace(),this.bumpIf(">")?{val:{type:Lt.tag,value:r,children:i,location:oo(o,this.clonePosition())},err:null}:this.error(Qt.INVALID_TAG,oo(a,this.clonePosition())))}return this.error(Qt.UNCLOSED_TAG,oo(o,this.clonePosition()))}return this.error(Qt.INVALID_TAG,oo(o,this.clonePosition()))}parseTagName(){const e=this.offset();for(this.bump();!this.isEOF()&&po(this.char());)this.bump();return this.message.slice(e,this.offset())}parseLiteral(e,t){const o=this.clonePosition();let r="";for(;;){const o=this.tryParseQuote(t);if(o){r+=o;continue}const n=this.tryParseUnquoted(e,t);if(n){r+=n;continue}const i=this.tryParseLeftAngleBracket();if(!i)break;r+=i}const n=oo(o,this.clonePosition());return{val:{type:Lt.literal,value:r,location:n},err:null}}tryParseLeftAngleBracket(){return this.isEOF()||60!==this.char()||!this.ignoreTag&&(uo(e=this.peek()||0)||47===e)?null:(this.bump(),"<");var e}tryParseQuote(e){if(this.isEOF()||39!==this.char())return null;switch(this.peek()){case 39:return this.bump(),this.bump(),"'";case 123:case 60:case 62:case 125:break;case 35:if("plural"===e||"selectordinal"===e)break;return null;default:return null}this.bump();const t=[this.char()];for(this.bump();!this.isEOF();){const e=this.char();if(39===e){if(39!==this.peek()){this.bump();break}t.push(39),this.bump()}else t.push(e);this.bump()}return String.fromCodePoint(...t)}tryParseUnquoted(e,t){if(this.isEOF())return null;const o=this.char();return 60===o||123===o||35===o&&("plural"===t||"selectordinal"===t)||125===o&&e>0?null:(this.bump(),String.fromCodePoint(o))}parseArgument(e,t){const o=this.clonePosition();if(this.bump(),this.bumpSpace(),this.isEOF())return this.error(Qt.EXPECT_ARGUMENT_CLOSING_BRACE,oo(o,this.clonePosition()));if(125===this.char())return this.bump(),this.error(Qt.EMPTY_ARGUMENT,oo(o,this.clonePosition()));let r=this.parseIdentifierIfPossible().value;if(!r)return this.error(Qt.MALFORMED_ARGUMENT,oo(o,this.clonePosition()));if(this.bumpSpace(),this.isEOF())return this.error(Qt.EXPECT_ARGUMENT_CLOSING_BRACE,oo(o,this.clonePosition()));switch(this.char()){case 125:return this.bump(),{val:{type:Lt.argument,value:r,location:oo(o,this.clonePosition())},err:null};case 44:return this.bump(),this.bumpSpace(),this.isEOF()?this.error(Qt.EXPECT_ARGUMENT_CLOSING_BRACE,oo(o,this.clonePosition())):this.parseArgumentOptions(e,t,r,o);default:return this.error(Qt.MALFORMED_ARGUMENT,oo(o,this.clonePosition()))}}parseIdentifierIfPossible(){const e=this.clonePosition(),t=this.offset(),o=function(e,t){return co.lastIndex=t,co.exec(e)[1]??""}(this.message,t),r=t+o.length;this.bumpTo(r);return{value:o,location:oo(e,this.clonePosition())}}parseArgumentOptions(e,t,o,r){let n=this.clonePosition(),i=this.parseIdentifierIfPossible().value,a=this.clonePosition();switch(i){case"":return this.error(Qt.EXPECT_ARGUMENT_TYPE,oo(n,a));case"number":case"date":case"time":{this.bumpSpace();let e=null;if(this.bumpIf(",")){this.bumpSpace();const t=this.clonePosition(),o=this.parseSimpleArgStyleIfPossible();if(o.err)return o;const r=lo(o.val);if(0===r.length)return this.error(Qt.EXPECT_ARGUMENT_STYLE,oo(this.clonePosition(),this.clonePosition()));e={style:r,styleLocation:oo(t,this.clonePosition())}}const t=this.tryParseArgumentClose(r);if(t.err)return t;const n=oo(r,this.clonePosition());if(e&&e.style.startsWith("::")){let t=so(e.style.slice(2));if("number"===i){const r=this.parseNumberSkeletonFromString(t,e.styleLocation);return r.err?r:{val:{type:Lt.number,value:o,location:n,style:r.val},err:null}}{if(0===t.length)return this.error(Qt.EXPECT_DATE_TIME_SKELETON,n);let r=t;this.locale&&(r=function(e,t){let o="";for(let r=0;r<e.length;r++){const n=e.charAt(r);if("j"===n){let i=0;for(;r+1<e.length&&e.charAt(r+1)===n;)i++,r++;let a=1+(1&i),s=i<2?1:3+(i>>1),l="a",c=Jt(t);for("H"!=c&&"k"!=c||(s=0);s-- >0;)o+=l;for(;a-- >0;)o=c+o}else o+="J"===n?"H":n}return o}(t,this.locale));const a={type:It.dateTime,pattern:r,location:e.styleLocation,parsedOptions:this.shouldParseSkeletons?Ct(r):{}};return{val:{type:"date"===i?Lt.date:Lt.time,value:o,location:n,style:a},err:null}}}return{val:{type:"number"===i?Lt.number:"date"===i?Lt.date:Lt.time,value:o,location:n,style:e?.style??null},err:null}}case"plural":case"selectordinal":case"select":{const n=this.clonePosition();if(this.bumpSpace(),!this.bumpIf(","))return this.error(Qt.EXPECT_SELECT_ARGUMENT_OPTIONS,oo(n,{...n}));this.bumpSpace();let a=this.parseIdentifierIfPossible(),s=0;if("select"!==i&&"offset"===a.value){if(!this.bumpIf(":"))return this.error(Qt.EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE,oo(this.clonePosition(),this.clonePosition()));this.bumpSpace();const e=this.tryParseDecimalInteger(Qt.EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE,Qt.INVALID_PLURAL_ARGUMENT_OFFSET_VALUE);if(e.err)return e;this.bumpSpace(),a=this.parseIdentifierIfPossible(),s=e.val}const l=this.tryParsePluralOrSelectOptions(e,i,t,a);if(l.err)return l;const c=this.tryParseArgumentClose(r);if(c.err)return c;const d=oo(r,this.clonePosition());return"select"===i?{val:{type:Lt.select,value:o,options:ao(l.val),location:d},err:null}:{val:{type:Lt.plural,value:o,options:ao(l.val),offset:s,pluralType:"plural"===i?"cardinal":"ordinal",location:d},err:null}}default:return this.error(Qt.INVALID_ARGUMENT_TYPE,oo(n,a))}}tryParseArgumentClose(e){return this.isEOF()||125!==this.char()?this.error(Qt.EXPECT_ARGUMENT_CLOSING_BRACE,oo(e,this.clonePosition())):(this.bump(),{val:!0,err:null})}parseSimpleArgStyleIfPossible(){let e=0;const t=this.clonePosition();for(;!this.isEOF();){switch(this.char()){case 39:{this.bump();let e=this.clonePosition();if(!this.bumpUntil("'"))return this.error(Qt.UNCLOSED_QUOTE_IN_ARGUMENT_STYLE,oo(e,this.clonePosition()));this.bump();break}case 123:e+=1,this.bump();break;case 125:if(!(e>0))return{val:this.message.slice(t.offset,this.offset()),err:null};e-=1;break;default:this.bump()}}return{val:this.message.slice(t.offset,this.offset()),err:null}}parseNumberSkeletonFromString(e,t){let o=[];try{o=function(e){if(0===e.length)throw new Error("Number skeleton cannot be empty");const t=e.split(Et).filter(e=>e.length>0),o=[];for(const e of t){let t=e.split("/");if(0===t.length)throw new Error("Invalid number skeleton");const[r,...n]=t;for(const e of n)if(0===e.length)throw new Error("Invalid number skeleton");o.push({stem:r,options:n})}return o}(e)}catch{return this.error(Qt.INVALID_NUMBER_SKELETON,t)}return{val:{type:It.number,tokens:o,location:t,parsedOptions:this.shouldParseSkeletons?Rt(o):{}},err:null}}tryParsePluralOrSelectOptions(e,t,o,r){let n=!1;const i=[],a=new Set;let{value:s,location:l}=r;for(;;){if(0===s.length){const e=this.clonePosition();if("select"===t||!this.bumpIf("="))break;{const t=this.tryParseDecimalInteger(Qt.EXPECT_PLURAL_ARGUMENT_SELECTOR,Qt.INVALID_PLURAL_ARGUMENT_SELECTOR);if(t.err)return t;l=oo(e,this.clonePosition()),s=this.message.slice(e.offset,this.offset())}}if(a.has(s))return this.error("select"===t?Qt.DUPLICATE_SELECT_ARGUMENT_SELECTOR:Qt.DUPLICATE_PLURAL_ARGUMENT_SELECTOR,l);"other"===s&&(n=!0),this.bumpSpace();const r=this.clonePosition();if(!this.bumpIf("{"))return this.error("select"===t?Qt.EXPECT_SELECT_ARGUMENT_SELECTOR_FRAGMENT:Qt.EXPECT_PLURAL_ARGUMENT_SELECTOR_FRAGMENT,oo(this.clonePosition(),this.clonePosition()));const c=this.parseMessage(e+1,t,o);if(c.err)return c;const d=this.tryParseArgumentClose(r);if(d.err)return d;i.push([s,{value:c.val,location:oo(r,this.clonePosition())}]),a.add(s),this.bumpSpace(),({value:s,location:l}=this.parseIdentifierIfPossible())}return 0===i.length?this.error("select"===t?Qt.EXPECT_SELECT_ARGUMENT_SELECTOR:Qt.EXPECT_PLURAL_ARGUMENT_SELECTOR,oo(this.clonePosition(),this.clonePosition())):this.requiresOtherClause&&!n?this.error(Qt.MISSING_OTHER_CLAUSE,oo(this.clonePosition(),this.clonePosition())):{val:i,err:null}}tryParseDecimalInteger(e,t){let o=1;const r=this.clonePosition();this.bumpIf("+")||this.bumpIf("-")&&(o=-1);let n=!1,i=0;for(;!this.isEOF();){const e=this.char();if(!(e>=48&&e<=57))break;n=!0,i=10*i+(e-48),this.bump()}const a=oo(r,this.clonePosition());return n?(i*=o,Number.isSafeInteger(i)?{val:i,err:null}:this.error(t,a)):this.error(e,a)}offset(){return this.position.offset}isEOF(){return this.offset()===this.message.length}clonePosition(){return{offset:this.position.offset,line:this.position.line,column:this.position.column}}char(){const e=this.position.offset;if(e>=this.message.length)throw Error("out of bound");const t=this.message.codePointAt(e);if(void 0===t)throw Error(`Offset ${e} is at invalid UTF-16 code unit boundary`);return t}error(e,t){return{val:null,err:{kind:e,message:this.message,location:t}}}bump(){if(this.isEOF())return;const e=this.char();10===e?(this.position.line+=1,this.position.column=1,this.position.offset+=1):(this.position.column+=1,this.position.offset+=e<65536?1:2)}bumpIf(e){if(this.message.startsWith(e,this.offset())){for(let t=0;t<e.length;t++)this.bump();return!0}return!1}bumpUntil(e){const t=this.offset(),o=this.message.indexOf(e,t);return o>=0?(this.bumpTo(o),!0):(this.bumpTo(this.message.length),!1)}bumpTo(e){if(this.offset()>e)throw Error(`targetOffset ${e} must be greater than or equal to the current offset ${this.offset()}`);for(e=Math.min(e,this.message.length);;){const t=this.offset();if(t===e)break;if(t>e)throw Error(`targetOffset ${e} is at invalid UTF-16 code unit boundary`);if(this.bump(),this.isEOF())break}}bumpSpace(){for(;!this.isEOF()&&mo(this.char());)this.bump()}peek(){if(this.isEOF())return null;const e=this.char(),t=this.offset();return this.message.charCodeAt(t+(e>=65536?2:1))??null}}function uo(e){return e>=97&&e<=122||e>=65&&e<=90}function po(e){return 45===e||46===e||e>=48&&e<=57||95===e||e>=97&&e<=122||e>=65&&e<=90||183==e||e>=192&&e<=214||e>=216&&e<=246||e>=248&&e<=893||e>=895&&e<=8191||e>=8204&&e<=8205||e>=8255&&e<=8256||e>=8304&&e<=8591||e>=11264&&e<=12271||e>=12289&&e<=55295||e>=63744&&e<=64975||e>=65008&&e<=65533||e>=65536&&e<=983039}function mo(e){return e>=9&&e<=13||32===e||133===e||e>=8206&&e<=8207||8232===e||8233===e}function _o(e){e.forEach(e=>{if(delete e.location,Gt(e)||Wt(e))for(const t in e.options)delete e.options[t].location,_o(e.options[t].value);else jt(e)&&qt(e.style)||(Ft(e)||Ut(e))&&Kt(e.style)?delete e.style.location:Zt(e)&&_o(e.children)})}function fo(e,t={}){t={shouldParseSkeletons:!0,requiresOtherClause:!0,...t};const o=new ho(e,t).parse();if(o.err){const e=SyntaxError(Qt[o.err.kind]);throw e.location=o.err.location,e.originalMessage=o.err.message,e}return t?.captureLocation||_o(o.val),o.val}let go=function(e){return e.MISSING_VALUE="MISSING_VALUE",e.INVALID_VALUE="INVALID_VALUE",e.MISSING_INTL_API="MISSING_INTL_API",e}({});class vo extends Error{code;originalMessage;constructor(e,t,o){super(e),this.code=t,this.originalMessage=o}toString(){return`[formatjs Error: ${this.code}] ${this.message}`}}class bo extends vo{constructor(e,t,o,r){super(`Invalid values for "${e}": "${t}". Options are "${Object.keys(o).join('", "')}"`,go.INVALID_VALUE,r)}}class yo extends vo{constructor(e,t,o){super(`Value for "${e}" must be of type ${t}`,go.INVALID_VALUE,o)}}class wo extends vo{constructor(e,t){super(`The intl string context variable "${e}" was not provided to the string "${t}"`,go.MISSING_VALUE,t)}}let ko=function(e){return e[e.literal=0]="literal",e[e.object=1]="object",e}({});function xo(e){return"function"==typeof e}function zo(e,t,o,r,n,i,a){if(1===e.length&&Dt(e[0]))return[{type:ko.literal,value:e[0].value}];const s=[];for(const l of e){if(Dt(l)){s.push({type:ko.literal,value:l.value});continue}if(Vt(l)){"number"==typeof i&&s.push({type:ko.literal,value:o.getNumberFormat(t).format(i)});continue}const{value:e}=l;if(!n||!(e in n))throw new wo(e,a);let c=n[e];if(Ot(l))c&&"string"!=typeof c&&"number"!=typeof c&&"bigint"!=typeof c||(c="string"==typeof c||"number"==typeof c||"bigint"==typeof c?String(c):""),s.push({type:"string"==typeof c?ko.literal:ko.object,value:c});else{if(Ft(l)){const e="string"==typeof l.style?r.date[l.style]:Kt(l.style)?l.style.parsedOptions:void 0;s.push({type:ko.literal,value:o.getDateTimeFormat(t,e).format(c)});continue}if(Ut(l)){const e="string"==typeof l.style?r.time[l.style]:Kt(l.style)?l.style.parsedOptions:r.time.medium;s.push({type:ko.literal,value:o.getDateTimeFormat(t,e).format(c)});continue}if(jt(l)){const e="string"==typeof l.style?r.number[l.style]:qt(l.style)?l.style.parsedOptions:void 0;if(e&&e.scale){const t=e.scale||1;if("bigint"==typeof c){if(!Number.isInteger(t))throw new TypeError(`Cannot apply fractional scale ${t} to bigint value. Scale must be an integer when formatting bigint.`);c*=BigInt(t)}else c*=t}s.push({type:ko.literal,value:o.getNumberFormat(t,e).format(c)});continue}if(Zt(l)){const{children:e,value:c}=l,d=n[c];if(!xo(d))throw new yo(c,"function",a);let h=d(zo(e,t,o,r,n,i).map(e=>e.value));Array.isArray(h)||(h=[h]),s.push(...h.map(e=>({type:"string"==typeof e?ko.literal:ko.object,value:e})))}if(Gt(l)){const e=c,i=(Object.prototype.hasOwnProperty.call(l.options,e)?l.options[e]:void 0)||l.options.other;if(!i)throw new bo(l.value,c,Object.keys(l.options),a);s.push(...zo(i.value,t,o,r,n));continue}if(Wt(l)){const e=`=${c}`;let i=Object.prototype.hasOwnProperty.call(l.options,e)?l.options[e]:void 0;if(!i){if(!Intl.PluralRules)throw new vo('Intl.PluralRules is not available in this environment.\nTry polyfilling it using "@formatjs/intl-pluralrules"\n',go.MISSING_INTL_API,a);const e="bigint"==typeof c?Number(c):c,r=o.getPluralRules(t,{type:l.pluralType}).select(e-(l.offset||0));i=(Object.prototype.hasOwnProperty.call(l.options,r)?l.options[r]:void 0)||l.options.other}if(!i)throw new bo(l.value,c,Object.keys(l.options),a);const d="bigint"==typeof c?Number(c):c;s.push(...zo(i.value,t,o,r,n,d-(l.offset||0)));continue}}}return(l=s).length<2?l:l.reduce((e,t)=>{const o=e[e.length-1];return o&&o.type===ko.literal&&t.type===ko.literal?o.value+=t.value:e.push(t),e},[]);var l}function Co(e,t){return t?Object.keys(e).reduce((o,r)=>{var n,i;return o[r]=(n=e[r],(i=t[r])?{...n,...i,...Object.keys(n).reduce((e,t)=>(e[t]={...n[t],...i[t]},e),{})}:n),o},{...e}):e}function Eo(e){return{create:()=>({get:t=>e[t],set(t,o){e[t]=o}})}}class Po{ast;locales;resolvedLocale;formatters;formats;message;formatterCache={number:{},dateTime:{},pluralRules:{}};constructor(e,t=Po.defaultLocale,o,r){if(this.locales=t,this.resolvedLocale=Po.resolveLocale(t),"string"==typeof e){if(this.message=e,!Po.__parse)throw new TypeError("IntlMessageFormat.__parse must be set to process `message` of type `string`");const{...t}=r||{};this.ast=Po.__parse(e,{...t,locale:this.resolvedLocale})}else this.ast=e;if(!Array.isArray(this.ast))throw new TypeError("A message must be provided as a String or AST.");this.formats=Co(Po.formats,o),this.formatters=r&&r.formatters||function(e={number:{},dateTime:{},pluralRules:{}}){return{getNumberFormat:_t((...e)=>new Intl.NumberFormat(...e),{cache:Eo(e.number),strategy:xt.variadic}),getDateTimeFormat:_t((...e)=>new Intl.DateTimeFormat(...e),{cache:Eo(e.dateTime),strategy:xt.variadic}),getPluralRules:_t((...e)=>new Intl.PluralRules(...e),{cache:Eo(e.pluralRules),strategy:xt.variadic})}}(this.formatterCache)}format=e=>{const t=this.formatToParts(e);if(1===t.length)return t[0].value;const o=t.reduce((e,t)=>(e.length&&t.type===ko.literal&&"string"==typeof e[e.length-1]?e[e.length-1]+=t.value:e.push(t.value),e),[]);return o.length<=1?o[0]||"":o};formatToParts=e=>zo(this.ast,this.locales,this.formatters,this.formats,e,void 0,this.message);resolvedOptions=()=>({locale:this.resolvedLocale?.toString()||Intl.NumberFormat.supportedLocalesOf(this.locales)[0]});getAst=()=>this.ast;static memoizedDefaultLocale=null;static get defaultLocale(){return Po.memoizedDefaultLocale||(Po.memoizedDefaultLocale=(new Intl.NumberFormat).resolvedOptions().locale),Po.memoizedDefaultLocale}static resolveLocale=e=>{if(void 0===Intl.Locale)return;const t=Intl.NumberFormat.supportedLocalesOf(e);return t.length>0?new Intl.Locale(t[0]):new Intl.Locale("string"==typeof e?e:e[0])};static __parse=fo;static formats={number:{integer:{maximumFractionDigits:0},currency:{style:"currency"},percent:{style:"percent"}},date:{short:{month:"numeric",day:"numeric",year:"2-digit"},medium:{month:"short",day:"numeric",year:"numeric"},long:{month:"long",day:"numeric",year:"numeric"},full:{weekday:"long",month:"long",day:"numeric",year:"numeric"}},time:{short:{hour:"numeric",minute:"numeric"},medium:{hour:"numeric",minute:"numeric",second:"numeric"},long:{hour:"numeric",minute:"numeric",second:"numeric",timeZoneName:"short"},full:{hour:"numeric",minute:"numeric",second:"numeric",timeZoneName:"short"}}}}const So={cs:{common:{save:"Uložit",saving:"Ukládání...",cancel:"Zrušit",delete:"Smazat",close:"Zavřít",add:"Přidat",discard:"Zahodit",loading:"Načítání..."},grid:{heatmap_toggle:"Heatmapa",heatmap_needs_firmware:"Heatmapa vyžaduje firmware 1.3.0 nebo novější.",heatmap_no_memory:"Heatmapa není na tomto zařízení dostupná — nedostatek paměti."},furniture:{armchair:"Křeslo",bath:"Vana",bedside_table:"Noční stolek",bidet:"Bidet",car:"Auto",carpet:"Koberec",cat_bed:"Pelíšek pro kočku",cabinet:"Skříňka",ceiling_fan:"Stropní ventilátor",counter:"Pracovní deska",cupboard:"Skříň",desk:"Psací stůl",dog_bed:"Pelíšek pro psa",dining_table:"Jídelní stůl",door_left_swing:"Dveře (levé)",door_right_swing:"Dveře (pravé)",double_bed:"Manželská postel",fridge:"Lednice",hot_tub:"Vířivka",kitchen_island:"Kuchyňský ostrůvek",lamp:"Lampa",oven_stove:"Trouba / sporák",plant:"Rostlina",pool:"Bazén",round_table:"Kulatý stůl",shower:"Sprcha",side_table:"Odkládací stolek",single_bed:"Jednolůžková postel",sliding_door:"Posuvné dveře",sofa_2_seat:"Pohovka (dvoumístná)",sofa_3_seat:"Pohovka (třímístná)",speaker:"Reproduktor",tv:"Televize",washbasin:"Umyvadlo",washing_machine:"Pračka",toilet:"Toaleta",window:"Okno",custom_icon:"Vlastní ikona",custom:"Vlastní",search_placeholder:"Hledat nábytek...",remove:"Odebrat"},text_label:{label:"Textový popisek",add:"Přidat textový popisek",default_text:"Popisek",text:"Text",font:"Písmo",size_cm:"Velikost (cm)",bold:"Tučné",italic:"Kurzíva",align:"Zarovnání",align_left:"Zarovnat vlevo",align_center:"Zarovnat na střed",align_right:"Zarovnat vpravo",text_color:"Barva textu",auto_color:"Automaticky",background:"Pozadí",no_background:"Žádné",remove:"Odebrat popisek"},corners:{front_left:"Vpředu vlevo",front_right:"Vpředu vpravo",back_right:"Vzadu vpravo",back_left:"Vzadu vlevo",left_wall:"levá stěna",right_wall:"pravá stěna",front_wall:"přední stěna",back_wall:"zadní stěna"},wizard:{how_calibration_works:"Jak funguje kalibrace místnosti",calibrate_room_size:"Kalibrovat velikost místnosti",begin_marking:"Spustit kalibraci",mark_corner:"Označit: {corner}",recording:"Nahrávání... {current} s / {total} s",paused:"Pozastaveno — musí být viditelný právě jeden cíl",stand_still:"Stůjte nehybně",no_target:"Nebyl detekován žádný cíl. Ujistěte se, že jste pro senzor viditelní.",multiple_targets:"Detekováno více cílů. Během kalibrace by měla být v místnosti pouze jedna osoba.",save_prompt:"Kliknutím na Uložit uložíte kalibraci této místnosti, nebo klikněte na roh výše a označte jej znovu.",save_failed:"Uložení kalibrace se nezdařilo. Zkontrolujte, že je zařízení online, a zkuste to znovu.",invalid_corners:"Označené rohy netvoří platný tvar místnosti. Označte rohy znovu a zkuste to znovu.",walk_instruction_full:"<strong>Přejděte postupně ke každému rohu</strong> (1 → 2 → 3 → 4) a klikněte na Označit. Několik sekund stůjte nehybně, aby se na vás senzor mohl zaměřit.",cant_reach:"<strong>Nemůžete se dostat k rohu?</strong> Postavte se co nejblíže a do polí pro odsazení zadejte vzdálenost od každé stěny — jako u rohu 4 na obrázku výše, kde překáží rostlina.",corner_sensor_hint:"V tomto příkladu je senzor namontovaný v rohu 2, ale může být kdekoli. Můžete stát přímo před ním.",walk_instruction:"Přejděte ke každému rohu místnosti a klikněte na Označit. Senzor bude po dobu {duration} sekund zaznamenávat vaši polohu.",corner_step:"Roh {index}/4: Přejděte k rohu {corner}",distance_from:"Vzdálenost od:",distance_from_side:"{wall} (cm)",front_wall_label:"Přední stěna (strana senzoru)",back_wall_label:"Zadní stěna",sensor:"Senzor",no_presence:"Žádná přítomnost",dont_show_again:"Příště nezobrazovat"},dialogs:{delete_calibration_title:"Smazat kalibraci místnosti?",delete_calibration_body:"Tímto se také smažou všechny detekční zóny a nábytek. Tuto akci nelze vrátit zpět.",unsaved_changes:"Máte neuložené změny",unsaved_changes_body:"Pokud odejdete bez použití změn, vaše změny se ztratí.",backup_configuration:"Zálohovat konfiguraci",restore_configuration:"Obnovit konfiguraci",no_configurations:"Žádné uložené konfigurace.",configuration_name:"Název konfigurace"},menu:{settings:"Nastavení",room_calibration:"Kalibrovat velikost místnosti",delete_calibration:"Smazat kalibraci místnosti",detection_zones:"Detekční zóny",furniture:"Nábytek",overlays:"Překryvy"},settings:{title:"Nastavení",detection_ranges:"Detekční rozsahy",sensor_calibration:"Kalibrace senzoru",entities:"Entity",target_sensor:"Senzor cílů",stuck_target_timeout:"Časový limit zaseknutého cíle",assisted_clear:"Uvolnění pomocí senzoru",assisted_clear_enabled:"Povoleno",assisted_clear_timeout:"Prodleva uvolnění",static_sensor:"Statický senzor",motion_sensor:"Pohybový senzor",environmental:"Prostředí",auto:"Automaticky",max_distance:"Max. vzdálenost",min_distance:"Min. vzdálenost",presence_timeout:"Časový limit přítomnosti",trigger_threshold:"Práh spuštění",renew_threshold:"Práh obnovení",illuminance_offset:"Korekce osvětlení",humidity_offset:"Korekce vlhkosti",temperature_offset:"Korekce teploty",presence_delay:"Prodleva přítomnosti",furthest_point:"Aktuální nejvzdálenější bod od senzoru:",logging:"Protokolování",log_system:"Systém",log_epp:"Zónový engine",log_led:"LED",log_networking:"Síť",log_ble:"Bluetooth",log_co2:"CO2",led_and_relay:"LED a relé",led:"LED",led_mode:"Režim",led_brightness:"Jas",led_presence_color:"Barva obsazenosti",manual_control:"Ruční ovládání",presence:"Obsazenost",environmental_presence:"Prostředí + obsazenost",relay:"Relé",relay_trigger_mode:"Režim spouštění",relay_contact_mode:"Režim kontaktu",relay_disabled:"Zakázáno",relay_motion:"Pouze pohyb",relay_presence:"Pouze přítomnost",relay_occupancy:"Obsazenost",relay_normally_open:"Spínací (NO)",relay_normally_closed:"Rozpínací (NC)",update_rate:"Frekvence aktualizace",reset_to_default:"Obnovit výchozí",show_info:"Zobrazit informace",frequency:{"5hz":"5 Hz","2hz":"2 Hz","1hz":"1 Hz","0_5hz":"0,5 Hz"},log_level:{none:"Žádné",error:"Chyba",warning:"Varování",info:"Info",debug:"Ladění"}},sidebar:{detection_zones:"Detekční zóny",live_overview:"Živý přehled",add_zone:"Přidat zónu",rest_of_room:"Zbytek místnosti",room:"Místnost"},zones:{type:"Typ",default:"Výchozí",bed:"Postel",seating:"Sezení",transit:"Průchozí",custom:"Vlastní",trigger:"Spuštění",renew:"Obnovení",presence_timeout:"Časový limit přítomnosti",handoff_timeout:"Časový limit předání",seconds_suffix:"s",remove_zone:"Odebrat zónu"},color:{choose:"Vybrat barvu",custom:"Vlastní barva…",in_use:"Používá ji jiná zóna",preset:"Barva {n}"},overlays:{entry_exit:"Vstup / Výstup",interference:"Rušení",suppress:"Potlačit",click_to_paint:"Kliknutím kreslíte"},live:{presence:"Přítomnost",detected:"Detekováno",clear:"Volno",environment:"Prostředí",occupancy:"Obsazenost",static_presence:"Statická přítomnost",motion_presence:"Pohybová přítomnost",target_presence:"Přítomnost cíle",mmwave:"mmWave",delete_target:"Smazat cíl",mark_interference:"Označit jako zdroj rušení",suppress_detection:"Potlačit detekci",grid_dimensions:"{width, number, ::.0} m × {depth, number, ::.0} m · Nejvzdálenější bod: {furthest, number, ::.0} m",illuminance_value:"{value, number, ::.0} lux",temperature_value:"{value, number, ::.0} °C",humidity_value:"{value, number, ::.0} %",co2_value:"{value, number} ppm",debug:{detection_events:"Události detekce",copy_all:"Kopírovat vše",clear:"Vymazat",waiting_for_events:"Čekání na události...",static:"Statická",motion:"Pohyb",occ:"Obs",on:"zap",off:"vyp",active:"aktivní",pending:"čeká",inactive:"neaktivní",occupied:"obsazeno",room:"Místnost",no_targets:"žádné cíle",all_clear:"vše volné",zone_n:"Zóna {n}",target_n:"Cíl {n}"},events:{static_active:"Detekována statická přítomnost",static_fading:"Statická přítomnost slábne…",static_cleared:"Statická přítomnost skončila",motion_active:"Detekována pohybová přítomnost",motion_fading:"Pohybová přítomnost slábne…",motion_cleared:"Pohybová přítomnost skončila",zone_occupied:"{zone}: obsazeno",zone_clearing:"{zone}: uvolňuje se…",zone_cleared:"{zone}: uvolněno",zone_cleared_handoff:"{zone}: uvolněno (předání)",zone_cleared_overlay:"{zone}: uvolněno (opuštění překryvu)",zone_cleared_force:"{zone}: uvolněno (s pomocí senzoru)",room_occupied:"Místnost obsazena",room_empty:"Místnost prázdná",mmwave_on:"mmWave zapnuto",mmwave_off:"mmWave vypnuto",force_clear:"{zone}: vynuceně uvolněno (oba senzory nečinné)",stuck_dismiss:"{target} automaticky zrušen (zaseknutý {secs} s)",target_entered:"{target} vstoupil: {zone}",target_left:"{target} opustil místnost",target_moved:"{target} se přesunul {from} → {to}",dropped:"{n, plural, one {# událost zahozena} few {# události zahozeny} many {# události zahozeno} other {# událostí zahozeno}}"}},entities:{room_level:"Úroveň místnosti",zone_level:"Úroveň zóny",target_level:"Úroveň cíle",occupancy:"Obsazenost",static_presence:"Statická přítomnost",motion_presence:"Pohybová přítomnost",target_presence:"Přítomnost cíle",mmwave:"Přítomnost mmWave",target_count:"Počet cílů",zone_presence:"Přítomnost",zone_target_count:"Počet cílů",xy:"Poloha XY",active:"Aktivní",target_signal:"Signál",target_zone:"Zóna",illuminance:"Osvětlení",humidity:"Vlhkost",temperature:"Teplota",co2:"CO₂"},info:{occupancy:"Kombinovaná obsazenost ze všech zdrojů — PIR pohyb, statická přítomnost mmWave a sledování zón. Zobrazuje „detekováno“, pokud přítomnost zjistí kterýkoli zdroj.",static_presence:"Radar mmWave detekuje nehybné osoby měřením mikropohybů, jako je dýchání. Funguje i přes nábytek a přikrývky.",motion_presence:"Pasivní infračervený senzor (PIR) detekuje pohyb snímáním tělesného tepla. Rychlá reakce, ale spouští se pouze při pohybu, ne při nehybné přítomnosti.",target_presence:"Zda je radarem mmWave aktivně sledován nějaký cíl. Detekováno, když je hlášen alespoň jeden cílový bod.",mmwave:"Kombinuje statickou přítomnost mmWave a sledování cílů, ignoruje PIR pohybový senzor. Detekováno, když je zapnutý některý ze zdrojů, kromě případu, kdy je statický senzor vypnutý a sledování cílů je pouze ve stavu čekání.",zone_occupancy:"Obsazenost zóny {slot}. Aktuálně detekováno: {count} {count, plural, one {cíl} few {cíle} many {cíle} other {cílů}}. Citlivost určuje, kolik po sobě jdoucích snímků je potřeba k potvrzení přítomnosti.",rest_of_room_occupancy:"Pokrývá celou místnost mimo všechny definované zóny. Aktuálně detekováno: {count} {count, plural, one {cíl} few {cíle} many {cíle} other {cílů}}.",target_auto_range:"Automaticky nastaví max. vzdálenost podle rozměrů místnosti.",target_max_distance:"Maximální detekční vzdálenost senzoru cílů (LD2450). Hardwarový limit: 6 m.",stuck_target_timeout:"Automaticky zruší cíl hlášený na přesně stejných souřadnicích po tento počet sekund. Nastavením na 0 tuto funkci vypnete. Výchozí hodnota je 300 sekund (5 minut).",assisted_clear_enabled:"Když je zapnuto, čekající zóny se uvolní, jakmile pohybový i statický senzor hlásí nečinnost a žádná zóna není obsazena. Vypnutím se budete spoléhat pouze na vlastní časový limit uvolnění každé zóny.",assisted_clear_timeout:"Ochranná doba (v sekundách), po kterou musí místnost zůstat prázdná — oba senzory nečinné a žádná obsazená zóna — než se čekající zóny uvolní. 0 uvolní okamžitě. Rozsah 0–600 s.",static_min_distance:"Minimální detekční vzdálenost statického senzoru.",static_max_distance:"Maximální detekční vzdálenost statického senzoru. Hardwarový limit: 16 m.",motion_timeout:"Doba od posledního pohybu, než pohybový senzor přestane hlásit pohyb.",static_timeout:"Doba od poslední statické detekce, než senzor přestane hlásit přítomnost.",trigger_threshold:"Minimální síla signálu potřebná k prvotní detekci statické přítomnosti. Vyšší = obtížnější spuštění.",renew_threshold:"Minimální síla signálu potřebná k udržení detekce statické přítomnosti. Vyšší = obtížnější obnovení.",illuminance_offset:"Upraví naměřené osvětlení o pevnou hodnotu.",humidity_offset:"Upraví naměřenou vlhkost o pevnou hodnotu.",temperature_offset:"Upraví naměřenou teplotu o pevnou hodnotu.",presence_delay:"Prodleva před nahlášením přítomnosti po prvotní detekci. Pomáhá filtrovat krátké falešné poplachy.",room_occupancy:"Kombinovaná obsazenost místnosti ze všech senzorů.",room_static:"Detekce statické přítomnosti mmWave.",room_motion:"Detekce pohybu PIR.",room_target_presence:"Zda je aktivně sledován nějaký cíl.",room_mmwave:"Kombinovaná statická mmWave + sledování cílů, ignoruje PIR pohyb. Vypnuto, když čeká pouze sledování cílů a statická přítomnost je neaktivní.",room_target_count:"Počet cílů detekovaných v místnosti.",zone_presence:"Obsazenost jednotlivých zón na základě sledování cílů.",zone_target_count:"Počet cílů v každé zóně.",xy:"Souřadnice XY namapované na mřížku místnosti.",active:"Zda každý slot cíle aktivně sleduje.",target_signal:"Síla signálu pro každý cíl (vyšší = silnější detekce).",target_zone:"Ve které zóně se každý cíl aktuálně nachází.",illuminance:"Senzor osvětlení BH1750.",humidity:"Senzor vlhkosti SHTC3.",temperature:"Senzor teploty SHTC3.",co2:"Senzor CO₂ SCD40 (volitelný modul).",log_system:"Protokoly frameworku: OTA, API, mDNS, I2C, ovladače senzorů a řídicí entity. Nezahrnuje aktualizace zón/cílů — ty jsou pod Zónovým enginem.",log_epp:"Protokoly zónového enginu — detekce zón, sledování cílů, konfigurace a stavy entit zón/cílů/pohybu.",log_led:"Protokoly řídicího skriptu LED — přechody mezi režimy a rozhodovací strom.",log_networking:"Protokoly připojení WiFi nebo Ethernet a DHCP.",log_ble:"Protokoly skeneru a proxy Bluetooth Low Energy.",log_co2:"Protokoly senzoru CO2 (SCD4x).",led_mode:"Řídí chování RGB LED. Ruční ovládání vypne automatickou LED a umožní vám ji ovládat jako standardní entitu světla v HA.",led_brightness:"Násobitel jasu RGB LED v automatických režimech.",led_presence_color:"Barva používaná pro indikaci obsazenosti, když je LED v režimu Obsazenost nebo Prostředí + obsazenost.",relay_trigger_mode:"Co aktivuje relé. Zakázáno ponechá relé pod ručním ovládáním přes přepínač relé. Jakýkoli jiný režim automaticky sleduje zvolený signál přítomnosti a přepíše ruční ovládání.",relay_contact_mode:"Spínací kontakt sepne relé při spuštění (typické „aktivní = sepnuto“). Rozpínací kontakt jej naopak rozepne — užitečné pro zabezpečovací obvody, které v klidovém stavu očekávají uzavřenou smyčku."},dimensions:{width_cm:"Š (cm)",height_cm:"V (cm)",rotation:"Otoč."},protocol:{firmware_behind:"Firmware tohoto senzoru je potřeba aktualizovat, aby fungoval s touto verzí integrace.",firmware_ahead:"Firmware tohoto senzoru je novější než integrace. Aktualizujte integraci Everything Presence Pro Grid přes HACS.",open_hacs:"Otevřít v HACS",unavailable:"Zařízení je offline — verzi firmwaru nelze zjistit.",update_firmware:"Aktualizovat firmware"},tabs:{device_configuration:"Konfigurace zařízení",device_configuration_short:"Konfig.",flash_firmware:"Nahrát firmware",flash_firmware_short:"Nahrát",device_groups:"Skupiny zařízení",device_groups_short:"Skupiny",help:"Otevřít uživatelskou příručku"},flasher:{title:"Nahrát firmware",devices_on_network:"Nainstalovaná zařízení",no_devices:"Nejsou nainstalována žádná zařízení Everything Presence Pro.",no_eppgrid_devices:"Nebyla nalezena žádná zařízení s firmwarem Everything Presence Pro Grid.",flash_from_tab:"Nahrajte firmware do zařízení na kartě Nahrát firmware",offline:"Offline",online:"Online",usb_title:"Připojení USB",usb_flash_title:"Nahrát firmware",usb_flash_desc:"Nainstalujte nebo aktualizujte firmware a nastavte WiFi.",usb_wifi_title:"Nastavit WiFi",usb_wifi_desc:"Nastavte WiFi na již nahraném zařízení.",usb_browser_warning:"Nahrávání přes USB vyžaduje prohlížeč Chrome nebo Edge.",usb_insecure_warning:"Nahrávání přes USB vyžaduje zabezpečené (HTTPS) připojení k Home Assistant — přes prostý HTTP je blokováno.",usb_web_flasher_link:"Nahrát rovnou z prohlížeče",select_variant:"Vyberte variantu firmwaru:",cancelling:"Rušení...",wifi:"WiFi",ethernet:"Ethernet",go_to_config:"Přejít na Konfiguraci zařízení",flash_usb:"Nahrát firmware přes USB",loading:"Načítání zařízení...",configure_wifi:"Nastavit WiFi",scan:"Hledat znovu",select_a_network:"Vyberte síť...",manual_ssid:"Zadat SSID ručně (skrytá síť)",enter_ssid:"Zadejte SSID",wifi_password:"Heslo WiFi",show_password:"Zobrazit heslo",ip_address:"IP adresa: {ip}",connect:"Připojit",usb_flash:"Nahrát přes USB",usb_step_connecting:"Připojování k zařízení...",usb_step_wifi_check:"Kontrola stávajícího připojení WiFi...",usb_step_flashing:"Nahrávání firmwaru {version}...",usb_step_scanning:"Vyhledávání sítí WiFi...",wifi_scan_hint:"Pokud je zařízení již připojeno k WiFi, vyhledávání nemusí fungovat. Použijte místo toho ruční zadání SSID.",usb_step_provisioning:"Nastavování WiFi...",usb_step_wifi_connecting:"Připojování k WiFi...",usb_step_reading_ip:"Zjišťování IP adresy zařízení...",usb_step_adding:"Přidávání zařízení...",wifi_configured:"WiFi úspěšně nastavena",go_to_integrations:"Přejít na Integrace",copy_ip:"Kopírovat IP adresu",retry_ha_add:"Zkusit znovu přidat do Home Assistant",flash_another:"Nahrát další zařízení",ha_add:{adding:"Přidávání zařízení do Home Assistant...",retrying:"Čekání, až se zařízení připojí (pokus {attempt} z {max})...",added:"Zařízení přidáno do Home Assistant",already_added:"Zařízení už je v Home Assistant",needs_auth:"Zařízení bylo nalezeno — dokončete nastavení v Integracích a zadejte šifrovací klíč",cannot_connect:"Zařízení se v síti nepodařilo najít. Zkontrolujte, že jsou Home Assistant a zařízení ve stejné síti.",failed:"Přidání se nezdařilo: {reason}"},usb_ethernet_complete:"Firmware úspěšně nahrán!",usb_ethernet_hint:"Připojte zařízení k síti ethernetovým kabelem. ESPHome jej automaticky rozpozná.",go_to_devices:"Přejít na Nastavení → Zařízení",usb_retry:"Zkusit znovu",confirm_delete_title:"Odstranit starou konfiguraci?",confirm_delete_message:"Toto zařízení bylo dříve nastaveno s původním firmwarem. Stará konfigurace bude z Home Assistant odstraněna.",update:"Aktualizovat",update_all:"Aktualizovat vše",integration_update:"Je potřeba aktualizace integrace",integration_outdated_title:"Vyžadována aktualizace integrace",integration_outdated_body:"Jedno nebo více zařízení má firmware novější než tato verze integrace. Aktualizujte integraci Everything Presence Pro Grid, abyste obnovili plnou funkčnost.",open_hacs:"Otevřít v HACS",ota_retry:"Zkusit znovu",ota_download_github:"Stáhnout z GitHubu",cancel:"Zrušit",start_over:"Začít znovu",cancelled_ip_hint:"Zařízení je dostupné na {ip} — mělo by se brzy objevit v detekci Home Assistant.",errors:{start_failed:"Nepodařilo se spustit aktualizaci. Je zařízení online?",firmware_not_published:"Tato verze firmwaru zatím není k dispozici ke stažení. Vydání se pravděpodobně stále publikuje — zkuste to prosím za chvíli znovu.",connect_failed:"Připojení k zařízení se nezdařilo",connection_lost:"Během aktualizace došlo ke ztrátě připojení",update_timeout:"Vypršel časový limit aktualizace",update_failed_generic:"Aktualizace se nezdařila",ota_failed_version_unchanged:"Aktualizace se nezdařila — verze firmwaru se nezměnila",ota_timeout:"Vypršel časový limit aktualizace OTA",ota_device_error:"Aktualizace se nezdařila: {message}",ota_download_unreachable:"Zařízení nemohlo stáhnout firmware z Home Assistanta — nepodařilo se mu spojit se serverem pro stahování ({message}). Zkuste „Stáhnout z GitHubu“ nebo zkontrolujte, že zařízení dosáhne na Home Assistant ve vaší síti.",ota_download_unreachable_direct:"Zařízení nemohlo stáhnout firmware — nepodařilo se mu spojit se serverem pro stahování ({message}). Stahuje přímo z GitHubu, zkontrolujte proto přístup tohoto zařízení k internetu.",flash_cancelled:"Nahrávání zrušeno",timeout:"Časový limit vypršel",aborted:"Zrušeno",port_closed:"Sériové připojení bylo ztraceno — zařízení mohlo být odpojeno. Znovu jej připojte a zkuste to znovu."}},device_setup:{title:"Nastavte své zařízení",name_help:"Dejte tomuto senzoru název, který poznáte, například „Obývací pokoj“.",name_label:"Název zařízení",area_help:"Přiřaďte jej k oblasti, aby se seskupil se zbytkem dané místnosti.",area_label:"Oblast",skip_and_finish:"Přeskočit a dokončit",finish:"Dokončit",recreate_entity_ids:"Znovu vytvořit ID entit podle nového názvu"},connection:{connecting:"Připojování k zařízení...",offline:"Zařízení je offline",failed:"K zařízení se nelze připojit",client_count:"Aktuálně {count, plural, one {je připojen # klient} few {jsou připojeni # klienti} many {je připojeno # klienta} other {je připojeno # klientů}}.",check_connections:"Zkontrolujte další karty prohlížeče s otevřeným tímto panelem, relace protokolů ESPHome nebo další instance Home Assistant.",retry:"Zkusit znovu",ha_reconnecting:"Opětovné připojování k Home Assistant..."},usb:{errors:{serial_port_busy:"Sériový port je zaneprázdněn předchozí operací. Obnovte stránku a zkuste to znovu.",serial_port_unavailable:"Sériový port není k dispozici",device_disconnected:"Zařízení odpojeno. Odpojte jej, znovu připojte a zkuste to znovu.",manifest_download_failed:"Nepodařilo se stáhnout manifest firmwaru",file_download_failed:"Nepodařilo se stáhnout soubor firmwaru: {file}",port_open_failed:"Nepodařilo se otevřít sériový port. Odpojte zařízení, znovu jej připojte a zkuste to znovu.",no_device_response:"Žádná odpověď od zařízení — může mít nahraný ethernetový firmware, který nepodporuje nastavení WiFi.",base_url_required:"Pro stažení firmwaru je vyžadována baseUrl",flash_failed:"Nahrání firmwaru se nezdařilo."}},wifi:{errors:{provisioning_failed:"Nastavení WiFi se nezdařilo",scan_failed:"Vyhledávání WiFi se nezdařilo",connection_failed:"Připojení k WiFi se nezdařilo — zkontrolujte SSID/heslo a zkuste to znovu",error_code:"Chyba WiFi (kód {code})",invalid_command:"Neplatný příkaz — zařízení možná potřebuje restartovat (vypnout a zapnout)",unknown_command:"Neznámý příkaz",not_authorized:"Neautorizováno",ssid_too_long:"Název sítě WiFi je příliš dlouhý (max. 32 bajtů)",password_too_long:"Heslo WiFi je příliš dlouhé (max. 64 bajtů)"}},errors:{apply_layout:"Uložení rozvržení místnosti se nezdařilo. Zkontrolujte, že je zařízení online, a zkuste to znovu.",save_settings:"Uložení nastavení se nezdařilo. Zkontrolujte, že je zařízení online, a zkuste to znovu.",save_configuration:"Uložení zálohy konfigurace se nezdařilo. Zkuste to znovu.",load_configuration:"Obnovení konfigurace se nezdařilo. Může být ve starém formátu — znovu ji uložte a zkuste to znovu."},language_request:{message:"Váš jazyk Home Assistant je {language}, ale Everything Presence Pro Grid do něj zatím není přeložen.",action:"Požádat o překlad",dismiss:"Zavřít"},card:{offline:"Zařízení offline",loading:"Načítání…",uncalibrated:"Toto zařízení ještě není zkalibrováno. Otevřete panel Everything Presence Pro Grid a nastavte místnost.",no_device:"Vyberte zařízení v editoru karty.",nothing_to_show:"Zapněte mapu nebo senzory, aby se tato karta zobrazila.",heatmap_toggle:"Heatmapa",clear_heatmap:"Vymazat heatmapu",clear_heatmap_confirm:"Vymazat všechna nahromaděná data heatmapy pro toto zařízení? Tuto akci nelze vrátit zpět.",clear_heatmap_error:"Heatmapu se nepodařilo vymazat — zařízení může být offline.",clear:"Vymazat",cancel:"Zrušit",ok:"OK",editor:{device_id:"Zařízení",primary:"Primární informace",secondary:"Sekundární informace",layout:"Rozvržení",show_map:"Zobrazit mapu",show_sensors:"Zobrazit senzory",show_grid:"Zobrazit mřížku",show_furniture:"Zobrazit nábytek",show_overlays:"Zobrazit překryvy",show_heatmap:"Heatmapa",room_color:"Barva zbytku místnosti",reset_room_color:"Obnovit na automatickou",presence:"Přítomnost",zones:"Zóny",occupancy:"Obsazenost",static_presence:"Statická přítomnost",motion_presence:"Pohybová přítomnost",target_presence:"Přítomnost cíle",mmwave:"mmWave",temperature:"Teplota",humidity:"Vlhkost",illuminance:"Osvětlení",co2:"CO₂",floor_plan:"Obrázek půdorysu",floor_plan_url:"URL obrázku půdorysu",floor_plan_ratio:"Vaše místnost je {width} m × {depth} m — ořízněte půdorys na poměr {ratio} : 1, aby lícoval bez roztažení.",floor_plan_calibrate_first:"Nejdříve zkalibrujte místnost, abyste získali doporučený poměr oříznutí.",floor_plan_opacity:"Krytí půdorysu"}}},en:{common:{save:"Save",saving:"Saving...",cancel:"Cancel",delete:"Delete",close:"Close",add:"Add",discard:"Discard",loading:"Loading..."},grid:{heatmap_toggle:"Heatmap",heatmap_needs_firmware:"Heatmap needs firmware 1.3.0 or newer.",heatmap_no_memory:"Heatmap is unavailable on this device — not enough memory."},furniture:{armchair:"Armchair",bath:"Bath",bedside_table:"Bedside table",bidet:"Bidet",car:"Car",carpet:"Carpet",cat_bed:"Cat bed",cabinet:"Cabinet",ceiling_fan:"Ceiling fan",counter:"Counter",cupboard:"Cupboard",desk:"Desk",dog_bed:"Dog bed",dining_table:"Dining table",door_left_swing:"Door (left swing)",door_right_swing:"Door (right swing)",double_bed:"Double bed",fridge:"Fridge",hot_tub:"Hot tub",kitchen_island:"Kitchen island",lamp:"Lamp",oven_stove:"Oven / stove",plant:"Plant",pool:"Pool",round_table:"Round table",shower:"Shower",side_table:"Side table",single_bed:"Single bed",sliding_door:"Sliding door",sofa_2_seat:"Sofa (2 seat)",sofa_3_seat:"Sofa (3 seat)",speaker:"Speaker",tv:"TV",washbasin:"Wash basin",washing_machine:"Washing machine",toilet:"Toilet",window:"Window",custom_icon:"Custom icon",custom:"Custom",search_placeholder:"Search furniture...",remove:"Remove"},text_label:{label:"Text label",add:"Add text label",default_text:"Label",text:"Text",font:"Font",size_cm:"Size (cm)",bold:"Bold",italic:"Italic",align:"Alignment",align_left:"Align left",align_center:"Align centre",align_right:"Align right",text_color:"Text colour",auto_color:"Auto",background:"Background",no_background:"None",remove:"Remove label"},corners:{front_left:"Front-left",front_right:"Front-right",back_right:"Back-right",back_left:"Back-left",left_wall:"left wall",right_wall:"right wall",front_wall:"front wall",back_wall:"back wall"},wizard:{how_calibration_works:"How room calibration works",calibrate_room_size:"Calibrate room size",begin_marking:"Start calibration",mark_corner:"Mark {corner}",recording:"Recording... {current}s / {total}s",paused:"Paused — need exactly one target visible",stand_still:"Stand still",no_target:"No target detected. Make sure you are visible to the sensor.",multiple_targets:"Multiple targets detected. Only one person should be in the room during calibration.",save_prompt:"Click Save to store this room's calibration, or click a corner above to re-mark it.",save_failed:"Saving the calibration failed. Check that the device is online and try again.",invalid_corners:"The marked corners don't form a valid room shape. Re-mark the corners and try again.",walk_instruction_full:"<strong>Walk to each corner</strong> in order (1 → 2 → 3 → 4) and click Mark. Stand still for a few seconds so the sensor can lock on.",cant_reach:"<strong>Can't reach a corner?</strong> Stand as close as you can and enter the distance from each wall in the offset fields — like corner 4 in the diagram above, where a plant is in the way.",corner_sensor_hint:"In this example, your sensor is mounted in Corner 2, but it can be anywhere. You can stand right in front of it.",walk_instruction:"Walk to each corner of the room and click Mark. The sensor will record your position over {duration} seconds.",corner_step:"Corner {index}/4: Walk to the {corner}",distance_from:"Distance from:",distance_from_side:"{wall} (cm)",front_wall_label:"Front wall (sensor side)",back_wall_label:"Back wall",sensor:"Sensor",no_presence:"No presence",dont_show_again:"Don't show this again"},dialogs:{delete_calibration_title:"Delete room calibration?",delete_calibration_body:"This will also delete all detection zones and furniture. This cannot be undone.",unsaved_changes:"You have unsaved changes",unsaved_changes_body:"Your changes will be lost if you navigate away without applying.",backup_configuration:"Backup configuration",restore_configuration:"Restore configuration",no_configurations:"No saved configurations.",configuration_name:"Configuration name"},menu:{settings:"Settings",room_calibration:"Calibrate room size",delete_calibration:"Delete room calibration",detection_zones:"Detection zones",furniture:"Furniture",overlays:"Overlays"},settings:{title:"Settings",detection_ranges:"Detection Ranges",sensor_calibration:"Sensor Calibration",entities:"Entities",target_sensor:"Target Sensor",stuck_target_timeout:"Stuck target timeout",assisted_clear:"Sensor-assisted clear",assisted_clear_enabled:"Enabled",assisted_clear_timeout:"Clear delay",static_sensor:"Static Sensor",motion_sensor:"Motion Sensor",environmental:"Environmental",auto:"Auto",max_distance:"Max distance",min_distance:"Min distance",presence_timeout:"Presence timeout",trigger_threshold:"Trigger threshold",renew_threshold:"Renew threshold",illuminance_offset:"Illuminance offset",humidity_offset:"Humidity offset",temperature_offset:"Temperature offset",presence_delay:"Presence delay",furthest_point:"Current furthest point from sensor:",logging:"Logging",log_system:"System",log_epp:"Zone Engine",log_led:"LED",log_networking:"Network",log_ble:"Bluetooth",log_co2:"CO2",led_and_relay:"LED and Relay",led:"LED",led_mode:"Mode",led_brightness:"Brightness",led_presence_color:"Occupancy color",manual_control:"Manual Control",presence:"Occupancy",environmental_presence:"Environmental + Occupancy",relay:"Relay",relay_trigger_mode:"Trigger Mode",relay_contact_mode:"Contact Mode",relay_disabled:"Disabled",relay_motion:"Motion Only",relay_presence:"Presence Only",relay_occupancy:"Occupancy",relay_normally_open:"Normally Open (NO)",relay_normally_closed:"Normally Closed (NC)",update_rate:"Update rate",reset_to_default:"Reset to default",show_info:"Show info",frequency:{"5hz":"5 Hz","2hz":"2 Hz","1hz":"1 Hz","0_5hz":"0.5 Hz"},log_level:{none:"None",error:"Error",warning:"Warning",info:"Info",debug:"Debug"}},sidebar:{detection_zones:"Detection zones",live_overview:"Live overview",add_zone:"Add zone",rest_of_room:"Rest of room",room:"Room"},zones:{type:"Type",default:"Default",bed:"Bed",seating:"Seating",transit:"Transit",custom:"Custom",trigger:"Trigger",renew:"Renew",presence_timeout:"Presence timeout",handoff_timeout:"Handoff timeout",seconds_suffix:"s",remove_zone:"Remove zone"},color:{choose:"Choose colour",custom:"Custom colour…",in_use:"Used by another zone",preset:"Colour {n}"},overlays:{entry_exit:"Entry / Exit",interference:"Interference",suppress:"Suppress",click_to_paint:"Click to paint"},live:{presence:"Presence",detected:"Detected",clear:"Clear",environment:"Environment",occupancy:"Occupancy",static_presence:"Static presence",motion_presence:"Motion presence",target_presence:"Target presence",mmwave:"mmWave",delete_target:"Delete target",mark_interference:"Mark as interference source",suppress_detection:"Suppress detection",grid_dimensions:"{width, number, ::.0}m × {depth, number, ::.0}m · Furthest point: {furthest, number, ::.0}m",illuminance_value:"{value, number, ::.0} lux",temperature_value:"{value, number, ::.0} °C",humidity_value:"{value, number, ::.0} %",co2_value:"{value, number} ppm",debug:{detection_events:"Detection events",copy_all:"Copy all",clear:"Clear",waiting_for_events:"Waiting for events...",static:"Static",motion:"Motion",occ:"Occ",on:"on",off:"off",active:"active",pending:"pending",inactive:"inactive",occupied:"occupied",room:"Room",no_targets:"no targets",all_clear:"all clear",zone_n:"Zone {n}",target_n:"Target {n}"},events:{static_active:"Static presence detected",static_fading:"Static presence fading…",static_cleared:"Static presence cleared",motion_active:"Motion presence detected",motion_fading:"Motion presence fading…",motion_cleared:"Motion presence cleared",zone_occupied:"{zone} occupied",zone_clearing:"{zone} clearing…",zone_cleared:"{zone} cleared",zone_cleared_handoff:"{zone} cleared (handoff)",zone_cleared_overlay:"{zone} cleared (overlay exit)",zone_cleared_force:"{zone} cleared (sensor-assisted)",room_occupied:"Room occupied",room_empty:"Room empty",mmwave_on:"mmWave on",mmwave_off:"mmWave off",force_clear:"{zone} force-cleared (both sensors idle)",stuck_dismiss:"{target} auto-dismissed (stuck {secs}s)",target_entered:"{target} entered {zone}",target_left:"{target} left the room",target_moved:"{target} moved {from} → {to}",dropped:"{n} events dropped"}},entities:{room_level:"Room level",zone_level:"Zone level",target_level:"Target level",occupancy:"Occupancy",static_presence:"Static presence",motion_presence:"Motion presence",target_presence:"Target presence",mmwave:"mmWave presence",target_count:"Target count",zone_presence:"Presence",zone_target_count:"Target count",xy:"XY position",active:"Active",target_signal:"Signal",target_zone:"Zone",illuminance:"Illuminance",humidity:"Humidity",temperature:"Temperature",co2:"CO₂"},info:{occupancy:"Combined occupancy from all sources — PIR motion, static mmWave presence, and zone tracking. Shows detected if any source detects presence.",static_presence:"mmWave radar detects stationary people by measuring micro-movements like breathing. Works through furniture and blankets.",motion_presence:"Passive infrared sensor detects movement by sensing body heat. Fast response but only triggers on motion, not stationary presence.",target_presence:"Whether any target is actively tracked by the mmWave radar. Detected when at least one target point is being reported.",mmwave:"Combines static mmWave presence and the target tracker, ignoring the PIR motion sensor. Detected when either source is on, except while the static sensor is off and the target tracker is only pending.",zone_occupancy:"Zone {slot} occupancy. Currently {count} {count, plural, one {target} other {targets}} detected. Sensitivity determines how many consecutive frames are needed to confirm presence.",rest_of_room_occupancy:"Covers the entire room outside of any defined zones. Currently {count} {count, plural, one {target} other {targets}} detected.",target_auto_range:"Automatically set max distance from room dimensions.",target_max_distance:"Maximum detection distance for the target sensor (LD2450). Hardware limit: 6m.",stuck_target_timeout:"Auto-dismiss a target reported at exactly the same coordinates for this many seconds. Set to 0 to disable. Default is 300 seconds (5 minutes).",assisted_clear_enabled:"When on, pending zones are cleared once both the motion and static sensors report inactive and no zone is occupied. Turn off to rely only on each zone's own clear timeout.",assisted_clear_timeout:"Grace period (seconds) the room must stay empty — both sensors inactive and no occupied zone — before pending zones are cleared. 0 clears immediately. Range 0–600 s.",static_min_distance:"Minimum detection distance for the static sensor.",static_max_distance:"Maximum detection distance for the static sensor. Hardware limit: 16m.",motion_timeout:"Time after last motion before the motion sensor clears.",static_timeout:"Time after last static detection before the sensor clears.",trigger_threshold:"Minimum signal strength needed to initially detect static presence. Higher = harder to trigger.",renew_threshold:"Minimum signal strength needed to maintain static presence detection. Higher = harder to renew.",illuminance_offset:"Adjust the illuminance reading by a fixed amount.",humidity_offset:"Adjust the humidity reading by a fixed amount.",temperature_offset:"Adjust the temperature reading by a fixed amount.",presence_delay:"Delay before reporting presence after initial detection. Helps filter brief false positives.",room_occupancy:"Combined room occupancy from all sensors.",room_static:"mmWave static presence detection.",room_motion:"PIR motion detection.",room_target_presence:"Whether any target is actively tracked.",room_mmwave:"Combined static mmWave + target tracker, ignoring PIR motion. Off when only the target tracker is pending and static is inactive.",room_target_count:"Number of targets detected in the room.",zone_presence:"Per-zone occupancy based on target tracking.",zone_target_count:"Number of targets in each zone.",xy:"XY coordinates mapped to the room grid.",active:"Whether each target slot is actively tracking.",target_signal:"Signal strength for each target (higher = stronger detection).",target_zone:"Which zone each target is currently in.",illuminance:"BH1750 illuminance sensor.",humidity:"SHTC3 humidity sensor.",temperature:"SHTC3 temperature sensor.",co2:"SCD40 CO₂ sensor (optional module).",log_system:"Framework logs: OTA, API, mDNS, I2C, sensor drivers, and control entities. Excludes zone/target updates — those are under Zone Engine.",log_epp:"Zone engine logs — zone detection, target tracking, configuration, and zone/target/motion entity states.",log_led:"LED control script logs — mode transitions and decision tree.",log_networking:"WiFi or Ethernet connection and DHCP logs.",log_ble:"Bluetooth Low Energy scanner and proxy logs.",log_co2:"CO2 sensor (SCD4x) logs.",led_mode:"Controls the RGB LED behavior. Manual Control disables automatic LED and lets you control it as a standard HA light entity.",led_brightness:"Brightness multiplier for the RGB LED in automatic modes.",led_presence_color:"Color used for occupancy indication when LED is in Occupancy or Environmental + Occupancy mode.",relay_trigger_mode:"What activates the relay. Disabled leaves the relay under manual control via the relay switch entity. Any other mode follows the chosen presence signal automatically and overrides manual control.",relay_contact_mode:'Normally Open closes the relay when the trigger fires (typical "active = closed"). Normally Closed opens it instead — useful for security circuits that expect a closed loop in the idle state.'},dimensions:{width_cm:"W (cm)",height_cm:"H (cm)",rotation:"Rot"},protocol:{firmware_behind:"This sensor's firmware needs to be updated to work with this version of the integration.",firmware_ahead:"This sensor's firmware is newer than the integration. Update the Everything Presence Pro Grid integration via HACS.",open_hacs:"Open in HACS",unavailable:"Device is offline — firmware version cannot be determined.",update_firmware:"Update Firmware"},tabs:{device_configuration:"Device Configuration",device_configuration_short:"Config",flash_firmware:"Flash Firmware",flash_firmware_short:"Flash",device_groups:"Device Groups",device_groups_short:"Groups",help:"Open user guide"},flasher:{title:"Flash Firmware",devices_on_network:"Installed Devices",no_devices:"No Everything Presence Pro devices installed.",no_eppgrid_devices:"No devices with Everything Presence Pro Grid firmware found.",flash_from_tab:"Flash your devices from the Flash Firmware tab",offline:"Offline",online:"Online",usb_title:"USB Connection",usb_flash_title:"Flash Firmware",usb_flash_desc:"Install or update firmware and configure WiFi.",usb_wifi_title:"Configure WiFi",usb_wifi_desc:"Set up WiFi on an already flashed device.",usb_browser_warning:"USB flashing requires Chrome or Edge browser.",usb_insecure_warning:"USB flashing needs a secure (HTTPS) connection to Home Assistant — it's blocked over plain HTTP.",usb_web_flasher_link:"Flash from your browser instead",select_variant:"Select firmware variant:",cancelling:"Cancelling...",wifi:"WiFi",ethernet:"Ethernet",go_to_config:"Go to Device Configuration",flash_usb:"Flash firmware over USB",loading:"Loading devices...",configure_wifi:"Configure WiFi",scan:"Scan Again",select_a_network:"Select a network...",manual_ssid:"Enter SSID manually (hidden network)",enter_ssid:"Enter SSID",wifi_password:"WiFi password",show_password:"Show password",ip_address:"IP Address: {ip}",connect:"Connect",usb_flash:"Flash via USB",usb_step_connecting:"Connecting to device...",usb_step_wifi_check:"Checking existing WiFi connection...",usb_step_flashing:"Flashing firmware {version}...",usb_step_scanning:"Scanning for WiFi networks...",wifi_scan_hint:"If the device is already connected to WiFi, scanning may not work. Use manual SSID entry instead.",usb_step_provisioning:"Configuring WiFi...",usb_step_wifi_connecting:"Connecting to WiFi...",usb_step_reading_ip:"Detecting device IP address...",usb_step_adding:"Adding device...",wifi_configured:"WiFi configured successfully",go_to_integrations:"Go to Integrations",copy_ip:"Copy IP address",retry_ha_add:"Retry adding to Home Assistant",flash_another:"Flash another device",ha_add:{adding:"Adding device to Home Assistant...",retrying:"Waiting for device to come online (attempt {attempt} of {max})...",added:"Device added to Home Assistant",already_added:"Device is already in Home Assistant",needs_auth:"Device reached — complete setup in Integrations to provide the encryption key",cannot_connect:"Couldn't reach the device on the network. Check that Home Assistant and the device are on the same network.",failed:"Failed to add: {reason}"},usb_ethernet_complete:"Firmware flashed successfully!",usb_ethernet_hint:"Connect the device to your network via ethernet cable. It will be automatically detected by ESPHome.",go_to_devices:"Go to Settings → Devices",usb_retry:"Retry",confirm_delete_title:"Remove old configuration?",confirm_delete_message:"This device was previously configured with the original firmware. The old configuration will be removed from Home Assistant.",update:"Update",update_all:"Upgrade all",integration_update:"Integration update needed",integration_outdated_title:"Integration update required",integration_outdated_body:"One or more devices have firmware that is newer than this version of the integration. Update the Everything Presence Pro Grid integration to restore full functionality.",open_hacs:"Open in HACS",ota_retry:"Retry",ota_download_github:"Download from GitHub",cancel:"Cancel",start_over:"Start over",cancelled_ip_hint:"Device reachable at {ip} — it should appear in Home Assistant discovery shortly.",errors:{start_failed:"Failed to start update. Is the device online?",firmware_not_published:"This firmware version isn't available to download yet. The release is probably still being published — please try again shortly.",connect_failed:"Failed to connect to device",connection_lost:"Connection lost during update",update_timeout:"Update timed out",update_failed_generic:"Update failed",ota_failed_version_unchanged:"Update failed — firmware version unchanged",ota_timeout:"OTA update timed out",ota_device_error:"Update failed: {message}",ota_download_unreachable:"The device couldn't download the firmware from Home Assistant — it couldn't reach the download server ({message}). Try \"Download from GitHub\", or check that the device can reach Home Assistant on your network.",ota_download_unreachable_direct:"The device couldn't download the firmware — it couldn't reach the download server ({message}). It downloads directly from GitHub, so check this device's internet access.",flash_cancelled:"Flash cancelled",timeout:"Timeout",aborted:"Cancelled",port_closed:"Serial connection lost — the device may have been unplugged. Reconnect it and try again."}},device_setup:{title:"Set up your device",name_help:'Give this sensor a name you\'ll recognise, like "Living Room".',name_label:"Device name",area_help:"Assign it to an area so it groups with the rest of that room.",area_label:"Area",skip_and_finish:"Skip and finish",finish:"Finish",recreate_entity_ids:"Recreate entity IDs to match new name"},connection:{connecting:"Connecting to device...",offline:"Device is offline",failed:"Cannot connect to device",client_count:"{count} client(s) are currently connected.",check_connections:"Check for other browser tabs with this panel open, ESPHome log sessions, or additional Home Assistant instances.",retry:"Retry",ha_reconnecting:"Reconnecting to Home Assistant..."},usb:{errors:{serial_port_busy:"Serial port is busy from a previous operation. Refresh the page and try again.",serial_port_unavailable:"Serial port not available",device_disconnected:"Device disconnected. Unplug, plug it back in, and try again.",manifest_download_failed:"Failed to download firmware manifest",file_download_failed:"Failed to download firmware file: {file}",port_open_failed:"Could not open serial port. Unplug the device, plug it back in, and try again.",no_device_response:"No response from device — it may be flashed with ethernet firmware which does not support WiFi configuration.",base_url_required:"baseUrl is required for firmware download",flash_failed:"Firmware flash failed."}},wifi:{errors:{provisioning_failed:"WiFi provisioning failed",scan_failed:"WiFi scan failed",connection_failed:"WiFi connection failed — check SSID/password and try again",error_code:"WiFi error (code {code})",invalid_command:"Invalid command — device may need to be power-cycled",unknown_command:"Unknown command",not_authorized:"Not authorized",ssid_too_long:"WiFi network name is too long (max 32 bytes)",password_too_long:"WiFi password is too long (max 64 bytes)"}},errors:{apply_layout:"Saving the room layout failed. Check that the device is online and try again.",save_settings:"Saving the settings failed. Check that the device is online and try again.",save_configuration:"Saving the configuration backup failed. Try again.",load_configuration:"Restoring the configuration failed. It may be in an old format — re-save it and try again."},language_request:{message:"Your Home Assistant language is {language}, but Everything Presence Pro Grid isn't translated into it yet.",action:"Request a translation",dismiss:"Dismiss"},card:{offline:"Device offline",loading:"Loading…",uncalibrated:"This device isn't calibrated yet. Open the Everything Presence Pro Grid panel to set up the room.",no_device:"Select a device in the card editor.",nothing_to_show:"Enable the map or sensors to show this card.",heatmap_toggle:"Heatmap",clear_heatmap:"Clear heatmap",clear_heatmap_confirm:"Clear all accumulated heatmap data for this device? This can't be undone.",clear_heatmap_error:"Couldn't clear the heatmap — the device may be offline.",clear:"Clear",cancel:"Cancel",ok:"OK",editor:{device_id:"Device",primary:"Primary information",secondary:"Secondary information",layout:"Layout",show_map:"Show map",show_sensors:"Show sensors",show_grid:"Show grid",show_furniture:"Show furniture",show_overlays:"Show overlays",show_heatmap:"Heatmap",room_color:"Rest-of-room colour",reset_room_color:"Reset to auto",presence:"Presence",zones:"Zones",occupancy:"Occupancy",static_presence:"Static presence",motion_presence:"Motion presence",target_presence:"Target presence",mmwave:"mmWave",temperature:"Temperature",humidity:"Humidity",illuminance:"Illuminance",co2:"CO₂",floor_plan:"Floor plan image",floor_plan_url:"Floor plan image URL",floor_plan_ratio:"Your room is {width} m × {depth} m — crop your plan to {ratio} : 1 so it lines up without stretching.",floor_plan_calibrate_first:"Calibrate the room first to get the recommended crop ratio.",floor_plan_opacity:"Plan opacity"}}},es:{common:{save:"Guardar",saving:"Guardando...",cancel:"Cancelar",delete:"Eliminar",close:"Cerrar",add:"Añadir",discard:"Descartar",loading:"Cargando..."},grid:{heatmap_toggle:"Mapa de calor",heatmap_needs_firmware:"El mapa de calor necesita el firmware 1.3.0 o posterior.",heatmap_no_memory:"El mapa de calor no está disponible en este dispositivo: no hay memoria suficiente."},furniture:{armchair:"Sillón",bath:"Bañera",bedside_table:"Mesita de noche",bidet:"Bidé",car:"Coche",carpet:"Alfombra",cat_bed:"Cama para gato",cabinet:"Armario",ceiling_fan:"Ventilador de techo",counter:"Mostrador",cupboard:"Alacena",desk:"Escritorio",dog_bed:"Cama para perro",dining_table:"Mesa de comedor",door_left_swing:"Puerta (apertura izquierda)",door_right_swing:"Puerta (apertura derecha)",double_bed:"Cama doble",fridge:"Nevera",hot_tub:"Jacuzzi",kitchen_island:"Isla de cocina",lamp:"Lámpara",oven_stove:"Horno / cocina",plant:"Planta",pool:"Piscina",round_table:"Mesa redonda",shower:"Ducha",side_table:"Mesa auxiliar",single_bed:"Cama individual",sliding_door:"Puerta corredera",sofa_2_seat:"Sofá (2 plazas)",sofa_3_seat:"Sofá (3 plazas)",speaker:"Altavoz",tv:"TV",washbasin:"Lavabo",washing_machine:"Lavadora",toilet:"Inodoro",window:"Ventana",custom_icon:"Icono personalizado",custom:"Personalizado",search_placeholder:"Buscar mobiliario...",remove:"Eliminar"},text_label:{label:"Etiqueta de texto",add:"Añadir etiqueta de texto",default_text:"Etiqueta",text:"Texto",font:"Fuente",size_cm:"Tamaño (cm)",bold:"Negrita",italic:"Cursiva",align:"Alineación",align_left:"Alinear a la izquierda",align_center:"Centrar",align_right:"Alinear a la derecha",text_color:"Color del texto",auto_color:"Auto",background:"Fondo",no_background:"Ninguno",remove:"Eliminar etiqueta"},corners:{front_left:"Frente-izquierda",front_right:"Frente-derecha",back_right:"Fondo-derecha",back_left:"Fondo-izquierda",left_wall:"pared izquierda",right_wall:"pared derecha",front_wall:"pared frontal",back_wall:"pared del fondo"},wizard:{how_calibration_works:"Cómo funciona la calibración de la habitación",calibrate_room_size:"Calibrar tamaño de la habitación",begin_marking:"Iniciar calibración",mark_corner:"Marcar {corner}",recording:"Grabando... {current}s / {total}s",paused:"En pausa — se necesita exactamente un objetivo visible",stand_still:"Permanece inmóvil",no_target:"No se detecta ningún objetivo. Asegúrate de que el sensor pueda verte.",multiple_targets:"Se detectan varios objetivos. Solo debe haber una persona en la habitación durante la calibración.",save_prompt:"Haz clic en Guardar para almacenar la calibración de esta habitación, o haz clic en una esquina superior para volver a marcarla.",save_failed:"No se pudo guardar la calibración. Comprueba que el dispositivo está en línea y vuelve a intentarlo.",invalid_corners:"Las esquinas marcadas no forman una sala válida. Vuelve a marcar las esquinas e inténtalo de nuevo.",walk_instruction_full:"<strong>Camina hasta cada esquina</strong> en orden (1 → 2 → 3 → 4) y haz clic en Marcar. Permanece inmóvil unos segundos para que el sensor pueda registrar tu posición.",cant_reach:"<strong>¿No puedes llegar a una esquina?</strong> Acércate todo lo que puedas e introduce la distancia a cada pared en los campos de desplazamiento, como en la esquina 4 del diagrama superior, donde hay una planta en el camino.",corner_sensor_hint:"En este ejemplo, el sensor está montado en la esquina 2, pero puede estar en cualquier lugar. Puedes colocarte justo delante de él.",walk_instruction:"Camina hasta cada esquina de la habitación y haz clic en Marcar. El sensor registrará tu posición durante {duration} segundos.",corner_step:"Esquina {index}/4: Camina hasta la {corner}",distance_from:"Distancia desde:",distance_from_side:"{wall} (cm)",front_wall_label:"Pared frontal (lado del sensor)",back_wall_label:"Pared del fondo",sensor:"Sensor",no_presence:"Sin presencia",dont_show_again:"No mostrar esto de nuevo"},dialogs:{delete_calibration_title:"¿Eliminar la calibración de la habitación?",delete_calibration_body:"Esto también eliminará todas las zonas de detección y el mobiliario. Esta acción no se puede deshacer.",unsaved_changes:"Tienes cambios sin guardar",unsaved_changes_body:"Los cambios se perderán si navegas a otra página sin aplicarlos.",backup_configuration:"Respaldar configuración",restore_configuration:"Restaurar configuración",no_configurations:"No hay configuraciones guardadas.",configuration_name:"Nombre de la configuración"},menu:{settings:"Ajustes",room_calibration:"Calibrar tamaño de la habitación",delete_calibration:"Eliminar calibración de la habitación",detection_zones:"Zonas de detección",furniture:"Mobiliario",overlays:"Capas"},settings:{title:"Ajustes",detection_ranges:"Rangos de detección",sensor_calibration:"Calibración del sensor",entities:"Entidades",target_sensor:"Sensor de objetivos",stuck_target_timeout:"Tiempo de objetivo atascado",assisted_clear:"Borrado asistido por sensores",assisted_clear_enabled:"Activado",assisted_clear_timeout:"Retardo de borrado",static_sensor:"Sensor estático",motion_sensor:"Sensor de movimiento",environmental:"Ambiental",auto:"Auto",max_distance:"Distancia máxima",min_distance:"Distancia mínima",presence_timeout:"Tiempo de espera de presencia",trigger_threshold:"Umbral de activación",renew_threshold:"Umbral de renovación",illuminance_offset:"Desplazamiento de iluminancia",humidity_offset:"Desplazamiento de humedad",temperature_offset:"Desplazamiento de temperatura",presence_delay:"Retardo de presencia",furthest_point:"Punto más lejano actual del sensor:",logging:"Registro",log_system:"Sistema",log_epp:"Motor de zonas",log_led:"LED",log_networking:"Red",log_ble:"Bluetooth",log_co2:"CO2",led_and_relay:"LED y relé",led:"LED",led_mode:"Modo",led_brightness:"Brillo",led_presence_color:"Color de ocupación",manual_control:"Control manual",presence:"Ocupación",environmental_presence:"Ambiental + Ocupación",relay:"Relé",relay_trigger_mode:"Modo de activación",relay_contact_mode:"Modo de contacto",relay_disabled:"Desactivado",relay_motion:"Solo movimiento",relay_presence:"Solo presencia",relay_occupancy:"Ocupación",relay_normally_open:"Normalmente abierto (NA)",relay_normally_closed:"Normalmente cerrado (NC)",update_rate:"Frecuencia de actualización",reset_to_default:"Restablecer valores predeterminados",show_info:"Mostrar información",frequency:{"5hz":"5 Hz","2hz":"2 Hz","1hz":"1 Hz","0_5hz":"0,5 Hz"},log_level:{none:"Ninguno",error:"Error",warning:"Advertencia",info:"Información",debug:"Depuración"}},sidebar:{detection_zones:"Zonas de detección",live_overview:"Vista en directo",add_zone:"Añadir zona",rest_of_room:"Resto de la habitación",room:"Habitación"},zones:{type:"Tipo",default:"Predeterminado",bed:"Cama",seating:"Asiento",transit:"Tránsito",custom:"Personalizado",trigger:"Activación",renew:"Renovación",presence_timeout:"Tiempo de espera de presencia",handoff_timeout:"Tiempo de espera de transferencia",seconds_suffix:"s",remove_zone:"Eliminar zona"},color:{choose:"Elegir color",custom:"Color personalizado…",in_use:"Usado por otra zona",preset:"Color {n}"},overlays:{entry_exit:"Entrada / Salida",interference:"Interferencia",suppress:"Suprimir",click_to_paint:"Haz clic para pintar"},live:{presence:"Presencia",detected:"Detectado",clear:"Sin detección",environment:"Entorno",occupancy:"Ocupación",static_presence:"Presencia estática",motion_presence:"Presencia en movimiento",target_presence:"Presencia de objetivo",mmwave:"mmWave",delete_target:"Eliminar objetivo",mark_interference:"Marcar como fuente de interferencia",suppress_detection:"Suprimir detección",grid_dimensions:"{width, number, ::.0}m × {depth, number, ::.0}m · Punto más lejano: {furthest, number, ::.0}m",illuminance_value:"{value, number, ::.0} lux",temperature_value:"{value, number, ::.0} °C",humidity_value:"{value, number, ::.0} %",co2_value:"{value, number} ppm",debug:{detection_events:"Eventos de detección",copy_all:"Copiar todo",clear:"Borrar",waiting_for_events:"Esperando eventos...",static:"Estático",motion:"Movimiento",occ:"Ocup",on:"sí",off:"no",active:"activo",pending:"pendiente",inactive:"inactivo",occupied:"ocupada",room:"Habitación",no_targets:"sin objetivos",all_clear:"todo despejado",zone_n:"Zona {n}",target_n:"Objetivo {n}"},events:{static_active:"Presencia estática detectada",static_fading:"Presencia estática desvaneciéndose…",static_cleared:"Presencia estática eliminada",motion_active:"Presencia en movimiento detectada",motion_fading:"Presencia en movimiento desvaneciéndose…",motion_cleared:"Presencia en movimiento eliminada",zone_occupied:"{zone} ocupada",zone_clearing:"{zone} despejándose…",zone_cleared:"{zone} despejada",zone_cleared_handoff:"{zone} despejada (transferencia)",zone_cleared_overlay:"{zone} despejada (salida de capa)",zone_cleared_force:"{zone} despejada (asistida por sensor)",room_occupied:"Habitación ocupada",room_empty:"Habitación vacía",mmwave_on:"mmWave activado",mmwave_off:"mmWave desactivado",force_clear:"{zone} forzada a despejar (ambos sensores inactivos)",stuck_dismiss:"{target} descartado automáticamente (atascado {secs}s)",target_entered:"{target} entró en {zone}",target_left:"{target} salió de la habitación",target_moved:"{target} se movió de {from} → {to}",dropped:"{n} eventos descartados"}},entities:{room_level:"Nivel de habitación",zone_level:"Nivel de zona",target_level:"Nivel de objetivo",occupancy:"Ocupación",static_presence:"Presencia estática",motion_presence:"Presencia en movimiento",target_presence:"Presencia de objetivo",mmwave:"Presencia mmWave",target_count:"Número de objetivos",zone_presence:"Presencia",zone_target_count:"Número de objetivos",xy:"Posición XY",active:"Activo",target_signal:"Señal",target_zone:"Zona",illuminance:"Iluminancia",humidity:"Humedad",temperature:"Temperatura",co2:"CO₂"},info:{occupancy:"Ocupación combinada de todas las fuentes: sensor PIR de movimiento, presencia estática por radar mmWave y seguimiento de zonas. Muestra «detectado» si alguna fuente detecta presencia.",static_presence:"El radar mmWave detecta personas inmóviles midiendo micromovimientos como la respiración. Funciona a través de muebles y mantas.",motion_presence:"El sensor infrarrojo pasivo detecta movimiento captando el calor corporal. Respuesta rápida, pero solo se activa con movimiento, no con presencia estática.",target_presence:"Indica si el radar mmWave está rastreando activamente algún objetivo. Se muestra como detectado cuando se está reportando al menos un punto objetivo.",mmwave:"Combina la presencia mmWave estática y el seguimiento de objetivos, ignorando el sensor PIR de movimiento. Detectado cuando alguna de las dos fuentes está activa, salvo cuando el sensor estático está apagado y el seguimiento de objetivos solo está pendiente.",zone_occupancy:"Ocupación de la zona {slot}. Actualmente se detectan {count} {count, plural, one {objetivo} other {objetivos}}. La sensibilidad determina cuántos fotogramas consecutivos son necesarios para confirmar presencia.",rest_of_room_occupancy:"Cubre toda la habitación fuera de las zonas definidas. Actualmente se detectan {count} {count, plural, one {objetivo} other {objetivos}}.",target_auto_range:"Establece automáticamente la distancia máxima a partir de las dimensiones de la habitación.",target_max_distance:"Distancia máxima de detección para el sensor de objetivos (LD2450). Límite hardware: 6 m.",stuck_target_timeout:"Descarta automáticamente un objetivo reportado exactamente en las mismas coordenadas durante este número de segundos. Establece 0 para deshabilitar. Por defecto 300 segundos (5 minutos).",assisted_clear_enabled:"Cuando está activado, las zonas pendientes se borran en cuanto los sensores de movimiento y estático informan inactividad y ninguna zona está ocupada. Desactívalo para usar solo el tiempo de espera propio de cada zona.",assisted_clear_timeout:"Periodo de gracia (segundos) que la sala debe permanecer vacía — ambos sensores inactivos y ninguna zona ocupada — antes de borrar las zonas pendientes. 0 borra de inmediato. Rango 0–600 s.",static_min_distance:"Distancia mínima de detección para el sensor estático.",static_max_distance:"Distancia máxima de detección para el sensor estático. Límite hardware: 16 m.",motion_timeout:"Tiempo tras el último movimiento antes de que el sensor de movimiento se limpie.",static_timeout:"Tiempo tras la última detección estática antes de que el sensor se limpie.",trigger_threshold:"Intensidad de señal mínima necesaria para detectar inicialmente presencia estática. Más alto = más difícil de activar.",renew_threshold:"Intensidad de señal mínima necesaria para mantener la detección de presencia estática. Más alto = más difícil de renovar.",illuminance_offset:"Ajusta la lectura de iluminancia en un valor fijo.",humidity_offset:"Ajusta la lectura de humedad en un valor fijo.",temperature_offset:"Ajusta la lectura de temperatura en un valor fijo.",presence_delay:"Retardo antes de notificar presencia tras la detección inicial. Ayuda a filtrar falsos positivos breves.",room_occupancy:"Ocupación combinada de la habitación procedente de todos los sensores.",room_static:"Detección de presencia estática por radar mmWave.",room_motion:"Detección de movimiento por PIR.",room_target_presence:"Indica si se está rastreando activamente algún objetivo.",room_mmwave:"Presencia mmWave estática + seguimiento de objetivos, ignorando el PIR de movimiento. Apagado si el sensor estático está inactivo y el seguimiento solo está pendiente.",room_target_count:"Número de objetivos detectados en la habitación.",zone_presence:"Ocupación por zona basada en el seguimiento de objetivos.",zone_target_count:"Número de objetivos en cada zona.",xy:"Coordenadas XY mapeadas a la cuadrícula de la habitación.",active:"Indica si cada ranura de objetivo está rastreando activamente.",target_signal:"Intensidad de señal de cada objetivo (más alta = detección más sólida).",target_zone:"Zona en la que se encuentra actualmente cada objetivo.",illuminance:"Sensor de iluminancia BH1750.",humidity:"Sensor de humedad SHTC3.",temperature:"Sensor de temperatura SHTC3.",co2:"Sensor de CO₂ SCD40 (módulo opcional).",log_system:"Registros del framework: OTA, API, mDNS, I2C, controladores de sensores y entidades de control. Excluye las actualizaciones de zonas/objetivos: están en Motor de zonas.",log_epp:"Registros del motor de zonas: detección de zonas, seguimiento de objetivos, configuración y estados de entidades de zona/objetivo/movimiento.",log_led:"Registros del script de control del LED: transiciones de modo y árbol de decisión.",log_networking:"Registros de conexión WiFi o Ethernet y DHCP.",log_ble:"Registros del escáner y proxy Bluetooth de baja energía.",log_co2:"Registros del sensor de CO2 (SCD4x).",led_mode:"Controla el comportamiento del LED RGB. El control manual desactiva el LED automático y permite controlarlo como una entidad de luz estándar de HA.",led_brightness:"Multiplicador de brillo para el LED RGB en los modos automáticos.",led_presence_color:"Color utilizado para indicar ocupación cuando el LED está en modo Ocupación o Ambiental + Ocupación.",relay_trigger_mode:"Qué activa el relé. Desactivado deja el relé bajo control manual a través de la entidad de interruptor del relé. Cualquier otro modo sigue automáticamente la señal de presencia elegida y anula el control manual.",relay_contact_mode:'Normalmente abierto cierra el relé cuando se dispara el activador (típico "activo = cerrado"). Normalmente cerrado lo abre en su lugar — útil para circuitos de seguridad que esperan un bucle cerrado en estado inactivo.'},dimensions:{width_cm:"An (cm)",height_cm:"Al (cm)",rotation:"Rot"},protocol:{firmware_behind:"El firmware de este sensor debe actualizarse para funcionar con esta versión de la integración.",firmware_ahead:"El firmware de este sensor es más reciente que la integración. Actualiza la integración Everything Presence Pro Grid desde HACS.",open_hacs:"Abrir en HACS",unavailable:"El dispositivo no está disponible — no se puede determinar la versión del firmware.",update_firmware:"Actualizar firmware"},tabs:{device_configuration:"Configuración del dispositivo",device_configuration_short:"Config",flash_firmware:"Instalar firmware",flash_firmware_short:"Flash",device_groups:"Grupos de dispositivos",device_groups_short:"Grupos",help:"Abrir la guía del usuario"},flasher:{title:"Instalar firmware",devices_on_network:"Dispositivos instalados",no_devices:"No hay dispositivos Everything Presence Pro instalados.",no_eppgrid_devices:"No se han encontrado dispositivos con firmware Everything Presence Pro Grid.",flash_from_tab:"Instala el firmware de tus dispositivos desde la pestaña Instalar firmware",offline:"Sin conexión",online:"Conectado",usb_title:"Conexión USB",usb_flash_title:"Instalar firmware",usb_flash_desc:"Instala o actualiza el firmware y configura el WiFi.",usb_wifi_title:"Configurar WiFi",usb_wifi_desc:"Configura el WiFi en un dispositivo que ya tiene firmware instalado.",usb_browser_warning:"La instalación por USB requiere el navegador Chrome o Edge.",usb_insecure_warning:"La instalación por USB necesita una conexión segura (HTTPS) a Home Assistant — está bloqueada por HTTP sin cifrar.",usb_web_flasher_link:"Instala desde tu navegador",select_variant:"Selecciona la variante de firmware:",cancelling:"Cancelando...",wifi:"WiFi",ethernet:"Ethernet",go_to_config:"Ir a la configuración del dispositivo",flash_usb:"Instalar firmware por USB",loading:"Cargando dispositivos...",configure_wifi:"Configurar WiFi",scan:"Buscar de nuevo",select_a_network:"Selecciona una red...",manual_ssid:"Introducir SSID manualmente (red oculta)",enter_ssid:"Introducir SSID",wifi_password:"Contraseña WiFi",show_password:"Mostrar contraseña",ip_address:"Dirección IP: {ip}",connect:"Conectar",usb_flash:"Instalar por USB",usb_step_connecting:"Conectando al dispositivo...",usb_step_wifi_check:"Comprobando conexión WiFi existente...",usb_step_flashing:"Instalando firmware {version}...",usb_step_scanning:"Buscando redes WiFi...",wifi_scan_hint:"Si el dispositivo ya está conectado al WiFi, es posible que la búsqueda no funcione. Usa la entrada manual de SSID en su lugar.",usb_step_provisioning:"Configurando WiFi...",usb_step_wifi_connecting:"Conectando al WiFi...",usb_step_reading_ip:"Detectando la dirección IP del dispositivo...",usb_step_adding:"Añadiendo dispositivo...",wifi_configured:"WiFi configurado correctamente",go_to_integrations:"Ir a Integraciones",copy_ip:"Copiar dirección IP",retry_ha_add:"Reintentar añadir a Home Assistant",flash_another:"Flashear otro dispositivo",ha_add:{adding:"Añadiendo dispositivo a Home Assistant...",retrying:"Esperando a que el dispositivo esté disponible (intento {attempt} de {max})...",added:"Dispositivo añadido a Home Assistant",already_added:"El dispositivo ya está en Home Assistant",needs_auth:"Dispositivo accesible — completa la configuración en Integraciones para proporcionar la clave de cifrado",cannot_connect:"No se pudo conectar al dispositivo en la red. Comprueba que Home Assistant y el dispositivo están en la misma red.",failed:"Error al añadir: {reason}"},usb_ethernet_complete:"¡Firmware instalado correctamente!",usb_ethernet_hint:"Conecta el dispositivo a tu red mediante cable Ethernet. ESPHome lo detectará automáticamente.",go_to_devices:"Ir a Ajustes → Dispositivos",usb_retry:"Reintentar",confirm_delete_title:"¿Eliminar la configuración antigua?",confirm_delete_message:"Este dispositivo se configuró anteriormente con el firmware original. La configuración antigua se eliminará de Home Assistant.",update:"Actualizar",update_all:"Actualizar todo",integration_update:"Actualización de la integración necesaria",integration_outdated_title:"Se requiere actualización de la integración",integration_outdated_body:"Uno o más dispositivos tienen un firmware más reciente que esta versión de la integración. Actualiza la integración Everything Presence Pro Grid para restaurar toda la funcionalidad.",open_hacs:"Abrir en HACS",ota_retry:"Reintentar",ota_download_github:"Descargar desde GitHub",cancel:"Cancelar",start_over:"Empezar de nuevo",cancelled_ip_hint:"El dispositivo es accesible en {ip} — debería aparecer en la detección de Home Assistant pronto.",errors:{start_failed:"No se ha podido iniciar la actualización. ¿El dispositivo está en línea?",firmware_not_published:"Esta versión del firmware aún no está disponible para descargar. Probablemente la versión todavía se está publicando; inténtalo de nuevo en unos momentos.",connect_failed:"No se ha podido conectar al dispositivo",connection_lost:"Se perdió la conexión durante la actualización",update_timeout:"La actualización ha agotado el tiempo de espera",update_failed_generic:"Error en la actualización",ota_failed_version_unchanged:"Actualización fallida — la versión del firmware no ha cambiado",ota_timeout:"La actualización OTA ha agotado el tiempo de espera",ota_device_error:"Error en la actualización: {message}",ota_download_unreachable:"El dispositivo no pudo descargar el firmware desde Home Assistant: no pudo conectarse al servidor de descargas ({message}). Prueba «Descargar desde GitHub» o comprueba que el dispositivo puede acceder a Home Assistant en tu red.",ota_download_unreachable_direct:"El dispositivo no pudo descargar el firmware: no pudo conectarse al servidor de descargas ({message}). Descarga directamente desde GitHub, así que comprueba el acceso a internet de este dispositivo.",flash_cancelled:"Instalación cancelada",timeout:"Tiempo de espera agotado",aborted:"Cancelado",port_closed:"Conexión serie perdida — puede que el dispositivo se haya desconectado. Vuelve a conectarlo e inténtalo de nuevo."}},device_setup:{title:"Configura tu dispositivo",name_help:'Dale a este sensor un nombre que reconozcas, como "Salón".',name_label:"Nombre del dispositivo",area_help:"Asígnalo a un área para que se agrupe con el resto de esa habitación.",area_label:"Área",skip_and_finish:"Omitir y finalizar",finish:"Finalizar",recreate_entity_ids:"Recrear los IDs de entidad para que coincidan con el nuevo nombre"},connection:{connecting:"Conectando al dispositivo...",offline:"El dispositivo no está disponible",failed:"No se puede conectar al dispositivo",client_count:"Hay {count} cliente(s) conectados actualmente.",check_connections:"Comprueba si hay otras pestañas del navegador con este panel abierto, sesiones de registro de ESPHome o instancias adicionales de Home Assistant.",retry:"Reintentar",ha_reconnecting:"Reconectando a Home Assistant..."},usb:{errors:{serial_port_busy:"El puerto serie está ocupado por una operación anterior. Actualiza la página e inténtalo de nuevo.",serial_port_unavailable:"Puerto serie no disponible",device_disconnected:"Dispositivo desconectado. Desconéctalo, vuelve a conectarlo e inténtalo de nuevo.",manifest_download_failed:"No se ha podido descargar el manifiesto del firmware",file_download_failed:"No se ha podido descargar el archivo de firmware: {file}",port_open_failed:"No se ha podido abrir el puerto serie. Desconecta el dispositivo, vuelve a conectarlo e inténtalo de nuevo.",no_device_response:"Sin respuesta del dispositivo — puede que tenga instalado el firmware Ethernet, que no admite configuración WiFi.",base_url_required:"baseUrl es obligatorio para la descarga del firmware",flash_failed:"Error al instalar el firmware."}},wifi:{errors:{provisioning_failed:"Error al configurar el WiFi",scan_failed:"Error al buscar redes WiFi",connection_failed:"Error de conexión WiFi — comprueba el SSID y la contraseña e inténtalo de nuevo",error_code:"Error de WiFi (código {code})",invalid_command:"Comando no válido — puede que el dispositivo necesite reiniciarse",unknown_command:"Comando desconocido",not_authorized:"No autorizado",ssid_too_long:"El nombre de la red WiFi es demasiado largo (máximo 32 bytes)",password_too_long:"La contraseña WiFi es demasiado larga (máximo 64 bytes)"}},errors:{apply_layout:"No se pudo guardar la distribución de la habitación. Comprueba que el dispositivo está en línea e inténtalo de nuevo.",save_settings:"No se pudieron guardar los ajustes. Comprueba que el dispositivo está en línea e inténtalo de nuevo.",save_configuration:"No se pudo guardar la copia de seguridad de la configuración. Inténtalo de nuevo.",load_configuration:"No se pudo restaurar la configuración. Puede que esté en un formato antiguo — vuelve a guardarla e inténtalo de nuevo."},language_request:{message:"El idioma de tu Home Assistant es {language}, pero Everything Presence Pro Grid aún no está traducido a ese idioma.",action:"Solicitar una traducción",dismiss:"Descartar"},card:{offline:"Dispositivo sin conexión",loading:"Cargando…",uncalibrated:"Este dispositivo aún no está calibrado. Abre el panel de Everything Presence Pro Grid para configurar la habitación.",no_device:"Selecciona un dispositivo en el editor de tarjetas.",nothing_to_show:"Activa el mapa o los sensores para mostrar esta tarjeta.",heatmap_toggle:"Mapa de calor",clear_heatmap:"Borrar mapa de calor",clear_heatmap_confirm:"¿Borrar todos los datos del mapa de calor acumulados de este dispositivo? No se puede deshacer.",clear_heatmap_error:"No se pudo borrar el mapa de calor: puede que el dispositivo esté sin conexión.",clear:"Borrar",cancel:"Cancelar",ok:"OK",editor:{device_id:"Dispositivo",primary:"Información principal",secondary:"Información secundaria",layout:"Disposición",show_map:"Mostrar mapa",show_sensors:"Mostrar sensores",show_grid:"Mostrar cuadrícula",show_furniture:"Mostrar mobiliario",show_overlays:"Mostrar superposiciones",show_heatmap:"Mapa de calor",room_color:"Color del resto de la sala",reset_room_color:"Restablecer a automático",presence:"Presencia",zones:"Zonas",occupancy:"Ocupación",static_presence:"Presencia estática",motion_presence:"Presencia en movimiento",target_presence:"Presencia de objetivo",mmwave:"mmWave",temperature:"Temperatura",humidity:"Humedad",illuminance:"Iluminancia",co2:"CO₂",floor_plan:"Imagen del plano",floor_plan_url:"URL de la imagen del plano",floor_plan_ratio:"Tu habitación mide {width} m × {depth} m — recorta el plano a {ratio} : 1 para que encaje sin estirarse.",floor_plan_calibrate_first:"Calibra primero la habitación para obtener la proporción de recorte recomendada.",floor_plan_opacity:"Opacidad del plano"}}}},Ao=Object.assign(e=>e,{formatNumber:(e,t=1)=>e.toFixed(t),lang:"en"});function $o(e,t){const o=t.split(".");let r=e;for(const e of o){if(null==r||"object"!=typeof r)return;r=r[e]}return"string"==typeof r?r:void 0}function To(e){const t=e?.locale?.language??e?.language??"en",o=t.split("-")[0],r=So[t]?t:So[o]?o:"en",n=So[r],i=So.en,a=new Map,s=new Map,l=(e,t)=>{if(a.size>=256&&!a.has(e)){const e=a.keys().next().value;void 0!==e&&a.delete(e)}a.set(e,t)},c=(e,t)=>{const o=$o(n,e)??$o(i,e)??e;if(!t)return o;let s;if(a.has(o)){if(s=a.get(o),null===s)return o}else{try{s=new Po(o,r)}catch{return l(o,null),o}l(o,s)}try{return s.format(t)}catch{return o}};return c.formatNumber=(e,t=1)=>{let o=s.get(t);return o||(o=new Intl.NumberFormat(r,{minimumFractionDigits:t,maximumFractionDigits:t}),s.set(t,o)),o.format(e)},c.lang=r,c}class Ho extends ce{constructor(){super(...arguments),this.furniture=[],this.selectedFurnitureId=null,this.roomWidth=3e3,this.cellPx=28,this.gapPx=1,this.minCol=0,this.minRow=0,this.visCols=20,this.visRows=20,this.sidebarTab="zones",this.localize=Ao,this._isNarrow=!1,this._onNarrowMql=e=>{this._isNarrow=e.matches}}connectedCallback(){super.connectedCallback(),this._narrowMql=window.matchMedia("(max-width: 819px)"),this._isNarrow=this._narrowMql.matches,this._narrowMql.addEventListener("change",this._onNarrowMql)}disconnectedCallback(){super.disconnectedCallback(),this._narrowMql?.removeEventListener("change",this._onNarrowMql)}_mmToPx(e){return function(e,t,o=1){return e/ze*(t+o)}(e,this.cellPx,this.gapPx)}_fireEvent(e,t){this.dispatchEvent(new CustomEvent(e,{bubbles:!0,composed:!0,detail:t}))}_itemRotation(e){return this.furniture.find(t=>t.id===e)?.rotation??0}_onItemPointerDown(e,t){this._fireEvent("furniture-select",t),this._fireEvent("furniture-pointer-down",{e:e,id:t,type:"move",rotation:this._itemRotation(t)})}_onResizePointerDown(e,t,o){this._fireEvent("furniture-pointer-down",{e:e,id:t,type:"resize",handle:o,rotation:this._itemRotation(t)})}_onRotatePointerDown(e,t){this._fireEvent("furniture-pointer-down",{e:e,id:t,type:"rotate",rotation:this._itemRotation(t)})}_onDeletePointerDown(e,t){e.stopPropagation(),this._fireEvent("furniture-delete",t)}_renderSelectionControls(e){return G`
			<div class="furn-rotate-stem"></div>
			<div class="furn-rotate-handle" @pointerdown=${t=>this._onRotatePointerDown(t,e.id)}>
				<ha-icon icon="mdi:rotate-right" style="--mdc-icon-size: 14px;"></ha-icon>
			</div>
			<div class="furn-delete-btn" @pointerdown=${t=>this._onDeletePointerDown(t,e.id)}>
				<ha-icon icon="mdi:close" style="--mdc-icon-size: 14px;"></ha-icon>
			</div>
		`}render(){if(!this.furniture.length)return Z;const e=$e(this.roomWidth),t=this.cellPx+this.gapPx,o=this._isNarrow?44:30,r="furniture"===this.sidebarTab;return G`
			<div class="furniture-overlay ${r?"":"non-interactive"}">
				${this.furniture.map(n=>{const i=(e-this.minCol)*t+this._mmToPx(n.x),a=(0-this.minRow)*t+this._mmToPx(n.y),s=r&&this.selectedFurnitureId===n.id,l=this.furnitureTones?.get(n.id);if("text"===n.type){const e=this._mmToPx(n.fontSize??200),t=n.background?Oe(n.background):null,o=t?`background: color-mix(in srgb, ${n.background} 85%, transparent);`:"",r=n.color&&Oe(n.color)?n.color:null,d="var(--epp-text, var(--primary-text-color, #212121))";let h,u=null;r?h=r:t?h=Ue(t).color:l?(h=l.color,u=l.halo):h=d;const p=[`font-family: ${c=n.fontFamily??pt,(ut.find(e=>e.key===c)??ut[0]).stack};`,`font-size: ${e}px;`,`font-weight: ${n.bold?700:400};`,`font-style: ${n.italic?"italic":"normal"};`,`color: ${h};`,`text-align: ${n.align??mt};`,o].join(" ");return G`
							<div
								class="furniture-item furniture-item--text${s?" selected":""}${u?" has-halo":""}"
								data-id="${n.id}"
								style="${u?`--epp-furniture-halo-color:${u};`:""}left: ${i}px; top: ${a}px; transform: rotate(${n.rotation}deg);"
								@pointerdown=${e=>this._onItemPointerDown(e,n.id)}
							>
								<span class="furniture-text-content" style="${p}">${n.text??""}</span>
								${s?this._renderSelectionControls(n):Z}
							</div>
						`}var c;const d=this._mmToPx(n.width),h=this._mmToPx(n.height),u="svg"===n.type&&Object.hasOwn(He,n.icon)?He[n.icon]:null;return G`
						<div
							class="furniture-item${s?" selected":""}${l?" has-halo":""}"
							data-id="${n.id}"
							style="
								${l?`--epp-furniture-color:${l.color};--epp-furniture-halo-color:${l.halo};`:""}
								left: ${i}px; top: ${a}px;
								width: ${d}px; height: ${h}px;
								transform: rotate(${n.rotation}deg);
							"
							@pointerdown=${e=>this._onItemPointerDown(e,n.id)}
						>
							${u?it([n.icon,d,h],()=>W`<svg viewBox="${u.viewBox}" preserveAspectRatio="none" class="furn-svg">
												${lt(function(e,t){return e.replace(/stroke-width="(\d*\.?\d+)"/g,(e,o)=>`stroke-width="${Math.round(Number(o)*t*1e3)/1e3}"`)}(u.content,function(e,t,o){const[,,r,n]=e.trim().split(/\s+/).map(Number),i=Math.sqrt(t/r*(o/n));return Number.isFinite(i)&&i>0?i:1}(u.viewBox,d,h)))}
											</svg>`):G`<ha-icon icon="${n.icon}" style="--mdc-icon-size: ${.6*Math.min(d,h)}px;"></ha-icon>`}
							${s?G`
										<!-- Resize handles (cursor follows visual rotation) -->
										${function(e,t,o,r){if(e)return ht;const n=t>=r,i=o>=r;return dt.filter(e=>!!ct(e)||("n"===e||"s"===e?n:i))}(n.lockAspect,d,h,o).map(e=>G`
												<div
													class="furn-handle furn-handle-${e}"
													style="cursor: ${function(e,t){const o=e.includes("e")?1:e.includes("w")?-1:0,r=e.includes("s")?1:e.includes("n")?-1:0,n=((180*Math.atan2(o,-r)/Math.PI+t)%180+180)%180;switch(45*Math.round(n/45)%180){case 0:return"ns-resize";case 45:return"nesw-resize";case 90:return"ew-resize";default:return"nwse-resize"}}(e,n.rotation)};"
													@pointerdown=${t=>this._onResizePointerDown(t,n.id,e)}
												></div>
											`)}
										${this._renderSelectionControls(n)}
									`:Z}
						</div>
					`})}
			</div>
		`}}Ho.styles=a`
		:host {
			display: contents;
		}

		.furniture-overlay {
			position: absolute;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			pointer-events: none;
			z-index: 15;
		}

		.furniture-overlay.non-interactive {
			pointer-events: none !important;
		}

		.furniture-overlay.non-interactive .furniture-item {
			pointer-events: none !important;
			opacity: 0.6;
			/* The grey box is an editing affordance — hide it outside the
			   furniture tab. Transparent (not border: none) keeps the 1px
			   border reserving layout so the icon doesn't shift on tab switch. */
			border-color: transparent;
		}

		/* touch-action: none on every draggable surface — otherwise the
		   browser claims the touch gesture for scrolling mid-drag and fires
		   pointercancel, wedging the drag. */
		.furniture-item {
			position: absolute;
			display: flex;
			align-items: center;
			justify-content: center;
			border: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
			border-radius: 4px;
			background: transparent;
			color: var(
				--epp-furniture-color,
				var(--epp-text-muted, var(--secondary-text-color, #757575))
			);
			pointer-events: auto;
			cursor: grab;
			transform-origin: center center;
			user-select: none;
			touch-action: none;
		}

		.furniture-item:hover {
			border-color: var(--epp-accent, var(--primary-color, #03a9f4));
		}

		.furniture-item.selected {
			outline: 2px solid var(--epp-accent, var(--primary-color, #03a9f4));
			outline-offset: -1px;
			box-shadow: 0 0 8px
				color-mix(in srgb, var(--epp-accent, #03a9f4) 40%, transparent);
			z-index: 10;
		}

		.furniture-item.has-halo {
			filter: drop-shadow(0 0 1.3px var(--epp-furniture-halo-color))
				drop-shadow(0 0 1.3px var(--epp-furniture-halo-color));
		}

		.furniture-item--text {
			border: none;
			background: transparent;
			width: max-content;
			height: auto;
			padding: 0;
		}
		.furniture-item--text.selected {
			outline: 2px solid var(--epp-accent, var(--primary-color, #03a9f4));
			outline-offset: 3px;
		}
		.furniture-text-content {
			display: inline-block;
			white-space: pre;
			line-height: 1.2;
			pointer-events: none;
			padding: 2px 4px;
			border-radius: var(--epp-radius-sm, 6px);
		}

		.furniture-item ha-icon {
			pointer-events: none;
		}

		.furn-svg {
			width: 100%;
			height: 100%;
			pointer-events: none;
		}

		/* Keep stroke widths balanced under non-uniform (preserveAspectRatio=
		   none) scaling — the stretch no longer thickens/thins strokes per axis.
		   Line weight is restored via a geometric-mean stroke-width multiplier at
		   render time (scaleSvgStrokeWidths). */
		.furn-svg * {
			vector-effect: non-scaling-stroke;
		}

		.furn-handle {
			position: absolute;
			width: 22px;
			height: 22px;
			background: transparent;
			pointer-events: auto;
			z-index: 2;
			display: flex;
			align-items: center;
			justify-content: center;
			touch-action: none;
		}

		/* Visible square (8×8) sits centered inside the larger touch area. */
		.furn-handle::before {
			content: "";
			width: 8px;
			height: 8px;
			background: var(--epp-accent, var(--primary-color, #03a9f4));
			border: 1px solid var(--epp-surface, var(--card-background-color, #fff));
			border-radius: 2px;
		}

		.furn-handle-n { top: -11px; left: 50%; transform: translateX(-50%); }
		.furn-handle-s { bottom: -11px; left: 50%; transform: translateX(-50%); }
		.furn-handle-e { right: -11px; top: 50%; transform: translateY(-50%); }
		.furn-handle-w { left: -11px; top: 50%; transform: translateY(-50%); }
		.furn-handle-ne { top: -11px; right: -11px; }
		.furn-handle-nw { top: -11px; left: -11px; }
		.furn-handle-se { bottom: -11px; right: -11px; }
		.furn-handle-sw { bottom: -11px; left: -11px; }

		/* Transparent >=44px centered touch hit area on each interactive handle.
		   Uses ::after (the visible nub uses ::before on .furn-handle, and is the
		   element's own circle on the rotate/delete handles). Does not change any
		   handle geometry/offset or the drag/rotate/delete math. */
		@media (max-width: 819px) {
			.furn-handle::after,
			.furn-rotate-handle::after,
			.furn-delete-btn::after {
				content: "";
				position: absolute;
				top: 50%;
				left: 50%;
				width: 44px;
				height: 44px;
				transform: translate(-50%, -50%);
				/* transparent — just enlarges the touch hit target */
			}
		}

		.furn-rotate-stem {
			position: absolute;
			top: -38px;
			left: 50%;
			transform: translateX(-50%);
			width: 2px;
			height: 38px;
			background: var(--epp-accent, var(--primary-color, #03a9f4));
			pointer-events: none;
		}

		/* z-index: 3 keeps the rotate/delete buttons (and their mobile 44px
		   ::after hit-areas) above the resize handles (z-index: 2) — otherwise
		   the NE resize handle's hit-area paints on top of the delete button and
		   swallows taps on the visible X. Delete is pushed further out diagonally
		   and rotate lifted higher so their visible discs no longer overlap each
		   other or the NE corner handle on small items. */
		.furn-rotate-handle {
			position: absolute;
			top: -54px;
			left: 50%;
			transform: translateX(-50%);
			width: 20px;
			height: 20px;
			background: var(--epp-accent, var(--primary-color, #03a9f4));
			border: 2px solid var(--epp-accent-text, #fff);
			border-radius: 50%;
			display: flex;
			align-items: center;
			justify-content: center;
			cursor: grab;
			pointer-events: auto;
			color: var(--epp-accent-text, #fff);
			touch-action: none;
			z-index: 3;
		}

		.furn-delete-btn {
			position: absolute;
			top: -34px;
			right: -16px;
			width: 20px;
			height: 20px;
			background: var(--epp-danger, var(--error-color, #f44336));
			border: 1px solid var(--epp-accent-text, #fff);
			border-radius: 50%;
			display: flex;
			align-items: center;
			justify-content: center;
			cursor: pointer;
			pointer-events: auto;
			color: var(--epp-accent-text, #fff);
			touch-action: none;
			z-index: 3;
		}
	`,e([pe({attribute:!1})],Ho.prototype,"furniture",void 0),e([pe({attribute:!1})],Ho.prototype,"selectedFurnitureId",void 0),e([pe({type:Number})],Ho.prototype,"roomWidth",void 0),e([pe({type:Number})],Ho.prototype,"cellPx",void 0),e([pe({type:Number})],Ho.prototype,"gapPx",void 0),e([pe({type:Number})],Ho.prototype,"minCol",void 0),e([pe({type:Number})],Ho.prototype,"minRow",void 0),e([pe({type:Number})],Ho.prototype,"visCols",void 0),e([pe({type:Number})],Ho.prototype,"visRows",void 0),e([pe({attribute:!1})],Ho.prototype,"sidebarTab",void 0),e([pe({attribute:!1})],Ho.prototype,"localize",void 0),e([pe({attribute:!1})],Ho.prototype,"furnitureTones",void 0),e([me()],Ho.prototype,"_isNarrow",void 0),customElements.get("epp-furniture-overlay")||customElements.define("epp-furniture-overlay",Ho);const Bo={[ve]:`background-image: ${Ze(1,6)};`,[be]:`background-image: ${Ze(2,5)};`,[ye]:`background-image: ${Ze(3,5)};`};class Mo extends ce{constructor(){super(...arguments),this.grid=new Uint8Array(0),this.zoneConfigs=[],this.targets=[],this.roomWidth=0,this.roomDepth=0,this.perspective=null,this.furniture=[],this.selectedFurnitureId=null,this.sidebarTab="zones",this.editable=!1,this.activeZone=null,this.occupancy={},this.targetPrevXY=[],this.localize=Ao,this.maxRangeMm=Ce,this.maxGridPx=480,this.showOverlays=!0,this.showDimensions=!0,this.showSignal=!0,this.plain=!1,this.fill=!1,this.fadeUncovered=!1,this.mobile=!1,this.dismissedTargets=new Map,this.frozenBounds=null,this.heatmapCells=[],this.showHeatmap=!1,this.trails=[],this.floorPlanOpacity=1,this._planError=!1,this._availPx=0,this._availHeightPx=0,this._onResize=()=>{this._measureAvail()},this._fovCache=null,this._fovPerspective=Mo._FOV_UNCACHED,this._scanCache=null,this._lastEnterIdx=-1,this._onStrokeEnd=()=>{this._lastEnterIdx=-1,this.dispatchEvent(new CustomEvent("cell-paint",{detail:{action:"up"},bubbles:!0,composed:!0}))},this._onPlanError=()=>{this._planError=!0}}connectedCallback(){super.connectedCallback(),"undefined"!=typeof ResizeObserver&&(this._ro=new ResizeObserver(()=>{this._measureAvail()}),this._ro.observe(this)),window.addEventListener("resize",this._onResize)}disconnectedCallback(){super.disconnectedCallback(),this._ro?.disconnect(),window.removeEventListener("resize",this._onResize),void 0!==this._settleRaf&&(cancelAnimationFrame(this._settleRaf),this._settleRaf=void 0)}firstUpdated(){this._measureAvail(),"undefined"!=typeof requestAnimationFrame&&(this._settleRaf=requestAnimationFrame(()=>{this._settleRaf=void 0,this.isConnected&&this._measureAvail()}))}updated(e){this._measureAvail(),this._updateFurnitureTones(e)}_updateFurnitureTones(e){if(!this.furniture.length)return void(this._furnitureTones=void 0);if(!(e.has("furniture")||e.has("grid")||e.has("zoneConfigs")||e.has("roomColor")||e.has("roomWidth")||e.has("roomDepth")||e.has("plain")||e.has("perspective")||e.has("maxRangeMm")||e.has("frozenBounds"))&&void 0!==this._furnitureTones)return;this._furnitureTones=function(e,t,o,r){const n=new Map;for(const i of e){const e=Me(i.x+i.width/2,i.y+i.height/2,t,o);if(!e)continue;const a=Ne(e);if(null===a)continue;const s=r(a);if(!s)continue;const{color:l,halo:c}=Ue(s);n.set(i.id,{color:l,halo:c})}return n}(this.furniture,this.roomWidth,this.roomDepth,e=>this._readCellRgb(e));const t=this.shadowRoot?.querySelector("epp-furniture-overlay");t&&(t.furnitureTones=this._furnitureTones)}_readCellRgb(e){const t=this.shadowRoot?.querySelector(`.cell[data-idx="${e}"]`);return t?function(e){const t=/^rgba?\(\s*([0-9.]+)[\s,]+([0-9.]+)[\s,]+([0-9.]+)/i.exec(e);if(!t)return null;const o=[Number(t[1]),Number(t[2]),Number(t[3])];return De(o)?o:null}(getComputedStyle(t).backgroundColor):null}_measureAvail(){const e=this.clientWidth;if(e&&Math.abs(e-this._availPx)>=1&&(this._availPx=e),this.fill)return void(this._availHeightPx=0);const t=Math.floor(this.clientHeight-this._captionBlockPx()),o=this.clientWidth>0||this.clientHeight>0,r=t>0?t:o?1:0;Math.abs(r-this._availHeightPx)>=1&&(this._availHeightPx=r)}_captionBlockPx(){const e=this.shadowRoot?.querySelector(".grid-dimensions");return e?(this._captionMarginPx??=Number.parseFloat(getComputedStyle(e).marginTop)||0,e.offsetHeight+this._captionMarginPx):0}remeasure(){this._measureAvail()}willUpdate(e){if(e.has("floorPlan")&&(this._planError=!1),(e.has("targets")||e.has("dismissedTargets")||e.has("roomWidth")||e.has("roomDepth"))&&0!==this.dismissedTargets.size)for(const[e,t]of this.dismissedTargets){const o=this.targets[e];if(!o||"inactive"===o.status||null==o.x||null==o.y)continue;const r=Me(o.x,o.y,this.roomWidth,this.roomDepth);if(!r)continue;Ne(r)!==t&&this.dispatchEvent(new CustomEvent("target-undismissed",{detail:{targetIndex:e},bubbles:!0,composed:!0}))}}render(){const e=this._getScan(),t=this.frozenBounds??e.bounds,o=t.minCol>t.maxCol,r=o?0:t.minCol,n=o?19:t.maxCol,i=o?0:t.minRow,a=o?19:t.maxRow,s=n-r+1,l=a-i+1,c=this.plain?0:1,d=this._availPx>0?4+(s-1)*c:0,h=!this.mobile,u=this.fill&&this._availPx>0,p=u?Number.POSITIVE_INFINITY:h?960:this.maxGridPx,m=u?Number.POSITIVE_INFINITY:h?48:32,_=this.fill?0:this._availHeightPx,f=_>0?4+(l-1)*c:0,g=function(e,t,o,r,n,i=32){const a=Math.min(Math.floor(e/r),Math.floor(e/n),i),s=t>0?Math.min(a,Math.floor(t/r)):a,l=o>0?Math.floor(o/n):Number.POSITIVE_INFINITY;return Math.max(1,Math.min(s,l,i))}(p,this._availPx>0?Math.max(1,this._availPx-d):this._availPx,_>0?Math.max(1,_-f):0,s,l,m);return G`
			<div class="grid-targets-wrapper">
				${this._renderFloorPlan(e.rawBounds,r,i,s,l)}
				<div
					class="grid"
					style="grid-template-columns: repeat(${s}, ${g}px); grid-template-rows: repeat(${l}, ${g}px);"
					@pointerup=${this.editable?this._onStrokeEnd:Z}
					@pointercancel=${this.editable?this._onStrokeEnd:Z}
				>
					${this._renderVisibleCells(e.status,r,n,i,a,g,e.rawBounds)}
				</div>
				${this._renderFurnitureOverlay(g,c,r,i,s,l)}
				${this._renderTargetDots(r,n,i,a,s,l)}
				${this._renderHeatmap(g,r,i,s,l)}
			</div>
			${this.showDimensions?this._renderGridDimensions(e.metrics):Z}
		`}_getSensorFov(){return this.perspective?(this._fovPerspective===this.perspective||(this._fovCache=function(e){const t=Qe(e,0,0),o=Qe(e,0,1e3),r=o.x-t.x,n=o.y-t.y,i=Math.sqrt(r*r+n*n);return!Number.isFinite(i)||i<1e-6?null:{sensorPos:t,dirX:r/i,dirY:n/i}}(this.perspective),this._fovPerspective=this.perspective),this._fovCache):null}_getScan(){const e=this._getSensorFov(),t=this._scanCache;if(t&&t.grid===this.grid&&t.fov===e&&t.perspective===this.perspective&&t.roomWidth===this.roomWidth&&t.maxRangeMm===this.maxRangeMm&&t.showDimensions===this.showDimensions)return t;const o=new Array(xe);for(let t=0;t<ke;t++)for(let r=0;r<we;r++)o[t*we+r]=Xe(r,t,e,this.roomWidth,this.maxRangeMm);return this._scanCache={grid:this.grid,fov:e,perspective:this.perspective,roomWidth:this.roomWidth,maxRangeMm:this.maxRangeMm,showDimensions:this.showDimensions,status:o,bounds:Je(this.grid,e,this.roomWidth,this.maxRangeMm),rawBounds:Ae(this.grid),metrics:this.showDimensions?et(this.grid,this.roomWidth,this.perspective,e,this.maxRangeMm):null},this._scanCache}_renderVisibleCells(e,t,o,r,n,i,a){const s=this.occupancy,l=this.plain,c=this.showOverlays,d=l?[]:this.zoneConfigs,h=e=>function(e,t,o=Ge){if(!Ee(e))return"var(--secondary-background-color, #e0e0e0)";const r=Pe(e);if(r>0&&r<=7){const e=t[r-1];if(e)return e.color}return o}(e,d,this.roomColor),u=this.fadeUncovered?function(e=Ge){return`color-mix(in srgb, ${e} 88%, #808080)`}(this.roomColor):"",p=this._planActive,m=(e,t)=>e>=a.minCol&&e<=a.maxCol&&t>=a.minRow&&t<=a.maxRow,_=[];for(let a=r;a<=n;a++)for(let r=t;r<=o;r++){const t=a*we+r,o=this.grid[t],n=e[t],d="in_range"===n,f=Ee(o),g=m(r,a);let v;v=d?h(o):this.fadeUncovered?g?u:h(o):"beyond_max_range"===n&&f?"repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,0.13) 3px, rgba(0,0,0,0.13) 4px), repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(0,0,0,0.13) 3px, rgba(0,0,0,0.13) 4px), #fff":"beyond_max_range"===n?h(o):"repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,0.13) 3px, rgba(0,0,0,0.13) 4px), repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(0,0,0,0.13) 3px, rgba(0,0,0,0.13) 4px), #c8c8c8",p&&l&&g&&(v="transparent");let b="";if(!l&&d&&f){const e=Pe(o);if(s[e]){const t=e>0?this.zoneConfigs[e-1]?.color:null;b=`position: relative; z-index: 1; box-shadow: 0 0 8px 1px color-mix(in srgb, ${t??"#999"} 60%, ${t?"#222":"#444"});`}}const y=!l&&c&&d&&f?Bo[Se(o)]??"":"",w=this.editable&&d;_.push(G`
					<div
						class="cell"
						data-idx="${t}"
						style="background: ${v}; width: ${i}px; height: ${i}px; ${b} ${y}"
						@pointerdown=${w?e=>this._onCellPointerDown(t,e):Z}
						@pointerenter=${w?()=>this._onCellPointerEnter(t):Z}
					></div>
				`)}return _}_onCellPointerDown(e,t){const o=t.target;o?.hasPointerCapture?.(t.pointerId)&&o.releasePointerCapture(t.pointerId),this._lastEnterIdx=-1,this.dispatchEvent(new CustomEvent("cell-paint",{detail:{index:e,action:"down"},bubbles:!0,composed:!0}))}_onCellPointerEnter(e){e!==this._lastEnterIdx&&(this._lastEnterIdx=e,this.dispatchEvent(new CustomEvent("cell-paint",{detail:{index:e,action:"enter"},bubbles:!0,composed:!0})))}_renderTargetDots(e,t,o,r,n,i){const a=[],s=Math.min(this.targets.length,3);for(let l=0;l<s;l++)a.push(this._renderTargetDot(this.targets[l],l,e,t,o,r,n,i));return G`
			<div class="targets-overlay" style="pointer-events: none;">${a}</div>
		`}_renderTargetDot(e,t,o,r,n,i,a,s){if("inactive"===e.status)return Z;const l=e=>null!==e&&e.col>=o&&e.col<=r&&e.row>=n&&e.row<=i;let c=null!=e.x&&null!=e.y?Me(e.x,e.y,this.roomWidth,this.roomDepth):null;if("pending"===e.status&&!l(c)&&this.targetPrevXY[t]&&(c=Me(this.targetPrevXY[t].x,this.targetPrevXY[t].y,this.roomWidth,this.roomDepth)),null===c||!l(c))return Z;const d=Math.max(0,Math.min(100,(c.col-o)/a*100)),h=Math.max(0,Math.min(100,(c.row-n)/s*100)),u=Ne(c);if(null!==u&&this.dismissedTargets.get(t)===u)return Z;if(null!==u&&u<this.grid.length){const e=Se(this.grid[u]);if(2===e||3===e){const e=Pe(this.grid[u]);if(!this.occupancy[e])return Z}}const p="pending"===e.status?.3:1;return G`
			<div
				class="target-dot ${this.editable?"":"clickable"}"
				style="left: ${d}%; top: ${h}%; background: ${Be[t]}; opacity: ${p}; transition: opacity 0.5s ease;"
				@click=${o=>{if(this.editable)return;o.stopPropagation();const r=o.currentTarget.getBoundingClientRect();this.dispatchEvent(new CustomEvent("target-click",{detail:{targetIndex:t,x:e.x,y:e.y,clientX:r.left+r.width/2,clientY:r.top+r.height/2},bubbles:!0,composed:!0}))}}
			></div>
			${this.showSignal&&"active"===e.status&&e.signal>0?G`
						<div style="position: absolute; left: ${d}%; top: ${h}%; transform: translate(-50%, -280%); background: rgba(0,0,0,0.7); color: #fff; font-size: 10px; font-weight: bold; padding: 0 4px; border-radius: 6px; pointer-events: none;">
							${e.signal}
						</div>
					`:Z}
		`}get _planActive(){return!!this.floorPlan&&!this._planError}_renderFloorPlan(e,t,o,r,n){if(!this._planActive||!this.plain)return Z;if(e.minCol>e.maxCol)return Z;const i=function(e,t,o,r,n){return{leftPct:(e.minCol-t)/r*100,topPct:(e.minRow-o)/n*100,widthPct:(e.maxCol-e.minCol+1)/r*100,heightPct:(e.maxRow-e.minRow+1)/n*100}}(e,t,o,r,n),a=Math.max(0,Math.min(1,this.floorPlanOpacity));return G`
			<div
				class="floor-plan"
				style="left:${i.leftPct}%;top:${i.topPct}%;width:${i.widthPct}%;height:${i.heightPct}%;opacity:${a};"
			>
				<img src=${this.floorPlan} alt="" @error=${this._onPlanError} />
			</div>
		`}_renderHeatmap(e,t,o,r,n){if(!this.showHeatmap)return Z;const i=this.heatmapCells,a=[];for(let s=0;s<i.length;s++){const l=i[s];if(!l)continue;const c=(s%we+.5-t)/r*100,d=(Math.floor(s/we)+.5-o)/n*100;c<0||c>100||d<0||d>100||a.push(G`<div
				class="heat-cell"
				style="left:${c}%;top:${d}%;width:${e}px;height:${e}px;background:${Ke(l)};"
			></div>`)}return G`<div class="heatmap-overlay">
			${a}
			${this._renderTrails(t,o,r,n)}
		</div>`}_renderTrails(e,t,o,r){const n=this.trails.map(n=>this._trailPolyline(n,e,t,o,r)).filter(e=>null!==e);return 0===n.length?Z:G`<svg class="trail" viewBox="0 0 100 100" preserveAspectRatio="none">${n}</svg>`}_trailPolyline(e,t,o,r,n){if(e.length<2)return null;const i=e.map(e=>{const i=Me(e.x,e.y,this.roomWidth,this.roomDepth);if(!i)return null;return`${(i.col-t)/r*100},${(i.row-o)/n*100}`}).filter(e=>null!==e);return i.length<2?null:W`<polyline
			points=${i.join(" ")}
			fill="none" stroke="rgba(3,169,244,0.7)" stroke-width="0.6"
			stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"
		/>`}_renderGridDimensions(e){return e?G`
			<div class="grid-dimensions">
				${this.localize("live.grid_dimensions",{width:e.widthM,depth:e.depthM,furthest:e.furthestM})}
			</div>
		`:Z}_renderFurnitureOverlay(e,t,o,r,n,i){return this.furniture.length?G`
			<epp-furniture-overlay
				.furniture=${this.furniture}
				.selectedFurnitureId=${this.selectedFurnitureId}
				.roomWidth=${this.roomWidth}
				.cellPx=${e}
				.gapPx=${t}
				.minCol=${o}
				.minRow=${r}
				.visCols=${n}
				.visRows=${i}
				.sidebarTab=${this.sidebarTab}
				.localize=${this.localize}
				.furnitureTones=${this._furnitureTones}
			></epp-furniture-overlay>
		`:Z}}Mo.styles=a`
		:host {
			/* A centred flex column holding the map and its dimensions caption. The
			   panel makes our container (.grid-container) flex:1 of a height-bounded
			   column, so the box we're given is usually TALLER than the map — the
			   card is the "expansion area" that shows the space the map can use, and
			   the map floats in the middle of it. align-items does the horizontal
			   centring the old \`text-align: center\` used to do (.grid-targets-wrapper
			   is a flex item now, so it no longer shrink-wraps its own line box; it
			   would otherwise stretch, or hug the left edge, whenever the map is
			   narrower than the column). The absolutely-positioned overlays are
			   relative to the wrapper, so centring the wrapper moves the whole
			   positioning context together — overlay maths is unaffected. */
			display: flex;
			flex-direction: column;
			justify-content: center;
			align-items: center;
		}

		/* Never let flex SHRINK these: a transient over-tall map (measured budget
		   one frame stale) would otherwise be squashed into the wrapper's
		   overflow:hidden and clipped, instead of simply overhanging for a frame
		   and self-correcting on the next measure. */
		.grid-targets-wrapper,
		.grid-dimensions {
			flex: 0 0 auto;
		}

		.grid-targets-wrapper {
			position: relative;
			/* Defensive reset, not a fix for our own CSS: the host no longer sets
			   text-align itself (it centres via align-items on the flex column —
			   see :host above), so there's nothing of ours to reset here. But
			   text-align is inherited, and the host's own used value still
			   depends on whatever its light-DOM ancestor sets — a centred or
			   right-aligned ancestor outside our shadow boundary could otherwise
			   leak through into the grid-dimensions caption / cell content. Pin
			   it here regardless. */
			text-align: left;
			/* Own the overlay z-indexes. The targets (z-index 20), furniture (15)
			   and heatmap (15) overlays are absolutely positioned with positive
			   z-indexes; without a stacking context here those values leak to the
			   page root and outrank HA's sticky dashboard header (a small z-index),
			   so a tall card scrolled under the header paints its furniture over the
			   toolbar. container-type on the card host does NOT create a stacking
			   context (verified), so isolate here. */
			isolation: isolate;
		}

		:host(:not([editable])) .grid-targets-wrapper {
			overflow: hidden;
		}

		/* Floor-plan background layer. Positioned in the same percentage space
		   as the target dots (see planRectPct) so plan and targets align; sits
		   below the grid (z 1) and the furniture/target overlays (15/20). */
		.floor-plan {
			position: absolute;
			z-index: 0;
			overflow: hidden;
			pointer-events: none;
		}
		.floor-plan img {
			width: 100%;
			height: 100%;
			object-fit: fill;
			display: block;
		}

		.grid {
			display: grid;
			gap: 1px;
			background: var(--divider-color, #e0e0e0);
			border: 2px solid var(--divider-color, #e0e0e0);
			border-radius: 8px;
			overflow: hidden;
			user-select: none;
			position: relative;
			z-index: 1;
		}

		/* Clean-map mode: no gridlines. The 1px gaps + divider background that
		   draw the graph-paper lines collapse, so cells merge into smooth
		   in/out-of-range regions; the border stays as the map frame. */
		:host([plain]) .grid {
			gap: 0;
			background: transparent;
		}

		/* Paint strokes must own the touch gesture — otherwise the browser
		   claims it for scrolling and fires pointercancel mid-stroke. The
		   live grid stays scrollable. */
		:host([editable]) .grid {
			touch-action: none;
		}

		.cell {
			transition: opacity 0.1s;
		}

		:host([editable]) .cell {
			cursor: pointer;
		}

		:host([editable]) .cell:hover {
			opacity: 0.75;
		}

		.targets-overlay {
			position: absolute;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			pointer-events: none;
			z-index: 20;
		}

		.target-dot {
			position: absolute;
			width: 14px;
			height: 14px;
			border-radius: 50%;
			background: var(--primary-color, #03a9f4);
			border: 2px solid var(--card-background-color, #fff);
			box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
			transform: translate(-50%, -50%);
			z-index: 10;
			pointer-events: auto;
		}

		.target-dot.clickable {
			cursor: pointer;
		}

		:host([editable]) .target-dot {
			pointer-events: none;
		}

		.target-dot.moving {
			background: #4caf50;
		}

		.target-dot.stationary {
			background: #ff9800;
		}

		.heatmap-overlay {
			position: absolute;
			inset: 0;
			pointer-events: none;
			z-index: 15;
		}

		.heat-cell {
			position: absolute;
			transform: translate(-50%, -50%);
		}

		.trail {
			position: absolute;
			inset: 0;
			overflow: visible;
		}

		.grid-dimensions {
			text-align: center;
			font-size: 12px;
			color: var(--secondary-text-color, #757575);
			margin-top: 8px;
		}
	`,Mo._FOV_UNCACHED={},e([pe({attribute:!1})],Mo.prototype,"grid",void 0),e([pe({attribute:!1})],Mo.prototype,"zoneConfigs",void 0),e([pe({attribute:!1})],Mo.prototype,"targets",void 0),e([pe({type:Number})],Mo.prototype,"roomWidth",void 0),e([pe({type:Number})],Mo.prototype,"roomDepth",void 0),e([pe({attribute:!1})],Mo.prototype,"perspective",void 0),e([pe({attribute:!1})],Mo.prototype,"furniture",void 0),e([pe({attribute:!1})],Mo.prototype,"selectedFurnitureId",void 0),e([pe({attribute:!1})],Mo.prototype,"sidebarTab",void 0),e([pe({type:Boolean,reflect:!0})],Mo.prototype,"editable",void 0),e([pe({attribute:!1})],Mo.prototype,"activeZone",void 0),e([pe({attribute:!1})],Mo.prototype,"occupancy",void 0),e([pe({attribute:!1})],Mo.prototype,"targetPrevXY",void 0),e([pe({attribute:!1})],Mo.prototype,"localize",void 0),e([pe({type:Number})],Mo.prototype,"maxRangeMm",void 0),e([pe({type:Number})],Mo.prototype,"maxGridPx",void 0),e([pe({type:Boolean})],Mo.prototype,"showOverlays",void 0),e([pe({type:Boolean})],Mo.prototype,"showDimensions",void 0),e([pe({type:Boolean})],Mo.prototype,"showSignal",void 0),e([pe({type:Boolean,reflect:!0})],Mo.prototype,"plain",void 0),e([pe({attribute:!1})],Mo.prototype,"roomColor",void 0),e([pe({type:Boolean})],Mo.prototype,"fill",void 0),e([pe({type:Boolean})],Mo.prototype,"fadeUncovered",void 0),e([pe({type:Boolean})],Mo.prototype,"mobile",void 0),e([pe({attribute:!1})],Mo.prototype,"dismissedTargets",void 0),e([pe({attribute:!1})],Mo.prototype,"frozenBounds",void 0),e([pe({attribute:!1})],Mo.prototype,"heatmapCells",void 0),e([pe({type:Boolean})],Mo.prototype,"showHeatmap",void 0),e([pe({attribute:!1})],Mo.prototype,"trails",void 0),e([pe({attribute:!1})],Mo.prototype,"floorPlan",void 0),e([pe({type:Number})],Mo.prototype,"floorPlanOpacity",void 0),e([me()],Mo.prototype,"_planError",void 0),e([me()],Mo.prototype,"_availPx",void 0),e([me()],Mo.prototype,"_availHeightPx",void 0),e([me()],Mo.prototype,"_furnitureTones",void 0),customElements.get("epp-grid")||customElements.define("epp-grid",Mo);let No=null;class Ro extends ce{constructor(){super(...arguments),this.text="",this.localize=Ao,this._onKeydown=e=>{"Escape"===e.key&&this._close()},this._onViewportChange=()=>{this._close()},this._onPointerDown=e=>{e.composedPath().includes(this)||this._close()}}render(){return G`<button
			type="button"
			aria-label=${this.localize("settings.show_info")}
			aria-describedby="tip"
			title=${this.localize("settings.show_info")}
			@click=${this._toggle}
		><ha-icon icon="mdi:help-circle-outline"></ha-icon><span id="tip" class="info-tip-tooltip" role="tooltip">${this.text}</span></button>`}get _tooltip(){return this.shadowRoot?.querySelector(".info-tip-tooltip")??null}_toggle(e){e.stopPropagation();const t=No===this;if(No?._close(),t)return;const o=this._tooltip,r=e.currentTarget.getBoundingClientRect();o.style.display="block",o.style.left=`${Math.max(8,Math.min(r.right-240,window.innerWidth-256))}px`,o.style.top=`${r.bottom+6}px`,No=this,this._attachListeners()}_close(){const e=this._tooltip;e&&(e.style.display="none"),No===this&&(No=null),this._detachListeners()}_attachListeners(){document.addEventListener("keydown",this._onKeydown),document.addEventListener("pointerdown",this._onPointerDown,!0),window.addEventListener("scroll",this._onViewportChange,!0),window.addEventListener("resize",this._onViewportChange)}_detachListeners(){document.removeEventListener("keydown",this._onKeydown),document.removeEventListener("pointerdown",this._onPointerDown,!0),window.removeEventListener("scroll",this._onViewportChange,!0),window.removeEventListener("resize",this._onViewportChange)}disconnectedCallback(){super.disconnectedCallback(),this._close()}}Ro.styles=[a`
      :host {
        display: inline-flex;
        align-items: center;
        flex-shrink: 0;
        pointer-events: auto;
        opacity: 1;
      }

      button {
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        color: var(--epp-text-muted, var(--secondary-text-color, #757575));
        font: inherit;
      }

      button:hover {
        color: var(--epp-accent, var(--primary-color, #03a9f4));
      }

      ha-icon {
        --mdc-icon-size: 18px;
      }

      .info-tip-tooltip {
        display: none;
        position: fixed;
        background: var(--epp-surface, var(--card-background-color, #fff));
        border: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
        border-radius: var(--epp-radius-md, 10px);
        padding: var(--epp-space-2, 8px) var(--epp-space-3, 12px);
        font-size: var(--epp-font-xs, 12px);
        color: var(--epp-text, var(--primary-text-color, #212121));
        box-shadow: var(--epp-elevation-1, 0 2px 8px rgba(0, 0, 0, 0.12));
        white-space: normal;
        width: 240px;
        z-index: 9999;
        line-height: 1.4;
        pointer-events: none;
        text-align: left;
      }
    `],e([pe({type:String})],Ro.prototype,"text",void 0),e([pe({attribute:!1})],Ro.prototype,"localize",void 0),customElements.get("epp-info-tip")||customElements.define("epp-info-tip",Ro);class Lo extends ce{constructor(){super(...arguments),this.sensorState={occupancy:!1,static_presence:!1,motion_presence:!1,target_presence:!1,mmwave:!1,illuminance:null,temperature:null,humidity:null,co2:null},this.zoneState={occupancy:{},target_counts:{},frame_count:0},this.zoneConfigs=[],this.hasPerspective=!1,this.localize=Ao,this.presenceKeys=null,this.showZones=!0,this.envKeys=null,this.interactive=!0,this.showInfoTips=!0}_renderRow(e){const t=void 0!==e.color?G`
					<div
						class="live-sensor-dot"
						style=${e.color?`background: ${e.color};${e.on?` box-shadow: 0 0 6px 2px ${e.color};`:""}`:"background: #fff; border: 1px solid #ccc;"+(e.on?" box-shadow: 0 0 6px 2px #999;":"")}
					></div>
				`:G`<div class="live-sensor-dot ${e.on?"on":"off"}"></div>`;return G`
			<div class="live-sensor-row">
				${t}
				<span class="live-sensor-label">${e.label}</span>
				<span class="live-sensor-state ${e.on?"detected":""}">${e.on?this.localize("live.detected"):this.localize("live.clear")}</span>
				${this.showInfoTips?G`<epp-info-tip .text=${e.info} .localize=${this.localize}></epp-info-tip>`:Z}
			</div>
		`}render(){const e=this.sensorState,t=this.zoneState,o=[{id:"occupancy",label:this.localize("live.occupancy"),on:e.occupancy_state??e.occupancy,info:this.localize("info.occupancy")},{id:"static_presence",label:this.localize("live.static_presence"),on:e.static_state?"I"!==e.static_state:e.static_presence,info:this.localize("info.static_presence")},{id:"motion_presence",label:this.localize("live.motion_presence"),on:e.motion_state?"I"!==e.motion_state:e.motion_presence,info:this.localize("info.motion_presence")},{id:"target_presence",label:this.localize("live.target_presence"),on:e.target_presence,info:this.localize("info.target_presence")},{id:"mmwave",label:this.localize("live.mmwave"),on:e.mmwave,info:this.localize("info.mmwave")}],r=this.presenceKeys?o.filter(e=>this.presenceKeys?.includes(e.id)):o,n=[],i=t.occupancy[0]??!1,a=t.target_counts[0]??0;n.push({id:"zone_0",label:this.localize("sidebar.rest_of_room"),on:i,info:this.localize("info.rest_of_room_occupancy",{count:a}),color:null});for(let e=0;e<7;e++){const o=this.zoneConfigs[e];if(!o)continue;const r=e+1,i=t.occupancy[r]??!1,a=t.target_counts[r]??0;n.push({id:`zone_${r}`,label:o.name,on:i,info:this.localize("info.zone_occupancy",{slot:r,count:a}),color:o.color})}const s=[];null!==e.illuminance&&s.push({id:"illuminance",label:this.localize("entities.illuminance"),value:this.localize("live.illuminance_value",{value:e.illuminance})}),null!==e.temperature&&s.push({id:"temperature",label:this.localize("entities.temperature"),value:this.localize("live.temperature_value",{value:e.temperature})}),null!==e.humidity&&s.push({id:"humidity",label:this.localize("entities.humidity"),value:this.localize("live.humidity_value",{value:e.humidity})}),null!==e.co2&&s.push({id:"co2",label:this.localize("entities.co2"),value:this.localize("live.co2_value",{value:e.co2})});const l=this.envKeys?s.filter(e=>this.envKeys?.includes(e.id)):s,c=r.length>0,d=this.showZones&&this.hasPerspective,h=l.length>0,u=G`<hr style="border: none; border-top: 1px solid var(--divider-color, #eee); margin: 10px 12px;"/>`,p=this.interactive?G`<button class="live-section-header live-section-link" @click=${()=>{this.dispatchEvent(new CustomEvent("view-change",{detail:{view:"editor",sidebarTab:"zones"},bubbles:!0,composed:!0}))}}>${this.localize("sidebar.detection_zones")}</button>`:G`<div class="live-section-header">${this.localize("sidebar.detection_zones")}</div>`;return G`
      <div style="padding: 8px 0;">
        ${c?G`<div class="live-section-header">${this.localize("live.presence")}</div>
            ${r.map(e=>this._renderRow(e))}`:Z}
        ${d?G`${c?u:Z}${p}
            ${n.map(e=>this._renderRow(e))}`:Z}
        ${h?G`${c||d?u:Z}
            <div class="live-section-header">${this.localize("live.environment")}</div>
            ${l.map(e=>G`
              <div class="live-sensor-row">
                <span class="live-sensor-label">${e.label}</span>
                <span class="live-sensor-value">${e.value}</span>
              </div>`)}`:Z}
      </div>
    `}}Lo.styles=a`
    :host {
      display: block;
    }

    .live-section-link {
      cursor: pointer;
      background: none;
      border: none;
      color: var(--epp-accent, var(--primary-color, #03a9f4));
    }

    .live-section-link:hover {
      text-decoration: underline;
    }

    .live-section-header {
      font-size: 11px;
      font-weight: 600;
      color: var(--epp-text-muted, var(--secondary-text-color, #888));
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: var(--epp-space-1, 4px) var(--epp-space-3, 12px) 6px;
    }

    .live-sensor-row {
      display: flex;
      align-items: center;
      gap: var(--epp-space-2, 8px);
      padding: 6px var(--epp-space-3, 12px);
      font-size: var(--epp-font-sm, 13px);
    }

    .live-sensor-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
      box-sizing: border-box;
    }

    .live-sensor-dot.on {
      background: var(--epp-success, var(--success-color, #4caf50));
    }

    .live-sensor-dot.off {
      background: var(--epp-text-disabled, var(--disabled-text-color, #bbb));
    }

    .live-sensor-label {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      /* Extra vertical room so a subscript (e.g. the ₂ in CO₂) isn't
         clipped by overflow: hidden, which is needed for the ellipsis. */
      line-height: 1.5;
    }

    .live-sensor-state {
      font-size: var(--epp-font-xs, 12px);
      color: var(--epp-text-muted, var(--secondary-text-color, #888));
      flex-shrink: 0;
    }

    .live-sensor-state.detected {
      color: var(--epp-success, var(--success-color, #4caf50));
      font-weight: 500;
    }

    .live-sensor-value {
      font-size: var(--epp-font-sm, 13px);
      font-weight: 500;
      color: var(--epp-text, var(--primary-text-color, #212121));
      margin-left: auto;
    }

  `,e([pe({attribute:!1})],Lo.prototype,"sensorState",void 0),e([pe({attribute:!1})],Lo.prototype,"zoneState",void 0),e([pe({attribute:!1})],Lo.prototype,"zoneConfigs",void 0),e([pe({attribute:!1})],Lo.prototype,"hasPerspective",void 0),e([pe({attribute:!1})],Lo.prototype,"localize",void 0),e([pe({attribute:!1})],Lo.prototype,"presenceKeys",void 0),e([pe({type:Boolean})],Lo.prototype,"showZones",void 0),e([pe({attribute:!1})],Lo.prototype,"envKeys",void 0),e([pe({type:Boolean})],Lo.prototype,"interactive",void 0),e([pe({type:Boolean})],Lo.prototype,"showInfoTips",void 0),customElements.get("epp-live-sidebar")||customElements.define("epp-live-sidebar",Lo);class Io extends ce{constructor(){super(...arguments),this.icon="",this.label="",this.disabled=!1,this.variant="default"}render(){return G`
      <button
        type="button"
        class=${this.variant}
        aria-label=${this.label||Z}
        ?disabled=${this.disabled}
      >
        <ha-icon icon=${this.icon}></ha-icon>
      </button>
    `}}Io.styles=a`
    :host { display: inline-flex; }
    button {
      cursor: pointer;
      border: none;
      background: transparent;
      color: var(--epp-icon-button-color, var(--epp-text-muted, var(--secondary-text-color, #757575)));
      width: var(--epp-control-height, 40px);
      height: var(--epp-control-height, 40px);
      border-radius: var(--epp-radius-md, 10px);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }
    button:hover { color: var(--epp-icon-button-color, var(--epp-text, var(--primary-text-color, #212121))); }
    .danger:hover { color: var(--epp-icon-button-color, var(--epp-danger, var(--error-color, #f44336))); }
    button:focus-visible {
      outline: var(--epp-focus-ring, 2px solid var(--primary-color, #03a9f4));
      outline-offset: 2px;
    }
    button:disabled { opacity: 0.4; cursor: not-allowed; }
    ha-icon { --mdc-icon-size: 20px; }
  `,e([pe({type:String})],Io.prototype,"icon",void 0),e([pe({type:String})],Io.prototype,"label",void 0),e([pe({type:Boolean})],Io.prototype,"disabled",void 0),e([pe({type:String})],Io.prototype,"variant",void 0),customElements.get("epp-icon-button")||customElements.define("epp-icon-button",Io),a`
  .configuration-card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: var(--epp-space-3, 12px);
  }

  .configuration-card {
    position: relative;
    border: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
    border-radius: var(--epp-radius-sm, 6px);
    overflow: hidden;
    cursor: pointer;
    transition: box-shadow 0.15s;
  }

  .configuration-card:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  }

  .configuration-card:focus-visible {
    outline: 2px solid var(--primary-color, #03a9f4);
    outline-offset: 2px;
  }

  .configuration-card-thumbnail {
    background: var(--epp-surface-2, var(--secondary-background-color, #f5f5f5));
    padding: var(--epp-space-2, 8px);
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    /* Themed ink so the currentColor floor-plan art + icon-fallback rect read
       in both light and dark mode (matches the grid furniture overlay). */
    color: var(--epp-text-muted, var(--secondary-text-color, #757575));
  }

  .configuration-card-thumbnail svg {
    width: 100%;
    height: 100%;
  }

  .configuration-card-info {
    /* 6px has no spacing token; left literal. 8px → --epp-space-2. */
    padding: 6px var(--epp-space-2, 8px);
  }

  .configuration-card-name {
    font-size: var(--epp-font-xs, 12px);
    font-weight: var(--epp-weight-medium, 500);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .configuration-card-size {
    font-size: 10px;
    color: var(--epp-text-muted, var(--secondary-text-color, #757575));
  }

  .configuration-card-delete {
    position: absolute;
    top: var(--epp-space-1, 4px);
    right: var(--epp-space-1, 4px);
    z-index: 1;
    /* fixed dark scrim so the icon stays legible over the thumbnail image,
       not themed (must stay dark in any theme) */
    background: rgba(0, 0, 0, 0.4);
    border-radius: var(--epp-radius-pill, 9999px);
    --epp-icon-button-color: #fff;
    --epp-control-height: var(--epp-control-height-sm, 32px);
  }

  .configuration-card-delete:hover {
    background: var(--epp-danger, var(--error-color, #f44336));
  }
`,a`
  .wizard-btn {
    padding: 10px 24px;
    border-radius: 10px;
    border: none;
    cursor: pointer;
    font-size: 15px;
    font-weight: 500;
  }

  .wizard-btn-primary {
    background: var(--primary-color, #03a9f4);
    color: #fff;
  }

  .wizard-btn-primary:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .wizard-btn-back {
    background: transparent;
    color: var(--secondary-text-color, #757575);
  }
`,a`
  .settings-section {
    display: flex;
    flex-direction: column;
    gap: var(--epp-space-3, 12px);
  }

  /* .setting-group is superseded by epp-card; kept for any legacy references. */
  .setting-group {
    background: var(--epp-surface, var(--card-background-color, #fff));
    border-radius: var(--epp-radius-md, 10px);
    padding: var(--epp-space-4, 16px);
    margin-bottom: var(--epp-space-3, 12px);
    border: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
  }

  .setting-group h4 {
    margin: 0 0 var(--epp-space-3, 12px);
    font-size: var(--epp-font-base, 14px);
    font-weight: var(--epp-weight-semibold, 600);
    color: var(--epp-text, var(--primary-text-color, #212121));
  }

  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    padding: var(--epp-space-2, 8px) 0;
    gap: var(--epp-space-1, 4px);
    border-bottom: 1px solid var(--epp-border, var(--divider-color, #f0f0f0));
  }

  .setting-row:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .setting-row label:not(.toggle-switch) {
    font-size: var(--epp-font-base, 14px);
    color: var(--epp-text, var(--primary-text-color, #212121));
    flex: 1;
    min-width: 120px;
  }

  .setting-input-unit {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: var(--epp-font-sm, 13px);
    color: var(--epp-text-muted, var(--secondary-text-color, #757575));
    flex: 1;
    min-width: 0;
    justify-content: flex-end;
  }

  .setting-range {
    flex: 1;
    min-width: 80px;
    accent-color: var(--primary-color, #03a9f4);
  }

  .setting-value {
    font-size: var(--epp-font-base, 14px);
    color: var(--epp-text-muted, var(--secondary-text-color, #757575));
    font-weight: var(--epp-weight-medium, 500);
    display: inline-block;
    width: 36px;
    text-align: right;
    flex-shrink: 0;
  }

  .setting-unit {
    display: inline-block;
    width: 24px;
    font-size: var(--epp-font-sm, 13px);
    color: var(--epp-text-muted, var(--secondary-text-color, #757575));
    flex-shrink: 0;
  }

  /* Mobile: give a slider row's label its own full-width line above the
     control. The control group (.setting-input-unit) is right-aligned, so
     on narrow screens its min-content (slider + value + unit) is wider than
     its flex-allotted width and overflows LEFT over the label text instead
     of wrapping. Forcing the label to 100% basis drops the slider, value,
     unit, reset and info onto the next line with room to breathe. Scoped to
     rows that actually contain a slider via :has(.setting-range) — toggle
     and select rows fit fine on one line and must not stack.
     (@media placed after the base .setting-row rules so it wins on source
     order; verify it survives in the built bundle.) */
  @media (max-width: 819px) {
    .setting-row:has(.setting-range) label:not(.toggle-switch) {
      flex-basis: 100%;
    }
  }
`;const Do=a`
  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 40px;
    min-width: 40px;
    max-width: 40px;
    height: 22px;
    flex: 0 0 40px;
  }

  .toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .toggle-slider {
    position: absolute;
    cursor: pointer;
    inset: 0;
    background-color: var(--divider-color, #ccc);
    border-radius: 22px;
    transition: background-color 0.2s;
  }

  .toggle-slider::before {
    content: "";
    position: absolute;
    height: 16px;
    width: 16px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    border-radius: 50%;
    transition: transform 0.2s;
  }

  .toggle-switch input:checked + .toggle-slider {
    background-color: var(--primary-color, #03a9f4);
  }

  .toggle-switch input:checked + .toggle-slider::before {
    transform: translateX(18px);
  }
`;a`
  .sidebar-item-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .sidebar-remove-btn {
    background: none;
    border: none;
    color: var(--secondary-text-color, #757575);
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
  }

  .sidebar-remove-btn:hover {
    color: var(--error-color, #f44336);
  }
`,a`
  .chip {
    padding: 2px var(--epp-space-2, 8px);
    border-radius: var(--epp-radius-pill, 9999px);
    background: var(--epp-accent, var(--primary-color, #03a9f4));
    color: var(--epp-accent-text, var(--text-primary-color, #fff));
    font-size: var(--epp-font-sm, 13px);
  }
  .chip.zone {
    background: var(--epp-surface-2, var(--secondary-background-color, #f5f5f5));
    color: var(--epp-text, var(--primary-text-color, #212121));
    border: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
  }
`,a`
  .save-cancel-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
  }
`,a`
  .panel-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    font-size: 20px;
    font-weight: 500;
    margin-bottom: 16px;
    text-align: center;
    /* Reserve the device picker's 56px height (the ha-select field) so the header
       can't collapse to 0 while ha-select upgrades async.

       STILL LOAD-BEARING, for a NEW reason. It used to stop a collapsed header from
       deflating the grid's viewport-relative "top" measurement. Nothing reads that
       top any more (#338: the grid measures its own BOX, never the window) — but the
       header is a SIBLING ABOVE the grid inside the height-bounded column, so a
       header that is briefly 0px hands the grid's card 56px of remainder it is about
       to lose. The grid measures that inflated box, sizes the map to it, and the map
       jumps back down a frame later when ha-select upgrades — a visible flicker on
       the live<->editor swap. Reserving the space up front means the box the grid
       measures is the box it keeps. (epp-grid's firstUpdated also schedules one
       post-layout re-measure as defence in depth; this rule is what stops the known
       case from ever needing it.)

       Intentionally unscoped (not desktop-only): the same reserve is load-bearing on
       mobile too, since the grid container-measures there as well now (#338) — a
       briefly-0px header inflates the grid's measured box on mobile just as on
       desktop. Must stay on this (cascade-winning) .panel-header rule; see the root
       cause + cascade guard in panel-layout.test.ts. */
    min-height: 56px;
  }

  .panel-header ha-select {
    --mdc-typography-subtitle1-font-size: 16px;
    --mdc-typography-subtitle1-font-weight: 500;
    min-width: 200px;
  }
`;class Oo extends ce{constructor(){super(...arguments),this.label="",this.checked=!1,this.disabled=!1,this.controlLabel="",this._onChange=e=>{e.stopPropagation();const t=e.target.checked;this.checked=t,this.dispatchEvent(new CustomEvent("value-changed",{detail:{value:t},bubbles:!0,composed:!0}))}}render(){const e=customElements.get("ha-switch")?G`<ha-switch
          data-toggle-control
          aria-label=${this.controlLabel||this.label||Z}
          .checked=${this.checked}
          .disabled=${this.disabled}
          @change=${this._onChange}
        ></ha-switch>`:G`<label class="toggle-switch">
          <input
            type="checkbox"
            data-toggle-control
            aria-label=${this.controlLabel||this.label||Z}
            .checked=${this.checked}
            .disabled=${this.disabled}
            @change=${this._onChange}
          />
          <span class="toggle-slider"></span>
        </label>`;return G`<div class="row">${this.label?G`<span class="label">${this.label}</span>`:Z}${e}</div>`}}Oo.styles=[Do,a`
      :host { display: block; }
      .row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--epp-space-3, 12px);
      }
      .label {
        font-size: var(--epp-font-base, 14px);
        color: var(--epp-text, var(--primary-text-color, #212121));
      }
    `],e([pe({type:String})],Oo.prototype,"label",void 0),e([pe({type:Boolean})],Oo.prototype,"checked",void 0),e([pe({type:Boolean})],Oo.prototype,"disabled",void 0),e([pe({attribute:"control-label"})],Oo.prototype,"controlLabel",void 0),customElements.get("epp-toggle")||customElements.define("epp-toggle",Oo);class jo extends ce{constructor(){super(...arguments),this.content="",this._onFocusIn=()=>{let e=document.activeElement;for(;e?.shadowRoot?.activeElement;)e=e.shadowRoot.activeElement;this.toggleAttribute("pointer-focus",!e?.matches(":focus-visible"))},this._onFocusOut=()=>this.removeAttribute("pointer-focus")}connectedCallback(){super.connectedCallback(),this.addEventListener("focusin",this._onFocusIn),this.addEventListener("focusout",this._onFocusOut)}disconnectedCallback(){this.removeEventListener("focusin",this._onFocusIn),this.removeEventListener("focusout",this._onFocusOut),super.disconnectedCallback()}render(){return G`
      <slot></slot>
      <span class="tip" role="tooltip">${this.content}</span>
    `}}jo.styles=a`
    :host { display: inline-flex; position: relative; }
    .tip {
      position: absolute;
      bottom: calc(100% + 6px);
      left: 50%;
      transform: translateX(-50%);
      background: var(--epp-tooltip-bg, var(--primary-text-color, #212121));
      color: var(--epp-tooltip-text, var(--card-background-color, #fff));
      border-radius: var(--epp-radius-sm, 6px);
      padding: var(--epp-space-1, 4px) var(--epp-space-2, 8px);
      font-size: var(--epp-font-xs, 12px);
      white-space: nowrap;
      box-shadow: var(--epp-elevation-1, 0 2px 8px rgba(0, 0, 0, 0.12));
      opacity: 0;
      /* visibility:hidden (not just opacity) removes it from the a11y tree
         while inactive so screen readers don't announce hidden hint text. */
      visibility: hidden;
      pointer-events: none;
      transition: opacity 0.12s, visibility 0.12s;
      z-index: 9999;
    }
    /* Hover always shows the hint. Focus shows it only when the browser deems
       the focus worth a visible affordance — otherwise clicking the trigger
       would leave the hint on screen after the pointer moved away, since the
       click also focuses it. */
    :host(:hover) .tip,
    :host(:focus-within:not([pointer-focus])) .tip { opacity: 1; visibility: visible; }
  `,e([pe({type:String})],jo.prototype,"content",void 0),customElements.get("epp-tooltip")||customElements.define("epp-tooltip",jo);class Fo{constructor(e){this._opts=e,this._unsub=null,this._conn=null,this._device=null}ensure(){const e=this._opts.getHass(),t=this._opts.getDeviceId();!e||!t||this._opts.enabled&&!this._opts.enabled()?this._teardown():this._unsub&&this._conn===e.connection&&this._device===t||(this._unsub?.(),this._conn=e.connection,this._device=t,this._opts.onResubscribe?.(),this._unsub=this._opts.subscribeFn(e,t,this._opts.onData))}dispose(){this._teardown()}_teardown(){this._unsub?.(),this._unsub=null,this._conn=null,this._device=null}}function Uo(e){if(e)try{e()}catch(e){console.debug("safeUnsub: callback threw (ignored):",e)}}const Go=new Set(["device_not_found"]);function Wo(e){const{wireType:t,initialState:o,reduce:r,onOpen:n,onReconnect:i,onError:a}=e,s=new Map;function l(e){for(const t of e.listeners)t(e.state)}function c(e,t){if(!t)return;const o=t(e.state);null!==o&&(e.state=o,l(e))}function d(e,t){if(!t||"object"!=typeof t)return;const o=t,n=r(e.state,o);null!==n&&(e.state=n,l(e)),!0===o.closed&&function(e){if(null!==e.reopenTimer)return;p(e),e.reopenAttempts=0,h(e)}(e)}function h(e){if(s.get(e.deviceId)!==e)return;if(null!==e.reopenTimer)return;const t=e.reopenAttempts++,o=Math.min(500*2**t,3e4),r=e.connection;e.reopenTimer=setTimeout(()=>{e.reopenTimer=null,u(r,e)},o+250*Math.random())}function u(e,o){o.connection=e,o.dead=!1;const r=++o.openGen;e.subscribeMessage(e=>d(o,e),{type:t,device_id:o.deviceId}).then(e=>{o.openGen===r?(o.unsubWs=e,c(o,n)):Uo(e)}).catch(e=>{o.openGen===r&&(c(o,a),!function(e){if(!e||"object"!=typeof e)return!1;const t=e.code;return"string"==typeof t&&Go.has(t)}(e)?h(o):o.dead=!0)})}function p(e){null!==e.reopenTimer&&(clearTimeout(e.reopenTimer),e.reopenTimer=null),e.openGen++,e.unsubWs&&(Uo(e.unsubWs),e.unsubWs=null)}return{subscribe:function(e,t,r){let n=s.get(t);return n?n.connection!==e.connection?(p(n),c(n,i),u(e.connection,n)):null===n.unsubWs&&null!==n.reopenTimer?(clearTimeout(n.reopenTimer),n.reopenTimer=null,n.reopenAttempts=0,h(n)):n.dead&&(n.reopenAttempts=0,u(e.connection,n)):(n={deviceId:t,state:o(),listeners:new Set,unsubWs:null,connection:null,openGen:0,reopenTimer:null,reopenAttempts:0,dead:!1},s.set(t,n),u(e.connection,n)),n.listeners.add(r),r(n.state),()=>{const e=s.get(t);e&&(e.listeners.delete(r),0===e.listeners.size&&(p(e),s.delete(t)))}}}}const Vo=Wo({wireType:"eppgrid/overview/subscribe_heatmap",initialState:()=>[],reduce:(e,t)=>Array.isArray(t.cells)?t.cells:null});function Zo(e,t,o){return Vo.subscribe(e,t,o)}const qo=Wo({wireType:"eppgrid/overview/subscribe",initialState:()=>({snapshot:null,data:null,available:!0,connected:!1}),reduce:(e,t)=>"snapshot"in t?{...e,snapshot:t.snapshot,connected:!0}:"available"in t&&!("targets"in t)?{...e,available:t.available}:"targets"in t?{...e,data:{targets:t.targets,sensors:t.sensors,zones:t.zones},available:!0}:null,onOpen:e=>({...e,connected:!0}),onReconnect:e=>({...e,connected:!1}),onError:e=>e.connected||e.available?{...e,connected:!1,available:!1}:null});function Ko(e,t,o){return qo.subscribe(e,t,o)}class Qo{constructor(e){this.text="",this._unsub=null,this._tpl=null,this._conn=null,this._varsKey=null,this._onChange=e}update(e,t,o){const r=t??"";if(!r)return this._teardown(),void this._set("");if(!((n=r).includes("{{")||n.includes("{%")||n.includes("{#")))return this._teardown(),void this._set(r);var n;if(!e)return void this._teardown();const i=JSON.stringify(o??{});this._unsub&&this._tpl===r&&this._conn===e.connection&&this._varsKey===i||(this._teardown(),this._tpl=r,this._conn=e.connection,this._varsKey=i,this._unsub=function(e,t,o){let r=null,n=!1;return e.connection.subscribeMessage(e=>{const t=e??{};o("error"in t?{text:"",error:String(t.error)}:{text:null==t.result?"":String(t.result),error:null})},{type:"render_template",template:t.template,variables:t.variables,report_errors:!0}).then(e=>{n?e():r=e},e=>{if(n)return;const t=e instanceof Error?e.message:String(e);o({text:"",error:t})}),()=>{n=!0,r&&(r(),r=null)}}(e,{template:r,variables:o},e=>this._set(null!=e.error?e.error:e.text)))}dispose(){this._teardown()}_teardown(){this._unsub?.(),this._unsub=null,this._tpl=null,this._conn=null,this._varsKey=null}_set(e){e!==this.text&&(this.text=e,this._onChange())}}const Xo={room_occupancy:!0,zone_presence:!0,room_target_presence:!1,room_static_presence:!1,room_motion_presence:!1,room_mmwave:!1,target_active:!1,target_xy:!1,target_signal:!1,target_zone:!1,zone_target_count:!1,target_count:!1,env_temperature:!1,env_humidity:!1,env_illuminance:!1,env_co2:!1},Yo={temperature_offset:0,humidity_offset:0,illuminance_offset:0,motion_timeout:5,target_auto_distance:!0,target_max_distance:6,stuck_target_timeout:300,assisted_clear_enabled:!0,assisted_clear_timeout:5,static_auto_distance:!0,static_min_distance:.3,static_max_distance:16,static_trigger_threshold:3,static_renew_threshold:3,static_timeout:30,static_on_delay:0,led_mode:"Manual Control",led_brightness:1,led_presence_color:"#CC33FF",relay_trigger_mode:"disabled",relay_contact_mode:"no",target_update_rate_ms:1e3,zone_update_rate_ms:1e3,entities:{...Xo},log_levels:{}};Object.freeze(Xo),Object.freeze(Yo.entities),Object.freeze(Yo.log_levels),Object.freeze(Yo);const Jo=["default","bed","seating","transit","custom"],er=["#B8E7FF","#CFDB70","#FFC4CF","#F3E7AC","#7CCFB8","#A0C4E7","#F3AC94"],tr={rest:"bed",thoroughfare:"transit"};function or(e){const t="string"==typeof e&&e in tr?tr[e]:e;return Jo.includes(t)?t:"default"}const rr=/^#[0-9a-fA-F]{6}$/;function nr(e){return"string"==typeof e&&rr.test(e)?e:void 0}function ir(e,t){const o="number"==typeof e?e:"string"==typeof e?Number(e):NaN;return Number.isFinite(o)?o:t}function ar(e,t){const o=ir(e,t);return o>0?o:t}function sr(e,t){return"string"==typeof e&&e.length>0?e:"number"==typeof e&&Number.isFinite(e)?String(e):t}function lr(e,t,o){if(e?.grid_bytes&&Array.isArray(e.grid_bytes)){const t=new Uint8Array(xe),o=e.grid_bytes,r=Math.min(o.length,xe);for(let e=0;e<r;e++)t[e]=o[e];return t}return t>0&&o>0?function(e,t){const o=new Uint8Array(xe),r=Math.ceil(e/ze),n=Math.ceil(t/ze),i=$e(e);for(let e=0;e<ke;e++)for(let t=0;t<we;t++)t>=i&&t<i+r&&e>=0&&e<0+n&&(o[e*we+t]=1);return o}(t,o):new Uint8Array(xe)}function cr(e,t,o){const r=e||{},n=Yo;return{temperatureOffset:r.temperature_offset??n.temperature_offset,humidityOffset:r.humidity_offset??n.humidity_offset,illuminanceOffset:r.illuminance_offset??n.illuminance_offset,motionTimeout:r.motion_timeout??n.motion_timeout,targetAutoDistance:r.target_auto_distance??n.target_auto_distance,targetMaxDistance:r.target_max_distance??n.target_max_distance,stuckTargetTimeout:r.stuck_target_timeout??n.stuck_target_timeout,assistedClearEnabled:r.assisted_clear_enabled??n.assisted_clear_enabled,assistedClearTimeout:r.assisted_clear_timeout??n.assisted_clear_timeout,staticAutoDistance:r.static_auto_distance??n.static_auto_distance,staticMinDistance:r.static_min_distance??n.static_min_distance,staticMaxDistance:r.static_max_distance??n.static_max_distance,staticTriggerThreshold:r.static_trigger_threshold??n.static_trigger_threshold,staticRenewThreshold:r.static_renew_threshold??n.static_renew_threshold,staticTimeout:r.static_timeout??n.static_timeout,staticOnDelay:Math.min(Math.max(r.static_on_delay??n.static_on_delay,0),2),entities:t||{},logLevels:o??{},ledMode:r.led_mode??n.led_mode,ledBrightness:r.led_brightness??n.led_brightness,ledPresenceColor:r.led_presence_color??n.led_presence_color,relayTriggerMode:r.relay_trigger_mode??n.relay_trigger_mode,relayContactMode:r.relay_contact_mode??n.relay_contact_mode,targetUpdateRateMs:r.target_update_rate_ms??n.target_update_rate_ms,zoneUpdateRateMs:r.zone_update_rate_ms??n.zone_update_rate_ms}}function dr(e){const t=function(e){const t=e?.calibration,o=t?.perspective,r=Array.isArray(o)&&8===o.length&&o.every(e=>"number"==typeof e&&Number.isFinite(e))&&o.some(e=>Math.abs(e)>1e-9);return r&&t.room_width>0?{perspective:o,roomWidth:t.room_width||0,roomDepth:t.room_depth||0}:{perspective:null,roomWidth:0,roomDepth:0}}(e),o=e?.room_layout||{},r=(n=o.furniture,(Array.isArray(n)?n:[]).map((e,t)=>{const o=sr(e?.type,"icon"),r="svg"===o?"svg":"text"===o?"text":"icon",n={id:sr(e?.id,`f_load_${t}`),type:r,icon:sr(e?.icon,"text"===r?"mdi:format-text":"mdi:help"),label:sr(e?.label,"text"===r?"text_label.label":"Item"),x:ir(e?.x,0),y:ir(e?.y,0),width:ar(e?.width,600),height:ar(e?.height,600),rotation:ir(e?.rotation,0),lockAspect:"boolean"==typeof e?.lockAspect?e.lockAspect:"svg"!==r};if("text"!==r)return n;const i=ut.some(t=>t.key===e?.fontFamily)?e.fontFamily:pt,a="left"===e?.align||"right"===e?.align||"center"===e?.align?e.align:mt;return{...n,text:"string"==typeof e?.text?e.text.slice(0,512):"",fontFamily:i,fontSize:(s=ir(e?.fontSize,200),Number.isFinite(s)?Math.min(3e3,Math.max(30,s)):200),color:nr(e?.color),bold:!0===e?.bold,italic:!0===e?.italic,align:a,background:nr(e?.background)};var s}));var n;const i=lr(o,t.roomWidth,t.roomDepth),{zone0:a,zones:s}=function(e){const t={zone0:{type:"default"},zones:Array(7).fill(null)},o=e?.zone_slots;if(!Array.isArray(o)||8!==o.length)return t;if(!o[0]||"object"!=typeof o[0])return t;const r={type:or(o[0].type),trigger:o[0].trigger,renew:o[0].renew,timeout:o[0].timeout,handoff_timeout:o[0].handoff_timeout},n=Array.from({length:7},(e,t)=>{const r=o[t+1];return r&&"object"==typeof r?{...r,type:or(r.type),color:(n=r.color,i=t+1,"string"==typeof n&&rr.test(n)?n:er[(i-1)%er.length])}:null;var n,i});return{zone0:r,zones:n}}(o);return{calibration:t,furniture:r,grid:i,zone0:a,zoneConfigs:s,settings:cr(e?.settings,e?.entities,e?.log_levels)}}const hr="epp_card_heatmap_enabled_";function ur(e=3){return Array.from({length:e},()=>[])}const pr=/\/eppgrid_static\/([^/]+)\/eppgrid-(?:panel|card)\.js(?:[?#]|$)/;function mr(){try{return"undefined"!=typeof sessionStorage?sessionStorage:null}catch{return null}}function _r(e,t,o){try{null===o?e?.removeItem(t):e?.setItem(t,o)}catch{}}const fr=a`
  :host {
    /* accent + semantic */
    --epp-accent: var(--primary-color, #03a9f4);
    --epp-accent-text: var(--text-primary-color, #fff);
    --epp-success: var(--success-color, #43a047);
    --epp-warning: var(--warning-color, #ff9800);
    --epp-danger: var(--error-color, #f44336);

    /* neutrals / text / surface */
    --epp-text: var(--primary-text-color, #212121);
    --epp-text-muted: var(--secondary-text-color, #757575);
    --epp-text-disabled: var(--disabled-text-color, #bdbdbd);
    --epp-border: var(--divider-color, #e0e0e0);
    --epp-surface: var(--card-background-color, #fff);
    --epp-surface-2: var(--secondary-background-color, #f5f5f5);
    /* tooltip is a contrast bubble — ink-on-paper inverted, made explicit so
       theme authors get a clean override point and a softened --epp-text can't
       silently change the tooltip background */
    --epp-tooltip-bg: var(--primary-text-color, #212121);
    --epp-tooltip-text: var(--card-background-color, #fff);

    /* furniture auto-contrast (domain colours — not themed) */
    --epp-furniture-on-dark: #eef2f7;
    --epp-furniture-on-light: #28303c;
    --epp-furniture-halo-on-dark: rgba(0, 0, 0, 0.85);
    --epp-furniture-halo-on-light: rgba(255, 255, 255, 0.95);

    /* spacing — 4px base */
    --epp-space-1: 4px;
    --epp-space-2: 8px;
    --epp-space-3: 12px;
    --epp-space-4: 16px;
    --epp-space-5: 24px;
    --epp-space-6: 32px;

    /* radius */
    --epp-radius-sm: 6px;
    --epp-radius-md: 10px;
    --epp-radius-lg: 16px;
    --epp-radius-pill: 9999px;

    /* elevation */
    --epp-elevation-1: 0 2px 8px rgba(0, 0, 0, 0.12);
    --epp-elevation-2: 0 6px 20px rgba(0, 0, 0, 0.18);

    /* type scale */
    --epp-font-xs: 12px;
    --epp-font-sm: 13px;
    --epp-font-base: 14px;
    --epp-font-md: 15px;
    --epp-font-lg: 16px;
    --epp-font-xl: 18px;
    --epp-font-2xl: 20px;
    --epp-weight-regular: 400;
    --epp-weight-medium: 500;
    --epp-weight-semibold: 600;

    /* controls / focus */
    --epp-control-height: 40px;
    --epp-control-height-sm: 32px;
    --epp-focus-ring: 2px solid var(--primary-color, #03a9f4);

    /* layout — centered reading column for non-grid views */
    --epp-content-max: 720px;
  }
`,gr=function(e){if(!e)return null;const t=pr.exec(e),o=t?.[1];return o&&"0"!==o?o:null}(import.meta.url);function vr(e){return!0===e||"on"===e?"on":"toggle"===e?"toggle":"toggle_and_clear"===e?"toggle_and_clear":"off"}function br(e){return"toggle"===e||"toggle_and_clear"===e}function yr(e){return"toggle_and_clear"===e}function wr(e){return"number"!=typeof e||Number.isNaN(e)?100:Math.max(0,Math.min(100,e))}function kr(e){const t=(e,t)=>!e||!0===e[t],o=e.sensors??{},r=o.environmental,n=o.presence;return{type:e.type??"custom:eppgrid-card",device_id:e.device_id??"",primary:e.primary??"",secondary:e.secondary??"",show_map:!1!==e.show_map,show_sensors:!1!==e.show_sensors,show_grid:!1!==e.show_grid,room_color:e.room_color,floor_plan:e.floor_plan,floor_plan_opacity:wr(e.floor_plan_opacity),layout:e.layout??"vertical",show_furniture:!1!==e.show_furniture,show_overlays:!1!==e.show_overlays,show_heatmap:vr(e.show_heatmap),sensors:{presence:{occupancy:t(n,"occupancy"),static_presence:t(n,"static_presence"),motion_presence:t(n,"motion_presence"),target_presence:t(n,"target_presence"),mmwave:t(n,"mmwave")},zones:!1!==o.zones,environmental:{temperature:t(r,"temperature"),humidity:t(r,"humidity"),illuminance:t(r,"illuminance"),co2:t(r,"co2")}}}}const xr={occupancy:!1,static_presence:!1,motion_presence:!1,target_presence:!1,mmwave:!1,illuminance:null,temperature:null,humidity:null,co2:null},zr={occupancy:{},target_counts:{},frame_count:0};class Cr extends ce{constructor(){super(...arguments),this._data={snapshot:null,data:null,available:!0,connected:!1},this._localize=Ao,this._currentBundleHash=gr,this._reloadPage=()=>location.reload(),this._bundleCheckPending=!0,this._bundleCheckInFlight=!1,this._bundleRetryMs=2e3,this._heatmapCells=[],this._targetTrails=ur(),this._heatmapOn=!1,this._showClearHeatmapDialog=!1,this._clearHeatmapError=!1,this._overviewSub=new Fo({getHass:()=>this.__hass,getDeviceId:()=>this._config?.device_id,subscribeFn:Ko,onResubscribe:()=>{this._targetTrails=ur(),this._bundleCheckPending=!0,this._maybeCheckForNewBundle()},onData:e=>{e.snapshot!==this._lastSnapshot&&(this._lastSnapshot=e.snapshot,this._parsedSnapshot=e.snapshot?dr(e.snapshot):null),this._data=e,function(e,t,o=60){for(let r=0;r<t.length&&r<e.length;r++){const n=t[r];if(null!=n.x&&null!=n.y&&"active"===n.status){const t=e[r];t.push({x:n.x,y:n.y}),t.length>o&&t.splice(0,t.length-o)}else e[r].length=0}}(this._targetTrails,e.data?.targets??[]),this.requestUpdate()}}),this._heatmapSub=new Fo({getHass:()=>this.__hass,getDeviceId:()=>this._config?.device_id,enabled:()=>this._heatmapVisible()&&!0===this._resolved?.show_map,subscribeFn:Zo,onData:e=>{this._heatmapCells=e,this.requestUpdate()}}),this._presenceKeys=null,this._envKeys=null,this._parsedSnapshot=null,this._lastSnapshot=void 0,this._primaryField=new Qo(()=>this.requestUpdate()),this._secondaryField=new Qo(()=>this.requestUpdate()),this._onHeatmapToggle=e=>{this._heatmapOn=e.detail.value;const t=this._config?.device_id;t&&function(e,t){try{localStorage.setItem(hr+e,t?"1":"0")}catch{}}(t,this._heatmapOn),this._heatmapSub.ensure()},this._onClearHeatmapClick=()=>{this._showClearHeatmapDialog=!0},this._onClearHeatmapCancel=()=>{this._showClearHeatmapDialog=!1},this._onClearHeatmapErrorDismiss=()=>{this._clearHeatmapError=!1},this._onClearHeatmapConfirm=async()=>{this._showClearHeatmapDialog=!1;const e=this._config?.device_id;if(!e)return;const t=this.__hass;try{if(!t?.callWS)throw new Error("Home Assistant connection unavailable");await t.callWS({type:"eppgrid/clear_heatmap",device_id:e}),this._heatmapCells=[],this.requestUpdate()}catch(e){console.error("Failed to clear heatmap:",e),this._clearHeatmapError=!0}}}setConfig(e){this._config=e,this._resolved=kr(e),this._heatmapOn=!(!br(this._resolved.show_heatmap)||!e.device_id)&&function(e){try{return"1"===localStorage.getItem(hr+e)}catch{return!1}}(e.device_id);const t=e?.sensors?.presence;this._presenceKeys=t?Object.keys(t).filter(e=>t[e]):null;const o=e?.sensors?.environmental;this._envKeys=o?Object.keys(o).filter(e=>o[e]):null,this._maybeResubscribe(),this._updateTemplates()}set hass(e){this.__hass=e,this._localize=To(e),this._maybeResubscribe(),this._updateTemplates(),this.requestUpdate()}get hass(){return this.__hass}connectedCallback(){super.connectedCallback(),this._maybeResubscribe(),this._maybeCheckForNewBundle()}disconnectedCallback(){super.disconnectedCallback(),this._clearBundleRetry(),this._overviewSub.dispose(),this._heatmapSub.dispose(),this._primaryField.dispose(),this._secondaryField.dispose()}_maybeResubscribe(){this._overviewSub.ensure(),this._heatmapSub.ensure()}async _maybeCheckForNewBundle(){if(this._bundleCheckPending&&!this._bundleCheckInFlight){this._bundleCheckInFlight=!0;try{await async function(e){const{currentHash:t,fetchServerHash:o,reload:r,storage:n}=e,i=e.guardKey??"eppgrid_reload_for_hash";if(!t)return!0;let a;try{a=await o()}catch{return!1}return!(null==a||"0"!==a&&(t===a?(_r(n,i,null),0):(function(e,t){try{return e?.getItem(t)??null}catch{return null}}(n,i)===a||(_r(n,i,a),r()),0)))}({currentHash:this._currentBundleHash,fetchServerHash:async()=>{const e=this.__hass,t=await(e?.callWS?.({type:"eppgrid/frontend_version"}));return t?.card_hash??null},reload:this._reloadPage,storage:mr(),guardKey:"eppgrid_reload_for_card_hash"})?(this._bundleCheckPending=!1,this._clearBundleRetry()):this._scheduleBundleRetry()}finally{this._bundleCheckInFlight=!1}}}_scheduleBundleRetry(){void 0===this._bundleRetryTimer&&this.isConnected&&(this._bundleRetryTimer=setTimeout(()=>{this._bundleRetryTimer=void 0,this._maybeCheckForNewBundle()},this._bundleRetryMs))}_clearBundleRetry(){void 0!==this._bundleRetryTimer&&(clearTimeout(this._bundleRetryTimer),this._bundleRetryTimer=void 0)}_updateTemplates(){if(!this._resolved)return;const e={config:this._config};this._primaryField.update(this.__hass,this._resolved.primary,e),this._secondaryField.update(this.__hass,this._resolved.secondary,e)}getCardSize(){const e=this._resolved??kr(this._config??{}),t=e.show_map;let o=1;return t&&(o+=6),e.show_sensors&&!t&&(o+=4),o}getGridOptions(){const e=this._resolved??kr(this._config??{}),t=e.show_map,o=e.show_sensors;return t&&o?{columns:12,rows:"auto",min_columns:6}:t?{columns:8,rows:"auto",min_columns:6}:{columns:6,rows:"auto",min_columns:4}}static getConfigElement(){return document.createElement("eppgrid-card-editor")}static getStubConfig(){return{device_id:"",show_sensors:!1}}render(){if(!this._config||!this._resolved)return Z;const e=this._resolved,t=this._primaryField.text,o=this._secondaryField.text,r=t||o?G`<div class="card-header">
						${t?G`<div class="card-primary">${t}</div>`:Z}
						${o?G`<div class="card-secondary">${o}</div>`:Z}
					</div>`:Z;if(!e.device_id)return G`<ha-card>${r}<div class="placeholder">${this._localize("card.no_device")}</div></ha-card>`;if(!e.show_map&&!e.show_sensors)return G`<ha-card>${r}<div class="placeholder">${this._localize("card.nothing_to_show")}</div></ha-card>`;const n=e.show_map&&e.show_sensors?e.layout:"single";return G`
			<ha-card>
				${r}
				${!1===this._data.available?G`<div class="offline">${this._localize("card.offline")}</div>`:Z}
				<div class="content">
					<div class="overview overview--${n}">
						${e.show_map?G`<div class="map">${this._renderMap(e)}</div>`:Z}
						${e.show_sensors?G`<div class="sensors">${this._renderSensors(e)}</div>`:Z}
					</div>
				</div>
			</ha-card>
		`}_heatmapVisible(){const e=this._resolved;return null!=e&&("on"===e.show_heatmap||br(e.show_heatmap)&&this._heatmapOn)}_renderHeatmapOverlay(e){const t=this._localize("card.heatmap_toggle"),o=this._localize("card.clear_heatmap");return G`<div class="heatmap-overlay">
			${yr(e.show_heatmap)?G`<epp-tooltip content=${o}>
							<epp-icon-button
								icon="mdi:delete-sweep"
								variant="danger"
								.label=${o}
								@click=${this._onClearHeatmapClick}
							></epp-icon-button>
						</epp-tooltip>`:Z}
			<epp-tooltip content=${t}>
				<epp-toggle
					.controlLabel=${t}
					.checked=${this._heatmapOn}
					@value-changed=${this._onHeatmapToggle}
				></epp-toggle>
			</epp-tooltip>
		</div>`}_renderClearHeatmapDialog(){return G`<epp-confirm-dialog
			.open=${this._showClearHeatmapDialog}
			.heading=${this._localize("card.clear_heatmap")}
			.message=${this._localize("card.clear_heatmap_confirm")}
			.confirmLabel=${this._localize("card.clear")}
			.cancelLabel=${this._localize("card.cancel")}
			.danger=${!0}
			@confirm=${this._onClearHeatmapConfirm}
			@cancel=${this._onClearHeatmapCancel}
		></epp-confirm-dialog>`}_renderClearHeatmapErrorDialog(){return G`<epp-confirm-dialog
			.open=${this._clearHeatmapError}
			.heading=${this._localize("card.clear_heatmap")}
			.message=${this._localize("card.clear_heatmap_error")}
			.confirmLabel=${this._localize("card.ok")}
			.danger=${!0}
			.hideCancel=${!0}
			@confirm=${this._onClearHeatmapErrorDismiss}
			@cancel=${this._onClearHeatmapErrorDismiss}
		></epp-confirm-dialog>`}_renderMap(e){if(null==this._data.snapshot)return G`<div class="placeholder">${this._localize("card.loading")}</div>`;const t=this._parsedSnapshot;if(!t||null==t.calibration.perspective)return G`<div class="placeholder">${this._localize("card.uncalibrated")}</div>`;const o=this._data.data,r=t.settings.targetAutoDistance?Ce:Math.round(1e3*t.settings.targetMaxDistance),n=this._heatmapVisible();return G`
			<epp-grid
				.grid=${t.grid}
				.zoneConfigs=${t.zoneConfigs}
				.targets=${o?.targets??[]}
				.roomWidth=${t.calibration.roomWidth}
				.roomDepth=${t.calibration.roomDepth}
				.perspective=${t.calibration.perspective}
				.furniture=${e.show_furniture?t.furniture:[]}
				.occupancy=${o?.zones?.occupancy??{}}
				.localize=${this._localize}
				.maxRangeMm=${r}
				.maxGridPx=${480}
				.showOverlays=${e.show_overlays}
				.showDimensions=${!1}
				.showSignal=${!1}
				.plain=${!!e.floor_plan||!e.show_grid}
				.roomColor=${function(e){if(De(e))return`rgb(${e[0]}, ${e[1]}, ${e[2]})`}(e.room_color)}
				.floorPlan=${e.floor_plan}
				.floorPlanOpacity=${e.floor_plan_opacity/100}
				.fill=${!0}
				.fadeUncovered=${!0}
				.heatmapCells=${n?this._heatmapCells:[]}
				.trails=${n?this._targetTrails:[]}
				?showHeatmap=${n}
			></epp-grid>
			${br(e.show_heatmap)?this._renderHeatmapOverlay(e):Z}
			${yr(e.show_heatmap)?this._renderClearHeatmapDialog():Z}
			${yr(e.show_heatmap)?this._renderClearHeatmapErrorDialog():Z}
		`}_renderSensors(e){const t=this._parsedSnapshot,o=this._data.data,r=e.sensors;return G`
			<epp-live-sidebar
				.sensorState=${o?.sensors??xr}
				.zoneState=${o?.zones??zr}
				.zoneConfigs=${t?.zoneConfigs??[]}
				.hasPerspective=${null!=t?.calibration.perspective}
				.localize=${this._localize}
				.presenceKeys=${this._presenceKeys}
				.showZones=${r.zones}
				.envKeys=${this._envKeys}
				.interactive=${!1}
				.showInfoTips=${!1}
			></epp-live-sidebar>
		`}}Cr.styles=[fr,a`
			:host {
				display: block;
				container-type: inline-size;
				--epp-card-sensors-width: 240px;
			}
			.card-header {
				padding: var(--epp-space-3) var(--epp-space-3) 0;
			}
			.card-primary {
				font-size: var(--epp-font-lg);
				font-weight: var(--epp-weight-semibold);
				color: var(--epp-text);
			}
			.card-secondary {
				font-size: var(--epp-font-sm);
				color: var(--epp-text-muted);
				margin-top: var(--epp-space-1);
			}
			.overview {
				display: flex;
				gap: var(--epp-space-3);
			}
			.overview--vertical,
			.overview--single {
				flex-direction: column;
			}
			.overview--horizontal {
				flex-direction: row;
				align-items: flex-start;
			}
			.overview--horizontal .map {
				flex: 1 1 auto;
				min-width: 0;
			}
			.overview--horizontal .sensors {
				flex: 0 0 var(--epp-card-sensors-width);
			}
			.map {
				position: relative;
			}
			.heatmap-overlay {
				position: absolute;
				right: var(--epp-space-2);
				bottom: var(--epp-space-2);
				display: inline-flex;
				align-items: center;
				gap: var(--epp-space-2);
				padding: var(--epp-space-1) var(--epp-space-2);
				background: var(--epp-surface);
				border: 1px solid var(--epp-border);
				border-radius: var(--epp-radius-pill);
			}
			/* The clear button is visually heavier than the compact toggle at the
			   default control height — scope it down so the two controls in the
			   pill line up at the same height. */
			.heatmap-overlay epp-icon-button {
				--epp-control-height: var(--epp-control-height-sm);
			}
			.content {
				padding: var(--epp-space-3);
			}
			.placeholder {
				padding: var(--epp-space-5);
				color: var(--epp-text-muted);
				text-align: center;
			}
			.offline {
				font-size: var(--epp-font-xs);
				color: var(--epp-warning);
				padding: 0 var(--epp-space-3) var(--epp-space-2);
			}
			@container (max-width: 500px) {
				/* Stack the two parts. align-items:stretch (overriding the row
				   layout's flex-start) is essential: it gives the map a definite
				   full width so the aspect-locked epp-grid fits the card instead of
				   sizing off its height path and overflowing/collapsing. flex is
				   reset to content-height so neither part grows along the column. */
				.overview--horizontal {
					flex-direction: column;
					align-items: stretch;
				}
				.overview--horizontal .map,
				.overview--horizontal .sensors {
					flex: 0 0 auto;
				}
			}
		`],e([me()],Cr.prototype,"_config",void 0),e([me()],Cr.prototype,"_data",void 0),e([me()],Cr.prototype,"_heatmapOn",void 0),e([me()],Cr.prototype,"_showClearHeatmapDialog",void 0),e([me()],Cr.prototype,"_clearHeatmapError",void 0),customElements.get("eppgrid-card")||customElements.define("eppgrid-card",Cr);let Er=null,Pr=!1;const Sr=window;Sr.customCards=Sr.customCards||[],Sr.customCards.some(e=>"eppgrid-card"===e.type)||Sr.customCards.push({type:"eppgrid-card",name:"Everything Presence Pro Grid",description:"Live overview map and sensors for an Everything Presence Pro Grid device.",preview:!0,getEntitySuggestion:function(e,t){!function(e){null===Er&&!Pr&&e?.callWS&&(Pr=!0,e.callWS({type:"eppgrid/overview/list_devices"}).then(e=>{Er=new Set((e??[]).map(e=>e.device_id))}).catch(()=>{Er=new Set}).finally(()=>{Pr=!1}))}(e);const o=e?.entities?.[t]?.device_id;return o&&null!==Er&&Er.has(o)?{config:{type:"custom:eppgrid-card",device_id:o}}:null}})
/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */;const Ar=Symbol.for(""),$r=e=>{if(e?.r===Ar)return e?._$litStatic$},Tr=(e,...t)=>({_$litStatic$:t.reduce((t,o,r)=>t+(e=>{if(void 0!==e._$litStatic$)return e._$litStatic$;throw Error(`Value passed to 'literal' function must be a 'literal' result: ${e}. Use 'unsafeStatic' to pass non-literal values, but\n            take care to ensure page security.`)})(o)+e[r+1],e[0]),r:Ar}),Hr=new Map,Br=(e=>(t,...o)=>{const r=o.length;let n,i;const a=[],s=[];let l,c=0,d=!1;for(;c<r;){for(l=t[c];c<r&&void 0!==(i=o[c],n=$r(i));)l+=n+t[++c],d=!0;c!==r&&s.push(i),a.push(l),c++}if(c===r&&a.push(t[r]),d){const e=a.join("$$lit$$");void 0===(t=Hr.get(e))&&(a.raw=a,Hr.set(e,t=a)),o=s}return e(t,...o)})(G);class Mr extends ce{constructor(){super(...arguments),this.label="",this.value="",this.type="text",this.unit="",this.disabled=!1,this.placeholder="",this.min="",this.max="",this.step="",this.autocomplete="",this._tag=customElements.get("ha-input")?Tr`ha-input`:customElements.get("ha-textfield")?Tr`ha-textfield`:Tr`input`,this._isNativeInput=!customElements.get("ha-input")&&!customElements.get("ha-textfield"),this._onInput=e=>{e.stopPropagation();const t=e.target.value;this.value=t,this.dispatchEvent(new CustomEvent("value-changed",{detail:{value:t},bubbles:!0,composed:!0}))},this._onInnerValueChanged=e=>{e.stopPropagation()}}render(){const e=this._tag;return Br`
      <div class="field">
        <${e}
          data-field-control
          type=${this.type}
          .label=${this.label}
          aria-label=${this._isNativeInput&&this.label||Z}
          placeholder=${this.placeholder||Z}
          min=${this.min||Z}
          max=${this.max||Z}
          step=${this.step||Z}
          autocomplete=${this.autocomplete||Z}
          .value=${this.value}
          ?disabled=${this.disabled}
          @input=${this._onInput}
          @value-changed=${this._onInnerValueChanged}
        ></${e}>
        ${this.unit?Br`<span class="unit">${this.unit}</span>`:""}
      </div>
    `}}Mr.styles=a`
    :host { display: block; }
    .field { display: flex; align-items: center; gap: var(--epp-space-2, 8px); }
    .field > [data-field-control] {
      flex: 1;
      min-width: 0;
      /* Size the control's label/value/placeholder to the design type scale
         rather than HA's larger field default (kept the field labels oversized). */
      font-size: var(--epp-font-base, 14px);
      --mdc-typography-subtitle1-font-size: var(--epp-font-base, 14px);
    }
    .unit {
      color: var(--epp-text-muted, var(--secondary-text-color, #757575));
      font-size: var(--epp-font-sm, 13px);
      flex-shrink: 0;
    }
  `,e([pe({type:String})],Mr.prototype,"label",void 0),e([pe({type:String})],Mr.prototype,"value",void 0),e([pe({type:String})],Mr.prototype,"type",void 0),e([pe({type:String})],Mr.prototype,"unit",void 0),e([pe({type:Boolean})],Mr.prototype,"disabled",void 0),e([pe({type:String})],Mr.prototype,"placeholder",void 0),e([pe({type:String})],Mr.prototype,"min",void 0),e([pe({type:String})],Mr.prototype,"max",void 0),e([pe({type:String})],Mr.prototype,"step",void 0),e([pe({type:String})],Mr.prototype,"autocomplete",void 0),customElements.get("epp-field")||customElements.define("epp-field",Mr);class Nr extends ce{constructor(){super(...arguments),this._localize=Ao,this._devices=[],this._loading=!1,this._pictureUploadRequested=!1,this._preloadTimeoutMs=4e3,this._computeLabel=e=>{const t=`card.editor.${e.name}`,o=this._localize(t);return o===t?e.name:o},this._resetRoomColor=()=>{if(!this._config)return;const e={...this._config};delete e.room_color,this._emitConfigChanged(e)},this._onPictureChanged=e=>{e.stopPropagation();const t=e.target.value;this._writeFloorPlan(t||void 0)},this._onUrlChanged=e=>{e.stopPropagation();const t=String(e.detail?.value??"").trim();this._writeFloorPlan(t||void 0)},this._onOpacityInput=e=>{if(!this._config)return;const t=Number(e.target.value);this._emitConfigChanged({...this._config,floor_plan_opacity:t})}}setConfig(e){this._config=e,this.requestUpdate()}set hass(e){this.__hass=e,this._localize=To(e),this._loadDevices(),this._ensurePictureUpload(),this.requestUpdate()}get hass(){return this.__hass}connectedCallback(){super.connectedCallback(),this._loadDevices(),this._ensurePictureUpload()}async _ensurePictureUpload(){if(!this._pictureUploadRequested&&!this._hasPictureUpload&&this.isConnected&&this.__hass){this._pictureUploadRequested=!0;try{if(customElements.get("ha-selector")){const e=document.createElement("ha-selector");e.hass=this.__hass,e.selector={media:{}},e.style.display="none",(this.shadowRoot??this).appendChild(e),await Promise.race([customElements.whenDefined("ha-picture-upload"),new Promise(e=>setTimeout(e,this._preloadTimeoutMs))]),e.remove()}}catch{}this.requestUpdate()}}async _loadDevices(){if(this.__hass&&!this._devices.length&&!this._loading){this._loading=!0;try{const e=await this.__hass.callWS({type:"eppgrid/overview/list_devices"});this._devices=e??[],this._config&&!this._config.device_id&&this._devices.length>0&&this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:{...this._config,device_id:this._devices[0].device_id}},bubbles:!0,composed:!0}))}catch{this._devices=[]}finally{this._loading=!1}}}_valueChanged(e){e.stopPropagation();let t={...this._config,...e.detail.value};!1===t.show_map&&!1===t.show_sensors&&(t={...t,show_map:!0}),this._emitConfigChanged(t)}_emitConfigChanged(e){this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:e},bubbles:!0,composed:!0}))}_selectedDevice(){return this._devices.find(e=>e.device_id===this._config?.device_id)}_renderRatioHint(e,t){if(!(e>0&&t>0))return G`<div class="fp-ratio-hint">
				${this._localize("card.editor.floor_plan_calibrate_first")}
			</div>`;const o=Math.max(e,t),r=Math.min(e,t);return G`<div class="fp-ratio-hint">
			<span class="fp-ratio-proxy" style=${`aspect-ratio:${e} / ${t};`}></span>
			<span>${this._localize("card.editor.floor_plan_ratio",{width:(e/1e3).toFixed(1),depth:(t/1e3).toFixed(1),ratio:(o/r).toFixed(2)})}</span>
		</div>`}get _hasPictureUpload(){return!!customElements.get("ha-picture-upload")}_renderUpload(e,t){const o=e>0&&t>0?e/t:void 0;return this._hasPictureUpload?G`<ha-picture-upload
				.hass=${this.__hass}
				.value=${this._config?.floor_plan??null}
				original
				?crop=${void 0!==o}
				.cropOptions=${void 0!==o?{round:!1,aspectRatio:o}:void 0}
				@change=${this._onPictureChanged}
			></ha-picture-upload>`:G`<epp-field
			class="fp-url"
			.value=${this._config?.floor_plan??""}
			.label=${this._localize("card.editor.floor_plan_url")}
			@value-changed=${this._onUrlChanged}
		></epp-field>`}_writeFloorPlan(e){if(!this._config)return;const t={...this._config};e?t.floor_plan=e:(delete t.floor_plan,delete t.floor_plan_opacity),this._emitConfigChanged(t)}_renderOpacity(){const e=wr(this._config?.floor_plan_opacity);return G`<div class="fp-opacity-row">
			<label class="fp-label">${this._localize("card.editor.floor_plan_opacity")}</label>
			<input
				class="fp-opacity"
				type="range"
				min="0"
				max="100"
				step="5"
				.value=${String(e)}
				aria-label=${this._localize("card.editor.floor_plan_opacity")}
				@input=${this._onOpacityInput}
			/>
			<span class="fp-opacity-val">${e}%</span>
		</div>`}_renderFloorPlanSection(){const e=this._selectedDevice(),t=e?.room_width??0,o=e?.room_depth??0;return G`<div class="floor-plan-section">
			<div class="fp-label">${this._localize("card.editor.floor_plan")}</div>
			${this._renderUpload(t,o)}
			${this._renderRatioHint(t,o)}
			${this._config?.floor_plan?this._renderOpacity():Z}
		</div>`}render(){return this.__hass&&this._config?G`
			<ha-form
				.hass=${this.__hass}
				.data=${kr(this._config)}
				.schema=${function(e,t=!1){return[{name:"device_id",required:!0,selector:{select:{mode:"dropdown",options:e.map(e=>({value:e.device_id,label:e.name}))}}},{name:"primary",selector:{template:{}}},{name:"secondary",selector:{template:{}}},{name:"layout",selector:{select:{mode:"dropdown",options:[{value:"horizontal",label:"Horizontal"},{value:"vertical",label:"Vertical"}]}}},{name:"show_map",selector:{boolean:{}}},...t?[]:[{name:"show_grid",selector:{boolean:{}}}],{name:"show_furniture",selector:{boolean:{}}},{name:"show_overlays",selector:{boolean:{}}},{name:"show_heatmap",selector:{select:{mode:"dropdown",options:[{value:"off",label:"Off"},{value:"on",label:"On"},{value:"toggle",label:"Toggle on card"},{value:"toggle_and_clear",label:"Toggle and clear on card"}]}}},{name:"show_sensors",selector:{boolean:{}}},{name:"sensors",type:"expandable",title:"Sensors",schema:[{name:"presence",type:"expandable",title:"Presence",schema:[{name:"occupancy",selector:{boolean:{}}},{name:"static_presence",selector:{boolean:{}}},{name:"motion_presence",selector:{boolean:{}}},{name:"target_presence",selector:{boolean:{}}},{name:"mmwave",selector:{boolean:{}}}]},{name:"zones",selector:{boolean:{}}},{name:"environmental",type:"expandable",title:"Environmental",schema:[{name:"temperature",selector:{boolean:{}}},{name:"humidity",selector:{boolean:{}}},{name:"illuminance",selector:{boolean:{}}},{name:"co2",selector:{boolean:{}}}]}]},{name:"room_color",selector:{color_rgb:{}}}]}(this._devices,!!this._config?.floor_plan)}
				.computeLabel=${this._computeLabel}
				@value-changed=${this._valueChanged}
			></ha-form>
			${this._config.room_color?G`<button
							type="button"
							class="reset-room-color"
							@click=${this._resetRoomColor}
						>
							${this._localize("card.editor.reset_room_color")}
						</button>`:Z}
			${this._renderFloorPlanSection()}
		`:Z}}Nr.styles=a`
		.reset-room-color {
			margin-top: var(--epp-space-2, 8px);
			background: none;
			border: none;
			padding: 0;
			color: var(--primary-color, #03a9f4);
			cursor: pointer;
			font: inherit;
			text-decoration: underline;
		}
		.floor-plan-section {
			margin-top: var(--epp-space-3, 12px);
		}
		.fp-label {
			font-size: var(--epp-font-sm, 13px);
			color: var(--epp-text-muted, var(--secondary-text-color));
			margin-bottom: var(--epp-space-2, 8px);
		}
		.fp-ratio-hint {
			display: flex;
			align-items: center;
			gap: var(--epp-space-2, 8px);
			margin-top: var(--epp-space-2, 8px);
			font-size: var(--epp-font-xs, 12px);
			color: var(--epp-text-muted, var(--secondary-text-color));
		}
		.fp-ratio-proxy {
			flex: 0 0 auto;
			width: 48px;
			border: 1px solid var(--epp-accent, var(--primary-color));
			border-radius: var(--epp-radius-sm, 6px);
		}
		.fp-opacity-row {
			display: flex;
			align-items: center;
			gap: var(--epp-space-2, 8px);
			margin-top: var(--epp-space-2, 8px);
		}
		.fp-opacity {
			flex: 1;
		}
		.fp-opacity-val {
			font-size: var(--epp-font-xs, 12px);
			color: var(--epp-text-muted, var(--secondary-text-color));
			width: 3em;
			text-align: right;
		}
	`,e([me()],Nr.prototype,"_devices",void 0),customElements.get("eppgrid-card-editor")||customElements.define("eppgrid-card-editor",Nr);
