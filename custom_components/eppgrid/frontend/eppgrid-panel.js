function t(t,e,i,o){var r,s=arguments.length,n=s<3?e:null===o?o=Object.getOwnPropertyDescriptor(e,i):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(t,e,i,o);else for(var a=t.length-1;a>=0;a--)(r=t[a])&&(n=(s<3?r(n):s>3?r(e,i,n):r(e,i))||n);return s>3&&n&&Object.defineProperty(e,i,n),n}"function"==typeof SuppressedError&&SuppressedError;
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const e=globalThis,i=e.ShadowRoot&&(void 0===e.ShadyCSS||e.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,o=Symbol(),r=new WeakMap;let s=class{constructor(t,e,i){if(this._$cssResult$=!0,i!==o)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o;const e=this.t;if(i&&void 0===t){const i=void 0!==e&&1===e.length;i&&(t=r.get(e)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),i&&r.set(e,t))}return t}toString(){return this.cssText}};const n=(t,...e)=>{const i=1===t.length?t[0]:e.reduce((e,i,o)=>e+(t=>{if(!0===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+t[o+1],t[0]);return new s(i,t,o)},a=i?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const i of t.cssRules)e+=i.cssText;return(t=>new s("string"==typeof t?t:t+"",void 0,o))(e)})(t):t,{is:l,defineProperty:c,getOwnPropertyDescriptor:h,getOwnPropertyNames:d,getOwnPropertySymbols:p,getPrototypeOf:u}=Object,g=globalThis,f=g.trustedTypes,m=f?f.emptyScript:"",b=g.reactiveElementPolyfillSupport,_=(t,e)=>t,v={toAttribute(t,e){switch(e){case Boolean:t=t?m:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t)}return t},fromAttribute(t,e){let i=t;switch(e){case Boolean:i=null!==t;break;case Number:i=null===t?null:Number(t);break;case Object:case Array:try{i=JSON.parse(t)}catch(t){i=null}}return i}},y=(t,e)=>!l(t,e),x={attribute:!0,type:String,converter:v,reflect:!1,useDefault:!1,hasChanged:y};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */Symbol.metadata??=Symbol("metadata"),g.litPropertyMetadata??=new WeakMap;let w=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=x){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){const i=Symbol(),o=this.getPropertyDescriptor(t,i,e);void 0!==o&&c(this.prototype,t,o)}}static getPropertyDescriptor(t,e,i){const{get:o,set:r}=h(this.prototype,t)??{get(){return this[e]},set(t){this[e]=t}};return{get:o,set(e){const s=o?.call(this);r?.call(this,e),this.requestUpdate(t,s,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??x}static _$Ei(){if(this.hasOwnProperty(_("elementProperties")))return;const t=u(this);t.finalize(),void 0!==t.l&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(_("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(_("properties"))){const t=this.properties,e=[...d(t),...p(t)];for(const i of e)this.createProperty(i,t[i])}const t=this[Symbol.metadata];if(null!==t){const e=litPropertyMetadata.get(t);if(void 0!==e)for(const[t,i]of e)this.elementProperties.set(t,i)}this._$Eh=new Map;for(const[t,e]of this.elementProperties){const i=this._$Eu(t,e);void 0!==i&&this._$Eh.set(i,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const e=[];if(Array.isArray(t)){const i=new Set(t.flat(1/0).reverse());for(const t of i)e.unshift(a(t))}else void 0!==t&&e.push(a(t));return e}static _$Eu(t,e){const i=e.attribute;return!1===i?void 0:"string"==typeof i?i:"string"==typeof t?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),void 0!==this.renderRoot&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){const t=new Map,e=this.constructor.elementProperties;for(const i of e.keys())this.hasOwnProperty(i)&&(t.set(i,this[i]),delete this[i]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((t,o)=>{if(i)t.adoptedStyleSheets=o.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const i of o){const o=document.createElement("style"),r=e.litNonce;void 0!==r&&o.setAttribute("nonce",r),o.textContent=i.cssText,t.appendChild(o)}})(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,i){this._$AK(t,i)}_$ET(t,e){const i=this.constructor.elementProperties.get(t),o=this.constructor._$Eu(t,i);if(void 0!==o&&!0===i.reflect){const r=(void 0!==i.converter?.toAttribute?i.converter:v).toAttribute(e,i.type);this._$Em=t,null==r?this.removeAttribute(o):this.setAttribute(o,r),this._$Em=null}}_$AK(t,e){const i=this.constructor,o=i._$Eh.get(t);if(void 0!==o&&this._$Em!==o){const t=i.getPropertyOptions(o),r="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==t.converter?.fromAttribute?t.converter:v;this._$Em=o;const s=r.fromAttribute(e,t.type);this[o]=s??this._$Ej?.get(o)??s,this._$Em=null}}requestUpdate(t,e,i,o=!1,r){if(void 0!==t){const s=this.constructor;if(!1===o&&(r=this[t]),i??=s.getPropertyOptions(t),!((i.hasChanged??y)(r,e)||i.useDefault&&i.reflect&&r===this._$Ej?.get(t)&&!this.hasAttribute(s._$Eu(t,i))))return;this.C(t,e,i)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(t,e,{useDefault:i,reflect:o,wrapped:r},s){i&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,s??e??this[t]),!0!==r||void 0!==s)||(this._$AL.has(t)||(this.hasUpdated||i||(e=void 0),this._$AL.set(t,e)),!0===o&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[t,e]of this._$Ep)this[t]=e;this._$Ep=void 0}const t=this.constructor.elementProperties;if(t.size>0)for(const[e,i]of t){const{wrapped:t}=i,o=this[e];!0!==t||this._$AL.has(e)||void 0===o||this.C(e,void 0,i,o)}}let t=!1;const e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(t=>t.hostUpdate?.()),this.update(e)):this._$EM()}catch(e){throw t=!1,this._$EM(),e}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(t){}firstUpdated(t){}};w.elementStyles=[],w.shadowRootOptions={mode:"open"},w[_("elementProperties")]=new Map,w[_("finalized")]=new Map,b?.({ReactiveElement:w}),(g.reactiveElementVersions??=[]).push("2.1.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const $=globalThis,k=t=>t,z=$.trustedTypes,C=z?z.createPolicy("lit-html",{createHTML:t=>t}):void 0,E="$lit$",T=`lit$${Math.random().toFixed(9).slice(2)}$`,S="?"+T,A=`<${S}>`,M=document,P=()=>M.createComment(""),D=t=>null===t||"object"!=typeof t&&"function"!=typeof t,H=Array.isArray,R="[ \t\n\f\r]",B=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,L=/-->/g,I=/>/g,N=RegExp(`>|${R}(?:([^\\s"'>=/]+)(${R}*=${R}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),F=/'/g,O=/"/g,U=/^(?:script|style|textarea|title)$/i,G=t=>(e,...i)=>({_$litType$:t,strings:e,values:i}),W=G(1),Z=G(2),j=Symbol.for("lit-noChange"),V=Symbol.for("lit-nothing"),X=new WeakMap,Y=M.createTreeWalker(M,129);function K(t,e){if(!H(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==C?C.createHTML(e):e}const q=(t,e)=>{const i=t.length-1,o=[];let r,s=2===e?"<svg>":3===e?"<math>":"",n=B;for(let e=0;e<i;e++){const i=t[e];let a,l,c=-1,h=0;for(;h<i.length&&(n.lastIndex=h,l=n.exec(i),null!==l);)h=n.lastIndex,n===B?"!--"===l[1]?n=L:void 0!==l[1]?n=I:void 0!==l[2]?(U.test(l[2])&&(r=RegExp("</"+l[2],"g")),n=N):void 0!==l[3]&&(n=N):n===N?">"===l[0]?(n=r??B,c=-1):void 0===l[1]?c=-2:(c=n.lastIndex-l[2].length,a=l[1],n=void 0===l[3]?N:'"'===l[3]?O:F):n===O||n===F?n=N:n===L||n===I?n=B:(n=N,r=void 0);const d=n===N&&t[e+1].startsWith("/>")?" ":"";s+=n===B?i+A:c>=0?(o.push(a),i.slice(0,c)+E+i.slice(c)+T+d):i+T+(-2===c?e:d)}return[K(t,s+(t[i]||"<?>")+(2===e?"</svg>":3===e?"</math>":"")),o]};class J{constructor({strings:t,_$litType$:e},i){let o;this.parts=[];let r=0,s=0;const n=t.length-1,a=this.parts,[l,c]=q(t,e);if(this.el=J.createElement(l,i),Y.currentNode=this.el.content,2===e||3===e){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes)}for(;null!==(o=Y.nextNode())&&a.length<n;){if(1===o.nodeType){if(o.hasAttributes())for(const t of o.getAttributeNames())if(t.endsWith(E)){const e=c[s++],i=o.getAttribute(t).split(T),n=/([.?@])?(.*)/.exec(e);a.push({type:1,index:r,name:n[2],strings:i,ctor:"."===n[1]?ot:"?"===n[1]?rt:"@"===n[1]?st:it}),o.removeAttribute(t)}else t.startsWith(T)&&(a.push({type:6,index:r}),o.removeAttribute(t));if(U.test(o.tagName)){const t=o.textContent.split(T),e=t.length-1;if(e>0){o.textContent=z?z.emptyScript:"";for(let i=0;i<e;i++)o.append(t[i],P()),Y.nextNode(),a.push({type:2,index:++r});o.append(t[e],P())}}}else if(8===o.nodeType)if(o.data===S)a.push({type:2,index:r});else{let t=-1;for(;-1!==(t=o.data.indexOf(T,t+1));)a.push({type:7,index:r}),t+=T.length-1}r++}}static createElement(t,e){const i=M.createElement("template");return i.innerHTML=t,i}}function Q(t,e,i=t,o){if(e===j)return e;let r=void 0!==o?i._$Co?.[o]:i._$Cl;const s=D(e)?void 0:e._$litDirective$;return r?.constructor!==s&&(r?._$AO?.(!1),void 0===s?r=void 0:(r=new s(t),r._$AT(t,i,o)),void 0!==o?(i._$Co??=[])[o]=r:i._$Cl=r),void 0!==r&&(e=Q(t,r._$AS(t,e.values),r,o)),e}class tt{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:e},parts:i}=this._$AD,o=(t?.creationScope??M).importNode(e,!0);Y.currentNode=o;let r=Y.nextNode(),s=0,n=0,a=i[0];for(;void 0!==a;){if(s===a.index){let e;2===a.type?e=new et(r,r.nextSibling,this,t):1===a.type?e=new a.ctor(r,a.name,a.strings,this,t):6===a.type&&(e=new nt(r,this,t)),this._$AV.push(e),a=i[++n]}s!==a?.index&&(r=Y.nextNode(),s++)}return Y.currentNode=M,o}p(t){let e=0;for(const i of this._$AV)void 0!==i&&(void 0!==i.strings?(i._$AI(t,i,e),e+=i.strings.length-2):i._$AI(t[e])),e++}}class et{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,i,o){this.type=2,this._$AH=V,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=i,this.options=o,this._$Cv=o?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const e=this._$AM;return void 0!==e&&11===t?.nodeType&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=Q(this,t,e),D(t)?t===V||null==t||""===t?(this._$AH!==V&&this._$AR(),this._$AH=V):t!==this._$AH&&t!==j&&this._(t):void 0!==t._$litType$?this.$(t):void 0!==t.nodeType?this.T(t):(t=>H(t)||"function"==typeof t?.[Symbol.iterator])(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==V&&D(this._$AH)?this._$AA.nextSibling.data=t:this.T(M.createTextNode(t)),this._$AH=t}$(t){const{values:e,_$litType$:i}=t,o="number"==typeof i?this._$AC(t):(void 0===i.el&&(i.el=J.createElement(K(i.h,i.h[0]),this.options)),i);if(this._$AH?._$AD===o)this._$AH.p(e);else{const t=new tt(o,this),i=t.u(this.options);t.p(e),this.T(i),this._$AH=t}}_$AC(t){let e=X.get(t.strings);return void 0===e&&X.set(t.strings,e=new J(t)),e}k(t){H(this._$AH)||(this._$AH=[],this._$AR());const e=this._$AH;let i,o=0;for(const r of t)o===e.length?e.push(i=new et(this.O(P()),this.O(P()),this,this.options)):i=e[o],i._$AI(r),o++;o<e.length&&(this._$AR(i&&i._$AB.nextSibling,o),e.length=o)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){const e=k(t).nextSibling;k(t).remove(),t=e}}setConnected(t){void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t))}}class it{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,i,o,r){this.type=1,this._$AH=V,this._$AN=void 0,this.element=t,this.name=e,this._$AM=o,this.options=r,i.length>2||""!==i[0]||""!==i[1]?(this._$AH=Array(i.length-1).fill(new String),this.strings=i):this._$AH=V}_$AI(t,e=this,i,o){const r=this.strings;let s=!1;if(void 0===r)t=Q(this,t,e,0),s=!D(t)||t!==this._$AH&&t!==j,s&&(this._$AH=t);else{const o=t;let n,a;for(t=r[0],n=0;n<r.length-1;n++)a=Q(this,o[i+n],e,n),a===j&&(a=this._$AH[n]),s||=!D(a)||a!==this._$AH[n],a===V?t=V:t!==V&&(t+=(a??"")+r[n+1]),this._$AH[n]=a}s&&!o&&this.j(t)}j(t){t===V?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class ot extends it{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===V?void 0:t}}class rt extends it{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==V)}}class st extends it{constructor(t,e,i,o,r){super(t,e,i,o,r),this.type=5}_$AI(t,e=this){if((t=Q(this,t,e,0)??V)===j)return;const i=this._$AH,o=t===V&&i!==V||t.capture!==i.capture||t.once!==i.once||t.passive!==i.passive,r=t!==V&&(i===V||o);o&&this.element.removeEventListener(this.name,this,i),r&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class nt{constructor(t,e,i){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=i}get _$AU(){return this._$AM._$AU}_$AI(t){Q(this,t)}}const at=$.litHtmlPolyfillSupport;at?.(J,et),($.litHtmlVersions??=[]).push("3.3.2");const lt=globalThis;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let ct=class extends w{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=((t,e,i)=>{const o=i?.renderBefore??e;let r=o._$litPart$;if(void 0===r){const t=i?.renderBefore??null;o._$litPart$=r=new et(e.insertBefore(P(),t),t,void 0,i??{})}return r._$AI(t),r})(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return j}};ct._$litElement$=!0,ct.finalized=!0,lt.litElementHydrateSupport?.({LitElement:ct});const ht=lt.litElementPolyfillSupport;ht?.({LitElement:ct}),(lt.litElementVersions??=[]).push("4.2.2");const dt=n`
  :host {
    display: flex;
    height: 100%;
    background: var(--primary-background-color, #fafafa);
    color: var(--primary-text-color, #212121);
    font-family: var(--paper-font-body1_-_font-family, "Roboto", sans-serif);
  }
`,pt=n`
  .panel {
    padding: 24px;
    max-width: 1100px;
    margin: 0 auto;
    font-size: 14px;
  }
`,ut=n`
  .template-dialog {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .template-dialog-card {
    background: var(--card-background-color, #fff);
    border-radius: 16px;
    padding: 24px;
    min-width: 320px;
    max-width: 440px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
  }

  .template-dialog-card h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 500;
  }

  .template-dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  .template-name-input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 8px;
    font-size: 15px;
    box-sizing: border-box;
    background: var(--card-background-color, #fff);
    color: var(--primary-text-color, #212121);
  }

  .template-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    border-radius: 8px;
    border: 1px solid var(--divider-color, #e0e0e0);
  }

  .template-item-name {
    flex: 1;
    font-size: 14px;
    font-weight: 500;
  }

  .template-item-size {
    font-size: 12px;
    color: var(--secondary-text-color, #757575);
  }

  .template-item-btn {
    padding: 4px 12px;
    font-size: 13px;
  }
`,gt=n`
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
`,ft=n`
  .accordion {
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 12px;
    margin-bottom: 12px;
    background: var(--card-background-color, #fff);
  }

  .accordion-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 14px 16px;
    cursor: pointer;
    user-select: none;
    background: var(--card-background-color, #fff);
    border: none;
    border-radius: 12px;
    width: 100%;
    text-align: left;
    font-size: 15px;
    font-weight: 500;
    color: var(--primary-text-color, #212121);
  }

  .accordion-header[data-open] {
    border-radius: 12px 12px 0 0;
  }

  .accordion-header:hover {
    background: var(--secondary-background-color, #f5f5f5);
  }

  .accordion-header ha-icon {
    --mdc-icon-size: 20px;
    color: var(--secondary-text-color, #757575);
  }

  .accordion-header .accordion-title {
    flex: 1;
  }

  .accordion-chevron {
    transition: transform 0.2s ease;
    --mdc-icon-size: 20px;
    color: var(--secondary-text-color, #757575);
  }

  .accordion-chevron[data-open] {
    transform: rotate(180deg);
  }

  .accordion-body {
    padding: 0 16px 16px;
  }
`,mt=n`
  .settings-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .setting-group {
    background: var(--card-background-color, #fff);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 12px;
    border: 1px solid var(--divider-color, #e0e0e0);
  }

  .setting-group h4 {
    margin: 0 0 12px;
    font-size: 14px;
    font-weight: 600;
    color: var(--primary-text-color, #212121);
  }

  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    padding: 8px 0;
    gap: 4px;
    border-bottom: 1px solid var(--divider-color, #f0f0f0);
  }

  .setting-row:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .setting-row label:not(.toggle-switch) {
    font-size: 14px;
    color: var(--primary-text-color, #212121);
    flex: 1;
    min-width: 120px;
  }

  .setting-input-unit {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--secondary-text-color, #757575);
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
    font-size: 14px;
    color: var(--secondary-text-color, #757575);
    font-weight: 500;
    display: inline-block;
    width: 36px;
    text-align: right;
    flex-shrink: 0;
  }

  .setting-unit {
    display: inline-block;
    width: 24px;
    font-size: 13px;
    color: var(--secondary-text-color, #757575);
    flex-shrink: 0;
  }
`,bt=n`
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
`,_t=n`
  .setting-info {
    position: relative;
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    margin-left: 8px;
  }

  .setting-info ha-icon {
    --mdc-icon-size: 18px;
    color: var(--primary-text-color, #212121);
    cursor: default;
  }

  .setting-info .setting-info-tooltip {
    display: none;
    position: fixed;
    background: var(--card-background-color, #fff);
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 12px;
    color: var(--primary-text-color, #212121);
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    white-space: normal;
    width: 240px;
    z-index: 9999;
    line-height: 1.4;
    pointer-events: none;
  }
`
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */,vt={attribute:!0,type:String,converter:v,reflect:!1,hasChanged:y},yt=(t=vt,e,i)=>{const{kind:o,metadata:r}=i;let s=globalThis.litPropertyMetadata.get(r);if(void 0===s&&globalThis.litPropertyMetadata.set(r,s=new Map),"setter"===o&&((t=Object.create(t)).wrapped=!0),s.set(i.name,t),"accessor"===o){const{name:o}=i;return{set(i){const r=e.get.call(this);e.set.call(this,i),this.requestUpdate(o,r,t,!0,i)},init(e){return void 0!==e&&this.C(o,void 0,t,e),e}}}if("setter"===o){const{name:o}=i;return function(i){const r=this[o];e.call(this,i),this.requestUpdate(o,r,t,!0,i)}}throw Error("Unsupported decorator location: "+o)};function xt(t){return(e,i)=>"object"==typeof i?yt(t,e,i):((t,e,i)=>{const o=e.hasOwnProperty(i);return e.constructor.createProperty(i,t),o?Object.getOwnPropertyDescriptor(e,i):void 0})(t,e,i)}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function wt(t){return xt({...t,state:!0,attribute:!1})}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const $t=2,kt=t=>(...e)=>({_$litDirective$:t,values:e});class zt{constructor(t){}get _$AU(){return this._$AM._$AU}_$AT(t,e,i){this._$Ct=t,this._$AM=e,this._$Ci=i}_$AS(t,e){return this.update(t,e)}update(t,e){return this.render(...e)}}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class Ct extends zt{constructor(t){if(super(t),this.it=V,t.type!==$t)throw Error(this.constructor.directiveName+"() can only be used in child bindings")}render(t){if(t===V||null==t)return this._t=void 0,this.it=t;if(t===j)return t;if("string"!=typeof t)throw Error(this.constructor.directiveName+"() called with a non-string value");if(t===this.it)return this._t;this.it=t;const e=[t];return e.raw=e,this._t={_$litType$:this.constructor.resultType,strings:e,values:[]}}}Ct.directiveName="unsafeHTML",Ct.resultType=1;const Et=kt(Ct),Tt=20,St=20,At=400,Mt=300,Pt=6e3,Dt=t=>!!(1&t),Ht=t=>t>>1&7,Rt=(t,e)=>-15&t|(7&e)<<1;function Bt(t){let e=Tt,i=0,o=St,r=0;for(let s=0;s<At;s++)if(Dt(t[s])){const t=s%Tt,n=Math.floor(s/Tt);t<e&&(e=t),t>i&&(i=t),n<o&&(o=n),n>r&&(r=n)}return{minCol:Math.max(0,e-1),maxCol:Math.min(19,i+1),minRow:Math.max(0,o-1),maxRow:Math.min(19,r+1)}}function Lt(t){let e=Tt,i=0,o=St,r=0;for(let s=0;s<At;s++)if(Dt(t[s])){const t=s%Tt,n=Math.floor(s/Tt);t<e&&(e=t),t>i&&(i=t),n<o&&(o=n),n>r&&(r=n)}return{minCol:e,maxCol:i,minRow:o,maxRow:r}}function It(t,e){const i=new Uint8Array(At),o=Math.ceil(t/Mt),r=Math.ceil(e/Mt),s=Math.floor((Tt-o)/2);for(let t=0;t<St;t++)for(let e=0;e<Tt;e++){e>=s&&e<s+o&&t>=0&&t<0+r&&(i[t*Tt+e]=1)}return i}const Nt={normal:{trigger:5,renew:3,timeout:10,handoff_timeout:3},entrance:{trigger:3,renew:2,timeout:5,handoff_timeout:1},thoroughfare:{trigger:3,renew:2,timeout:3,handoff_timeout:1},rest:{trigger:7,renew:1,timeout:30,handoff_timeout:10}},Ft=["#E69F00","#56B4E9","#009E73","#F0E442","#0072B2","#D55E00","#CC79A7"];function Ot(t,e,i,o,r,s,n,a){if(0===t){const t=Nt[i]||Nt.normal;return"custom"===i?{trigger:o,renew:r,timeout:s,handoffTimeout:n,entryPoint:a}:{trigger:t.trigger,renew:t.renew,timeout:t.timeout,handoffTimeout:t.handoff_timeout,entryPoint:!1}}if(t>0&&t<=e.length){const i=e[t-1];if(i){const t=Nt[i.type]||Nt.normal;return"custom"===i.type?{trigger:i.trigger??t.trigger,renew:i.renew??t.renew,timeout:i.timeout??t.timeout,handoffTimeout:i.handoff_timeout??t.handoff_timeout,entryPoint:i.entry_point??!1}:{trigger:t.trigger,renew:t.renew,timeout:t.timeout,handoffTimeout:t.handoff_timeout,entryPoint:"entrance"===i.type}}}return{trigger:5,renew:3,timeout:10,handoffTimeout:3,entryPoint:!1}}function Ut(t){const e=function(t){const e=t?.calibration;return e?.perspective&&e.room_width>0?{perspective:e.perspective,roomWidth:e.room_width||0,roomDepth:e.room_depth||0}:{perspective:null,roomWidth:0,roomDepth:0}}(t),i=t?.room_layout||{},o=(i.furniture||[]).map((t,e)=>({id:t.id||`f_load_${e}`,type:t.type||"icon",icon:t.icon||"mdi:help",label:t.label||"Item",x:t.x??0,y:t.y??0,width:t.width??600,height:t.height??600,rotation:t.rotation??0,lockAspect:t.lockAspect??"svg"!==t.type}));const r=function(t,e,i){return t?.grid_bytes&&Array.isArray(t.grid_bytes)?new Uint8Array(t.grid_bytes):e>0&&i>0?It(e,i):new Uint8Array(At)}(i,e.roomWidth,e.roomDepth),s=function(t){const e=t?.zone_slots||t?.zones||[];return Array.from({length:7},(t,i)=>{const o=e[i];return o?{name:o.name||`Zone ${i+1}`,color:o.color||Ft[i%Ft.length],type:o.type??"normal",trigger:o.trigger,renew:o.renew,timeout:o.timeout,handoff_timeout:o.handoff_timeout,entry_point:o.entry_point??!1}:null})}(i),n=function(t){const e=t?.room_type??"normal",i=Nt[e]??Nt.normal;return{roomType:e,roomTrigger:t?.room_trigger??i?.trigger??5,roomRenew:t?.room_renew??i?.renew??3,roomTimeout:t?.room_timeout??i?.timeout??10,roomHandoffTimeout:t?.room_handoff_timeout??i?.handoff_timeout??3,roomEntryPoint:t?.room_entry_point??!1}}(i);return{calibration:e,furniture:o,grid:r,zoneConfigs:s,roomThresholds:n,reportingConfig:t?.reporting||{},offsetsConfig:t?.offsets||{}}}function Gt(t,e,i,o){if(i<=0||o<=0)return null;const r=Math.ceil(i/Mt);return{col:Math.floor((Tt-r)/2)+t/Mt,row:e/Mt}}const Wt=Pt*Math.sin(Math.PI/3);function Zt(t,e){return t/Mt*(e+1)}function jt(t,e){return t/(e+1)*Mt}function Vt(t,e,i){const o=i-e;return Math.round((t+o+360)%360)}function Xt(t,e){if(!Dt(t))return"var(--secondary-background-color, #e0e0e0)";const i=Ht(t);if(i>0&&i<=7){const t=e[i-1];if(t)return t.color}return"var(--card-background-color, #fff)"}function Yt(t){return{r:parseInt(t.slice(1,3),16),g:parseInt(t.slice(3,5),16),b:parseInt(t.slice(5,7),16)}}function Kt(t,e,i){const o=t[6]*e+t[7]*i+1;return{x:(t[0]*e+t[1]*i+t[2])/o,y:(t[3]*e+t[4]*i+t[5])/o}}function qt(t){return t?Kt(t,0,0):null}function Jt(t,e,i,o){if(t<=0||e<=0)return 0;const r=qt(i);if(r){const e=Math.ceil(t/Mt),i=Math.floor((Tt-e)/2);let s=0;const n=Lt(o);for(let t=n.minRow;t<=n.maxRow;t++)for(let e=n.minCol;e<=n.maxCol;e++){if(!Dt(o[t*Tt+e]))continue;const n=(t+.5)*Mt,a=(e-i+.5)*Mt-r.x,l=n-r.y,c=Math.sqrt(a*a+l*l);c>s&&(s=c)}if(s>0){const t=s/1e3;return Math.ceil(2*t)/2}}const s=Math.max(t,e)/1e3;return Math.ceil(2*s)/2}function Qt(t){if(0===t.length)return 0;const e=[...t].sort((t,e)=>t-e),i=Math.floor(e.length/2);return e.length%2?e[i]:(e[i-1]+e[i])/2}function te(t,e,i){const o=Lt(t);if(o.minCol>o.maxCol)return null;const r=o.maxCol-o.minCol+1,s=o.maxRow-o.minRow+1,n=r*Mt,a=s*Mt,l=qt(i),c=Math.ceil(e/Mt),h=Math.floor((Tt-c)/2),d=l?l.x:n/2,p=l?l.y:0;let u=0;for(let e=0;e<At;e++){if(!Dt(t[e]))continue;const i=e%Tt,o=Math.floor(e/Tt),r=(i-h+.5)*Mt-d,s=(o+.5)*Mt-p,n=r*r+s*s;n>u&&(u=n)}return{widthM:(n/1e3).toFixed(1),depthM:(a/1e3).toFixed(1),furthestM:(Math.sqrt(u)/1e3).toFixed(1)}}function ee(t,e){const i=e&&e.cache?e.cache:le,o=e&&e.serializer?e.serializer:ne;return(e&&e.strategy?e.strategy:se)(t,{cache:i,serializer:o})}function ie(t,e,i,o){const r=null==(s=o)||"number"==typeof s||"boolean"==typeof s?o:i(o);var s;let n=e.get(r);return void 0===n&&(n=t.call(this,o),e.set(r,n)),n}function oe(t,e,i){const o=Array.prototype.slice.call(arguments,3),r=i(o);let s=e.get(r);return void 0===s&&(s=t.apply(this,o),e.set(r,s)),s}function re(t,e,i,o,r){return i.bind(e,t,o,r)}function se(t,e){return re(t,this,1===t.length?ie:oe,e.cache.create(),e.serializer)}const ne=function(){return JSON.stringify(arguments)};class ae{cache;constructor(){this.cache=Object.create(null)}get(t){return this.cache[t]}set(t,e){this.cache[t]=e}}const le={create:function(){return new ae}},ce={variadic:function(t,e){return re(t,this,oe,e.cache.create(),e.serializer)}},he=/(?:[Eec]{1,6}|G{1,5}|[Qq]{1,5}|(?:[yYur]+|U{1,5})|[ML]{1,5}|d{1,2}|D{1,3}|F{1}|[abB]{1,5}|[hkHK]{1,2}|w{1,2}|W{1}|m{1,2}|s{1,2}|[zZOvVxX]{1,4})(?=([^']*'[^']*')*[^']*$)/g;function de(t){const e={};return t.replace(he,t=>{const i=t.length;switch(t[0]){case"G":e.era=4===i?"long":5===i?"narrow":"short";break;case"y":e.year=2===i?"2-digit":"numeric";break;case"Y":case"u":case"U":case"r":throw new RangeError("`Y/u/U/r` (year) patterns are not supported, use `y` instead");case"q":case"Q":throw new RangeError("`q/Q` (quarter) patterns are not supported");case"M":case"L":e.month=["numeric","2-digit","short","long","narrow"][i-1];break;case"w":case"W":throw new RangeError("`w/W` (week) patterns are not supported");case"d":e.day=["numeric","2-digit"][i-1];break;case"D":case"F":case"g":throw new RangeError("`D/F/g` (day) patterns are not supported, use `d` instead");case"E":e.weekday=4===i?"long":5===i?"narrow":"short";break;case"e":if(i<4)throw new RangeError("`e..eee` (weekday) patterns are not supported");e.weekday=["short","long","narrow","short"][i-4];break;case"c":if(i<4)throw new RangeError("`c..ccc` (weekday) patterns are not supported");e.weekday=["short","long","narrow","short"][i-4];break;case"a":e.hour12=!0;break;case"b":case"B":throw new RangeError("`b/B` (period) patterns are not supported, use `a` instead");case"h":e.hourCycle="h12",e.hour=["numeric","2-digit"][i-1];break;case"H":e.hourCycle="h23",e.hour=["numeric","2-digit"][i-1];break;case"K":e.hourCycle="h11",e.hour=["numeric","2-digit"][i-1];break;case"k":e.hourCycle="h24",e.hour=["numeric","2-digit"][i-1];break;case"j":case"J":case"C":throw new RangeError("`j/J/C` (hour) patterns are not supported, use `h/H/K/k` instead");case"m":e.minute=["numeric","2-digit"][i-1];break;case"s":e.second=["numeric","2-digit"][i-1];break;case"S":case"A":throw new RangeError("`S/A` (second) patterns are not supported, use `s` instead");case"z":e.timeZoneName=i<4?"short":"long";break;case"Z":case"O":case"v":case"V":case"X":case"x":throw new RangeError("`Z/O/v/V/X/x` (timeZone) patterns are not supported, use `z` instead")}return""}),e}const pe=/[\t-\r \x85\u200E\u200F\u2028\u2029]/i;function ue(t){return t.replace(/^(.*?)-/,"")}const ge=/^\.(?:(0+)(\*)?|(#+)|(0+)(#+))$/g,fe=/^(@+)?(\+|#+)?[rs]?$/g,me=/(\*)(0+)|(#+)(0+)|(0+)/g,be=/^(0+)$/;function _e(t){const e={};return"r"===t[t.length-1]?e.roundingPriority="morePrecision":"s"===t[t.length-1]&&(e.roundingPriority="lessPrecision"),t.replace(fe,function(t,i,o){return"string"!=typeof o?(e.minimumSignificantDigits=i.length,e.maximumSignificantDigits=i.length):"+"===o?e.minimumSignificantDigits=i.length:"#"===i[0]?e.maximumSignificantDigits=i.length:(e.minimumSignificantDigits=i.length,e.maximumSignificantDigits=i.length+("string"==typeof o?o.length:0)),""}),e}function ve(t){switch(t){case"sign-auto":return{signDisplay:"auto"};case"sign-accounting":case"()":return{currencySign:"accounting"};case"sign-always":case"+!":return{signDisplay:"always"};case"sign-accounting-always":case"()!":return{signDisplay:"always",currencySign:"accounting"};case"sign-except-zero":case"+?":return{signDisplay:"exceptZero"};case"sign-accounting-except-zero":case"()?":return{signDisplay:"exceptZero",currencySign:"accounting"};case"sign-never":case"+_":return{signDisplay:"never"}}}function ye(t){let e;if("E"===t[0]&&"E"===t[1]?(e={notation:"engineering"},t=t.slice(2)):"E"===t[0]&&(e={notation:"scientific"},t=t.slice(1)),e){const i=t.slice(0,2);if("+!"===i?(e.signDisplay="always",t=t.slice(2)):"+?"===i&&(e.signDisplay="exceptZero",t=t.slice(2)),!be.test(t))throw new Error("Malformed concise eng/scientific notation");e.minimumIntegerDigits=t.length}return e}function xe(t){const e=ve(t);return e||{}}function we(t){let e={};for(const i of t){switch(i.stem){case"percent":case"%":e.style="percent";continue;case"%x100":e.style="percent",e.scale=100;continue;case"currency":e.style="currency",e.currency=i.options[0];continue;case"group-off":case",_":e.useGrouping=!1;continue;case"precision-integer":case".":e.maximumFractionDigits=0;continue;case"measure-unit":case"unit":e.style="unit",e.unit=ue(i.options[0]);continue;case"compact-short":case"K":e.notation="compact",e.compactDisplay="short";continue;case"compact-long":case"KK":e.notation="compact",e.compactDisplay="long";continue;case"scientific":e={...e,notation:"scientific",...i.options.reduce((t,e)=>({...t,...xe(e)}),{})};continue;case"engineering":e={...e,notation:"engineering",...i.options.reduce((t,e)=>({...t,...xe(e)}),{})};continue;case"notation-simple":e.notation="standard";continue;case"unit-width-narrow":e.currencyDisplay="narrowSymbol",e.unitDisplay="narrow";continue;case"unit-width-short":e.currencyDisplay="code",e.unitDisplay="short";continue;case"unit-width-full-name":e.currencyDisplay="name",e.unitDisplay="long";continue;case"unit-width-iso-code":e.currencyDisplay="symbol";continue;case"scale":e.scale=parseFloat(i.options[0]);continue;case"rounding-mode-floor":e.roundingMode="floor";continue;case"rounding-mode-ceiling":e.roundingMode="ceil";continue;case"rounding-mode-down":e.roundingMode="trunc";continue;case"rounding-mode-up":e.roundingMode="expand";continue;case"rounding-mode-half-even":e.roundingMode="halfEven";continue;case"rounding-mode-half-down":e.roundingMode="halfTrunc";continue;case"rounding-mode-half-up":e.roundingMode="halfExpand";continue;case"integer-width":if(i.options.length>1)throw new RangeError("integer-width stems only accept a single optional option");i.options[0].replace(me,function(t,i,o,r,s,n){if(i)e.minimumIntegerDigits=o.length;else{if(r&&s)throw new Error("We currently do not support maximum integer digits");if(n)throw new Error("We currently do not support exact integer digits")}return""});continue}if(be.test(i.stem)){e.minimumIntegerDigits=i.stem.length;continue}if(ge.test(i.stem)){if(i.options.length>1)throw new RangeError("Fraction-precision stems only accept a single optional option");i.stem.replace(ge,function(t,i,o,r,s,n){return"*"===o?e.minimumFractionDigits=i.length:r&&"#"===r[0]?e.maximumFractionDigits=r.length:s&&n?(e.minimumFractionDigits=s.length,e.maximumFractionDigits=s.length+n.length):(e.minimumFractionDigits=i.length,e.maximumFractionDigits=i.length),""});const t=i.options[0];"w"===t?e={...e,trailingZeroDisplay:"stripIfInteger"}:t&&(e={...e,..._e(t)});continue}if(fe.test(i.stem)){e={...e,..._e(i.stem)};continue}const t=ve(i.stem);t&&(e={...e,...t});const o=ye(i.stem);o&&(e={...e,...o})}return e}let $e=function(t){return t[t.literal=0]="literal",t[t.argument=1]="argument",t[t.number=2]="number",t[t.date=3]="date",t[t.time=4]="time",t[t.select=5]="select",t[t.plural=6]="plural",t[t.pound=7]="pound",t[t.tag=8]="tag",t}({}),ke=function(t){return t[t.number=0]="number",t[t.dateTime=1]="dateTime",t}({});function ze(t){return t.type===$e.literal}function Ce(t){return t.type===$e.argument}function Ee(t){return t.type===$e.number}function Te(t){return t.type===$e.date}function Se(t){return t.type===$e.time}function Ae(t){return t.type===$e.select}function Me(t){return t.type===$e.plural}function Pe(t){return t.type===$e.pound}function De(t){return t.type===$e.tag}function He(t){return!(!t||"object"!=typeof t||t.type!==ke.number)}function Re(t){return!(!t||"object"!=typeof t||t.type!==ke.dateTime)}let Be=function(t){return t[t.EXPECT_ARGUMENT_CLOSING_BRACE=1]="EXPECT_ARGUMENT_CLOSING_BRACE",t[t.EMPTY_ARGUMENT=2]="EMPTY_ARGUMENT",t[t.MALFORMED_ARGUMENT=3]="MALFORMED_ARGUMENT",t[t.EXPECT_ARGUMENT_TYPE=4]="EXPECT_ARGUMENT_TYPE",t[t.INVALID_ARGUMENT_TYPE=5]="INVALID_ARGUMENT_TYPE",t[t.EXPECT_ARGUMENT_STYLE=6]="EXPECT_ARGUMENT_STYLE",t[t.INVALID_NUMBER_SKELETON=7]="INVALID_NUMBER_SKELETON",t[t.INVALID_DATE_TIME_SKELETON=8]="INVALID_DATE_TIME_SKELETON",t[t.EXPECT_NUMBER_SKELETON=9]="EXPECT_NUMBER_SKELETON",t[t.EXPECT_DATE_TIME_SKELETON=10]="EXPECT_DATE_TIME_SKELETON",t[t.UNCLOSED_QUOTE_IN_ARGUMENT_STYLE=11]="UNCLOSED_QUOTE_IN_ARGUMENT_STYLE",t[t.EXPECT_SELECT_ARGUMENT_OPTIONS=12]="EXPECT_SELECT_ARGUMENT_OPTIONS",t[t.EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE=13]="EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE",t[t.INVALID_PLURAL_ARGUMENT_OFFSET_VALUE=14]="INVALID_PLURAL_ARGUMENT_OFFSET_VALUE",t[t.EXPECT_SELECT_ARGUMENT_SELECTOR=15]="EXPECT_SELECT_ARGUMENT_SELECTOR",t[t.EXPECT_PLURAL_ARGUMENT_SELECTOR=16]="EXPECT_PLURAL_ARGUMENT_SELECTOR",t[t.EXPECT_SELECT_ARGUMENT_SELECTOR_FRAGMENT=17]="EXPECT_SELECT_ARGUMENT_SELECTOR_FRAGMENT",t[t.EXPECT_PLURAL_ARGUMENT_SELECTOR_FRAGMENT=18]="EXPECT_PLURAL_ARGUMENT_SELECTOR_FRAGMENT",t[t.INVALID_PLURAL_ARGUMENT_SELECTOR=19]="INVALID_PLURAL_ARGUMENT_SELECTOR",t[t.DUPLICATE_PLURAL_ARGUMENT_SELECTOR=20]="DUPLICATE_PLURAL_ARGUMENT_SELECTOR",t[t.DUPLICATE_SELECT_ARGUMENT_SELECTOR=21]="DUPLICATE_SELECT_ARGUMENT_SELECTOR",t[t.MISSING_OTHER_CLAUSE=22]="MISSING_OTHER_CLAUSE",t[t.INVALID_TAG=23]="INVALID_TAG",t[t.INVALID_TAG_NAME=25]="INVALID_TAG_NAME",t[t.UNMATCHED_CLOSING_TAG=26]="UNMATCHED_CLOSING_TAG",t[t.UNCLOSED_TAG=27]="UNCLOSED_TAG",t}({});const Le=/[ \xA0\u1680\u2000-\u200A\u202F\u205F\u3000]/,Ie={"001":["H","h"],419:["h","H","hB","hb"],AC:["H","h","hb","hB"],AD:["H","hB"],AE:["h","hB","hb","H"],AF:["H","hb","hB","h"],AG:["h","hb","H","hB"],AI:["H","h","hb","hB"],AL:["h","H","hB"],AM:["H","hB"],AO:["H","hB"],AR:["h","H","hB","hb"],AS:["h","H"],AT:["H","hB"],AU:["h","hb","H","hB"],AW:["H","hB"],AX:["H"],AZ:["H","hB","h"],BA:["H","hB","h"],BB:["h","hb","H","hB"],BD:["h","hB","H"],BE:["H","hB"],BF:["H","hB"],BG:["H","hB","h"],BH:["h","hB","hb","H"],BI:["H","h"],BJ:["H","hB"],BL:["H","hB"],BM:["h","hb","H","hB"],BN:["hb","hB","h","H"],BO:["h","H","hB","hb"],BQ:["H"],BR:["H","hB"],BS:["h","hb","H","hB"],BT:["h","H"],BW:["H","h","hb","hB"],BY:["H","h"],BZ:["H","h","hb","hB"],CA:["h","hb","H","hB"],CC:["H","h","hb","hB"],CD:["hB","H"],CF:["H","h","hB"],CG:["H","hB"],CH:["H","hB","h"],CI:["H","hB"],CK:["H","h","hb","hB"],CL:["h","H","hB","hb"],CM:["H","h","hB"],CN:["H","hB","hb","h"],CO:["h","H","hB","hb"],CP:["H"],CR:["h","H","hB","hb"],CU:["h","H","hB","hb"],CV:["H","hB"],CW:["H","hB"],CX:["H","h","hb","hB"],CY:["h","H","hb","hB"],CZ:["H"],DE:["H","hB"],DG:["H","h","hb","hB"],DJ:["h","H"],DK:["H"],DM:["h","hb","H","hB"],DO:["h","H","hB","hb"],DZ:["h","hB","hb","H"],EA:["H","h","hB","hb"],EC:["h","H","hB","hb"],EE:["H","hB"],EG:["h","hB","hb","H"],EH:["h","hB","hb","H"],ER:["h","H"],ES:["H","hB","h","hb"],ET:["hB","hb","h","H"],FI:["H"],FJ:["h","hb","H","hB"],FK:["H","h","hb","hB"],FM:["h","hb","H","hB"],FO:["H","h"],FR:["H","hB"],GA:["H","hB"],GB:["H","h","hb","hB"],GD:["h","hb","H","hB"],GE:["H","hB","h"],GF:["H","hB"],GG:["H","h","hb","hB"],GH:["h","H"],GI:["H","h","hb","hB"],GL:["H","h"],GM:["h","hb","H","hB"],GN:["H","hB"],GP:["H","hB"],GQ:["H","hB","h","hb"],GR:["h","H","hb","hB"],GS:["H","h","hb","hB"],GT:["h","H","hB","hb"],GU:["h","hb","H","hB"],GW:["H","hB"],GY:["h","hb","H","hB"],HK:["h","hB","hb","H"],HN:["h","H","hB","hb"],HR:["H","hB"],HU:["H","h"],IC:["H","h","hB","hb"],ID:["H"],IE:["H","h","hb","hB"],IL:["H","hB"],IM:["H","h","hb","hB"],IN:["h","H"],IO:["H","h","hb","hB"],IQ:["h","hB","hb","H"],IR:["hB","H"],IS:["H"],IT:["H","hB"],JE:["H","h","hb","hB"],JM:["h","hb","H","hB"],JO:["h","hB","hb","H"],JP:["H","K","h"],KE:["hB","hb","H","h"],KG:["H","h","hB","hb"],KH:["hB","h","H","hb"],KI:["h","hb","H","hB"],KM:["H","h","hB","hb"],KN:["h","hb","H","hB"],KP:["h","H","hB","hb"],KR:["h","H","hB","hb"],KW:["h","hB","hb","H"],KY:["h","hb","H","hB"],KZ:["H","hB"],LA:["H","hb","hB","h"],LB:["h","hB","hb","H"],LC:["h","hb","H","hB"],LI:["H","hB","h"],LK:["H","h","hB","hb"],LR:["h","hb","H","hB"],LS:["h","H"],LT:["H","h","hb","hB"],LU:["H","h","hB"],LV:["H","hB","hb","h"],LY:["h","hB","hb","H"],MA:["H","h","hB","hb"],MC:["H","hB"],MD:["H","hB"],ME:["H","hB","h"],MF:["H","hB"],MG:["H","h"],MH:["h","hb","H","hB"],MK:["H","h","hb","hB"],ML:["H"],MM:["hB","hb","H","h"],MN:["H","h","hb","hB"],MO:["h","hB","hb","H"],MP:["h","hb","H","hB"],MQ:["H","hB"],MR:["h","hB","hb","H"],MS:["H","h","hb","hB"],MT:["H","h"],MU:["H","h"],MV:["H","h"],MW:["h","hb","H","hB"],MX:["h","H","hB","hb"],MY:["hb","hB","h","H"],MZ:["H","hB"],NA:["h","H","hB","hb"],NC:["H","hB"],NE:["H"],NF:["H","h","hb","hB"],NG:["H","h","hb","hB"],NI:["h","H","hB","hb"],NL:["H","hB"],NO:["H","h"],NP:["H","h","hB"],NR:["H","h","hb","hB"],NU:["H","h","hb","hB"],NZ:["h","hb","H","hB"],OM:["h","hB","hb","H"],PA:["h","H","hB","hb"],PE:["h","H","hB","hb"],PF:["H","h","hB"],PG:["h","H"],PH:["h","hB","hb","H"],PK:["h","hB","H"],PL:["H","h"],PM:["H","hB"],PN:["H","h","hb","hB"],PR:["h","H","hB","hb"],PS:["h","hB","hb","H"],PT:["H","hB"],PW:["h","H"],PY:["h","H","hB","hb"],QA:["h","hB","hb","H"],RE:["H","hB"],RO:["H","hB"],RS:["H","hB","h"],RU:["H"],RW:["H","h"],SA:["h","hB","hb","H"],SB:["h","hb","H","hB"],SC:["H","h","hB"],SD:["h","hB","hb","H"],SE:["H"],SG:["h","hb","H","hB"],SH:["H","h","hb","hB"],SI:["H","hB"],SJ:["H"],SK:["H"],SL:["h","hb","H","hB"],SM:["H","h","hB"],SN:["H","h","hB"],SO:["h","H"],SR:["H","hB"],SS:["h","hb","H","hB"],ST:["H","hB"],SV:["h","H","hB","hb"],SX:["H","h","hb","hB"],SY:["h","hB","hb","H"],SZ:["h","hb","H","hB"],TA:["H","h","hb","hB"],TC:["h","hb","H","hB"],TD:["h","H","hB"],TF:["H","h","hB"],TG:["H","hB"],TH:["H","h"],TJ:["H","h"],TL:["H","hB","hb","h"],TM:["H","h"],TN:["h","hB","hb","H"],TO:["h","H"],TR:["H","hB"],TT:["h","hb","H","hB"],TW:["hB","hb","h","H"],TZ:["hB","hb","H","h"],UA:["H","hB","h"],UG:["hB","hb","H","h"],UM:["h","hb","H","hB"],US:["h","hb","H","hB"],UY:["h","H","hB","hb"],UZ:["H","hB","h"],VA:["H","h","hB"],VC:["h","hb","H","hB"],VE:["h","H","hB","hb"],VG:["h","hb","H","hB"],VI:["h","hb","H","hB"],VN:["H","h"],VU:["h","H"],WF:["H","hB"],WS:["h","H"],XK:["H","hB","h"],YE:["h","hB","hb","H"],YT:["H","hB"],ZA:["H","h","hb","hB"],ZM:["h","hb","H","hB"],ZW:["H","h"],"af-ZA":["H","h","hB","hb"],"ar-001":["h","hB","hb","H"],"ca-ES":["H","h","hB"],"en-001":["h","hb","H","hB"],"en-HK":["h","hb","H","hB"],"en-IL":["H","h","hb","hB"],"en-MY":["h","hb","H","hB"],"es-BR":["H","h","hB","hb"],"es-ES":["H","h","hB","hb"],"es-GQ":["H","h","hB","hb"],"fr-CA":["H","h","hB"],"gl-ES":["H","h","hB"],"gu-IN":["hB","hb","h","H"],"hi-IN":["hB","h","H"],"it-CH":["H","h","hB"],"it-IT":["H","h","hB"],"kn-IN":["hB","h","H"],"ku-SY":["H","hB"],"ml-IN":["hB","h","H"],"mr-IN":["hB","hb","h","H"],"pa-IN":["hB","hb","h","H"],"ta-IN":["hB","h","hb","H"],"te-IN":["hB","h","H"],"zu-ZA":["H","hB","hb","h"]};function Ne(t){let e=t.hourCycle;if(void 0===e&&t.hourCycles&&t.hourCycles.length&&(e=t.hourCycles[0]),e)switch(e){case"h24":return"k";case"h23":return"H";case"h12":return"h";case"h11":return"K";default:throw new Error("Invalid hourCycle")}const i=t.language;let o;"root"!==i&&(o=t.maximize().region);return(Ie[o||""]||Ie[i||""]||Ie[`${i}-001`]||Ie["001"])[0]}const Fe=new RegExp(`^${Le.source}*`),Oe=new RegExp(`${Le.source}*$`);function Ue(t,e){return{start:t,end:e}}const Ge=!!Object.fromEntries,We=!!String.prototype.trimStart,Ze=!!String.prototype.trimEnd,je=Ge?Object.fromEntries:function(t){const e={};for(const[i,o]of t)e[i]=o;return e},Ve=We?function(t){return t.trimStart()}:function(t){return t.replace(Fe,"")},Xe=Ze?function(t){return t.trimEnd()}:function(t){return t.replace(Oe,"")},Ye=new RegExp("([^\\p{White_Space}\\p{Pattern_Syntax}]*)","yu");class Ke{message;position;locale;ignoreTag;requiresOtherClause;shouldParseSkeletons;constructor(t,e={}){this.message=t,this.position={offset:0,line:1,column:1},this.ignoreTag=!!e.ignoreTag,this.locale=e.locale,this.requiresOtherClause=!!e.requiresOtherClause,this.shouldParseSkeletons=!!e.shouldParseSkeletons}parse(){if(0!==this.offset())throw Error("parser can only be used once");return this.parseMessage(0,"",!1)}parseMessage(t,e,i){let o=[];for(;!this.isEOF();){const r=this.char();if(123===r){const e=this.parseArgument(t,i);if(e.err)return e;o.push(e.val)}else{if(125===r&&t>0)break;if(35!==r||"plural"!==e&&"selectordinal"!==e){if(60===r&&!this.ignoreTag&&47===this.peek()){if(i)break;return this.error(Be.UNMATCHED_CLOSING_TAG,Ue(this.clonePosition(),this.clonePosition()))}if(60===r&&!this.ignoreTag&&qe(this.peek()||0)){const i=this.parseTag(t,e);if(i.err)return i;o.push(i.val)}else{const i=this.parseLiteral(t,e);if(i.err)return i;o.push(i.val)}}else{const t=this.clonePosition();this.bump(),o.push({type:$e.pound,location:Ue(t,this.clonePosition())})}}}return{val:o,err:null}}parseTag(t,e){const i=this.clonePosition();this.bump();const o=this.parseTagName();if(this.bumpSpace(),this.bumpIf("/>"))return{val:{type:$e.literal,value:`<${o}/>`,location:Ue(i,this.clonePosition())},err:null};if(this.bumpIf(">")){const r=this.parseMessage(t+1,e,!0);if(r.err)return r;const s=r.val,n=this.clonePosition();if(this.bumpIf("</")){if(this.isEOF()||!qe(this.char()))return this.error(Be.INVALID_TAG,Ue(n,this.clonePosition()));const t=this.clonePosition();return o!==this.parseTagName()?this.error(Be.UNMATCHED_CLOSING_TAG,Ue(t,this.clonePosition())):(this.bumpSpace(),this.bumpIf(">")?{val:{type:$e.tag,value:o,children:s,location:Ue(i,this.clonePosition())},err:null}:this.error(Be.INVALID_TAG,Ue(n,this.clonePosition())))}return this.error(Be.UNCLOSED_TAG,Ue(i,this.clonePosition()))}return this.error(Be.INVALID_TAG,Ue(i,this.clonePosition()))}parseTagName(){const t=this.offset();for(this.bump();!this.isEOF()&&Je(this.char());)this.bump();return this.message.slice(t,this.offset())}parseLiteral(t,e){const i=this.clonePosition();let o="";for(;;){const i=this.tryParseQuote(e);if(i){o+=i;continue}const r=this.tryParseUnquoted(t,e);if(r){o+=r;continue}const s=this.tryParseLeftAngleBracket();if(!s)break;o+=s}const r=Ue(i,this.clonePosition());return{val:{type:$e.literal,value:o,location:r},err:null}}tryParseLeftAngleBracket(){return this.isEOF()||60!==this.char()||!this.ignoreTag&&(qe(t=this.peek()||0)||47===t)?null:(this.bump(),"<");var t}tryParseQuote(t){if(this.isEOF()||39!==this.char())return null;switch(this.peek()){case 39:return this.bump(),this.bump(),"'";case 123:case 60:case 62:case 125:break;case 35:if("plural"===t||"selectordinal"===t)break;return null;default:return null}this.bump();const e=[this.char()];for(this.bump();!this.isEOF();){const t=this.char();if(39===t){if(39!==this.peek()){this.bump();break}e.push(39),this.bump()}else e.push(t);this.bump()}return String.fromCodePoint(...e)}tryParseUnquoted(t,e){if(this.isEOF())return null;const i=this.char();return 60===i||123===i||35===i&&("plural"===e||"selectordinal"===e)||125===i&&t>0?null:(this.bump(),String.fromCodePoint(i))}parseArgument(t,e){const i=this.clonePosition();if(this.bump(),this.bumpSpace(),this.isEOF())return this.error(Be.EXPECT_ARGUMENT_CLOSING_BRACE,Ue(i,this.clonePosition()));if(125===this.char())return this.bump(),this.error(Be.EMPTY_ARGUMENT,Ue(i,this.clonePosition()));let o=this.parseIdentifierIfPossible().value;if(!o)return this.error(Be.MALFORMED_ARGUMENT,Ue(i,this.clonePosition()));if(this.bumpSpace(),this.isEOF())return this.error(Be.EXPECT_ARGUMENT_CLOSING_BRACE,Ue(i,this.clonePosition()));switch(this.char()){case 125:return this.bump(),{val:{type:$e.argument,value:o,location:Ue(i,this.clonePosition())},err:null};case 44:return this.bump(),this.bumpSpace(),this.isEOF()?this.error(Be.EXPECT_ARGUMENT_CLOSING_BRACE,Ue(i,this.clonePosition())):this.parseArgumentOptions(t,e,o,i);default:return this.error(Be.MALFORMED_ARGUMENT,Ue(i,this.clonePosition()))}}parseIdentifierIfPossible(){const t=this.clonePosition(),e=this.offset(),i=function(t,e){return Ye.lastIndex=e,Ye.exec(t)[1]??""}(this.message,e),o=e+i.length;this.bumpTo(o);return{value:i,location:Ue(t,this.clonePosition())}}parseArgumentOptions(t,e,i,o){let r=this.clonePosition(),s=this.parseIdentifierIfPossible().value,n=this.clonePosition();switch(s){case"":return this.error(Be.EXPECT_ARGUMENT_TYPE,Ue(r,n));case"number":case"date":case"time":{this.bumpSpace();let t=null;if(this.bumpIf(",")){this.bumpSpace();const e=this.clonePosition(),i=this.parseSimpleArgStyleIfPossible();if(i.err)return i;const o=Xe(i.val);if(0===o.length)return this.error(Be.EXPECT_ARGUMENT_STYLE,Ue(this.clonePosition(),this.clonePosition()));t={style:o,styleLocation:Ue(e,this.clonePosition())}}const e=this.tryParseArgumentClose(o);if(e.err)return e;const r=Ue(o,this.clonePosition());if(t&&t.style.startsWith("::")){let e=Ve(t.style.slice(2));if("number"===s){const o=this.parseNumberSkeletonFromString(e,t.styleLocation);return o.err?o:{val:{type:$e.number,value:i,location:r,style:o.val},err:null}}{if(0===e.length)return this.error(Be.EXPECT_DATE_TIME_SKELETON,r);let o=e;this.locale&&(o=function(t,e){let i="";for(let o=0;o<t.length;o++){const r=t.charAt(o);if("j"===r){let s=0;for(;o+1<t.length&&t.charAt(o+1)===r;)s++,o++;let n=1+(1&s),a=s<2?1:3+(s>>1),l="a",c=Ne(e);for("H"!=c&&"k"!=c||(a=0);a-- >0;)i+=l;for(;n-- >0;)i=c+i}else i+="J"===r?"H":r}return i}(e,this.locale));const n={type:ke.dateTime,pattern:o,location:t.styleLocation,parsedOptions:this.shouldParseSkeletons?de(o):{}};return{val:{type:"date"===s?$e.date:$e.time,value:i,location:r,style:n},err:null}}}return{val:{type:"number"===s?$e.number:"date"===s?$e.date:$e.time,value:i,location:r,style:t?.style??null},err:null}}case"plural":case"selectordinal":case"select":{const r=this.clonePosition();if(this.bumpSpace(),!this.bumpIf(","))return this.error(Be.EXPECT_SELECT_ARGUMENT_OPTIONS,Ue(r,{...r}));this.bumpSpace();let n=this.parseIdentifierIfPossible(),a=0;if("select"!==s&&"offset"===n.value){if(!this.bumpIf(":"))return this.error(Be.EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE,Ue(this.clonePosition(),this.clonePosition()));this.bumpSpace();const t=this.tryParseDecimalInteger(Be.EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE,Be.INVALID_PLURAL_ARGUMENT_OFFSET_VALUE);if(t.err)return t;this.bumpSpace(),n=this.parseIdentifierIfPossible(),a=t.val}const l=this.tryParsePluralOrSelectOptions(t,s,e,n);if(l.err)return l;const c=this.tryParseArgumentClose(o);if(c.err)return c;const h=Ue(o,this.clonePosition());return"select"===s?{val:{type:$e.select,value:i,options:je(l.val),location:h},err:null}:{val:{type:$e.plural,value:i,options:je(l.val),offset:a,pluralType:"plural"===s?"cardinal":"ordinal",location:h},err:null}}default:return this.error(Be.INVALID_ARGUMENT_TYPE,Ue(r,n))}}tryParseArgumentClose(t){return this.isEOF()||125!==this.char()?this.error(Be.EXPECT_ARGUMENT_CLOSING_BRACE,Ue(t,this.clonePosition())):(this.bump(),{val:!0,err:null})}parseSimpleArgStyleIfPossible(){let t=0;const e=this.clonePosition();for(;!this.isEOF();){switch(this.char()){case 39:{this.bump();let t=this.clonePosition();if(!this.bumpUntil("'"))return this.error(Be.UNCLOSED_QUOTE_IN_ARGUMENT_STYLE,Ue(t,this.clonePosition()));this.bump();break}case 123:t+=1,this.bump();break;case 125:if(!(t>0))return{val:this.message.slice(e.offset,this.offset()),err:null};t-=1;break;default:this.bump()}}return{val:this.message.slice(e.offset,this.offset()),err:null}}parseNumberSkeletonFromString(t,e){let i=[];try{i=function(t){if(0===t.length)throw new Error("Number skeleton cannot be empty");const e=t.split(pe).filter(t=>t.length>0),i=[];for(const t of e){let e=t.split("/");if(0===e.length)throw new Error("Invalid number skeleton");const[o,...r]=e;for(const t of r)if(0===t.length)throw new Error("Invalid number skeleton");i.push({stem:o,options:r})}return i}(t)}catch{return this.error(Be.INVALID_NUMBER_SKELETON,e)}return{val:{type:ke.number,tokens:i,location:e,parsedOptions:this.shouldParseSkeletons?we(i):{}},err:null}}tryParsePluralOrSelectOptions(t,e,i,o){let r=!1;const s=[],n=new Set;let{value:a,location:l}=o;for(;;){if(0===a.length){const t=this.clonePosition();if("select"===e||!this.bumpIf("="))break;{const e=this.tryParseDecimalInteger(Be.EXPECT_PLURAL_ARGUMENT_SELECTOR,Be.INVALID_PLURAL_ARGUMENT_SELECTOR);if(e.err)return e;l=Ue(t,this.clonePosition()),a=this.message.slice(t.offset,this.offset())}}if(n.has(a))return this.error("select"===e?Be.DUPLICATE_SELECT_ARGUMENT_SELECTOR:Be.DUPLICATE_PLURAL_ARGUMENT_SELECTOR,l);"other"===a&&(r=!0),this.bumpSpace();const o=this.clonePosition();if(!this.bumpIf("{"))return this.error("select"===e?Be.EXPECT_SELECT_ARGUMENT_SELECTOR_FRAGMENT:Be.EXPECT_PLURAL_ARGUMENT_SELECTOR_FRAGMENT,Ue(this.clonePosition(),this.clonePosition()));const c=this.parseMessage(t+1,e,i);if(c.err)return c;const h=this.tryParseArgumentClose(o);if(h.err)return h;s.push([a,{value:c.val,location:Ue(o,this.clonePosition())}]),n.add(a),this.bumpSpace(),({value:a,location:l}=this.parseIdentifierIfPossible())}return 0===s.length?this.error("select"===e?Be.EXPECT_SELECT_ARGUMENT_SELECTOR:Be.EXPECT_PLURAL_ARGUMENT_SELECTOR,Ue(this.clonePosition(),this.clonePosition())):this.requiresOtherClause&&!r?this.error(Be.MISSING_OTHER_CLAUSE,Ue(this.clonePosition(),this.clonePosition())):{val:s,err:null}}tryParseDecimalInteger(t,e){let i=1;const o=this.clonePosition();this.bumpIf("+")||this.bumpIf("-")&&(i=-1);let r=!1,s=0;for(;!this.isEOF();){const t=this.char();if(!(t>=48&&t<=57))break;r=!0,s=10*s+(t-48),this.bump()}const n=Ue(o,this.clonePosition());return r?(s*=i,Number.isSafeInteger(s)?{val:s,err:null}:this.error(e,n)):this.error(t,n)}offset(){return this.position.offset}isEOF(){return this.offset()===this.message.length}clonePosition(){return{offset:this.position.offset,line:this.position.line,column:this.position.column}}char(){const t=this.position.offset;if(t>=this.message.length)throw Error("out of bound");const e=this.message.codePointAt(t);if(void 0===e)throw Error(`Offset ${t} is at invalid UTF-16 code unit boundary`);return e}error(t,e){return{val:null,err:{kind:t,message:this.message,location:e}}}bump(){if(this.isEOF())return;const t=this.char();10===t?(this.position.line+=1,this.position.column=1,this.position.offset+=1):(this.position.column+=1,this.position.offset+=t<65536?1:2)}bumpIf(t){if(this.message.startsWith(t,this.offset())){for(let e=0;e<t.length;e++)this.bump();return!0}return!1}bumpUntil(t){const e=this.offset(),i=this.message.indexOf(t,e);return i>=0?(this.bumpTo(i),!0):(this.bumpTo(this.message.length),!1)}bumpTo(t){if(this.offset()>t)throw Error(`targetOffset ${t} must be greater than or equal to the current offset ${this.offset()}`);for(t=Math.min(t,this.message.length);;){const e=this.offset();if(e===t)break;if(e>t)throw Error(`targetOffset ${t} is at invalid UTF-16 code unit boundary`);if(this.bump(),this.isEOF())break}}bumpSpace(){for(;!this.isEOF()&&Qe(this.char());)this.bump()}peek(){if(this.isEOF())return null;const t=this.char(),e=this.offset();return this.message.charCodeAt(e+(t>=65536?2:1))??null}}function qe(t){return t>=97&&t<=122||t>=65&&t<=90}function Je(t){return 45===t||46===t||t>=48&&t<=57||95===t||t>=97&&t<=122||t>=65&&t<=90||183==t||t>=192&&t<=214||t>=216&&t<=246||t>=248&&t<=893||t>=895&&t<=8191||t>=8204&&t<=8205||t>=8255&&t<=8256||t>=8304&&t<=8591||t>=11264&&t<=12271||t>=12289&&t<=55295||t>=63744&&t<=64975||t>=65008&&t<=65533||t>=65536&&t<=983039}function Qe(t){return t>=9&&t<=13||32===t||133===t||t>=8206&&t<=8207||8232===t||8233===t}function ti(t){t.forEach(t=>{if(delete t.location,Ae(t)||Me(t))for(const e in t.options)delete t.options[e].location,ti(t.options[e].value);else Ee(t)&&He(t.style)||(Te(t)||Se(t))&&Re(t.style)?delete t.style.location:De(t)&&ti(t.children)})}function ei(t,e={}){e={shouldParseSkeletons:!0,requiresOtherClause:!0,...e};const i=new Ke(t,e).parse();if(i.err){const t=SyntaxError(Be[i.err.kind]);throw t.location=i.err.location,t.originalMessage=i.err.message,t}return e?.captureLocation||ti(i.val),i.val}let ii=function(t){return t.MISSING_VALUE="MISSING_VALUE",t.INVALID_VALUE="INVALID_VALUE",t.MISSING_INTL_API="MISSING_INTL_API",t}({});class oi extends Error{code;originalMessage;constructor(t,e,i){super(t),this.code=e,this.originalMessage=i}toString(){return`[formatjs Error: ${this.code}] ${this.message}`}}class ri extends oi{constructor(t,e,i,o){super(`Invalid values for "${t}": "${e}". Options are "${Object.keys(i).join('", "')}"`,ii.INVALID_VALUE,o)}}class si extends oi{constructor(t,e,i){super(`Value for "${t}" must be of type ${e}`,ii.INVALID_VALUE,i)}}class ni extends oi{constructor(t,e){super(`The intl string context variable "${t}" was not provided to the string "${e}"`,ii.MISSING_VALUE,e)}}let ai=function(t){return t[t.literal=0]="literal",t[t.object=1]="object",t}({});function li(t){return"function"==typeof t}function ci(t,e,i,o,r,s,n){if(1===t.length&&ze(t[0]))return[{type:ai.literal,value:t[0].value}];const a=[];for(const l of t){if(ze(l)){a.push({type:ai.literal,value:l.value});continue}if(Pe(l)){"number"==typeof s&&a.push({type:ai.literal,value:i.getNumberFormat(e).format(s)});continue}const{value:t}=l;if(!r||!(t in r))throw new ni(t,n);let c=r[t];if(Ce(l))c&&"string"!=typeof c&&"number"!=typeof c&&"bigint"!=typeof c||(c="string"==typeof c||"number"==typeof c||"bigint"==typeof c?String(c):""),a.push({type:"string"==typeof c?ai.literal:ai.object,value:c});else{if(Te(l)){const t="string"==typeof l.style?o.date[l.style]:Re(l.style)?l.style.parsedOptions:void 0;a.push({type:ai.literal,value:i.getDateTimeFormat(e,t).format(c)});continue}if(Se(l)){const t="string"==typeof l.style?o.time[l.style]:Re(l.style)?l.style.parsedOptions:o.time.medium;a.push({type:ai.literal,value:i.getDateTimeFormat(e,t).format(c)});continue}if(Ee(l)){const t="string"==typeof l.style?o.number[l.style]:He(l.style)?l.style.parsedOptions:void 0;if(t&&t.scale){const e=t.scale||1;if("bigint"==typeof c){if(!Number.isInteger(e))throw new TypeError(`Cannot apply fractional scale ${e} to bigint value. Scale must be an integer when formatting bigint.`);c*=BigInt(e)}else c*=e}a.push({type:ai.literal,value:i.getNumberFormat(e,t).format(c)});continue}if(De(l)){const{children:t,value:c}=l,h=r[c];if(!li(h))throw new si(c,"function",n);let d=h(ci(t,e,i,o,r,s).map(t=>t.value));Array.isArray(d)||(d=[d]),a.push(...d.map(t=>({type:"string"==typeof t?ai.literal:ai.object,value:t})))}if(Ae(l)){const t=c,s=(Object.prototype.hasOwnProperty.call(l.options,t)?l.options[t]:void 0)||l.options.other;if(!s)throw new ri(l.value,c,Object.keys(l.options),n);a.push(...ci(s.value,e,i,o,r));continue}if(Me(l)){const t=`=${c}`;let s=Object.prototype.hasOwnProperty.call(l.options,t)?l.options[t]:void 0;if(!s){if(!Intl.PluralRules)throw new oi('Intl.PluralRules is not available in this environment.\nTry polyfilling it using "@formatjs/intl-pluralrules"\n',ii.MISSING_INTL_API,n);const t="bigint"==typeof c?Number(c):c,o=i.getPluralRules(e,{type:l.pluralType}).select(t-(l.offset||0));s=(Object.prototype.hasOwnProperty.call(l.options,o)?l.options[o]:void 0)||l.options.other}if(!s)throw new ri(l.value,c,Object.keys(l.options),n);const h="bigint"==typeof c?Number(c):c;a.push(...ci(s.value,e,i,o,r,h-(l.offset||0)));continue}}}return(l=a).length<2?l:l.reduce((t,e)=>{const i=t[t.length-1];return i&&i.type===ai.literal&&e.type===ai.literal?i.value+=e.value:t.push(e),t},[]);var l}function hi(t,e){return e?Object.keys(t).reduce((i,o)=>{var r,s;return i[o]=(r=t[o],(s=e[o])?{...r,...s,...Object.keys(r).reduce((t,e)=>(t[e]={...r[e],...s[e]},t),{})}:r),i},{...t}):t}function di(t){return{create:()=>({get:e=>t[e],set(e,i){t[e]=i}})}}class pi{ast;locales;resolvedLocale;formatters;formats;message;formatterCache={number:{},dateTime:{},pluralRules:{}};constructor(t,e=pi.defaultLocale,i,o){if(this.locales=e,this.resolvedLocale=pi.resolveLocale(e),"string"==typeof t){if(this.message=t,!pi.__parse)throw new TypeError("IntlMessageFormat.__parse must be set to process `message` of type `string`");const{...e}=o||{};this.ast=pi.__parse(t,{...e,locale:this.resolvedLocale})}else this.ast=t;if(!Array.isArray(this.ast))throw new TypeError("A message must be provided as a String or AST.");this.formats=hi(pi.formats,i),this.formatters=o&&o.formatters||function(t={number:{},dateTime:{},pluralRules:{}}){return{getNumberFormat:ee((...t)=>new Intl.NumberFormat(...t),{cache:di(t.number),strategy:ce.variadic}),getDateTimeFormat:ee((...t)=>new Intl.DateTimeFormat(...t),{cache:di(t.dateTime),strategy:ce.variadic}),getPluralRules:ee((...t)=>new Intl.PluralRules(...t),{cache:di(t.pluralRules),strategy:ce.variadic})}}(this.formatterCache)}format=t=>{const e=this.formatToParts(t);if(1===e.length)return e[0].value;const i=e.reduce((t,e)=>(t.length&&e.type===ai.literal&&"string"==typeof t[t.length-1]?t[t.length-1]+=e.value:t.push(e.value),t),[]);return i.length<=1?i[0]||"":i};formatToParts=t=>ci(this.ast,this.locales,this.formatters,this.formats,t,void 0,this.message);resolvedOptions=()=>({locale:this.resolvedLocale?.toString()||Intl.NumberFormat.supportedLocalesOf(this.locales)[0]});getAst=()=>this.ast;static memoizedDefaultLocale=null;static get defaultLocale(){return pi.memoizedDefaultLocale||(pi.memoizedDefaultLocale=(new Intl.NumberFormat).resolvedOptions().locale),pi.memoizedDefaultLocale}static resolveLocale=t=>{if(void 0===Intl.Locale)return;const e=Intl.NumberFormat.supportedLocalesOf(t);return e.length>0?new Intl.Locale(e[0]):new Intl.Locale("string"==typeof t?t:t[0])};static __parse=ei;static formats={number:{integer:{maximumFractionDigits:0},currency:{style:"currency"},percent:{style:"percent"}},date:{short:{month:"numeric",day:"numeric",year:"2-digit"},medium:{month:"short",day:"numeric",year:"numeric"},long:{month:"long",day:"numeric",year:"numeric"},full:{weekday:"long",month:"long",day:"numeric",year:"numeric"}},time:{short:{hour:"numeric",minute:"numeric"},medium:{hour:"numeric",minute:"numeric",second:"numeric"},long:{hour:"numeric",minute:"numeric",second:"numeric",timeZoneName:"short"},full:{hour:"numeric",minute:"numeric",second:"numeric",timeZoneName:"short"}}}}const ui={en:{common:{save:"Save",saving:"Saving...",cancel:"Cancel",delete:"Delete",close:"Close",add:"Add",remove:"Remove",skip:"Skip",rename:"Rename",discard:"Discard",apply:"Apply",load:"Load",loading:"Loading...",add_another_sensor:"+ Add another sensor"},furniture:{armchair:"Armchair",bath:"Bath",double_bed:"Double bed",single_bed:"Single bed",door_left_swing:"Door (left swing)",door_right_swing:"Door (right swing)",dining_table:"Dining table",round_table:"Round table",lamp:"Lamp",oven_stove:"Oven / stove",plant:"Plant",shower:"Shower",sofa_2_seat:"Sofa (2 seat)",sofa_3_seat:"Sofa (3 seat)",tv:"TV",toilet:"Toilet",counter:"Counter",cupboard:"Cupboard",desk:"Desk",fridge:"Fridge",speaker:"Speaker",window:"Window",custom_icon:"Custom icon",custom:"Custom"},corners:{front_left:"Front-left",front_right:"Front-right",back_right:"Back-right",back_left:"Back-left",left_wall:"left wall",right_wall:"right wall",front_wall:"front wall",back_wall:"back wall"},wizard:{how_calibration_works:"How room calibration works",calibrate_room_size:"Calibrate room size",start_calibration:"Start room size calibration",begin_marking:"Begin marking corners",mark_corner:"Mark {corner}",recording:"Recording... {current}s / {total}s",paused:"Paused — need exactly one target visible",stand_still:"Stand still",no_target:"No target detected. Make sure you are visible to the sensor.",multiple_targets:"Multiple targets detected. Only one person should be in the room during calibration.",save_prompt:"Click Save to store this room's calibration, or click a corner above to re-mark it.",walk_instruction_full:"<strong>Walk to each corner</strong> in order (1 → 2 → 3 → 4) and click Mark. Stand still for a few seconds so the sensor can lock on.",cant_reach:"<strong>Can't reach a corner?</strong> Stand as close as you can and enter the distance from each wall in the offset fields — like corner 4 in the diagram above, where a plant is in the way.",corner_sensor_hint:"In this example, your sensor is mounted in Corner 2, but it can be anywhere. You can stand right in front of it.",walk_instruction:"Walk to each corner of the room and click Mark. The sensor will record your position over {duration} seconds.",corner_step:"Corner {index}/4: Walk to the {corner}",distance_from:"Distance from:",distance_from_side:"Distance from {wall} (cm)",how_to_position:"How to position your sensor",mount_height:"Mount height",mount_height_desc:"Place the sensor <strong>1.5 to 2 meters</strong> from the floor",placement:"Placement",placement_desc:"Place in a <strong>corner or on a wall</strong>, pointing toward the most distant opposite corner",beam_direction:"Beam direction",beam_direction_desc:"Keep the beam <strong>horizontal</strong> — not angled up or down",front_wall_label:"Front wall (sensor side)",back_wall_label:"Back wall",sensor:"Sensor",horizontal_correct:"Horizontal ✓",angled_wrong:"Angled ✗",no_presence:"No presence"},dialogs:{delete_calibration_title:"Delete room calibration?",delete_calibration_body:"This will also delete all detection zones and furniture. This cannot be undone.",unsaved_changes:"You have unsaved changes",unsaved_changes_body:"Your changes will be lost if you navigate away without applying.",update_entity_ids:"Update entity IDs?",update_entity_ids_body:"Zone names changed. Would you like to update the entity IDs to match?",save_template:"Save template",load_template:"Load template",no_templates:"No saved templates.",template_name:"Template name"},menu:{settings:"Settings",room_calibration:"Room size calibration",delete_calibration:"Delete room calibration",detection_zones:"Detection zones",furniture:"Furniture"},settings:{title:"Settings",detection_ranges:"Detection Ranges",sensor_calibration:"Sensor Calibration",entities:"Entities",target_sensor:"Target Sensor",static_sensor:"Static Sensor",motion_sensor:"Motion Sensor",environmental:"Environmental",auto:"Auto",max_distance:"Max distance",min_distance:"Min distance",presence_timeout:"Presence timeout",trigger_threshold:"Trigger threshold",renew_threshold:"Renew threshold",illuminance_offset:"Illuminance offset",humidity_offset:"Humidity offset",temperature_offset:"Temperature offset",furthest_point:"Current furthest point from sensor:"},sidebar:{detection_zones:"Detection zones",furniture:"Furniture",live_overview:"Live overview",add_zone:"Add zone",rest_of_room:"Rest of room",room:"Room"},zones:{zone_name:"Zone name",type:"Type",normal:"Normal",entrance:"Entrance",thoroughfare:"Thoroughfare",rest_area:"Rest area",custom:"Custom",trigger:"Trigger",renew:"Renew",presence_timeout:"Presence timeout",handoff_timeout:"Handoff timeout",entry_point:"Entry point",seconds_suffix:"s"},live:{presence:"Presence",detected:"Detected",clear:"Clear",environment:"Environment",occupancy:"Occupancy",static_presence:"Static presence",motion_presence:"Motion presence",target_presence:"Target presence",target_count:"Target count"},entities:{room_level:"Room level",zone_level:"Zone level",target_level:"Target level",occupancy:"Occupancy",static_presence:"Static presence",motion_presence:"Motion presence",target_presence:"Target presence",target_count:"Target count",zone_presence:"Presence",zone_target_count:"Target count",xy_sensor:"XY position, relative to sensor",xy:"XY position",active:"Active",distance:"Distance",angle:"Angle",speed:"Speed",resolution:"Resolution",illuminance:"Illuminance",humidity:"Humidity",temperature:"Temperature",co2:"CO₂"},info:{occupancy:"Combined occupancy from all sources — PIR motion, static mmWave presence, and zone tracking. Shows detected if any source detects presence.",static_presence:"mmWave radar detects stationary people by measuring micro-movements like breathing. Works through furniture and blankets.",motion_presence:"Passive infrared sensor detects movement by sensing body heat. Fast response but only triggers on motion, not stationary presence.",target_presence:"Whether any target is actively tracked by the mmWave radar. Detected when at least one target point is being reported.",zone_occupancy:"Zone {slot} occupancy. Currently {count} {count, plural, one {target} other {targets}} detected. Sensitivity determines how many consecutive frames are needed to confirm presence.",rest_of_room_occupancy:"Covers the entire room outside of any defined zones. Currently {count} {count, plural, one {target} other {targets}} detected.",target_auto_range:"Automatically set max distance from room dimensions.",target_max_distance:"Maximum detection distance for the target sensor (LD2450). Hardware limit: 6m.",static_min_distance:"Minimum detection distance for the static sensor.",static_max_distance:"Maximum detection distance for the static sensor. Hardware limit: 16m.",motion_timeout:"Time after last motion before the motion sensor clears.",static_timeout:"Time after last static detection before the sensor clears.",trigger_threshold:"Minimum signal strength needed to initially detect static presence. Higher = harder to trigger.",renew_threshold:"Minimum signal strength needed to maintain static presence detection. Higher = harder to renew.",illuminance_offset:"Adjust the illuminance reading by a fixed amount.",humidity_offset:"Adjust the humidity reading by a fixed amount.",temperature_offset:"Adjust the temperature reading by a fixed amount.",room_occupancy:"Combined room occupancy from all sensors.",room_static:"mmWave static presence detection.",room_motion:"PIR motion detection.",room_target_presence:"Whether any target is actively tracked.",room_target_count:"Number of targets detected in the room.",zone_presence:"Per-zone occupancy based on target tracking.",zone_target_count:"Number of targets in each zone.",xy_sensor:"Raw XY coordinates from the sensor.",xy:"XY coordinates mapped to the room grid.",active:"Whether each target slot is actively tracking.",distance:"Distance from sensor to each target.",angle:"Angle from sensor to each target.",speed:"Movement speed of each target.",resolution:"Detection resolution for each target.",illuminance:"BH1750 illuminance sensor.",humidity:"SHTC3 humidity sensor.",temperature:"SHTC3 temperature sensor.",co2:"SCD40 CO₂ sensor (optional module)."},dimensions:{width_cm:"W (cm)",height_cm:"H (cm)",rotation:"Rot"}}};function gi(t,e){const i=e.split(".");let o=t;for(const t of i){if(null==o||"object"!=typeof o)return;o=o[t]}return"string"==typeof o?o:void 0}const fi={armchair:{viewBox:"0 0 256 256",content:'<rect x="16" y="16" width="224" height="224" rx="16" stroke="black" stroke-width="12" fill="none"/><rect x="16" y="16" width="224" height="48" rx="8" stroke="black" stroke-width="12" fill="none"/><rect x="16" y="64" width="48" height="176" rx="8" stroke="black" stroke-width="12" fill="none"/><rect x="192" y="64" width="48" height="176" rx="8" stroke="black" stroke-width="12" fill="none"/><rect x="64" y="64" width="128" height="176" rx="8" stroke="black" stroke-width="8" fill="none"/>'},bath:{viewBox:"0 0 600 300",content:'<rect x="50" y="50" width="500" height="200" rx="40" stroke="black" stroke-width="8" fill="none"/><path d="M 100 220 C 100 240, 500 240, 500 220" stroke="black" stroke-width="8" fill="none"/><rect x="70" y="70" width="30" height="20" stroke="black" stroke-width="8" fill="none"/><rect x="80" y="90" width="10" height="20" stroke="black" stroke-width="8" fill="none"/><circle cx="510" cy="150" r="10" stroke="black" stroke-width="8" fill="none"/>'},"bed-double":{viewBox:"0 0 512 512",content:'<rect x="0" y="0" width="512" height="512" rx="16" stroke="black" stroke-width="16" fill="none"/><path d="M0 64C0 46.3269 16.3269 32 32 32H480C497.673 32 512 46.3269 512 64V128C512 145.673 497.673 160 480 160H32C16.3269 160 0 145.673 0 128V64Z" stroke="black" stroke-width="16" fill="none"/><rect x="32" y="32" width="208" height="96" rx="8" stroke="black" stroke-width="16" fill="none"/><rect x="272" y="32" width="208" height="96" rx="8" stroke="black" stroke-width="16" fill="none"/><rect x="16" y="144" width="480" height="336" rx="8" stroke="black" stroke-width="16" fill="none"/><line x1="16" y1="256" x2="496" y2="256" stroke="#D0D0D0" stroke-width="8"/><line x1="16" y1="368" x2="496" y2="368" stroke="#D0D0D0" stroke-width="8"/>'},"bed-single":{viewBox:"0 0 256 512",content:'<rect x="0" y="0" width="256" height="512" rx="16" stroke="black" stroke-width="16" fill="none"/><path d="M0 64C0 46.3269 16.3269 32 32 32H224C241.673 32 256 46.3269 256 64V128C256 145.673 241.673 160 224 160H32C16.3269 160 0 145.673 0 128V64Z" stroke="black" stroke-width="16" fill="none"/><rect x="32" y="32" width="192" height="96" rx="8" stroke="black" stroke-width="16" fill="none"/><rect x="16" y="144" width="224" height="336" rx="8" stroke="black" stroke-width="16" fill="none"/><line x1="16" y1="256" x2="240" y2="256" stroke="#D0D0D0" stroke-width="8"/><line x1="16" y1="368" x2="240" y2="368" stroke="#D0D0D0" stroke-width="8"/>'},"door-left":{viewBox:"0 0 256 256",content:'<rect x="0" y="210" width="80" height="20" fill="black"/><rect x="60" y="60" width="20" height="150" fill="black"/><rect x="200" y="210" width="56" height="20" fill="black"/><path d="M 80 60 A 150 150 0 0 1 200 210" stroke="black" stroke-width="3" fill="none"/>'},"door-right":{viewBox:"0 0 256 256",content:'<rect x="176" y="210" width="80" height="20" fill="black"/><rect x="176" y="60" width="20" height="150" fill="black"/><rect x="0" y="210" width="56" height="20" fill="black"/><path d="M 176 60 A 150 150 0 0 0 56 210" stroke="black" stroke-width="3" fill="none"/>'},"floor-lamp":{viewBox:"0 0 256 256",content:'<circle cx="128" cy="128" r="96" stroke="black" stroke-width="16" fill="none"/><circle cx="128" cy="128" r="80" stroke="black" stroke-width="8" fill="none"/><circle cx="128" cy="128" r="16" fill="black"/><line x1="128" y1="112" x2="128" y2="48" stroke="black" stroke-width="8"/><circle cx="128" cy="48" r="8" fill="black"/><path d="M 64 64 A 128 128 0 0 1 192 64" stroke="black" stroke-width="8" stroke-dasharray="8 8"/>'},oven:{viewBox:"0 0 256 256",content:'<rect x="0" y="0" width="256" height="256" rx="16" stroke="black" stroke-width="16" fill="none"/><line x1="0" y1="224" x2="256" y2="224" stroke="black" stroke-width="16"/><circle cx="64" cy="64" r="40" stroke="black" stroke-width="16" fill="none"/><circle cx="64" cy="64" r="16" fill="black"/><circle cx="192" cy="64" r="40" stroke="black" stroke-width="16" fill="none"/><circle cx="192" cy="64" r="16" fill="black"/><circle cx="64" cy="192" r="40" stroke="black" stroke-width="16" fill="none"/><circle cx="64" cy="192" r="16" fill="black"/><circle cx="192" cy="192" r="40" stroke="black" stroke-width="16" fill="none"/><circle cx="192" cy="192" r="16" fill="black"/><rect x="32" y="240" width="192" height="16" rx="4" stroke="black" stroke-width="8" fill="black"/>'},plant:{viewBox:"0 0 256 256",content:'<circle cx="128" cy="128" r="96" stroke="black" stroke-width="16" fill="none"/><circle cx="128" cy="128" r="80" fill="none"/><g transform="translate(128 128)"><path d="M 0 0 C 0 -64, 40 -80, 0 -96 C -40 -80, 0 -64, 0 0 Z" fill="none" stroke="black" stroke-width="12"/><path d="M 0 0 C 0 -64, 40 -80, 0 -96 C -40 -80, 0 -64, 0 0 Z" transform="rotate(72)" fill="none" stroke="black" stroke-width="12"/><path d="M 0 0 C 0 -64, 40 -80, 0 -96 C -40 -80, 0 -64, 0 0 Z" transform="rotate(144)" fill="none" stroke="black" stroke-width="12"/><path d="M 0 0 C 0 -64, 40 -80, 0 -96 C -40 -80, 0 -64, 0 0 Z" transform="rotate(216)" fill="none" stroke="black" stroke-width="12"/><path d="M 0 0 C 0 -64, 40 -80, 0 -96 C -40 -80, 0 -64, 0 0 Z" transform="rotate(288)" fill="none" stroke="black" stroke-width="12"/></g>'},shower:{viewBox:"0 0 256 256",content:'<path d="M 32 32 H 224 V 224 H 32 Z" stroke="black" stroke-width="16" fill="none"/><line x1="32" y1="32" x2="224" y2="224" stroke="black" stroke-width="8" stroke-dasharray="8 8"/><line x1="224" y1="32" x2="32" y2="224" stroke="black" stroke-width="8" stroke-dasharray="8 8"/><circle cx="128" cy="200" r="16" stroke="black" stroke-width="16" fill="none"/>'},"sofa-two-seater":{viewBox:"0 0 400 200",content:'<rect x="8" y="8" width="384" height="184" rx="12" stroke="black" stroke-width="10" fill="none"/><rect x="8" y="8" width="384" height="48" rx="8" stroke="black" stroke-width="10" fill="none"/><rect x="24" y="56" width="172" height="128" rx="8" stroke="black" stroke-width="8" fill="none"/><rect x="204" y="56" width="172" height="128" rx="8" stroke="black" stroke-width="8" fill="none"/>'},"sofa-three-seater":{viewBox:"0 0 560 200",content:'<rect x="8" y="8" width="544" height="184" rx="12" stroke="black" stroke-width="10" fill="none"/><rect x="8" y="8" width="544" height="48" rx="8" stroke="black" stroke-width="10" fill="none"/><rect x="24" y="56" width="160" height="128" rx="8" stroke="black" stroke-width="8" fill="none"/><rect x="200" y="56" width="160" height="128" rx="8" stroke="black" stroke-width="8" fill="none"/><rect x="376" y="56" width="160" height="128" rx="8" stroke="black" stroke-width="8" fill="none"/>'},"table-dining-room":{viewBox:"0 0 600 400",content:'<rect x="150" y="100" width="300" height="200" stroke="black" stroke-width="8" fill="none" rx="10"/><rect x="80" y="150" width="60" height="100" stroke="black" stroke-width="8" fill="none" rx="5"/><rect x="460" y="150" width="60" height="100" stroke="black" stroke-width="8" fill="none" rx="5"/><rect x="175" y="30" width="100" height="60" stroke="black" stroke-width="8" fill="none" rx="5"/><rect x="325" y="30" width="100" height="60" stroke="black" stroke-width="8" fill="none" rx="5"/><rect x="175" y="310" width="100" height="60" stroke="black" stroke-width="8" fill="none" rx="5"/><rect x="325" y="310" width="100" height="60" stroke="black" stroke-width="8" fill="none" rx="5"/>'},"table-dining-room-round":{viewBox:"0 0 400 400",content:'<circle cx="200" cy="200" r="100" stroke="black" stroke-width="8" fill="none"/><rect x="150" y="30" width="100" height="60" stroke="black" stroke-width="8" fill="none" rx="5"/><rect x="150" y="310" width="100" height="60" stroke="black" stroke-width="8" fill="none" rx="5"/><rect x="30" y="150" width="60" height="100" stroke="black" stroke-width="8" fill="none" rx="5"/><rect x="310" y="150" width="60" height="100" stroke="black" stroke-width="8" fill="none" rx="5"/>'},television:{viewBox:"0 0 256 64",content:'<line x1="0" y1="56" x2="256" y2="56" stroke="black" stroke-width="16"/><rect x="32" y="16" width="192" height="40" rx="4" stroke="black" stroke-width="16" fill="none"/><rect x="40" y="24" width="176" height="24" rx="2" stroke="black" stroke-width="8" fill="none"/>'},toilet:{viewBox:"0 0 300 400",content:'<rect x="75" y="30" width="150" height="80" rx="10" stroke="black" stroke-width="8" fill="none"/><path d="M 75 110 C 75 110, 50 160, 50 210 C 50 310, 125 360, 150 360 C 175 360, 250 310, 250 210 C 250 160, 225 110, 225 110 Z" stroke="black" stroke-width="8" fill="none"/><path d="M 100 150 C 100 150, 75 190, 75 220 C 75 300, 125 340, 150 340 C 175 340, 225 300, 225 220 C 225 190, 200 150, 200 150 Z" stroke="black" stroke-width="8" fill="none"/><circle cx="150" cy="70" r="15" stroke="black" stroke-width="8" fill="none"/>'}},mi=[{type:"svg",icon:"armchair",label:"furniture.armchair",defaultWidth:800,defaultHeight:800},{type:"svg",icon:"bath",label:"furniture.bath",defaultWidth:1700,defaultHeight:700},{type:"svg",icon:"bed-double",label:"furniture.double_bed",defaultWidth:1600,defaultHeight:2e3},{type:"svg",icon:"bed-single",label:"furniture.single_bed",defaultWidth:900,defaultHeight:2e3},{type:"svg",icon:"door-left",label:"furniture.door_left_swing",defaultWidth:800,defaultHeight:800},{type:"svg",icon:"door-right",label:"furniture.door_right_swing",defaultWidth:800,defaultHeight:800},{type:"svg",icon:"table-dining-room",label:"furniture.dining_table",defaultWidth:1600,defaultHeight:900},{type:"svg",icon:"table-dining-room-round",label:"furniture.round_table",defaultWidth:1e3,defaultHeight:1e3},{type:"svg",icon:"floor-lamp",label:"furniture.lamp",defaultWidth:400,defaultHeight:400},{type:"svg",icon:"oven",label:"furniture.oven_stove",defaultWidth:600,defaultHeight:600},{type:"svg",icon:"plant",label:"furniture.plant",defaultWidth:400,defaultHeight:400},{type:"svg",icon:"shower",label:"furniture.shower",defaultWidth:900,defaultHeight:900},{type:"svg",icon:"sofa-two-seater",label:"furniture.sofa_2_seat",defaultWidth:1600,defaultHeight:800},{type:"svg",icon:"sofa-three-seater",label:"furniture.sofa_3_seat",defaultWidth:2400,defaultHeight:800},{type:"svg",icon:"television",label:"furniture.tv",defaultWidth:1200,defaultHeight:200},{type:"svg",icon:"toilet",label:"furniture.toilet",defaultWidth:400,defaultHeight:700},{type:"icon",icon:"mdi:countertop",label:"furniture.counter",defaultWidth:2e3,defaultHeight:600,lockAspect:!1},{type:"icon",icon:"mdi:cupboard",label:"furniture.cupboard",defaultWidth:1e3,defaultHeight:500,lockAspect:!1},{type:"icon",icon:"mdi:desk",label:"furniture.desk",defaultWidth:1400,defaultHeight:700,lockAspect:!1},{type:"icon",icon:"mdi:fridge",label:"furniture.fridge",defaultWidth:700,defaultHeight:700,lockAspect:!0},{type:"icon",icon:"mdi:speaker",label:"furniture.speaker",defaultWidth:300,defaultHeight:300,lockAspect:!0},{type:"icon",icon:"mdi:window-open-variant",label:"furniture.window",defaultWidth:1e3,defaultHeight:150,lockAspect:!1}],bi=["corners.front_left","corners.front_right","corners.back_right","corners.back_left"],_i=[["corners.left_wall","corners.front_wall"],["corners.right_wall","corners.front_wall"],["corners.right_wall","corners.back_wall"],["corners.left_wall","corners.back_wall"]],vi=["#2196F3","#FF5722","#4CAF50"],yi=100,xi=Math.PI/3,wi=Pt*Math.sin(Math.PI/3);class $i{constructor(t){this.devices=[],this.selectedMac="",this.loading=!0,this._hass=null,this._host=t,t.addController(this)}hostConnected(){}hostDisconnected(){this.closeDeviceSession()}get hass(){return this._hass}set hass(t){this._hass=t}get hasDeviceSession(){return!!this._unsubDevice}async loadDevices(){if(!this._hass)return;try{const t=await this._hass.callWS({type:"eppgrid/list_devices"});this.devices=t.devices.sort((t,e)=>(t.name||"").localeCompare(e.name||""))}catch{return this.devices=[],void this._host.requestUpdate()}const t=localStorage.getItem("epp_selected_mac"),e=t&&this.devices.find(e=>e.mac===t);this.selectedMac=e?t:this.devices[0]?.mac??"",this._host.requestUpdate()}async loadDeviceConfig(t){let e=null;try{e=(await this._hass.callWS({type:"eppgrid/get_config",mac:t})).config}catch{}return await this.openDeviceSession(t),this._unsubDevice&&this.subscribeTargets(t),e}async openDeviceSession(t){if(this.closeDeviceSession(),this._hass&&t)try{this._unsubDevice=await this._hass.connection.subscribeMessage(()=>{},{type:"eppgrid/subscribe_device",mac:t})}catch(t){console.warn("Failed to open device session:",t)}}closeDeviceSession(){if(this.unsubscribeTargets(),this._unsubDevice){try{this._unsubDevice()}catch{}this._unsubDevice=void 0}}subscribeTargets(t){if(this.unsubscribeDisplay(),this._unsubTargets&&(this._unsubTargets(),this._unsubTargets=void 0),!this._hass||!t)return;this._hass.connection.subscribeMessage(t=>{const e=(t.targets||[]).map(t=>({x:t.x,y:t.y,speed:0,status:t.status??"inactive",signal:t.signal??0})),i=t.sensors?{occupancy:t.sensors.occupancy??!1,static_presence:t.sensors.static_presence??!1,motion_presence:t.sensors.motion_presence??!1,target_presence:t.sensors.target_presence??!1,illuminance:t.sensors.illuminance??null,temperature:t.sensors.temperature??null,humidity:t.sensors.humidity??null,co2:t.sensors.co2??null}:{occupancy:!1,static_presence:!1,motion_presence:!1,target_presence:!1,illuminance:null,temperature:null,humidity:null,co2:null},o=t.zones?{occupancy:t.zones.occupancy??{},target_counts:t.zones.target_counts??{},frame_count:t.zones.frame_count??0,debug_log:t.zones.debug_log}:null;this.onTargetData?.({targets:e,sensors:i,zones:o})},{type:"eppgrid/subscribe_grid_targets",mac:t}).then(t=>{this._unsubTargets=t}),this.subscribeDisplay(t)}unsubscribeTargets(){if(this.unsubscribeDisplay(),this._unsubTargets){try{this._unsubTargets()}catch{}this._unsubTargets=void 0}}subscribeDisplay(t){this.unsubscribeDisplay(),this._hass&&t&&this._hass.connection.subscribeMessage(t=>{const e=(t.targets||[]).map(t=>({raw_x:t.raw_x,raw_y:t.raw_y}));this.onRawTargetData?.(e)},{type:"eppgrid/subscribe_raw_targets",mac:t}).then(t=>{this._unsubDisplay=t})}unsubscribeDisplay(){if(this._unsubDisplay){try{this._unsubDisplay()}catch{}this._unsubDisplay=void 0}}selectDevice(t){this.selectedMac=t,localStorage.setItem("epp_selected_mac",t),this._host.requestUpdate()}}class ki{constructor(t){this.host=t,t.addController(this)}hostConnected(){}hostDisconnected(){}onCellMouseDown(t){if("furniture"===this.host._sidebarTab)return void(this.host._selectedFurnitureId=null);if(null===this.host._activeZone)return;this.host._isPainting=!0,this.host._frozenBounds=Bt(this.host._grid),this.host._paintAction=function(t,e){if(0===e)return Dt(t)&&0===Ht(t)?"clear":"set";return Ht(t)===e?"clear":"set"}(this.host._grid[t],this.host._activeZone),this.applyPaintToCell(t);const e=()=>{this.onCellMouseUp(),window.removeEventListener("mouseup",e)};window.addEventListener("mouseup",e)}onCellMouseEnter(t){this.host._isPainting&&this.applyPaintToCell(t)}onCellMouseUp(){this.host._isPainting&&(this.host._justPainted=!0,requestAnimationFrame(()=>{this.host._justPainted=!1})),this.host._isPainting=!1,this.host._frozenBounds=null}applyPaintToCell(t){if(null===this.host._activeZone)return;const e=(i=this.host._grid[t],o=this.host._activeZone,r=this.host._paintAction,0===o?"set"===r?1:0:Dt(i)?"set"===r?Rt(1|i,o):Rt(i,0):null);var i,o,r;null!==e&&(this.host._grid=new Uint8Array(this.host._grid),this.host._grid[t]=e,this.host._dirty=!0,0===this.host._activeZone&&this.updateRoomDimensionsFromGrid(),this.host.requestUpdate())}updateRoomDimensionsFromGrid(){const{roomWidth:t,roomDepth:e}=function(t){const e=Lt(t);return e.minCol>e.maxCol?{roomWidth:0,roomDepth:0}:{roomWidth:(e.maxCol-e.minCol+1)*Mt,roomDepth:(e.maxRow-e.minRow+1)*Mt}}(this.host._grid);this.host._roomWidth=t,this.host._roomDepth=e}initGridFromRoom(){this.host._grid=It(this.host._roomWidth,this.host._roomDepth)}addZone(){const t=this.host._zoneConfigs.findIndex(t=>null===t);if(-1===t)return;const e=new Set(this.host._zoneConfigs.filter(t=>null!==t).map(t=>t.color)),i=Ft.find(t=>!e.has(t))??Ft[t%Ft.length],o=[...this.host._zoneConfigs];o[t]={name:`Zone ${t+1}`,color:i,type:"normal"},this.host._zoneConfigs=o,this.host._activeZone=t+1,this.host._dirty=!0}removeZone(t){if(t<1||t>7||null===this.host._zoneConfigs[t-1])return;const e=function(t,e){if(e<1||e>7)return null;const i=new Uint8Array(t);let o=!1;for(let t=0;t<At;t++)Ht(i[t])===e&&(i[t]=Rt(i[t],0),o=!0);return o?i:new Uint8Array(t)}(this.host._grid,t);e&&(this.host._grid=e);const i=[...this.host._zoneConfigs];i[t-1]=null,this.host._zoneConfigs=i,this.host._activeZone===t&&(this.host._activeZone=null),this.host._dirty=!0,this.host.requestUpdate()}addFurniture(t){const e=`f_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,i=function(t,e,i,o){return{id:o,type:t.type,icon:t.icon,label:t.label,x:Math.max(0,(e-t.defaultWidth)/2),y:Math.max(0,(i-t.defaultHeight)/2),width:t.defaultWidth,height:t.defaultHeight,rotation:0,lockAspect:t.lockAspect??"icon"===t.type}}(t,this.host._roomWidth,this.host._roomDepth,e);this.host._furniture=[...this.host._furniture,i],this.host._selectedFurnitureId=i.id,this.host._dirty=!0}addCustomFurniture(t){this.addFurniture({type:"icon",icon:t,label:"furniture.custom",defaultWidth:600,defaultHeight:600,lockAspect:!1})}removeFurniture(t){this.host._furniture=function(t,e){return t.filter(t=>t.id!==e)}(this.host._furniture,t),this.host._selectedFurnitureId===t&&(this.host._selectedFurnitureId=null),this.host._dirty=!0}updateFurniture(t,e){this.host._furniture=function(t,e,i){return t.map(t=>t.id===e?{...t,...i}:t)}(this.host._furniture,t,e),this.host._dirty=!0}onFurniturePointerDown(t,e,i,o){t.preventDefault(),t.stopPropagation(),this.host._selectedFurnitureId=e;const r=this.host._furniture.find(t=>t.id===e);if(!r)return;let s=0,n=0,a=0;if("rotate"===i){const i=this.host.shadowRoot?.querySelector(`.furniture-item[data-id="${e}"]`);if(i){const e=i.getBoundingClientRect();s=e.left+e.width/2,n=e.top+e.height/2,a=Math.atan2(t.clientY-n,t.clientX-s)*(180/Math.PI)}}this.host._dragState={type:i,id:e,startX:t.clientX,startY:t.clientY,origX:r.x,origY:r.y,origW:r.width,origH:r.height,origRot:r.rotation,handle:o,centerX:s,centerY:n,startAngle:a};const l=t=>this.onFurnitureDrag(t),c=()=>{this.host._dragState=null,window.removeEventListener("pointermove",l),window.removeEventListener("pointerup",c)};window.addEventListener("pointermove",l),window.addEventListener("pointerup",c)}onFurnitureDrag(t){if(!this.host._dragState)return;const e=this.host._dragState,i=this.host.shadowRoot?.querySelector(".grid");if(!i)return;const o=i.firstElementChild?i.firstElementChild.offsetWidth:28,r=t.clientX-e.startX,s=t.clientY-e.startY;if("move"===e.type){const t=this.host._furniture.find(t=>t.id===e.id),i=Bt(this.host._grid),n=Math.ceil(this.host._roomWidth/Mt),a=Math.floor((Tt-n)/2),l=(i.minCol-a)*Mt,c=(i.maxCol+1-a)*Mt,h=i.minRow*Mt,d=(i.maxRow+1)*Mt,p=function(t,e,i,o,r,s,n,a,l,c,h){const d=jt(i,r),p=jt(o,r);return{x:Math.max(a,Math.min(l-s,t+d)),y:Math.max(c,Math.min(h-n,e+p))}}(e.origX,e.origY,r,s,o,t?.width??0,t?.height??0,l,c,h,d);this.updateFurniture(e.id,p)}else if("resize"===e.type&&e.handle){const t=this.host._furniture.find(t=>t.id===e.id),i=function(t,e,i,o,r,s,n,a,l){const c=jt(e,o),h=jt(i,o);let d=r,p=s,u=n,g=a;if(l){const e=Math.abs(c)>Math.abs(h)?c:h,i=n/a,o=t.includes("w")||t.includes("n")?-1:1;u=Math.max(100,n+o*e),g=Math.max(100,u/i),u=g*i,t.includes("w")&&(d=r+(n-u)),t.includes("n")&&(p=s+(a-g))}else t.includes("e")&&(u=Math.max(100,u+c)),t.includes("w")&&(u=Math.max(100,u-c),d+=c),t.includes("s")&&(g=Math.max(100,g+h)),t.includes("n")&&(g=Math.max(100,g-h),p+=h);return{x:d,y:p,width:u,height:g}}(e.handle,r,s,o,e.origX,e.origY,e.origW,e.origH,t?.lockAspect??!1);this.updateFurniture(e.id,i)}else if("rotate"===e.type){const i=Math.atan2(t.clientY-(e.centerY??0),t.clientX-(e.centerX??0))*(180/Math.PI);this.updateFurniture(e.id,{rotation:Vt(e.origRot,e.startAngle??0,i)})}}getTemplates(){try{return JSON.parse(localStorage.getItem("epp_layout_templates")||"[]")}catch{return[]}}saveTemplate(){const t=this.host._templateName.trim();if(!t)return;const e=this.getTemplates(),i=e.findIndex(e=>e.name===t),o={name:t,grid:Array.from(this.host._grid),zones:this.host._zoneConfigs.map(t=>null!==t?{...t}:null),roomWidth:this.host._roomWidth,roomDepth:this.host._roomDepth,furniture:this.host._furniture.map(t=>({...t}))};i>=0?e[i]=o:e.push(o),localStorage.setItem("epp_layout_templates",JSON.stringify(e)),this.host._showTemplateSave=!1,this.host._templateName=""}loadTemplate(t){const e=this.getTemplates().find(e=>e.name===t);if(!e)return;this.host._grid=new Uint8Array(e.grid);const i=e.zones||[];this.host._zoneConfigs=Array.from({length:7},(t,e)=>i[e]??null),this.host._roomWidth=e.roomWidth,this.host._roomDepth=e.roomDepth,this.host._furniture=(e.furniture||[]).map(t=>({...t})),this.host._showTemplateLoad=!1}deleteTemplate(t){const e=this.getTemplates().filter(e=>e.name!==t);localStorage.setItem("epp_layout_templates",JSON.stringify(e)),this.host.requestUpdate()}async applyLayout(){const t=new Map;for(let e=0;e<this.host._grid.length;e++)if(Dt(this.host._grid[e])){const i=Ht(this.host._grid[e]);i>0&&t.set(i,(t.get(i)??0)+1)}for(let e=0;e<this.host._zoneConfigs.length;e++)null!==this.host._zoneConfigs[e]&&0===(t.get(e+1)??0)&&(this.host._zoneConfigs[e]=null);this.host._saving=!0;try{await this.host.hass.callWS({type:"eppgrid/set_room_layout",mac:this.host._selectedMac,grid_bytes:Array.from(this.host._grid),room_type:this.host._roomType,room_trigger:this.host._roomTrigger,room_renew:this.host._roomRenew,room_timeout:this.host._roomTimeout,room_handoff_timeout:this.host._roomHandoffTimeout,room_entry_point:this.host._roomEntryPoint,zone_slots:this.host._zoneConfigs.map(t=>null!==t?{name:t.name,color:t.color,type:t.type,trigger:t.trigger,renew:t.renew,timeout:t.timeout,handoff_timeout:t.handoff_timeout,entry_point:t.entry_point}:null),furniture:this.host._furniture.map(t=>({type:t.type,icon:t.icon,label:t.label,x:t.x,y:t.y,width:t.width,height:t.height,rotation:t.rotation,lockAspect:t.lockAspect}))}),this.host._dirty=!1,this.host._view="live"}finally{this.host._saving=!1}}async saveSettings(){this.host._saving=!0;try{this.host._dirty=!1,this.host._view="live"}finally{this.host._saving=!1}}}function zi(){return{localZoneState:new Map,targetPrev:[null,null,null],targetGateCount:[0,0,0],targetPrevXY:[null,null,null]}}class Ci{constructor(t){this._zoneEngineState=zi(),this.host=t,t.addController(this)}hostConnected(){}hostDisconnected(){}get zoneEngineState(){return this._zoneEngineState}set zoneEngineState(t){this._zoneEngineState=t}resetZoneEngineState(){this._zoneEngineState=zi()}handleTargetData(t){this.host._targets=t.targets,this.host._sensorState=t.sensors,t.zones&&(this.host._zoneState={occupancy:t.zones.occupancy,target_counts:t.zones.target_counts,frame_count:t.zones.frame_count},this.host._showBackendDebugLog&&t.zones.debug_log&&this.appendBackendDebugLog(t.zones.debug_log))}handleRawTargetData(t){this.host._rawTargets=t}runLocalZoneEngine(){const t=function(t,e){const i=e.now??Date.now()/1e3,o=new Map,r=new Map,s=[null,null,null],n=[null,null,null];for(let i=0;i<3&&i<e.targets.length;i++){const a=e.targets[i];if(null==a.x||null==a.y){t.targetPrev[i]=null,t.targetGateCount[i]=0;continue}const l=a.signal;if(l<=0)continue;r.set(i,l);const c=Gt(a.x,a.y,e.roomWidth,e.roomDepth);if(!c){t.targetPrev[i]=null,t.targetGateCount[i]=0;continue}const h=Math.floor(c.col),d=Math.floor(c.row);if(h<0||h>=Tt||d<0||d>=St){t.targetPrev[i]=null,t.targetGateCount[i]=0;continue}const p=d*Tt+h,u=e.grid[p];if(!Dt(u)){t.targetPrev[i]=null,t.targetGateCount[i]=0;continue}const g=Ht(u);n[i]=g;const f=t.targetPrev[i];if(null!==f){const t=f.row*Tt+f.col;t>=0&&t<At&&Dt(e.grid[t])&&(s[i]=Ht(e.grid[t]))}t.targetPrevXY[i]={x:a.x,y:a.y};let m=!1;null!==f&&(m=Math.max(Math.abs(h-f.col),Math.abs(d-f.row))<=5);const b=Ot(g,e.zoneConfigs,e.roomType,e.roomTrigger,e.roomRenew,e.roomTimeout,e.roomHandoffTimeout,e.roomEntryPoint),{trigger:_,renew:v,entryPoint:y}=b,x=t.localZoneState.get(g),w=!x?.occupied,$=w?_:v;y||m||!w?l>=$?(o.set(g,!0),x&&x.confirmedTargets.add(i),t.targetPrev[i]={col:h,row:d},t.targetGateCount[i]=0):t.targetPrev[i]={col:h,row:d}:l>=Math.min($+2,8)?(t.targetGateCount[i]++,t.targetGateCount[i]>=2?(o.set(g,!0),x&&x.confirmedTargets.add(i),t.targetPrev[i]={col:h,row:d},t.targetGateCount[i]=0):t.targetPrev[i]={col:h,row:d}):(t.targetPrev[i]=null,t.targetGateCount[i]=0)}for(let o=0;o<3;o++){const r=s[o],a=n[o];if(null===r||null===a||r===a)continue;const l=t.localZoneState.get(r);if(l&&(l.confirmedTargets.delete(o),0===l.confirmedTargets.size&&l.occupied&&null===l.pendingSince)){const t=Ot(r,e.zoneConfigs,e.roomType,e.roomTrigger,e.roomRenew,e.roomTimeout,e.roomHandoffTimeout,e.roomEntryPoint),{timeout:o,handoffTimeout:s}=t;l.pendingSince=i-(o-s)}}const a={},l=new Set;for(let t=0;t<e.grid.length;t++)Dt(e.grid[t])&&l.add(Ht(e.grid[t]));for(const r of l){let s=t.localZoneState.get(r);s||(s={occupied:!1,pendingSince:null,confirmedTargets:new Set},t.localZoneState.set(r,s));const n=Ot(r,e.zoneConfigs,e.roomType,e.roomTrigger,e.roomRenew,e.roomTimeout,e.roomHandoffTimeout,e.roomEntryPoint),{timeout:l}=n,c=o.get(r)??!1;s.occupied?null===s.pendingSince?c||(s.pendingSince=i):c?s.pendingSince=null:i-s.pendingSince>=l&&(s.occupied=!1,s.pendingSince=null,s.confirmedTargets.clear()):c&&(s.occupied=!0,s.pendingSince=null),a[r]=s.occupied}const c=new Set;for(let t=0;t<3&&t<e.targets.length;t++)null!=e.targets[t].x&&null!=e.targets[t].y&&c.add(t);for(let i=0;i<3&&i<e.targets.length;i++)if(!c.has(i))for(const e of t.localZoneState.values())null===e.pendingSince&&e.confirmedTargets.delete(i);const h=[];for(let i=0;i<3&&i<e.targets.length;i++){const e=r.get(i)??0,o=null!==n[i];if(c.has(i)&&e>0&&o)h.push({status:"active"});else{let e=!1;if(!c.has(i)||!o)for(const[,o]of t.localZoneState)if(o.occupied&&null!==o.pendingSince&&o.confirmedTargets.has(i)){e=!0;break}h.push({status:e?"pending":"inactive"})}}return{occupancy:a,targets:h}}(this._zoneEngineState,{targets:this.host._targets,grid:this.host._grid,roomWidth:this.host._roomWidth,roomDepth:this.host._roomDepth,zoneConfigs:this.host._zoneConfigs,roomType:this.host._roomType,roomTrigger:this.host._roomTrigger,roomRenew:this.host._roomRenew,roomTimeout:this.host._roomTimeout,roomHandoffTimeout:this.host._roomHandoffTimeout,roomEntryPoint:this.host._roomEntryPoint});return this.host._showDebugLog&&this._buildFrontendDebugLog(t),t}enrichDebugLog(t){const e=t=>{if(0===t)return"Room";const e=this.host._zoneConfigs[t-1];return e?e.name:`Zone ${t}`},i={A:"active",P:"pending",O:"occupied"},[o,r]=t.split("|"),s=(o||"").trim().split(/\s+/).filter(Boolean).map(t=>{const[o,r,s,n]=t.split(":"),a=parseInt(r?.replace("Z","")??"0");return`${o}→${e(a)}(${i[s]??s},${n})`}),n=(r||"").trim().split(/\s+/).filter(Boolean).map(t=>{const[o,r,s]=t.split(":"),n=parseInt(o?.replace("Z","")??"0");return`${e(n)}: ${i[r]??r}(${s})`});return`${s.length?s.join(" "):"no targets"} | ${n.length?n.join(", "):"all clear"}`}computeHeatmapColors(){return function(t,e){const i=new Map;for(const[o,r]of Object.entries(t)){const t=Number(o);if(r<=0)continue;const s=Math.min(r,9)/9*.6;let n=100,a=180,l=255;if(t>0&&t<=7){const i=e[t-1];if(i){const t=Yt(i.color);n=t.r,a=t.g,l=t.b}}i.set(t,`rgba(${n}, ${a}, ${l}, ${s})`)}return i}(this.host._zoneState.target_counts,this.host._zoneConfigs)}appendBackendDebugLog(t){const e=this.enrichDebugLog(t);if(e!==this.host._backendDebugLogPrev){this.host._backendDebugLogPrev=e;const t=(new Date).toLocaleTimeString("en-GB",{hour12:!1,hour:"2-digit",minute:"2-digit",second:"2-digit",fractionalSecondDigits:1});this.host._backendDebugLogLines.push(`${t} ${e}`),this.host._backendDebugLogLines.length>yi&&(this.host._backendDebugLogLines=this.host._backendDebugLogLines.slice(-100)),this.host.requestUpdate()}}_appendFrontendDebugLog(t){if(t!==this.host._debugLogPrev){this.host._debugLogPrev=t;const e=(new Date).toLocaleTimeString("en-GB",{hour12:!1,hour:"2-digit",minute:"2-digit",second:"2-digit",fractionalSecondDigits:1});this.host._debugLogLines.push(`${e} ${t}`),this.host._debugLogLines.length>yi&&(this.host._debugLogLines=this.host._debugLogLines.slice(-100)),this.host.requestUpdate()}}_buildFrontendDebugLog(t){const e=[null,null,null];for(let t=0;t<3&&t<this.host._targets.length;t++){const i=this.host._targets[t];if(null==i.x||null==i.y||i.signal<=0)continue;const o=Gt(i.x,i.y,this.host._roomWidth,this.host._roomDepth);if(!o)continue;const r=Math.floor(o.col),s=Math.floor(o.row);if(r<0||r>=Tt||s<0||s>=St)continue;const n=s*Tt+r;Dt(this.host._grid[n])&&(e[t]=Ht(this.host._grid[n]))}const i=new Map;for(let t=0;t<3&&t<this.host._targets.length;t++){const o=this.host._targets[t];if(null==o.x||null==o.y||o.signal<=0)continue;const r=e[t];null!==r&&i.set(r,Math.max(i.get(r)??0,o.signal))}const o=[];for(let i=0;i<3&&i<this.host._targets.length;i++){const r=this.host._targets[i];if(null==r.x||null==r.y)continue;const s=r.signal;if(s<=0)continue;const n=e[i],a="pending"===t.targets[i]?.status?"P":"A";o.push(`T${i}:Z${n??0}:${a}:${s}`)}const r=new Set;for(let t=0;t<this.host._grid.length;t++)Dt(this.host._grid[t])&&r.add(Ht(this.host._grid[t]));const s=[];for(const t of r){const e=this._zoneEngineState.localZoneState.get(t);if(e?.occupied){const o=null!==e.pendingSince?"P":"O";s.push(`Z${t}:${o}:${i.get(t)??0}`)}}const n=`${o.join(" ")}|${s.join(" ")}`,a=this.enrichDebugLog(n);this._appendFrontendDebugLog(a)}}class Ei extends ct{constructor(){super(...arguments),this.sensorState={occupancy:!1,static_presence:!1,motion_presence:!1,target_presence:!1,illuminance:null,temperature:null,humidity:null,co2:null},this.zoneState={occupancy:{},target_counts:{},frame_count:0},this.zoneConfigs=[],this.perspective=null,this.localize=t=>t,this._expandedSensorInfo=null}render(){const t=this.sensorState,e=this.zoneState,i=[{id:"occupancy",label:this.localize("live.occupancy"),on:t.occupancy,info:this.localize("info.occupancy")},{id:"static",label:this.localize("live.static_presence"),on:t.static_presence,info:this.localize("info.static_presence")},{id:"motion",label:this.localize("live.motion_presence"),on:t.motion_presence,info:this.localize("info.motion_presence")},{id:"target",label:this.localize("live.target_presence"),on:t.target_presence,info:this.localize("info.target_presence")}],o=[];for(let t=0;t<7;t++){const i=this.zoneConfigs[t];if(!i)continue;const r=t+1,s=e.occupancy[r]??!1,n=e.target_counts[r]??0;o.push({id:`zone_${r}`,label:i.name,on:s,info:this.localize("info.zone_occupancy",{slot:r,count:n})})}const r=e.occupancy[0]??!1,s=e.target_counts[0]??0;o.push({id:"zone_0",label:this.localize("sidebar.rest_of_room"),on:r,info:this.localize("info.rest_of_room_occupancy",{count:s})});const n=[];return null!==t.illuminance&&n.push({id:"illuminance",label:this.localize("entities.illuminance"),value:`${t.illuminance.toFixed(1)} lux`}),null!==t.temperature&&n.push({id:"temperature",label:this.localize("entities.temperature"),value:`${t.temperature.toFixed(1)} °C`}),null!==t.humidity&&n.push({id:"humidity",label:this.localize("entities.humidity"),value:`${t.humidity.toFixed(1)} %`}),null!==t.co2&&n.push({id:"co2",label:this.localize("entities.co2"),value:`${Math.round(t.co2)} ppm`}),W`
      <div style="padding: 8px 0;">
        <div class="live-section-header">${this.localize("live.presence")}</div>
        ${i.map(t=>W`
          <div class="live-sensor-row">
            <div class="live-sensor-dot ${t.on?"on":"off"}"></div>
            <span class="live-sensor-label">${t.label}</span>
            <span class="live-sensor-state ${t.on?"detected":""}">${t.on?this.localize("live.detected"):this.localize("live.clear")}</span>
            <button class="live-sensor-info-btn"
              @click=${()=>{this._expandedSensorInfo=this._expandedSensorInfo===t.id?null:t.id}}
            >
              <ha-icon icon="mdi:information-outline" style="--mdc-icon-size: 16px;"></ha-icon>
            </button>
          </div>
          ${this._expandedSensorInfo===t.id?W`
            <div class="live-sensor-info-text">${t.info}</div>
          `:V}
        `)}

        ${this.perspective?W`
        <hr style="border: none; border-top: 1px solid var(--divider-color, #eee); margin: 10px 12px;"/>

        <button class="live-section-header live-section-link" @click=${()=>{this.dispatchEvent(new CustomEvent("view-change",{detail:{view:"editor",sidebarTab:"zones"},bubbles:!0,composed:!0}))}}>${this.localize("sidebar.detection_zones")}</button>
        ${o.map(t=>W`
          <div class="live-sensor-row">
            <div class="live-sensor-dot ${t.on?"on":"off"}"></div>
            <span class="live-sensor-label">${t.label}</span>
            <span class="live-sensor-state ${t.on?"detected":""}">${t.on?this.localize("live.detected"):this.localize("live.clear")}</span>
            <button class="live-sensor-info-btn"
              @click=${()=>{this._expandedSensorInfo=this._expandedSensorInfo===t.id?null:t.id}}
            >
              <ha-icon icon="mdi:information-outline" style="--mdc-icon-size: 16px;"></ha-icon>
            </button>
          </div>
          ${this._expandedSensorInfo===t.id?W`
            <div class="live-sensor-info-text">${t.info}</div>
          `:V}
        `)}
        `:V}

        <hr style="border: none; border-top: 1px solid var(--divider-color, #eee); margin: 10px 12px;"/>

        ${n.length?W`
          <div class="live-section-header">${this.localize("live.environment")}</div>
          ${n.map(t=>W`
            <div class="live-sensor-row">
              <span class="live-sensor-label">${t.label}</span>
              <span class="live-sensor-value">${t.value}</span>
            </div>
          `)}
        `:V}

      </div>
    `}}Ei.styles=n`
    :host {
      display: block;
    }

    .live-section-link {
      cursor: pointer;
      background: none;
      border: none;
      color: var(--primary-color, #03a9f4);
    }

    .live-section-link:hover {
      text-decoration: underline;
    }

    .live-section-header {
      font-size: 11px;
      font-weight: 600;
      color: var(--secondary-text-color, #888);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 4px 12px 6px;
    }

    .live-sensor-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      font-size: 13px;
    }

    .live-sensor-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .live-sensor-dot.on {
      background: #4CAF50;
    }

    .live-sensor-dot.off {
      background: var(--disabled-text-color, #bbb);
    }

    .live-sensor-label {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .live-sensor-state {
      font-size: 12px;
      color: var(--secondary-text-color, #888);
      flex-shrink: 0;
    }

    .live-sensor-state.detected {
      color: #4CAF50;
      font-weight: 500;
    }

    .live-sensor-value {
      font-size: 13px;
      font-weight: 500;
      color: var(--primary-text-color, #212121);
      margin-left: auto;
    }

    .live-sensor-info-btn {
      background: none;
      border: none;
      color: var(--secondary-text-color, #aaa);
      cursor: pointer;
      padding: 2px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
    }

    .live-sensor-info-btn:hover {
      color: var(--primary-color, #03a9f4);
    }

    .live-sensor-info-text {
      font-size: 12px;
      color: var(--secondary-text-color, #757575);
      padding: 2px 12px 8px 30px;
      line-height: 1.4;
    }

    .live-nav-link {
      display: flex;
      align-items: center;
      gap: 8px;
      background: none;
      border: none;
      color: var(--primary-color, #03a9f4);
      cursor: pointer;
      padding: 6px 4px;
      font-size: 13px;
      border-radius: 6px;
      text-align: left;
    }

    .live-nav-link:hover {
      background: var(--secondary-background-color, #f5f5f5);
    }
  `,t([xt({attribute:!1})],Ei.prototype,"sensorState",void 0),t([xt({attribute:!1})],Ei.prototype,"zoneState",void 0),t([xt({attribute:!1})],Ei.prototype,"zoneConfigs",void 0),t([xt({attribute:!1})],Ei.prototype,"perspective",void 0),t([xt({attribute:!1})],Ei.prototype,"localize",void 0),t([wt()],Ei.prototype,"_expandedSensorInfo",void 0),customElements.define("epp-live-sidebar",Ei);class Ti extends ct{constructor(){super(...arguments),this.perspective=null,this.sensorState={occupancy:!1,static_presence:!1,motion_presence:!1,target_presence:!1,illuminance:null,temperature:null,humidity:null,co2:null},this.zoneState={occupancy:{},target_counts:{},frame_count:0},this.zoneConfigs=[],this.localize=t=>t,this.headerTemplate=V,this.gridTemplate=V,this.debugLogTemplate=V,this.showMenu=!1}render(){return W`
      <div class="panel" @click=${t=>{t.target instanceof Element&&this.showMenu&&!t.target.closest(".sidebar-menu-wrapper")&&(this.showMenu=!1)}}>
        ${this.headerTemplate}
        <div class="editor-layout">
          <div style="flex: 1; min-width: 0;">
            ${V}
            <div class="grid-container">
              ${this.gridTemplate}
            </div>
            ${this.debugLogTemplate}
          </div>
          <div class="zone-sidebar">
            <div class="sidebar-header">
              <span class="sidebar-title" style="margin-right: auto;">${this.localize("sidebar.live_overview")}</span>
              <div class="sidebar-menu-wrapper">
                <button class="sidebar-menu-btn" @click=${()=>{this.showMenu=!this.showMenu}}>
                  <ha-icon icon="mdi:dots-vertical" style="--mdc-icon-size: 20px;"></ha-icon>
                </button>
                ${this.showMenu?W`
                  <div class="sidebar-menu" @click=${()=>{this.showMenu=!1}}>
                    ${this.perspective?W`
                      <button class="sidebar-menu-item" @click=${()=>{this._fireNavigate("editor","zones")}}>
                        <ha-icon icon="mdi:vector-square" style="--mdc-icon-size: 18px;"></ha-icon> ${this.localize("menu.detection_zones")}
                      </button>
                      <button class="sidebar-menu-item" @click=${()=>{this._fireNavigate("editor","furniture")}}>
                        <ha-icon icon="mdi:sofa" style="--mdc-icon-size: 18px;"></ha-icon> ${this.localize("menu.furniture")}
                      </button>
                    `:V}
                    <button class="sidebar-menu-item" @click=${()=>{this._fireNavigate("settings")}}>
                      <ha-icon icon="mdi:cog" style="--mdc-icon-size: 18px;"></ha-icon> ${this.localize("menu.settings")}
                    </button>
                    <hr style="border: none; border-top: 1px solid var(--divider-color, #eee); margin: 4px 0;"/>
                    <button class="sidebar-menu-item" @click=${()=>{this._fireAction("change-placement")}}>
                      <ha-icon icon="mdi:target" style="--mdc-icon-size: 18px;"></ha-icon> ${this.localize("menu.room_calibration")}
                    </button>
                    ${this.perspective?W`
                      <button class="sidebar-menu-item" style="color: var(--error-color, #f44336);" @click=${()=>{this._fireAction("show-delete-calibration")}}>
                        <ha-icon icon="mdi:delete" style="--mdc-icon-size: 18px;"></ha-icon> ${this.localize("menu.delete_calibration")}
                      </button>
                    `:V}
                    <hr style="border: none; border-top: 1px solid var(--divider-color, #eee); margin: 4px 0;"/>
                    <button class="sidebar-menu-item" @click=${()=>{this._fireAction("show-template-save")}}>
                      <ha-icon icon="mdi:content-save" style="--mdc-icon-size: 18px;"></ha-icon> ${this.localize("dialogs.save_template")}
                    </button>
                    <button class="sidebar-menu-item" @click=${()=>{this._fireAction("show-template-load")}}>
                      <ha-icon icon="mdi:folder-open" style="--mdc-icon-size: 18px;"></ha-icon> ${this.localize("dialogs.load_template")}
                    </button>
                  </div>
                `:V}
              </div>
            </div>
            <epp-live-sidebar
              .sensorState=${this.sensorState}
              .zoneState=${this.zoneState}
              .zoneConfigs=${this.zoneConfigs}
              .perspective=${this.perspective}
              .localize=${this.localize}
              @view-change=${t=>{this._fireNavigate(t.detail.view,t.detail.sidebarTab)}}
            ></epp-live-sidebar>
          </div>
        </div>
      </div>
    `}_fireNavigate(t,e){this.dispatchEvent(new CustomEvent("navigate-view",{detail:{view:t,sidebarTab:e},bubbles:!0,composed:!0}))}_fireAction(t){this.dispatchEvent(new CustomEvent("live-view-action",{detail:{action:t},bubbles:!0,composed:!0}))}}Ti.styles=n`
    :host {
      display: block;
    }

    .panel {
      padding: 24px;
      max-width: 1100px;
      margin: 0 auto;
      font-size: 14px;
    }

    .editor-layout {
      display: flex;
      gap: 24px;
      align-items: flex-start;
    }

    .grid-container {
      position: relative;
      display: inline-block;
      max-width: 100%;
      overflow: visible;
    }

    .zone-sidebar {
      width: 240px;
      max-height: 70vh;
      background: var(--card-background-color, #fff);
      border-left: 1px solid var(--divider-color, #e0e0e0);
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      overflow: hidden;
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 4px 4px 12px;
    }

    .sidebar-title {
      font-size: 15px;
      font-weight: 600;
      padding: 10px 12px 8px;
      color: var(--primary-text-color, #212121);
    }

    .sidebar-header .sidebar-title {
      padding: 0;
    }

    .sidebar-menu-wrapper {
      position: relative;
    }

    .sidebar-menu-btn {
      background: none;
      border: none;
      color: var(--secondary-text-color, #757575);
      cursor: pointer;
      padding: 4px;
      border-radius: 6px;
      display: flex;
    }

    .sidebar-menu-btn:hover {
      background: var(--secondary-background-color, #f0f0f0);
    }

    .sidebar-menu {
      position: absolute;
      top: 100%;
      right: 0;
      background: var(--card-background-color, #fff);
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 10px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
      z-index: 100;
      min-width: 220px;
      padding: 4px 0;
    }

    .sidebar-menu-item {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 8px 14px;
      border: none;
      background: none;
      color: var(--primary-text-color, #212121);
      font-size: 13px;
      cursor: pointer;
      text-align: left;
    }

    .sidebar-menu-item:hover {
      background: var(--secondary-background-color, #f5f5f5);
    }
  `,t([xt({attribute:!1})],Ti.prototype,"perspective",void 0),t([xt({attribute:!1})],Ti.prototype,"sensorState",void 0),t([xt({attribute:!1})],Ti.prototype,"zoneState",void 0),t([xt({attribute:!1})],Ti.prototype,"zoneConfigs",void 0),t([xt({attribute:!1})],Ti.prototype,"localize",void 0),t([xt({attribute:!1})],Ti.prototype,"headerTemplate",void 0),t([xt({attribute:!1})],Ti.prototype,"gridTemplate",void 0),t([xt({attribute:!1})],Ti.prototype,"debugLogTemplate",void 0),t([wt()],Ti.prototype,"showMenu",void 0),customElements.get("epp-live-view")||customElements.define("epp-live-view",Ti);class Si extends ct{constructor(){super(...arguments),this.zoneConfigs=[],this.activeZone=null,this.roomType="normal",this.roomTrigger=Nt.normal.trigger,this.roomRenew=Nt.normal.renew,this.roomTimeout=Nt.normal.timeout,this.roomHandoffTimeout=Nt.normal.handoff_timeout,this.roomEntryPoint=!1,this.localZoneState=new Map,this.localize=t=>t}render(){return this._renderZoneSidebar()}_renderZoneSidebar(){return W`
			<div class="zone-scroll-area">
				<!-- Room -->
				<div
					class="zone-item ${0===this.activeZone?"active":""}"
					@click=${()=>{this.dispatchEvent(new CustomEvent("zone-select",{detail:{zone:0},bubbles:!0,composed:!0}))}}
				>
					<div class="zone-item-row">
						<div
							class="zone-color-dot"
							style="background: #fff; border: 1px solid #ccc;${this.localZoneState.get(0)?.occupied?" box-shadow: 0 0 6px 2px #999;":""}"
						></div>
						<span class="zone-name"
							>${this.localize("sidebar.room")}</span
						>
					</div>
					${0===this.activeZone?W` ${this._renderBoundaryTypeControls()} `:V}
				</div>

				<hr class="zone-separator" />
				<!-- Named zones 1..N -->
				${this.zoneConfigs.map((t,e)=>{if(null===t)return V;const i=e+1;return W`
						<div
							class="zone-item ${this.activeZone===i?"active":""}"
							@click=${()=>{this.dispatchEvent(new CustomEvent("zone-select",{detail:{zone:i},bubbles:!0,composed:!0}))}}
						>
							<div class="zone-item-row">
								${this.activeZone===i?W`
											<input
												type="color"
												class="zone-color-picker"
												style="width: 16px; height: 16px; border-radius: 50%;${this.localZoneState.get(i)?.occupied?` box-shadow: 0 0 6px 2px ${t.color};`:""}"
												.value=${t.color}
												@input=${t=>{const i=t.target.value;this.dispatchEvent(new CustomEvent("zone-config-change",{detail:{index:e,updates:{color:i}},bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("dirty",{bubbles:!0,composed:!0}))}}
												@click=${t=>t.stopPropagation()}
											/>
										`:W`
											<div
												class="zone-color-dot"
												style="background: ${t.color};${this.localZoneState.get(i)?.occupied?` box-shadow: 0 0 6px 2px ${t.color};`:""}"
											></div>
										`}
								<input
									class="zone-name-input"
									type="text"
									.value=${t.name}
									@input=${t=>{const i=t.target.value;this.dispatchEvent(new CustomEvent("zone-config-change",{detail:{index:e,updates:{name:i}},bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("dirty",{bubbles:!0,composed:!0}))}}
									@click=${t=>{t.stopPropagation(),this.dispatchEvent(new CustomEvent("zone-select",{detail:{zone:i},bubbles:!0,composed:!0}))}}
									@focus=${()=>{this.dispatchEvent(new CustomEvent("zone-select",{detail:{zone:i},bubbles:!0,composed:!0}))}}
								/>
								<button
									class="zone-remove-btn"
									@click=${t=>{t.stopPropagation(),this.dispatchEvent(new CustomEvent("zone-remove",{detail:{slot:i},bubbles:!0,composed:!0}))}}
								>
									<ha-icon icon="mdi:close"></ha-icon>
								</button>
							</div>
							${this.activeZone===i?W`
										${this._renderZoneTypeControls(t,e)}
									`:V}
						</div>
					`})}

				${this.zoneConfigs.some(t=>null===t)?W`
							<button
								class="add-zone-btn"
								@click=${()=>{this.dispatchEvent(new CustomEvent("zone-add",{bubbles:!0,composed:!0}))}}
							>
								<ha-icon icon="mdi:plus"></ha-icon>
								${this.localize("sidebar.add_zone")}
							</button>
						`:V}
			</div>
		`}_renderBoundaryTypeControls(){const t="custom"===this.roomType,e=Nt[this.roomType]||Nt.normal,i=t?this.roomTrigger:e.trigger,o=t?this.roomRenew:e.renew,r=t?this.roomTimeout:e.timeout,s=t?this.roomHandoffTimeout:e.handoff_timeout,n=`width: 100%; display: flex; align-items: center; gap: 4px; font-size: 12px; opacity: ${t?1:.5};`;return W`
			<div
				class="zone-item-row zone-settings-row"
				style="flex-wrap: wrap; gap: 3px; padding: 4px 8px;"
			>
				<div
					style="width: 100%; display: flex; align-items: center; gap: 4px;"
				>
					<label
						style="width: 80px; flex-shrink: 0; font-size: 12px;"
						>${this.localize("zones.type")}</label
					>
					<select
						class="sensitivity-select"
						style="flex: 1; min-width: 0;"
						.value=${this.roomType}
						@change=${t=>{const e=t.target.value,i=Nt[e]||Nt.normal;this.dispatchEvent(new CustomEvent("room-config-change",{detail:{updates:{roomType:e,roomTrigger:i.trigger,roomRenew:i.renew,roomTimeout:i.timeout,roomHandoffTimeout:i.handoff_timeout}},bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("dirty",{bubbles:!0,composed:!0}))}}
						@click=${t=>t.stopPropagation()}
					>
						<option value="normal">
							${this.localize("zones.normal")}
						</option>
						<option value="entrance">
							${this.localize("zones.entrance")}
						</option>
						<option value="thoroughfare">
							${this.localize("zones.thoroughfare")}
						</option>
						<option value="rest">
							${this.localize("zones.rest_area")}
						</option>
						<option value="custom">
							${this.localize("zones.custom")}
						</option>
					</select>
				</div>
				<div style="${n}">
					<label style="width: 80px; flex-shrink: 0;"
						>${this.localize("zones.trigger")}</label
					>
					<input
						type="range"
						min="1"
						max="9"
						style="flex: 1; min-width: 0;"
						.value=${String(i)}
						?disabled=${!t}
						@input=${t=>{this.dispatchEvent(new CustomEvent("room-config-change",{detail:{updates:{roomTrigger:Number(t.target.value)}},bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("dirty",{bubbles:!0,composed:!0}))}}
						@click=${t=>t.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0;"
						>${i}</span
					>
				</div>
				<div style="${n}">
					<label style="width: 80px; flex-shrink: 0;"
						>${this.localize("zones.renew")}</label
					>
					<input
						type="range"
						min="1"
						max="9"
						style="flex: 1; min-width: 0;"
						.value=${String(o)}
						?disabled=${!t}
						@input=${t=>{this.dispatchEvent(new CustomEvent("room-config-change",{detail:{updates:{roomRenew:Number(t.target.value)}},bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("dirty",{bubbles:!0,composed:!0}))}}
						@click=${t=>t.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0;"
						>${o}</span
					>
				</div>
				<div style="${n}">
					<label style="width: 80px; flex-shrink: 0;"
						>${this.localize("zones.presence_timeout")}</label
					>
					<span style="flex: 1;"></span>
					<input
						type="number"
						min="1"
						max="300"
						style="width: 48px; text-align: right; font: inherit; font-size: 12px;"
						.value=${String(r)}
						?disabled=${!t}
						@input=${t=>{const e=Number(t.target.value);e>0&&(this.dispatchEvent(new CustomEvent("room-config-change",{detail:{updates:{roomTimeout:e}},bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("dirty",{bubbles:!0,composed:!0})))}}
						@click=${t=>t.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0; font-size: 12px;"
						>${this.localize("zones.seconds_suffix")}</span
					>
				</div>
				<div style="${n}">
					<label style="width: 80px; flex-shrink: 0;"
						>${this.localize("zones.handoff_timeout")}</label
					>
					<span style="flex: 1;"></span>
					<input
						type="number"
						min="1"
						max="300"
						style="width: 48px; text-align: right; font: inherit; font-size: 12px;"
						.value=${String(s)}
						?disabled=${!t}
						@input=${t=>{const e=Number(t.target.value);e>0&&(this.dispatchEvent(new CustomEvent("room-config-change",{detail:{updates:{roomHandoffTimeout:e}},bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("dirty",{bubbles:!0,composed:!0})))}}
						@click=${t=>t.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0; font-size: 12px;"
						>${this.localize("zones.seconds_suffix")}</span
					>
				</div>
				<div
					style="width: 100%; display: flex; align-items: center; gap: 4px; font-size: 12px; opacity: ${t?1:.5};"
				>
					<label style="width: 80px; flex-shrink: 0;"
						>${this.localize("zones.entry_point")}</label
					>
					<span style="flex: 1;"></span>
					<label class="toggle-switch">
						<input
							type="checkbox"
							?checked=${!!t&&this.roomEntryPoint}
							?disabled=${!t}
							@change=${t=>{this.dispatchEvent(new CustomEvent("room-config-change",{detail:{updates:{roomEntryPoint:t.target.checked}},bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("dirty",{bubbles:!0,composed:!0}))}}
							@click=${t=>t.stopPropagation()}
						/>
						<span class="toggle-slider"></span>
					</label>
					<span style="width: 10px;"></span>
				</div>
			</div>
		`}_renderZoneTypeControls(t,e){const i="custom"===t.type,o=Nt[t.type]||Nt.normal,r=t.trigger??o.trigger,s=t.renew??o.renew,n=t.timeout??o.timeout,a=t.handoff_timeout??o.handoff_timeout,l=`width: 100%; display: flex; align-items: center; gap: 4px; font-size: 12px; opacity: ${i?1:.5};`;return W`
			<div
				class="zone-item-row zone-settings-row"
				style="flex-wrap: wrap; gap: 3px; padding: 4px 8px;"
			>
				<div
					style="width: 100%; display: flex; align-items: center; gap: 4px;"
				>
					<label
						style="width: 80px; flex-shrink: 0; font-size: 12px;"
						>${this.localize("zones.type")}</label
					>
					<select
						class="sensitivity-select"
						style="flex: 1; min-width: 0;"
						.value=${t.type}
						@change=${t=>{const i=t.target.value,o=Nt[i]||Nt.normal;this.dispatchEvent(new CustomEvent("zone-config-change",{detail:{index:e,updates:{type:i,trigger:o.trigger,renew:o.renew,timeout:o.timeout,handoff_timeout:o.handoff_timeout}},bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("dirty",{bubbles:!0,composed:!0}))}}
						@click=${t=>t.stopPropagation()}
					>
						<option value="normal">
							${this.localize("zones.normal")}
						</option>
						<option value="entrance">
							${this.localize("zones.entrance")}
						</option>
						<option value="thoroughfare">
							${this.localize("zones.thoroughfare")}
						</option>
						<option value="rest">
							${this.localize("zones.rest_area")}
						</option>
						<option value="custom">
							${this.localize("zones.custom")}
						</option>
					</select>
				</div>
				<div style="${l}">
					<label style="width: 80px; flex-shrink: 0;"
						>${this.localize("zones.trigger")}</label
					>
					<input
						type="range"
						min="1"
						max="9"
						style="flex: 1; min-width: 0;"
						.value=${String(r)}
						?disabled=${!i}
						@input=${t=>{this.dispatchEvent(new CustomEvent("zone-config-change",{detail:{index:e,updates:{trigger:Number(t.target.value)}},bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("dirty",{bubbles:!0,composed:!0}))}}
						@click=${t=>t.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0;"
						>${r}</span
					>
				</div>
				<div style="${l}">
					<label style="width: 80px; flex-shrink: 0;"
						>${this.localize("zones.renew")}</label
					>
					<input
						type="range"
						min="1"
						max="9"
						style="flex: 1; min-width: 0;"
						.value=${String(s)}
						?disabled=${!i}
						@input=${t=>{this.dispatchEvent(new CustomEvent("zone-config-change",{detail:{index:e,updates:{renew:Number(t.target.value)}},bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("dirty",{bubbles:!0,composed:!0}))}}
						@click=${t=>t.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0;"
						>${s}</span
					>
				</div>
				<div style="${l}">
					<label style="width: 80px; flex-shrink: 0;"
						>${this.localize("zones.presence_timeout")}</label
					>
					<span style="flex: 1;"></span>
					<input
						type="number"
						min="1"
						max="300"
						style="width: 48px; text-align: right; font: inherit; font-size: 12px; margin-right: 0;"
						.value=${String(n)}
						?disabled=${!i}
						@input=${t=>{const i=Number(t.target.value);i>0&&(this.dispatchEvent(new CustomEvent("zone-config-change",{detail:{index:e,updates:{timeout:i}},bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("dirty",{bubbles:!0,composed:!0})))}}
						@click=${t=>t.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0; font-size: 12px;"
						>${this.localize("zones.seconds_suffix")}</span
					>
				</div>
				<div style="${l}">
					<label style="width: 80px; flex-shrink: 0;"
						>${this.localize("zones.handoff_timeout")}</label
					>
					<span style="flex: 1;"></span>
					<input
						type="number"
						min="1"
						max="300"
						style="width: 48px; text-align: right; font: inherit; font-size: 12px; margin-right: 0;"
						.value=${String(a)}
						?disabled=${!i}
						@input=${t=>{const i=Number(t.target.value);i>0&&(this.dispatchEvent(new CustomEvent("zone-config-change",{detail:{index:e,updates:{handoff_timeout:i}},bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("dirty",{bubbles:!0,composed:!0})))}}
						@click=${t=>t.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0; font-size: 12px;"
						>${this.localize("zones.seconds_suffix")}</span
					>
				</div>
				<div
					style="width: 100%; display: flex; align-items: center; gap: 4px; font-size: 12px; opacity: ${i?1:.5};"
				>
					<label style="width: 80px; flex-shrink: 0;"
						>${this.localize("zones.entry_point")}</label
					>
					<span style="flex: 1;"></span>
					<label class="toggle-switch">
						<input
							type="checkbox"
							?checked=${i?t.entry_point??!1:"entrance"===t.type}
							?disabled=${!i}
							@change=${t=>{this.dispatchEvent(new CustomEvent("zone-config-change",{detail:{index:e,updates:{entry_point:t.target.checked}},bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("dirty",{bubbles:!0,composed:!0}))}}
							@click=${t=>t.stopPropagation()}
						/>
						<span class="toggle-slider"></span>
					</label>
					<span style="width: 10px;"></span>
				</div>
			</div>
		`}}Si.styles=[bt,n`
			:host {
				display: block;
			}

			.zone-name-input {
				flex: 1;
				border: none;
				border-bottom: 1px solid var(--divider-color, #e0e0e0);
				background: transparent;
				font-size: 14px;
				color: var(--primary-text-color, #212121);
				padding: 2px 4px;
				min-width: 0;
			}

			.zone-name-input:focus {
				outline: none;
				border-bottom: 1px solid var(--primary-color, #03a9f4);
			}

			.sensitivity-select {
				padding: 2px 4px;
				border: 1px solid var(--divider-color, #e0e0e0);
				border-radius: 4px;
				font-size: 12px;
				background: var(--card-background-color, #fff);
				color: var(--primary-text-color, #212121);
				cursor: pointer;
				flex-shrink: 0;
			}

			.zone-color-picker {
				width: 24px;
				height: 24px;
				border: none;
				padding: 0;
				cursor: pointer;
				border-radius: 4px;
				flex-shrink: 0;
			}

			.zone-scroll-area {
				display: flex;
				flex-direction: column;
				gap: 6px;
				overflow-y: auto;
				flex: 1;
				min-height: 0;
			}

			.zone-item {
				display: flex;
				flex-direction: column;
				gap: 4px;
				padding: 6px 8px;
				border-radius: 8px;
				cursor: pointer;
				border: 2px solid var(--divider-color, #e0e0e0);
				transition: border-color 0.2s;
			}

			.zone-item:hover {
				background: var(--secondary-background-color, #f5f5f5);
			}

			.zone-item.active {
				border-color: var(--primary-color, #03a9f4);
			}

			.zone-item-row {
				display: flex;
				align-items: center;
				gap: 8px;
			}

			.zone-settings-row {
				padding-left: 24px;
				gap: 6px;
			}

			.zone-separator {
				border: none;
				border-top: 1px solid var(--divider-color, #e0e0e0);
				margin: 4px 0;
				flex-shrink: 0;
			}

			.zone-color-dot {
				width: 16px;
				height: 16px;
				border-radius: 50%;
				flex-shrink: 0;
			}

			.zone-name {
				flex: 1;
				font-size: 14px;
			}

			.zone-remove-btn {
				background: none;
				border: none;
				color: var(--secondary-text-color, #757575);
				cursor: pointer;
				padding: 4px;
				border-radius: 4px;
			}

			.zone-remove-btn:hover {
				color: var(--error-color, #f44336);
			}

			.add-zone-btn {
				display: flex;
				align-items: center;
				justify-content: center;
				gap: 6px;
				padding: 10px;
				border: 2px dashed var(--divider-color, #e0e0e0);
				border-radius: 8px;
				background: none;
				color: var(--primary-color, #03a9f4);
				cursor: pointer;
				font-size: 14px;
				transition: background 0.2s;
			}

			.add-zone-btn:hover {
				background: var(--secondary-background-color, #f5f5f5);
			}
		`],t([xt({attribute:!1})],Si.prototype,"grid",void 0),t([xt({attribute:!1})],Si.prototype,"zoneConfigs",void 0),t([xt({attribute:!1})],Si.prototype,"activeZone",void 0),t([xt({attribute:!1})],Si.prototype,"roomType",void 0),t([xt({attribute:!1})],Si.prototype,"roomTrigger",void 0),t([xt({attribute:!1})],Si.prototype,"roomRenew",void 0),t([xt({attribute:!1})],Si.prototype,"roomTimeout",void 0),t([xt({attribute:!1})],Si.prototype,"roomHandoffTimeout",void 0),t([xt({attribute:!1})],Si.prototype,"roomEntryPoint",void 0),t([xt({attribute:!1})],Si.prototype,"localZoneState",void 0),t([xt({attribute:!1})],Si.prototype,"localize",void 0),customElements.get("epp-zone-sidebar")||customElements.define("epp-zone-sidebar",Si)
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */;class Ai extends Ct{}Ai.directiveName="unsafeSVG",Ai.resultType=2;const Mi=kt(Ai);class Pi extends ct{constructor(){super(...arguments),this.furniture=[],this.selectedFurnitureId=null,this.hass=void 0,this.localize=t=>t,this.showCustomIconPicker=!1,this.customIconValue=""}render(){return this._renderFurnitureSidebar()}_renderFurnitureSidebar(){const t=this.furniture.find(t=>t.id===this.selectedFurnitureId);return W`
			${t?W`
						<div class="furn-selected-info">
							<div class="zone-item-row">
								<ha-icon icon="${t.icon}" style="--mdc-icon-size: 20px;"></ha-icon>
								<strong>${this.localize(t.label)}</strong>
								<button class="zone-remove-btn" @click=${()=>this._fireRemove(t.id)}>
									<ha-icon icon="mdi:close"></ha-icon>
								</button>
							</div>
							<div class="furn-dims">
								<label>
									${this.localize("dimensions.width_cm")}
									<input type="number" min="10" step="5" .value=${String(Math.round(t.width/10))}
										@change=${e=>this._fireUpdate(t.id,{width:10*parseInt(e.target.value)})}
									/>
								</label>
								<label>
									${this.localize("dimensions.height_cm")}
									<input type="number" min="10" step="5" .value=${String(Math.round(t.height/10))}
										@change=${e=>this._fireUpdate(t.id,{height:10*parseInt(e.target.value)})}
									/>
								</label>
								<label>
									${this.localize("dimensions.rotation")}
									<input type="number" step="5" .value=${String(Math.round(t.rotation))}
										@change=${e=>this._fireUpdate(t.id,{rotation:parseInt(e.target.value)%360})}
									/>
								</label>
							</div>
						</div>
					`:V}

			<div class="furn-catalog">
				${mi.map(t=>W`
						<button class="furn-sticker" @click=${()=>this._fireAdd(t)}>
							${"svg"===t.type&&fi[t.icon]?Z`<svg viewBox="${fi[t.icon].viewBox}" class="furn-sticker-svg">
										${Mi(fi[t.icon].content)}
									</svg>`:W`<ha-icon icon="${t.icon}" style="--mdc-icon-size: 24px;"></ha-icon>`}
							<span>${this.localize(t.label)}</span>
						</button>
					`)}
				<button class="furn-sticker furn-custom" @click=${()=>{this.dispatchEvent(new CustomEvent("custom-icon-toggle",{bubbles:!0,composed:!0}))}}>
					<ha-icon icon="mdi:plus" style="--mdc-icon-size: 24px;"></ha-icon>
					<span>${this.localize("furniture.custom_icon")}</span>
				</button>
			</div>
			${this.showCustomIconPicker?W`
						<div class="template-dialog">
							<div class="template-dialog-card">
								<h3>${this.localize("furniture.custom_icon")}</h3>
								<ha-icon-picker
									.hass=${this.hass}
									.value=${this.customIconValue}
									@value-changed=${t=>{this.dispatchEvent(new CustomEvent("custom-icon-change",{detail:t.detail.value||"",bubbles:!0,composed:!0}))}}
								></ha-icon-picker>
								${this.customIconValue.trim()?W`
											<div style="text-align: center;">
												<ha-icon icon="${this.customIconValue.trim()}" style="--mdc-icon-size: 48px;"></ha-icon>
											</div>
										`:V}
								<div class="template-dialog-actions">
									<button class="wizard-btn wizard-btn-back"
										@click=${()=>{this.dispatchEvent(new CustomEvent("custom-icon-toggle",{bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("custom-icon-change",{detail:"",bubbles:!0,composed:!0}))}}
									>${this.localize("common.cancel")}</button>
									<button class="wizard-btn wizard-btn-primary"
										?disabled=${!this.customIconValue.trim()}
										@click=${()=>{this.dispatchEvent(new CustomEvent("furniture-add-custom",{detail:this.customIconValue.trim(),bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("custom-icon-change",{detail:"",bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("custom-icon-toggle",{bubbles:!0,composed:!0}))}}
									>${this.localize("common.add")}</button>
								</div>
							</div>
						</div>
					`:V}
		`}_fireAdd(t){this.dispatchEvent(new CustomEvent("furniture-add",{detail:t,bubbles:!0,composed:!0}))}_fireRemove(t){this.dispatchEvent(new CustomEvent("furniture-remove",{detail:t,bubbles:!0,composed:!0}))}_fireUpdate(t,e){this.dispatchEvent(new CustomEvent("furniture-update",{detail:{id:t,updates:e},bubbles:!0,composed:!0}))}}Pi.styles=[ut,gt,n`
			:host {
				display: block;
			}

			.zone-item-row {
				display: flex;
				align-items: center;
				gap: 8px;
			}

			.zone-remove-btn {
				background: none;
				border: none;
				color: var(--secondary-text-color, #757575);
				cursor: pointer;
				padding: 4px;
				border-radius: 4px;
			}

			.zone-remove-btn:hover {
				color: var(--error-color, #f44336);
			}

			.furn-selected-info {
				display: flex;
				flex-direction: column;
				gap: 8px;
				padding: 8px;
				border: 2px solid var(--primary-color, #03a9f4);
				border-radius: 8px;
				margin-bottom: 8px;
			}

			.furn-dims {
				display: flex;
				gap: 6px;
			}

			.furn-dims label {
				flex: 1;
				font-size: 11px;
				color: var(--secondary-text-color, #757575);
				display: flex;
				flex-direction: column;
				gap: 2px;
			}

			.furn-dims input {
				width: 100%;
				padding: 4px;
				border: 1px solid var(--divider-color, #e0e0e0);
				border-radius: 4px;
				font-size: 12px;
				box-sizing: border-box;
				background: var(--card-background-color, #fff);
				color: var(--primary-text-color, #212121);
			}

			.furn-catalog {
				display: grid;
				grid-template-columns: 1fr 1fr;
				gap: 4px;
				overflow-y: auto;
				flex: 1;
				min-height: 0;
			}

			.furn-sticker {
				display: flex;
				flex-direction: column;
				align-items: center;
				gap: 4px;
				padding: 8px 4px;
				border: 1px solid var(--divider-color, #e0e0e0);
				border-radius: 8px;
				background: var(--card-background-color, #fff);
				cursor: pointer;
				font-size: 11px;
				color: var(--primary-text-color, #212121);
				text-align: center;
				transition: background 0.15s;
			}

			.furn-sticker:hover {
				background: var(--secondary-background-color, #f5f5f5);
			}

			.furn-sticker span {
				line-height: 1.2;
			}

			.furn-sticker-svg {
				width: 28px;
				height: 28px;
			}
		`],t([xt({attribute:!1})],Pi.prototype,"furniture",void 0),t([xt({attribute:!1})],Pi.prototype,"selectedFurnitureId",void 0),t([xt({attribute:!1})],Pi.prototype,"hass",void 0),t([xt({attribute:!1})],Pi.prototype,"localize",void 0),t([xt({attribute:!1})],Pi.prototype,"showCustomIconPicker",void 0),t([xt({attribute:!1})],Pi.prototype,"customIconValue",void 0),customElements.get("epp-furniture-sidebar")||customElements.define("epp-furniture-sidebar",Pi);class Di extends ct{constructor(){super(...arguments),this.furniture=[],this.selectedFurnitureId=null,this.roomWidth=3e3,this.cellPx=28,this.minCol=0,this.minRow=0,this.visCols=20,this.visRows=20,this.sidebarTab="zones",this.localize=t=>t}_mmToPx(t){return Zt(t,this.cellPx)}_fireEvent(t,e){this.dispatchEvent(new CustomEvent(t,{bubbles:!0,composed:!0,detail:e}))}_onItemPointerDown(t,e){this._fireEvent("furniture-select",e),this._fireEvent("furniture-pointer-down",{e:t,id:e,type:"move"})}_onResizePointerDown(t,e,i){this._fireEvent("furniture-pointer-down",{e:t,id:e,type:"resize",handle:i})}_onRotatePointerDown(t,e){this._fireEvent("furniture-pointer-down",{e:t,id:e,type:"rotate"})}_onDeletePointerDown(t,e){t.stopPropagation(),this._fireEvent("furniture-delete",e)}render(){if(!this.furniture.length)return V;const t=Math.ceil(this.roomWidth/Mt),e=Math.floor((Tt-t)/2),i=this.cellPx+1,o="furniture"===this.sidebarTab;return W`
			<div class="furniture-overlay ${o?"":"non-interactive"}">
				${this.furniture.map(t=>{const o=(e-this.minCol)*i+this._mmToPx(t.x),r=(0-this.minRow)*i+this._mmToPx(t.y),s=this._mmToPx(t.width),n=this._mmToPx(t.height),a=this.selectedFurnitureId===t.id;return W`
						<div
							class="furniture-item ${a?"selected":""}"
							data-id="${t.id}"
							style="
								left: ${o}px; top: ${r}px;
								width: ${s}px; height: ${n}px;
								transform: rotate(${t.rotation}deg);
							"
							@pointerdown=${e=>this._onItemPointerDown(e,t.id)}
						>
							${"svg"===t.type&&fi[t.icon]?Z`<svg viewBox="${fi[t.icon].viewBox}" preserveAspectRatio="none" class="furn-svg">
										${Mi(fi[t.icon].content)}
									</svg>`:W`<ha-icon icon="${t.icon}" style="--mdc-icon-size: ${.6*Math.min(s,n)}px;"></ha-icon>`}
							${a?W`
										<!-- Resize handles -->
										<div class="furn-handle furn-handle-n" @pointerdown=${e=>this._onResizePointerDown(e,t.id,"n")}></div>
										<div class="furn-handle furn-handle-s" @pointerdown=${e=>this._onResizePointerDown(e,t.id,"s")}></div>
										<div class="furn-handle furn-handle-e" @pointerdown=${e=>this._onResizePointerDown(e,t.id,"e")}></div>
										<div class="furn-handle furn-handle-w" @pointerdown=${e=>this._onResizePointerDown(e,t.id,"w")}></div>
										<div class="furn-handle furn-handle-ne" @pointerdown=${e=>this._onResizePointerDown(e,t.id,"ne")}></div>
										<div class="furn-handle furn-handle-nw" @pointerdown=${e=>this._onResizePointerDown(e,t.id,"nw")}></div>
										<div class="furn-handle furn-handle-se" @pointerdown=${e=>this._onResizePointerDown(e,t.id,"se")}></div>
										<div class="furn-handle furn-handle-sw" @pointerdown=${e=>this._onResizePointerDown(e,t.id,"sw")}></div>
										<!-- Rotate handle with stem -->
										<div class="furn-rotate-stem"></div>
										<div class="furn-rotate-handle" @pointerdown=${e=>this._onRotatePointerDown(e,t.id)}>
											<ha-icon icon="mdi:rotate-right" style="--mdc-icon-size: 14px;"></ha-icon>
										</div>
										<!-- Delete button -->
										<div class="furn-delete-btn" @pointerdown=${e=>this._onDeletePointerDown(e,t.id)}>
											<ha-icon icon="mdi:close" style="--mdc-icon-size: 14px;"></ha-icon>
										</div>
									`:V}
						</div>
					`})}
			</div>
		`}}Di.styles=n`
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
		}

		.furniture-item {
			position: absolute;
			display: flex;
			align-items: center;
			justify-content: center;
			border: 1px solid rgba(0, 0, 0, 0.3);
			border-radius: 4px;
			background: transparent;
			pointer-events: auto;
			cursor: grab;
			transform-origin: center center;
			user-select: none;
		}

		.furniture-item:hover {
			border-color: var(--primary-color, #03a9f4);
		}

		.furniture-item.selected {
			outline: 2px solid var(--primary-color, #03a9f4);
			outline-offset: -1px;
			box-shadow: 0 0 8px rgba(3, 169, 244, 0.4);
			z-index: 10;
		}

		.furniture-item ha-icon {
			color: rgba(0, 0, 0, 0.6);
			pointer-events: none;
		}

		.furn-svg {
			width: 100%;
			height: 100%;
			pointer-events: none;
		}

		.furn-handle {
			position: absolute;
			width: 8px;
			height: 8px;
			background: var(--primary-color, #03a9f4);
			border: 1px solid #fff;
			border-radius: 2px;
			pointer-events: auto;
			z-index: 2;
		}

		.furn-handle-n { top: -4px; left: 50%; transform: translateX(-50%); cursor: n-resize; }
		.furn-handle-s { bottom: -4px; left: 50%; transform: translateX(-50%); cursor: s-resize; }
		.furn-handle-e { right: -4px; top: 50%; transform: translateY(-50%); cursor: e-resize; }
		.furn-handle-w { left: -4px; top: 50%; transform: translateY(-50%); cursor: w-resize; }
		.furn-handle-ne { top: -4px; right: -4px; cursor: ne-resize; }
		.furn-handle-nw { top: -4px; left: -4px; cursor: nw-resize; }
		.furn-handle-se { bottom: -4px; right: -4px; cursor: se-resize; }
		.furn-handle-sw { bottom: -4px; left: -4px; cursor: sw-resize; }

		.furn-rotate-stem {
			position: absolute;
			top: -32px;
			left: 50%;
			transform: translateX(-50%);
			width: 2px;
			height: 32px;
			background: var(--primary-color, #03a9f4);
			pointer-events: none;
		}

		.furn-rotate-handle {
			position: absolute;
			top: -48px;
			left: 50%;
			transform: translateX(-50%);
			width: 20px;
			height: 20px;
			background: var(--primary-color, #03a9f4);
			border: 2px solid #fff;
			border-radius: 50%;
			display: flex;
			align-items: center;
			justify-content: center;
			cursor: grab;
			pointer-events: auto;
			color: #fff;
		}

		.furn-delete-btn {
			position: absolute;
			top: -24px;
			right: -4px;
			width: 20px;
			height: 20px;
			background: var(--error-color, #f44336);
			border: 1px solid #fff;
			border-radius: 50%;
			display: flex;
			align-items: center;
			justify-content: center;
			cursor: pointer;
			pointer-events: auto;
			color: #fff;
		}
	`,t([xt({attribute:!1})],Di.prototype,"furniture",void 0),t([xt({attribute:!1})],Di.prototype,"selectedFurnitureId",void 0),t([xt({type:Number})],Di.prototype,"roomWidth",void 0),t([xt({type:Number})],Di.prototype,"cellPx",void 0),t([xt({type:Number})],Di.prototype,"minCol",void 0),t([xt({type:Number})],Di.prototype,"minRow",void 0),t([xt({type:Number})],Di.prototype,"visCols",void 0),t([xt({type:Number})],Di.prototype,"visRows",void 0),t([xt({attribute:!1})],Di.prototype,"sidebarTab",void 0),t([xt({attribute:!1})],Di.prototype,"localize",void 0),customElements.get("epp-furniture-overlay")||customElements.define("epp-furniture-overlay",Di);class Hi extends ct{constructor(){super(...arguments),this.grid=new Uint8Array(0),this.zoneConfigs=[],this.targets=[],this.roomWidth=0,this.roomDepth=0,this.perspective=null,this.furniture=[],this.selectedFurnitureId=null,this.sidebarTab="zones",this.editable=!1,this.activeZone=null,this.showHitCounts=!1,this.occupancy={},this.targetPrevXY=[],this.heatmapColors=null,this.localize=t=>t,this.maxGridPx=480,this.widthFraction=.55,this.frozenBounds=null}render(){const t=this.frozenBounds??Bt(this.grid),e=t.minCol>t.maxCol,i=e?0:t.minCol,o=e?19:t.maxCol,r=e?0:t.minRow,s=t.maxRow,n=o-i+1,a=s-r+1,l=this.offsetWidth||this.parentElement?.offsetWidth||800,c=Math.min(this.maxGridPx,l*this.widthFraction),h=Math.min(Math.floor(c/n),Math.floor(c/a),32);return W`
			<div class="grid-targets-wrapper">
				<div
					class="grid"
					style="grid-template-columns: repeat(${n}, ${h}px); grid-template-rows: repeat(${a}, ${h}px);"
					@mouseup=${this._onCellMouseUp}
				>
					${this._renderVisibleCells(i,o,r,s,h)}
				</div>
				${this._renderFurnitureOverlay(h,i,r,n,a)}
				${this._renderTargetDots(i,r,n,a)}
			</div>
			${this._renderGridDimensions()}
		`}_renderVisibleCells(t,e,i,o,r){const s=this.heatmapColors,n=this.occupancy,a=[];for(let l=i;l<=o;l++)for(let i=t;i<=e;i++){const t=l*Tt+i,e=this.grid[t];let o=Xt(e,this.zoneConfigs),c="";if(Dt(e)){const t=Ht(e);if(s){const e=s.get(t);e&&(o=`linear-gradient(${e}, ${e}), linear-gradient(${o}, ${o})`)}n[t]&&(c="box-shadow: inset 0 0 0 1px rgba(0,0,0,0.4);")}a.push(W`
					<div
						class="cell"
						style="background: ${o}; width: ${r}px; height: ${r}px; ${c}"
						@mousedown=${()=>{this._onCellMouseDown(t)}}
						@mouseenter=${()=>{this._onCellMouseEnter(t)}}
					></div>
				`)}return a}_onCellMouseDown(t){this.dispatchEvent(new CustomEvent("cell-paint",{detail:{index:t,action:"down"},bubbles:!0,composed:!0}))}_onCellMouseEnter(t){this.dispatchEvent(new CustomEvent("cell-paint",{detail:{index:t,action:"enter"},bubbles:!0,composed:!0}))}_onCellMouseUp(){this.dispatchEvent(new CustomEvent("cell-paint",{detail:{action:"up"},bubbles:!0,composed:!0}))}_renderTargetDots(t,e,i,o){return W`
			<div class="targets-overlay" style="pointer-events: none;">
				${this.targets.map((r,s)=>{if("inactive"===r.status)return V;let n=null!=r.x?Gt(r.x,r.y,this.roomWidth,this.roomDepth):null;const a=n&&n.col>=t&&n.col<=t+i&&n.row>=e&&n.row<=e+o;if("pending"===r.status&&!a&&this.targetPrevXY[s]&&(n=Gt(this.targetPrevXY[s].x,this.targetPrevXY[s].y,this.roomWidth,this.roomDepth)),!n)return V;const l=Math.max(0,Math.min(100,(n.col-t)/i*100)),c=Math.max(0,Math.min(100,(n.row-e)/o*100));return W`
						<div
							class="target-dot"
							style="left: ${l}%; top: ${c}%; background: ${vi[s]||vi[0]}; opacity: ${"pending"===r.status?.3:1}; transition: opacity 0.5s ease;"
						></div>
						${"active"===r.status&&r.signal>0?W`
									<div style="position: absolute; left: ${l}%; top: ${c}%; transform: translate(-50%, -280%); background: rgba(0,0,0,0.7); color: #fff; font-size: 10px; font-weight: bold; padding: 0 4px; border-radius: 6px; pointer-events: none;">
										${r.signal}
									</div>
								`:V}
					`})}
			</div>
		`}_renderGridDimensions(){const t=te(this.grid,this.roomWidth,this.perspective);return t?W`
			<div class="grid-dimensions">
				${t.widthM}m × ${t.depthM}m · Furthest point: ${t.furthestM}m
			</div>
		`:V}_renderFurnitureOverlay(t,e,i,o,r){return this.furniture.length?W`
			<epp-furniture-overlay
				.furniture=${this.furniture}
				.selectedFurnitureId=${this.selectedFurnitureId}
				.roomWidth=${this.roomWidth}
				.cellPx=${t}
				.minCol=${e}
				.minRow=${i}
				.visCols=${o}
				.visRows=${r}
				.sidebarTab=${this.sidebarTab}
				.localize=${this.localize}
				@furniture-select=${t=>{t.stopPropagation(),this.dispatchEvent(new CustomEvent("furniture-select",{detail:t.detail,bubbles:!0,composed:!0}))}}
				@furniture-pointer-down=${t=>{t.stopPropagation(),this.dispatchEvent(new CustomEvent("furniture-pointer-down",{detail:t.detail,bubbles:!0,composed:!0}))}}
				@furniture-delete=${t=>{t.stopPropagation(),this.dispatchEvent(new CustomEvent("furniture-delete",{detail:t.detail,bubbles:!0,composed:!0}))}}
			></epp-furniture-overlay>
		`:V}}Hi.styles=n`
		:host {
			display: contents;
		}

		.grid-targets-wrapper {
			position: relative;
			display: inline-block;
		}

		.grid {
			display: grid;
			gap: 1px;
			background: var(--divider-color, #e0e0e0);
			border: 2px solid var(--divider-color, #e0e0e0);
			border-radius: 8px;
			overflow: hidden;
			user-select: none;
		}

		.cell {
			cursor: pointer;
			transition: opacity 0.1s;
		}

		.cell:hover {
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
			border: 2px solid #fff;
			box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
			transform: translate(-50%, -50%);
			z-index: 10;
		}

		.target-dot.moving {
			background: #4caf50;
		}

		.target-dot.stationary {
			background: #ff9800;
		}

		.grid-dimensions {
			text-align: center;
			font-size: 12px;
			color: var(--secondary-text-color, #757575);
			margin-top: 8px;
		}
	`,t([xt({attribute:!1})],Hi.prototype,"grid",void 0),t([xt({attribute:!1})],Hi.prototype,"zoneConfigs",void 0),t([xt({attribute:!1})],Hi.prototype,"targets",void 0),t([xt({type:Number})],Hi.prototype,"roomWidth",void 0),t([xt({type:Number})],Hi.prototype,"roomDepth",void 0),t([xt({attribute:!1})],Hi.prototype,"perspective",void 0),t([xt({attribute:!1})],Hi.prototype,"furniture",void 0),t([xt({attribute:!1})],Hi.prototype,"selectedFurnitureId",void 0),t([xt({attribute:!1})],Hi.prototype,"sidebarTab",void 0),t([xt({type:Boolean})],Hi.prototype,"editable",void 0),t([xt({attribute:!1})],Hi.prototype,"activeZone",void 0),t([xt({type:Boolean})],Hi.prototype,"showHitCounts",void 0),t([xt({attribute:!1})],Hi.prototype,"occupancy",void 0),t([xt({attribute:!1})],Hi.prototype,"targetPrevXY",void 0),t([xt({attribute:!1})],Hi.prototype,"heatmapColors",void 0),t([xt({attribute:!1})],Hi.prototype,"localize",void 0),t([xt({type:Number})],Hi.prototype,"maxGridPx",void 0),t([xt({type:Number})],Hi.prototype,"widthFraction",void 0),t([xt({attribute:!1})],Hi.prototype,"frozenBounds",void 0),customElements.get("epp-grid")||customElements.define("epp-grid",Hi);class Ri extends ct{constructor(){super(...arguments),this.sensorState={occupancy:!1,static_presence:!1,motion_presence:!1,target_presence:!1,illuminance:null,temperature:null,humidity:null,co2:null},this.targetAutoRange=!0,this.targetMaxDistance=6,this.staticAutoRange=!0,this.staticMinDistance=.3,this.staticMaxDistance=16,this.openAccordions=new Set,this.perspective=null,this.roomWidth=0,this.roomDepth=0,this.grid=new Uint8Array(0),this.saving=!1,this.dirty=!1,this.reportingConfig={},this.offsetsConfig={},this.localize=t=>t}render(){return W`
      <div class="settings-container" @input=${()=>{this._fireDirty()}} @change=${()=>{this._fireDirty()}}>
        <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 500;">${this.localize("settings.title")}</h2>
        ${[{id:"reporting",label:"settings.entities",icon:"mdi:format-list-checks"},{id:"detection",label:"settings.detection_ranges",icon:"mdi:signal-distance-variant"},{id:"sensitivity",label:"settings.sensor_calibration",icon:"mdi:tune-vertical"}].map(t=>{const e=this.openAccordions.has(t.id);return W`
            <div class="accordion">
              <button class="accordion-header" ?data-open=${e} @click=${()=>this.toggleAccordion(t.id)}>
                <ha-icon icon=${t.icon}></ha-icon>
                <span class="accordion-title">${this.localize(t.label)}</span>
                <ha-icon class="accordion-chevron" icon="mdi:chevron-down" ?data-open=${e}></ha-icon>
              </button>
              ${e?W`
                <div class="accordion-body">
                  ${this.renderSettingsSection(t.id)}
                </div>
              `:V}
            </div>
          `})}
        ${this.renderSaveCancelButtons()}
      </div>
    `}toggleAccordion(t){const e=this.openAccordions.has(t)?new Set:new Set([t]);this.openAccordions=e,this.dispatchEvent(new CustomEvent("accordion-toggle",{detail:e,bubbles:!0,composed:!0}))}renderSettingsSection(t){switch(t){case"detection":return this.renderDetectionRanges();case"sensitivity":return this.renderSensitivities();case"reporting":return this.renderReporting();default:return V}}renderEnvOffset(t,e,i,o,r,s,n,a,l){const c=(this.offsetsConfig||{})[i]??0,h=null!=e?e-c:null,d=null!=h?(h+c).toFixed(a):"—";return W`
      <div class="setting-row">
        <label>${t}</label>
        <span class="setting-input-unit"><input type="range" class="setting-range" data-offset-key=${i} .value=${String(c)} min=${o} max=${r} step=${s} @input=${t=>{const e=t.target,i=parseFloat(e.value),o=null!=h?(h+i).toFixed(a):"—";e.nextElementSibling.textContent=o}} /><span class="setting-value">${d}</span> ${n}</span>
        ${this.infoTip(l)}
      </div>
    `}infoTip(t){return W`<span class="setting-info"
      @click=${t=>{t.stopPropagation();const e=t.currentTarget,i=e.querySelector(".setting-info-tooltip");if(!i)return;const o="block"===i.style.display;if(this.shadowRoot.querySelectorAll(".setting-info-tooltip").forEach(t=>{t.style.display="none"}),o)return;const r=e.getBoundingClientRect();i.style.display="block",i.style.left=`${Math.max(8,Math.min(r.right-240,window.innerWidth-256))}px`,i.style.top=`${r.bottom+6}px`}}
    ><ha-icon icon="mdi:help-circle-outline"></ha-icon><span class="setting-info-tooltip">${t}</span></span>`}renderDetectionRanges(){const t=Jt(this.roomWidth,this.roomDepth,this.perspective,this.grid),e=te(this.grid,this.roomWidth,this.perspective),i=this.targetAutoRange?t>0?Math.min(t,6):6:this.targetMaxDistance,o=this.staticAutoRange?t>0?Math.min(t,16):16:this.staticMaxDistance,r="opacity: 0.5; pointer-events: none;";return W`
      <div class="settings-section">
        ${e?W`<p style="font-size: 13px; color: var(--secondary-text-color, #757575); margin: 0 0 12px;">${this.localize("settings.furthest_point")} <span style="font-weight: 700; color: var(--error-color, #db4437);">${e.furthestM}m</span></p>`:V}
        <div class="setting-group">
          <h4>${this.localize("settings.target_sensor")}</h4>
          <div class="setting-row">
            <label>${this.localize("settings.auto")}</label>
            <label class="toggle-switch">
              <input type="checkbox" ?checked=${this.targetAutoRange}
                @change=${t=>{const e=t.target.checked;e||(this.targetMaxDistance=i,this._fireChange("targetMaxDistance",i)),this.targetAutoRange=e,this._fireChange("targetAutoRange",e)}} />
              <span class="toggle-slider"></span>
            </label>
            ${this.infoTip(this.localize("info.target_auto_range"))}
          </div>
          <div class="setting-row" style="${this.targetAutoRange?r:""}">
            <label>${this.localize("settings.max_distance")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" .value=${String(i)} min="0.5" max="6" step="0.1"
              @input=${t=>{const e=t.target;this.targetMaxDistance=Number(e.value),this._fireChange("targetMaxDistance",Number(e.value)),e.nextElementSibling.textContent=e.value}} /><span class="setting-value">${i}</span><span class="setting-unit">m</span></span>
            ${this.infoTip(this.localize("info.target_max_distance"))}
          </div>
        </div>
        <div class="setting-group">
          <h4>${this.localize("settings.static_sensor")}</h4>
          <div class="setting-row">
            <label>${this.localize("settings.auto")}</label>
            <label class="toggle-switch">
              <input type="checkbox" ?checked=${this.staticAutoRange}
                @change=${t=>{const e=t.target.checked;e||(this.staticMaxDistance=o,this._fireChange("staticMaxDistance",o)),this.staticAutoRange=e,this._fireChange("staticAutoRange",e)}} />
              <span class="toggle-slider"></span>
            </label>
            ${this.infoTip(this.localize("info.target_auto_range"))}
          </div>
          <div class="setting-row" style="${this.staticAutoRange?r:""}">
            <label>${this.localize("settings.min_distance")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" .value=${String(this.staticAutoRange?.3:this.staticMinDistance)} min="0.3" max="16" step="0.1"
              @input=${t=>{const e=t.target;let i=Number(e.value);i>=this.staticMaxDistance&&(i=this.staticMaxDistance-.1,e.value=String(i)),this.staticMinDistance=i,this._fireChange("staticMinDistance",i),e.nextElementSibling.textContent=String(i)}} /><span class="setting-value">${this.staticAutoRange?.3:this.staticMinDistance}</span><span class="setting-unit">m</span></span>
            ${this.infoTip(this.localize("info.static_min_distance"))}
          </div>
          <div class="setting-row" style="${this.staticAutoRange?r:""}">
            <label>${this.localize("settings.max_distance")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" .value=${String(o)} min="2.4" max="16" step="0.1"
              @input=${t=>{const e=t.target;let i=Number(e.value);i<=this.staticMinDistance&&(i=this.staticMinDistance+.1,e.value=String(i)),this.staticMaxDistance=i,this._fireChange("staticMaxDistance",i),e.nextElementSibling.textContent=String(i)}} /><span class="setting-value">${o}</span><span class="setting-unit">m</span></span>
            ${this.infoTip(this.localize("info.static_max_distance"))}
          </div>
        </div>
      </div>
    `}renderSensitivities(){return W`
      <div class="settings-section">
        <div class="setting-group">
          <h4>${this.localize("settings.motion_sensor")}</h4>
          <div class="setting-row">
            <label>${this.localize("settings.presence_timeout")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" value="5" min="0" max="120" step="1" @input=${t=>{const e=t.target;e.nextElementSibling.textContent=e.value}} /><span class="setting-value">5</span><span class="setting-unit">s</span></span>
            ${this.infoTip(this.localize("info.motion_timeout"))}
          </div>
        </div>
        <div class="setting-group">
          <h4>${this.localize("settings.static_sensor")}</h4>
          <div class="setting-row">
            <label>${this.localize("settings.presence_timeout")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" value="30" min="0" max="120" step="1" @input=${t=>{const e=t.target;e.nextElementSibling.textContent=e.value}} /><span class="setting-value">30</span><span class="setting-unit">s</span></span>
            ${this.infoTip(this.localize("info.static_timeout"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("settings.trigger_threshold")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" min="0" max="9" value="3" @input=${t=>{const e=t.target;e.nextElementSibling.textContent=e.value}} /><span class="setting-value">3</span><span class="setting-unit"></span></span>
            ${this.infoTip(this.localize("info.trigger_threshold"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("settings.renew_threshold")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" min="0" max="9" value="3" @input=${t=>{const e=t.target;e.nextElementSibling.textContent=e.value}} /><span class="setting-value">3</span><span class="setting-unit"></span></span>
            ${this.infoTip(this.localize("info.renew_threshold"))}
          </div>
        </div>
        <div class="setting-group">
          <h4>${this.localize("settings.environmental")}</h4>
          ${this.renderEnvOffset(this.localize("settings.illuminance_offset"),this.sensorState.illuminance,"illuminance",-500,500,1,"lux",0,this.localize("info.illuminance_offset"))}
          ${this.renderEnvOffset(this.localize("settings.humidity_offset"),this.sensorState.humidity,"humidity",-50,50,.1,"%",1,this.localize("info.humidity_offset"))}
          ${this.renderEnvOffset(this.localize("settings.temperature_offset"),this.sensorState.temperature,"temperature",-20,20,.1,"°C",1,this.localize("info.temperature_offset"))}
        </div>
      </div>
    `}renderReporting(){const t=this.reportingConfig||{},e=(e,i)=>t[e]??i;return W`
      <div class="settings-section">
        <div class="setting-group">
          <h4>${this.localize("entities.room_level")}</h4>
          <div class="setting-row">
            <label>${this.localize("entities.occupancy")}</label>
            <label class="toggle-switch"><input type="checkbox" data-report-key="room_occupancy" ?checked=${e("room_occupancy",!0)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.room_occupancy"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.static_presence")}</label>
            <label class="toggle-switch"><input type="checkbox" data-report-key="room_static_presence" ?checked=${e("room_static_presence",!1)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.room_static"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.motion_presence")}</label>
            <label class="toggle-switch"><input type="checkbox" data-report-key="room_motion_presence" ?checked=${e("room_motion_presence",!1)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.room_motion"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.target_presence")}</label>
            <label class="toggle-switch"><input type="checkbox" data-report-key="room_target_presence" ?checked=${e("room_target_presence",!1)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.room_target_presence"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.target_count")}</label>
            <label class="toggle-switch"><input type="checkbox" data-report-key="room_target_count" ?checked=${e("room_target_count",!1)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.room_target_count"))}
          </div>
        </div>
        <div class="setting-group">
          <h4>${this.localize("entities.zone_level")}</h4>
          <div class="setting-row">
            <label>${this.localize("entities.zone_presence")}</label>
            <label class="toggle-switch"><input type="checkbox" data-report-key="zone_presence" ?checked=${e("zone_presence",!0)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.zone_presence"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.target_count")}</label>
            <label class="toggle-switch"><input type="checkbox" data-report-key="zone_target_count" ?checked=${e("zone_target_count",!1)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.zone_target_count"))}
          </div>
        </div>
        <div class="setting-group">
          <h4>${this.localize("entities.target_level")}</h4>
          <div class="setting-row">
            <label>${this.localize("entities.xy")}</label>
            <label class="toggle-switch"><input type="checkbox" data-report-key="target_xy" ?checked=${e("target_xy",!1)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.xy"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.active")}</label>
            <label class="toggle-switch"><input type="checkbox" data-report-key="target_active" ?checked=${e("target_active",!1)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.active"))}
          </div>
        </div>
        <div class="setting-group">
          <h4>${this.localize("settings.environmental")}</h4>
          <div class="setting-row">
            <label>${this.localize("entities.illuminance")}</label>
            <label class="toggle-switch"><input type="checkbox" data-report-key="env_illuminance" ?checked=${e("env_illuminance",!1)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.illuminance"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.humidity")}</label>
            <label class="toggle-switch"><input type="checkbox" data-report-key="env_humidity" ?checked=${e("env_humidity",!1)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.humidity"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.temperature")}</label>
            <label class="toggle-switch"><input type="checkbox" data-report-key="env_temperature" ?checked=${e("env_temperature",!1)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.temperature"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.co2")}</label>
            <label class="toggle-switch"><input type="checkbox" data-report-key="env_co2" ?checked=${e("env_co2",!1)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.co2"))}
          </div>
        </div>
      </div>
    `}renderSaveCancelButtons(){return W`
      <div class="save-cancel-bar">
        <button class="wizard-btn wizard-btn-back"
          @click=${()=>{this.dispatchEvent(new CustomEvent("cancel",{bubbles:!0,composed:!0}))}}
        >${this.localize("common.cancel")}</button>
        <button class="wizard-btn wizard-btn-primary"
          ?disabled=${this.saving||!this.dirty}
          @click=${()=>{this.dispatchEvent(new CustomEvent("save",{bubbles:!0,composed:!0}))}}
        >${this.saving?this.localize("common.saving"):this.localize("common.save")}</button>
      </div>
    `}_fireChange(t,e){this.dispatchEvent(new CustomEvent("setting-change",{detail:{key:t,value:e},bubbles:!0,composed:!0}))}_fireDirty(){this.dispatchEvent(new CustomEvent("dirty",{bubbles:!0,composed:!0}))}}Ri.styles=[ft,gt,mt,bt,_t,n`
      :host {
        display: block;
      }

      .settings-container {
        width: 560px;
        max-width: 100%;
        margin: 0 auto;
        padding: 0 16px;
        box-sizing: border-box;
      }

      .save-cancel-bar {
        display: flex;
        justify-content: space-between;
        padding: 12px;
        border-top: 1px solid var(--divider-color, #eee);
        margin-top: auto;
      }
    `],t([xt({attribute:!1})],Ri.prototype,"sensorState",void 0),t([xt({type:Boolean})],Ri.prototype,"targetAutoRange",void 0),t([xt({type:Number})],Ri.prototype,"targetMaxDistance",void 0),t([xt({type:Boolean})],Ri.prototype,"staticAutoRange",void 0),t([xt({type:Number})],Ri.prototype,"staticMinDistance",void 0),t([xt({type:Number})],Ri.prototype,"staticMaxDistance",void 0),t([xt({attribute:!1})],Ri.prototype,"openAccordions",void 0),t([xt({attribute:!1})],Ri.prototype,"perspective",void 0),t([xt({type:Number})],Ri.prototype,"roomWidth",void 0),t([xt({type:Number})],Ri.prototype,"roomDepth",void 0),t([xt({attribute:!1})],Ri.prototype,"grid",void 0),t([xt({type:Boolean})],Ri.prototype,"saving",void 0),t([xt({type:Boolean})],Ri.prototype,"dirty",void 0),t([xt({attribute:!1})],Ri.prototype,"reportingConfig",void 0),t([xt({attribute:!1})],Ri.prototype,"offsetsConfig",void 0),t([xt({attribute:!1})],Ri.prototype,"localize",void 0),customElements.define("epp-settings-view",Ri);class Bi extends ct{constructor(){super(...arguments),this._deviceCtrl=new $i(this),this._gridCtrl=new ki(this),this._targetCtrl=new Ci(this),this._localize=t=>t,this._currentLang="",this._grid=new Uint8Array(At),this._zoneConfigs=new Array(7).fill(null),this._activeZone=null,this._roomType="normal",this._roomTrigger=Nt.normal.trigger,this._roomRenew=Nt.normal.renew,this._roomTimeout=Nt.normal.timeout,this._roomHandoffTimeout=Nt.normal.handoff_timeout,this._roomEntryPoint=!1,this._targetAutoRange=!0,this._targetMaxDistance=6,this._staticAutoRange=!0,this._staticMinDistance=.3,this._staticMaxDistance=16,this._sidebarTab="zones",this._showDeleteCalibrationDialog=!1,this._showCustomIconPicker=!1,this._customIconValue="",this._furniture=[],this._selectedFurnitureId=null,this._furnitureClipboard=null,this._dragState=null,this._targets=[],this._rawTargets=[],this._sensorState={occupancy:!1,static_presence:!1,motion_presence:!1,target_presence:!1,illuminance:null,temperature:null,humidity:null,co2:null},this._zoneState={occupancy:{},target_counts:{},frame_count:0},this._showHitCounts=!1,this._showDebugLog=!1,this._debugLogLines=[],this._debugLogPrev=null,this._showBackendDebugLog=!1,this._backendDebugLogLines=[],this._backendDebugLogPrev=null,this._isPainting=!1,this._justPainted=!1,this._paintAction="set",this._frozenBounds=null,this._saving=!1,this._dirty=!1,this._showUnsavedDialog=!1,this._pendingNavigation=null,this._showTemplateSave=!1,this._showTemplateLoad=!1,this._templateName="",this._devices=[],this._selectedMac="",this._loading=!0,this._setupStep=null,this._wizardSaving=!1,this._wizardCornerIndex=0,this._wizardCorners=[null,null,null,null],this._wizardRoomWidth=0,this._wizardRoomDepth=0,this._wizardCapturing=!1,this._wizardCaptureProgress=0,this._wizardOffsetSide="",this._wizardOffsetFb="",this._view="live",this._openAccordions=new Set,this._perspective=null,this._roomWidth=0,this._roomDepth=0,this._beforeUnloadHandler=t=>{this._dirty&&(t.preventDefault(),t.returnValue="")},this._originalPushState=null,this._originalReplaceState=null,this._interceptNavigation=()=>!!this._dirty&&(this._showUnsavedDialog=!0,this._pendingNavigation=null,!0),this._dismissTooltips=()=>{this.shadowRoot.querySelectorAll(".setting-info-tooltip").forEach(t=>{t.style.display="none"})},this._onKeyDown=t=>{if("editor"!==this._view||"furniture"!==this._sidebarTab)return;if(!this._selectedFurnitureId)return;if(!t.composedPath().some(t=>{if(!(t instanceof HTMLElement))return!1;const e=t.tagName;return"INPUT"===e||"TEXTAREA"===e||"SELECT"===e||t.isContentEditable}))if("Backspace"===t.key||"Delete"===t.key)t.preventDefault(),this._removeFurniture(this._selectedFurnitureId);else if("Escape"===t.key)t.preventDefault(),this._selectedFurnitureId=null;else if("c"===t.key&&(t.ctrlKey||t.metaKey)){const t=this._furniture.find(t=>t.id===this._selectedFurnitureId);t&&(this._furnitureClipboard={...t})}else if("x"===t.key&&(t.ctrlKey||t.metaKey)){const t=this._furniture.find(t=>t.id===this._selectedFurnitureId);t&&(this._furnitureClipboard={...t},this._removeFurniture(t.id))}else if("v"===t.key&&(t.ctrlKey||t.metaKey)){if(!this._furnitureClipboard)return;t.preventDefault();const e=`f_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,i=this._furnitureClipboard,o=this._getRoomBounds(),r=Math.ceil(this._roomWidth/Mt),s=Math.floor((Tt-r)/2),n=(o.minCol-s)*Mt,a=(o.maxCol+1-s)*Mt,l=o.minRow*Mt,c=(o.maxRow+1)*Mt,h=300,d={...i,id:e,x:Math.max(n,Math.min(a-i.width,i.x+h)),y:Math.max(l,Math.min(c-i.height,i.y+h))};this._furniture=[...this._furniture,d],this._selectedFurnitureId=d.id,this._dirty=!0}},this._fovCache=null,this._fovPerspective=null,this._smoothBuffer=[],this._wizardCapturePaused=!1,this._wizardCaptureCancelled=!1}get _zoneEngineState(){return this._targetCtrl.zoneEngineState}set _zoneEngineState(t){this._targetCtrl.zoneEngineState=t}get _unsubTargets(){return this._deviceCtrl._unsubTargets}set _unsubTargets(t){this._deviceCtrl._unsubTargets=t}get _unsubDisplay(){return this._deviceCtrl._unsubDisplay}set _unsubDisplay(t){this._deviceCtrl._unsubDisplay=t}_syncCornerOffsets(){const t=this._wizardCorners[this._wizardCornerIndex];this._wizardOffsetSide=t?.offset_side?String(t.offset_side/10):"",this._wizardOffsetFb=t?.offset_fb?String(t.offset_fb/10):""}connectedCallback(){super.connectedCallback(),this._initialize(),window.addEventListener("beforeunload",this._beforeUnloadHandler),window.addEventListener("click",this._dismissTooltips),window.addEventListener("keydown",this._onKeyDown),this._originalPushState=history.pushState.bind(history),this._originalReplaceState=history.replaceState.bind(history),history.pushState=(...t)=>{this._interceptNavigation()?this._pendingNavigation=()=>{this._originalPushState(...t),window.dispatchEvent(new PopStateEvent("popstate"))}:this._originalPushState(...t)},history.replaceState=(...t)=>{this._interceptNavigation()?this._pendingNavigation=()=>{this._originalReplaceState(...t),window.dispatchEvent(new PopStateEvent("popstate"))}:this._originalReplaceState(...t)}}disconnectedCallback(){super.disconnectedCallback(),this._closeDeviceSession(),window.removeEventListener("beforeunload",this._beforeUnloadHandler),window.removeEventListener("click",this._dismissTooltips),window.removeEventListener("keydown",this._onKeyDown),this._originalPushState&&(history.pushState=this._originalPushState),this._originalReplaceState&&(history.replaceState=this._originalReplaceState)}willUpdate(t){if(t.has("hass")){const t=this.hass?.locale?.language??this.hass?.language;t!==this._currentLang&&(this._currentLang=t,this._localize=function(t){const e=t?.locale?.language??t?.language??"en",i=ui[e]??ui.en,o=ui.en,r=new Map;return(t,s)=>{const n=gi(i,t)??gi(o,t)??t;if(!s)return n;let a=r.get(n);return a||(a=new pi(n,e),r.set(n,a)),a.format(s)}}(this.hass))}}updated(t){if(t.has("hass")&&this.hass&&(this._deviceCtrl.hass=this.hass,this._loading&&!this._devices.length?this._initialize():this._selectedMac&&!this._deviceCtrl.hasDeviceSession&&this._loadDeviceConfig(this._selectedMac)),this._showDebugLog){const t=this.shadowRoot?.getElementById("debug-log-scroll");t&&(t.scrollTop=t.scrollHeight)}if(this._showBackendDebugLog){const t=this.shadowRoot?.getElementById("backend-debug-log-scroll");t&&(t.scrollTop=t.scrollHeight)}}async _initialize(){this.hass&&(this._loading=!0,this._deviceCtrl.hass=this.hass,await this._loadDevices(),this._selectedMac&&await this._loadDeviceConfig(this._selectedMac),this._loading=!1)}async _loadDevices(){this._deviceCtrl.hass=this.hass,await this._deviceCtrl.loadDevices(),this._devices=this._deviceCtrl.devices,this._selectedMac=this._deviceCtrl.selectedMac}async _loadDeviceConfig(t){this._deviceCtrl.hass=this.hass;const e=await this._deviceCtrl.loadDeviceConfig(t);e&&this._applyConfig(e)}_applyConfig(t){const e=Ut(t);this._perspective=e.calibration.perspective,this._roomWidth=e.calibration.roomWidth,this._roomDepth=e.calibration.roomDepth,this._setupStep=null,this._furniture=e.furniture,this._grid=e.grid,this._zoneConfigs=e.zoneConfigs,this._roomType=e.roomThresholds.roomType,this._roomTrigger=e.roomThresholds.roomTrigger,this._roomRenew=e.roomThresholds.roomRenew,this._roomTimeout=e.roomThresholds.roomTimeout,this._roomHandoffTimeout=e.roomThresholds.roomHandoffTimeout,this._roomEntryPoint=e.roomThresholds.roomEntryPoint,this._reportingConfig=e.reportingConfig,this._offsetsConfig=e.offsetsConfig}async _openDeviceSession(t){this._deviceCtrl.hass=this.hass,await this._deviceCtrl.openDeviceSession(t)}_closeDeviceSession(){this._deviceCtrl.closeDeviceSession(),this._targets=[],this._rawTargets=[]}_subscribeTargets(t){this._deviceCtrl.hass=this.hass,this._deviceCtrl.onTargetData=t=>{this._targetCtrl.handleTargetData(t)},this._deviceCtrl.onRawTargetData=t=>{this._targetCtrl.handleRawTargetData(t)},this._deviceCtrl.subscribeTargets(t)}_unsubscribeTargets(){this._deviceCtrl.unsubscribeTargets(),this._targets=[],this._rawTargets=[]}_subscribeDisplay(t){this._deviceCtrl.hass=this.hass,this._deviceCtrl.onRawTargetData=t=>{this._targetCtrl.handleRawTargetData(t)},this._deviceCtrl.subscribeDisplay(t)}_unsubscribeDisplay(){this._deviceCtrl.unsubscribeDisplay()}_onCellMouseDown(t){this._gridCtrl.onCellMouseDown(t)}_onCellMouseEnter(t){this._gridCtrl.onCellMouseEnter(t)}_onCellMouseUp(){this._gridCtrl.onCellMouseUp()}_applyPaintToCell(t){this._gridCtrl.applyPaintToCell(t)}_updateRoomDimensionsFromGrid(){this._gridCtrl.updateRoomDimensionsFromGrid()}_addZone(){this._gridCtrl.addZone()}_removeZone(t){this._gridCtrl.removeZone(t)}_addFurniture(t){this._gridCtrl.addFurniture(t)}_addCustomFurniture(t){this._gridCtrl.addCustomFurniture(t)}_removeFurniture(t){this._gridCtrl.removeFurniture(t)}_updateFurniture(t,e){this._gridCtrl.updateFurniture(t,e)}_mmToPx(t,e){return Zt(t,e)}_pxToMm(t,e){return jt(t,e)}_onFurniturePointerDown(t,e,i,o){this._gridCtrl.onFurniturePointerDown(t,e,i,o)}_onFurnitureDrag(t){this._gridCtrl.onFurnitureDrag(t)}_getCellColor(t){return Xt(this._grid[t],this._zoneConfigs)}_getRoomBounds(){return Bt(this._grid)}async _applyLayout(){return this._gridCtrl.applyLayout()}async _saveSettings(){return this._gridCtrl.saveSettings()}_getTemplates(){return this._gridCtrl.getTemplates()}_saveTemplate(){this._gridCtrl.saveTemplate()}_loadTemplate(t){this._gridCtrl.loadTemplate(t)}_deleteTemplate(t){this._gridCtrl.deleteTemplate(t)}_initGridFromRoom(){this._grid=It(this._roomWidth,this._roomDepth)}_mapTargetToPercent(t){return function(t,e,i,o){if(i>0&&o>0)return{x:Math.max(0,Math.min(t,i))/i*100,y:Math.max(0,Math.min(e,o))/o*100};return{x:t/Pt*100,y:e/Pt*100}}(t.x,t.y,this._roomWidth,this._roomDepth)}_getInversePerspective(){return function(t){if(!t||t.length<8)return null;const e=[t[0],t[1],t[2],t[3],t[4],t[5],t[6],t[7],1],i=e[0]*(e[4]*e[8]-e[5]*e[7])-e[1]*(e[3]*e[8]-e[5]*e[6])+e[2]*(e[3]*e[7]-e[4]*e[6]);if(Math.abs(i)<1e-10)return null;const o=[(e[4]*e[8]-e[5]*e[7])/i,(e[2]*e[7]-e[1]*e[8])/i,(e[1]*e[5]-e[2]*e[4])/i,(e[5]*e[6]-e[3]*e[8])/i,(e[0]*e[8]-e[2]*e[6])/i,(e[2]*e[3]-e[0]*e[5])/i,(e[3]*e[7]-e[4]*e[6])/i,(e[1]*e[6]-e[0]*e[7])/i,(e[0]*e[4]-e[1]*e[3])/i],r=o[8];return Math.abs(r)<1e-10?null:[o[0]/r,o[1]/r,o[2]/r,o[3]/r,o[4]/r,o[5]/r,o[6]/r,o[7]/r]}(this._perspective)}_applyPerspective(t,e,i){return Kt(t,e,i)}_getSensorFov(){return this._perspective?(this._fovCache&&this._fovPerspective===this._perspective||(this._fovCache=function(t){const e=Kt(t,0,0),i=Kt(t,0,1e3),o=i.x-e.x,r=i.y-e.y,s=Math.sqrt(o*o+r*r);return{sensorPos:e,dirX:o/s,dirY:r/s}}(this._perspective),this._fovPerspective=this._perspective),this._fovCache):null}_isCellInSensorRange(t,e){const i=this._getSensorFov(),o=this._autoDetectionRange(),r=function(t,e,i){return 1e3*(t?e>0?Math.min(e,6):6:i)}(this._targetAutoRange,o,this._targetMaxDistance);return function(t,e,i,o,r){if(!i)return!0;const s=Math.ceil(o/Mt),n=Math.floor((Tt-s)/2),a=(e+.5)*Mt,l=(t-n+.5)*Mt-i.sensorPos.x,c=a-i.sensorPos.y,h=Math.sqrt(l*l+c*c);if(h<1)return!0;const d=l/h*i.dirX+c/h*i.dirY;return!(Math.acos(Math.max(-1,Math.min(1,d)))>Math.PI/3||h>r)}(t,e,i,this._roomWidth,r)}_getGridRoomMetrics(){return te(this._grid,this._roomWidth,this._perspective)}_getRawRoomBounds(){return Lt(this._grid)}_mapTargetToGridCell(t){return Gt(t.x,t.y,this._roomWidth,this._roomDepth)}_guardNavigation(t){this._dirty?(this._pendingNavigation=t,this._showUnsavedDialog=!0):t()}_discardAndNavigate(){this._dirty=!1,this._showUnsavedDialog=!1,this._pendingNavigation&&(this._pendingNavigation(),this._pendingNavigation=null)}async _onDeviceChange(t){const e=t.target.value;this._guardNavigation(async()=>{this._closeDeviceSession(),this._selectedMac=e,localStorage.setItem("epp_selected_mac",e),await this._loadDeviceConfig(e)})}_getSmoothedRaw(){const t=this._rawTargets.find(t=>null!=t.raw_x&&null!=t.raw_y);if(!t)return null;const e=function(t,e,i,o){const r=[...t,{x:e,y:i,t:o}];let s=0;for(;s<r.length&&o-r[s].t>1e3;)s++;const n=r.slice(s);if(0===n.length)return{x:e,y:i,buffer:n};const a=t=>{const e=t.slice().sort((t,e)=>t-e),i=Math.floor(e.length/2);return e.length%2?e[i]:(e[i-1]+e[i])/2};return{x:a(n.map(t=>t.x)),y:a(n.map(t=>t.y)),buffer:n}}(this._smoothBuffer,t.raw_x,t.raw_y,Date.now());return this._smoothBuffer=e.buffer,{x:e.x,y:e.y}}_wizardCancelCapture(){this._wizardCaptureCancelled=!0,this._wizardCapturing=!1,this._wizardCapturePaused=!1}_wizardStartCapture(){const t=this._rawTargets.find(t=>null!=t.raw_x&&null!=t.raw_y);if(!t)return;this._wizardCapturing=!0,this._wizardCaptureProgress=0,this._wizardCapturePaused=!1,this._wizardCaptureCancelled=!1;const e=[];let i=0,o=Date.now();const r=()=>{if(this._wizardCaptureCancelled)return;const t=Date.now(),s=t-o;o=t;const n=this._rawTargets.filter(t=>null!=t.raw_x&&null!=t.raw_y),a=1===n.length;if(this._wizardCapturePaused=!a,a&&(i+=s,e.push({x:n[0].raw_x,y:n[0].raw_y})),this._wizardCaptureProgress=Math.min(i/5e3,1),i<5e3)return void requestAnimationFrame(r);if(this._wizardCapturing=!1,this._wizardCapturePaused=!1,0===e.length)return;const l=function(t){return 0===t.length?null:{x:Qt(t.map(t=>t.x)),y:Qt(t.map(t=>t.y))}}(e);if(!l)return;const c=this._wizardCornerIndex;this._wizardCorners=[...this._wizardCorners],this._wizardCorners[c]={raw_x:l.x,raw_y:l.y,offset_side:10*(parseFloat(this._wizardOffsetSide)||0),offset_fb:10*(parseFloat(this._wizardOffsetFb)||0)},c<3&&(this._wizardCornerIndex=c+1),this._syncCornerOffsets(),this._wizardCorners.every(t=>null!==t)&&this._autoComputeRoomDimensions()};requestAnimationFrame(r)}_autoComputeRoomDimensions(){const t=function(t){const e=(t,e)=>Math.sqrt((t.raw_x-e.raw_x)**2+(t.raw_y-e.raw_y)**2),i=Math.round(e(t[0],t[1])),o=e(t[0],t[3]),r=e(t[1],t[2]);return{width:i,depth:Math.round((o+r)/2)}}(this._wizardCorners);this._wizardRoomWidth=t.width,this._wizardRoomDepth=t.depth}_solvePerspective(t,e){return function(t,e){const i=[],o=[];for(let r=0;r<4;r++){const s=t[r].x,n=t[r].y,a=e[r].x,l=e[r].y;i.push([s,n,1,0,0,0,-s*a,-n*a]),o.push(a),i.push([0,0,0,s,n,1,-s*l,-n*l]),o.push(l)}const r=i.map((t,e)=>[...t,o[e]]);for(let t=0;t<8;t++){let e=Math.abs(r[t][t]),i=t;for(let o=t+1;o<8;o++)Math.abs(r[o][t])>e&&(e=Math.abs(r[o][t]),i=o);if(e<1e-12)return null;[r[t],r[i]]=[r[i],r[t]];for(let e=t+1;e<8;e++){const i=r[e][t]/r[t][t];for(let o=t;o<=8;o++)r[e][o]-=i*r[t][o]}}const s=new Array(8);for(let t=7;t>=0;t--){s[t]=r[t][8];for(let e=t+1;e<8;e++)s[t]-=r[t][e]*s[e];s[t]/=r[t][t]}return s}(t,e)}_computeWizardPerspective(){const t=this._wizardCorners;if(!t.every(t=>null!==t))return;const e=this._wizardRoomWidth,i=this._wizardRoomDepth,o=t.map(t=>({x:t.raw_x,y:t.raw_y})),r=[{x:t[0].offset_side,y:t[0].offset_fb},{x:e-t[1].offset_side,y:t[1].offset_fb},{x:e-t[2].offset_side,y:i-t[2].offset_fb},{x:t[3].offset_side,y:i-t[3].offset_fb}];this._perspective=this._solvePerspective(o,r),this._roomWidth=e,this._roomDepth=i}async _wizardFinish(){if(this._perspective){this._wizardSaving=!0;try{await this.hass.callWS({type:"eppgrid/set_setup",mac:this._selectedMac,perspective:this._perspective,room_width:this._wizardRoomWidth,room_depth:this._wizardRoomDepth}),this._roomWidth=this._wizardRoomWidth,this._roomDepth=this._wizardRoomDepth,this._initGridFromRoom(),this._setupStep=null,this._view="live"}finally{this._wizardSaving=!1}}}_rawToFovPct(t,e){return function(t,e){return{xPct:(t+Wt)/(2*Wt)*100,yPct:e/Pt*100}}(t,e)}_getWizardTargetStyle(t){const{xPct:e,yPct:i}=this._rawToFovPct(t.raw_x??0,t.raw_y??0);return`left: ${e}%; top: ${i}%;`}_renderGlobalDialogs(){return W`
      ${this._showTemplateSave?this._renderTemplateSaveDialog():V}
      ${this._showTemplateLoad?this._renderTemplateLoadDialog():V}
      ${this._showUnsavedDialog?W`
          <div class="template-dialog">
            <div class="template-dialog-card">
              <h3>${this._localize("dialogs.unsaved_changes")}</h3>
              <p class="overlay-help">${this._localize("dialogs.unsaved_changes_body")}</p>
              <div class="template-dialog-actions">
                <button class="wizard-btn wizard-btn-back"
                  @click=${()=>{this._showUnsavedDialog=!1,this._pendingNavigation=null}}
                >${this._localize("common.cancel")}</button>
                <button class="wizard-btn wizard-btn-primary" style="background: var(--error-color, #f44336);"
                  @click=${this._discardAndNavigate}
                >${this._localize("common.discard")}</button>
              </div>
            </div>
          </div>
        `:V}
      ${this._showDeleteCalibrationDialog?W`
          <div class="template-dialog">
            <div class="template-dialog-card">
              <h3>${this._localize("dialogs.delete_calibration_title")}</h3>
              <p class="overlay-help">${this._localize("dialogs.delete_calibration_body")}</p>
              <div class="template-dialog-actions">
                <button class="wizard-btn wizard-btn-back"
                  @click=${()=>{this._showDeleteCalibrationDialog=!1}}
                >${this._localize("common.cancel")}</button>
                <button class="wizard-btn wizard-btn-primary" style="background: var(--error-color, #f44336);"
                  @click=${this._deleteCalibration}
                >${this._localize("common.delete")}</button>
              </div>
            </div>
          </div>
        `:V}
    `}render(){if(this._loading)return W`<div class="loading-container">${this._localize("common.loading")}</div>`;if(!this._devices.length)return W`<div class="loading-container">${this._localize("common.loading")}</div>`;if(null!==this._setupStep)return this._renderWizard();const t="settings"===this._view?this._renderSettings():"editor"===this._view&&this._perspective?this._renderEditor():this._renderLiveOverview();return W`${t}${this._renderGlobalDialogs()}`}async _deleteCalibration(){this._showDeleteCalibrationDialog=!1,this._perspective=null,this._roomWidth=0,this._roomDepth=0,this._grid=new Uint8Array(400),this._zoneConfigs=new Array(7).fill(null),this._roomType="normal",this._roomTrigger=Nt.normal.trigger,this._roomRenew=Nt.normal.renew,this._roomTimeout=Nt.normal.timeout,this._roomHandoffTimeout=Nt.normal.handoff_timeout,this._roomEntryPoint=!1,this._furniture=[];try{await this.hass.callWS({type:"eppgrid/set_setup",mac:this._selectedMac,perspective:[0,0,0,0,0,0,0,0],room_width:0,room_depth:0}),await this.hass.callWS({type:"eppgrid/set_room_layout",mac:this._selectedMac,grid_bytes:Array.from(this._grid),zone_slots:this._zoneConfigs.map(()=>null),room_type:"normal",furniture:[]})}catch(t){console.error("Failed to delete calibration",t)}this._dirty=!1,this._view="live"}_changePlacement(){this._guardNavigation(()=>{this._setupStep="guide",this._wizardCornerIndex=0,this._wizardCorners=[null,null,null,null],this._wizardOffsetSide="",this._wizardOffsetFb="",this._wizardRoomWidth=this._roomWidth,this._wizardRoomDepth=this._roomDepth})}_renderHeader(){const t=V;return W`
      <div class="panel-header">
        <select
          class="device-select"
          .value=${this._selectedMac}
          @change=${t=>{if("__add__"===t.target.value)return window.open("/config/integrations/integration/eppgrid","_blank"),void(t.target.value=this._selectedMac);this._onDeviceChange(t)}}
        >
          ${this._devices.map(t=>W`
              <option value=${t.mac}>
                ${t.name}
              </option>
            `)}
          <option value="__add__">${this._localize("common.add_another_sensor")}</option>
        </select>
        ${t}
      </div>
    `}_renderWizard(){let t;switch(this._setupStep){case"guide":t=this._renderWizardGuide();break;case"corners":t=this._renderWizardCorners()}return W`
      <div class="wizard-container">
        ${this._renderHeader()} ${t}
        ${this._wizardCapturing?W`
          <div class="capture-overlay">
            <div class="capture-overlay-content">
              <div class="capture-progress" style="width: 200px;">
                <div class="capture-bar">
                  <div class="capture-fill" style="width: ${100*this._wizardCaptureProgress}%"></div>
                </div>
                <span>${this._localize("wizard.recording",{current:Math.round(5*this._wizardCaptureProgress),total:5})}</span>
              </div>
              <p style="margin: 8px 0 0; font-size: 13px; color: ${this._wizardCapturePaused?"var(--error-color, #e53935)":"var(--secondary-text-color)"};">
                ${this._wizardCapturePaused?this._localize("wizard.paused"):this._localize("wizard.stand_still")}
              </p>
              <button
                class="wizard-btn wizard-btn-back"
                style="margin-top: 12px;"
                @click=${()=>this._wizardCancelCapture()}
              >${this._localize("common.cancel")}</button>
            </div>
          </div>
        `:V}
      </div>
    `}_renderWizardGuide(){const t=(t,e,i=!1,o=0)=>Z`
      <g transform="translate(${t}, ${e}) rotate(${o}) scale(${i?-.7:.7}, 0.7)">
        <circle cx="0" cy="-12" r="4" fill="var(--primary-color, #03a9f4)"/>
        <line x1="0" y1="-8" x2="0" y2="2" stroke="var(--primary-color, #03a9f4)" stroke-width="2" stroke-linecap="round"/>
        <line x1="0" y1="2" x2="-4" y2="10" stroke="var(--primary-color, #03a9f4)" stroke-width="2" stroke-linecap="round"/>
        <line x1="0" y1="2" x2="4" y2="10" stroke="var(--primary-color, #03a9f4)" stroke-width="2" stroke-linecap="round"/>
        <line x1="0" y1="-4" x2="-5" y2="2" stroke="var(--primary-color, #03a9f4)" stroke-width="2" stroke-linecap="round"/>
        <line x1="0" y1="-4" x2="5" y2="-1" stroke="var(--primary-color, #03a9f4)" stroke-width="2" stroke-linecap="round"/>
      </g>
    `,e=(t,e,i,o)=>{const r=i-t,s=o-e,n=Math.sqrt(r*r+s*s),a=r/n,l=s/n,c=i-40*a,h=o-40*l;return Z`
        <line x1="${t+40*a}" y1="${e+40*l}" x2="${c}" y2="${h}" stroke="var(--primary-color, #03a9f4)" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
        <polygon points="${c},${h} ${c-8*a+4*l},${h-8*l-4*a} ${c-8*a-4*l},${h-8*l+4*a}" fill="var(--primary-color, #03a9f4)" opacity="0.5"/>
      `},i=50,o=55,r=290,s=55,n=290,a=225,l=50,c=235,h=98,d=225,p=Z`
      <svg viewBox="0 0 360 290" width="360" height="290" style="display: block; margin: 0 auto;">
        <!-- Room with rounded corners, soft fill -->
        <rect x="30" y="35" width="280" height="210" rx="8"
              fill="var(--secondary-background-color, #f5f5f5)"
              stroke="var(--divider-color, #d0d0d0)" stroke-width="2.5"/>

        <!-- Wall labels -->
        <text x="170" y="28" font-size="9" fill="var(--secondary-text-color, #aaa)" text-anchor="middle">${this._localize("wizard.front_wall_label")}</text>
        <text x="170" y="262" font-size="9" fill="var(--secondary-text-color, #aaa)" text-anchor="middle">${this._localize("wizard.back_wall_label")}</text>

        <!-- Arrows with walking figures: 1→2→3→4 -->
        ${e(i,o,r,s)}
        ${t(170,72)}
        ${e(r,s,n,a)}
        ${t(265,145,!1,90)}
        <!-- 3rd arrow flat from 3 to 4 badge, same gap as arrow 1 has from 2 -->
        ${e(n,a,h-15,a)}
        ${t(190,a-17,!0)}

        <!-- Corner 4 badge: same height as 3, just past arrow end -->
        <circle cx="${h}" cy="${d}" r="14" fill="#FF9800" opacity="0.15"/>
        <circle cx="${h}" cy="${d}" r="14" fill="none" stroke="#FF9800" stroke-width="2.5" stroke-dasharray="5 3"/>
        <text x="${h}" y="${d+5}" font-size="14" fill="#FF9800" font-weight="bold" text-anchor="middle">4</text>

        <!-- Pot plant in the corner (BL) -->
        <g transform="translate(${l+5}, ${c-5})">
          <!-- Pot -->
          <path d="M -12 -2 L -10 12 L 10 12 L 12 -2 Z" fill="#C68642" stroke="#A0522D" stroke-width="1.5"/>
          <rect x="-14" y="-5" width="28" height="5" rx="2" fill="#A0522D"/>
          <!-- Plant leaves -->
          <ellipse cx="0" cy="-18" rx="12" ry="10" fill="#66BB6A" stroke="#43A047" stroke-width="1"/>
          <ellipse cx="-10" cy="-12" rx="9" ry="7" fill="#81C784" stroke="#43A047" stroke-width="1"/>
          <ellipse cx="10" cy="-12" rx="9" ry="7" fill="#81C784" stroke="#43A047" stroke-width="1"/>
          <ellipse cx="-6" cy="-22" rx="7" ry="6" fill="#A5D6A7" stroke="#66BB6A" stroke-width="1"/>
          <ellipse cx="6" cy="-22" rx="7" ry="6" fill="#A5D6A7" stroke="#66BB6A" stroke-width="1"/>
        </g>

        <!-- Horizontal distance measure below the room -->
        <line x1="30" y1="${c+18}" x2="${h}" y2="${c+18}" stroke="#FF9800" stroke-width="1.5"/>
        <line x1="30" y1="${c+12}" x2="30" y2="${c+24}" stroke="#FF9800" stroke-width="1.5"/>
        <line x1="${h}" y1="${c+12}" x2="${h}" y2="${c+24}" stroke="#FF9800" stroke-width="1.5"/>
        <text x="${(30+h)/2}" y="${c+32}" font-size="9" fill="#FF9800" text-anchor="middle" font-weight="500">65cm</text>

        <!-- Corner 1: front-left -->
        <circle cx="${i}" cy="${o}" r="14" fill="#4CAF50" opacity="0.15"/>
        <circle cx="${i}" cy="${o}" r="14" fill="none" stroke="#4CAF50" stroke-width="2.5"/>
        <text x="${i}" y="${o+5}" font-size="14" fill="#4CAF50" font-weight="bold" text-anchor="middle">1</text>

        <!-- Corner 2: front-right (sensor here) -->
        <circle cx="${r}" cy="${s}" r="14" fill="#4CAF50" opacity="0.15"/>
        <circle cx="${r}" cy="${s}" r="14" fill="none" stroke="#4CAF50" stroke-width="2.5"/>
        <text x="${r}" y="${s+5}" font-size="14" fill="#4CAF50" font-weight="bold" text-anchor="middle">2</text>

        <!-- Corner 3: back-right -->
        <circle cx="${n}" cy="${a}" r="14" fill="#4CAF50" opacity="0.15"/>
        <circle cx="${n}" cy="${a}" r="14" fill="none" stroke="#4CAF50" stroke-width="2.5"/>
        <text x="${n}" y="${a+5}" font-size="14" fill="#4CAF50" font-weight="bold" text-anchor="middle">3</text>

        <!-- Sensor icon outside the top-right corner -->
        <g transform="translate(${r+18}, ${s-18}) rotate(-45)">
          <rect x="-5" y="-7" width="10" height="14" rx="3" fill="var(--primary-color, #03a9f4)"/>
          <circle cx="0" cy="-11" r="3.5" fill="var(--primary-color, #03a9f4)" opacity="0.4"/>
        </g>
        <text x="${r+24}" y="${s-24}" font-size="10" fill="var(--primary-color, #03a9f4)" font-weight="500">${this._localize("wizard.sensor")}</text>
      </svg>
    `;return W`
      <div style="max-width: 560px; margin: 0 auto;">
        <div class="setting-group">
          <h4 style="text-align: center; margin-bottom: 16px;">${this._localize("wizard.how_calibration_works")}</h4>

          ${p}

          <div style="display: flex; flex-direction: column; gap: 14px; padding: 16px 4px 0;">
            <div style="display: flex; align-items: flex-start; gap: 10px;">
              <div style="min-width: 22px; height: 22px; border-radius: 50%; background: #4CAF50; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; color: white;">1</div>
              <div style="font-size: 13px;">
                ${Et(this._localize("wizard.walk_instruction_full"))}
              </div>
            </div>

            <div style="display: flex; align-items: flex-start; gap: 10px;">
              <div style="min-width: 22px; height: 22px; border-radius: 50%; background: #FF9800; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; color: white;">!</div>
              <div style="font-size: 13px;">
                ${Et(this._localize("wizard.cant_reach"))}
              </div>
            </div>

            <div style="display: flex; align-items: flex-start; gap: 10px;">
              <ha-icon icon="mdi:information-outline" style="--mdc-icon-size: 20px; color: var(--primary-color); flex-shrink: 0; margin-top: 1px;"></ha-icon>
              <div style="font-size: 13px; color: var(--secondary-text-color, #757575);">
                ${this._localize("wizard.corner_sensor_hint")}
              </div>
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; margin-top: 20px;">
          <button class="wizard-btn wizard-btn-back"
            @click=${()=>{this._setupStep=null,this._wizardCorners=[null,null,null,null],this._wizardCornerIndex=0,this._wizardOffsetSide="",this._wizardOffsetFb=""}}
          >${this._localize("common.cancel")}</button>
          <button class="wizard-btn wizard-btn-primary"
            @click=${()=>{this._setupStep="corners"}}
          >${this._localize("wizard.begin_marking")}</button>
        </div>
      </div>
    `}_renderWizardCorners(){const t=this._wizardCornerIndex,e=this._rawTargets.filter(t=>null!=t.raw_x&&null!=t.raw_y),i=e.length>0,o=e.length>1,r=this._wizardCorners.every(t=>null!==t),s=bi[t]||"",[n,a]=_i[t]||["",""];return W`
      <div class="wizard-card">
        <h2>${this._localize("wizard.calibrate_room_size")}</h2>
        <p>
          ${this._localize("wizard.walk_instruction",{duration:5})}
        </p>

        ${r?V:W`
            <p class="corner-instruction">
              ${this._localize("wizard.corner_step",{index:t+1,corner:this._localize(s)})}
            </p>
        `}

        <div class="corner-progress">
          ${bi.map((e,i)=>{const o=!!this._wizardCorners[i],r=i<3,s=i<t;return W`
                <span
                  class="corner-chip ${o?"done":""} ${i===t?"active":""}"
                  @click=${()=>{const t=this._wizardCorners[i];this._wizardCornerIndex=i,this._wizardCorners=[...this._wizardCorners],this._wizardCorners[i]=null,this._wizardOffsetSide=t?.offset_side?String(t.offset_side/10):"",this._wizardOffsetFb=t?.offset_fb?String(t.offset_fb/10):""}}
                >
                  ${this._localize(e)} ${o?"✓":""}
                </span>
                ${r?W`
                  <span class="corner-arrow ${s?"done":""}">›</span>
                `:V}
              `})}
        </div>

        <div class="corner-offsets" key="${t}">
          <span class="offset-label">${this._localize("wizard.distance_from")}</span>
          <input
            type="number"
            class="offset-input"
            min="0"
            step="1"
            placeholder="${this._localize("wizard.distance_from_side",{wall:this._localize(n)})}"
            .value=${this._wizardOffsetSide}
            @input=${e=>{this._wizardOffsetSide=e.target.value;const i=10*(parseFloat(this._wizardOffsetSide)||0),o=this._wizardCorners[t];o&&(o.offset_side=i)}}
          />
          <input
            type="number"
            class="offset-input"
            min="0"
            step="1"
            placeholder="${this._localize("wizard.distance_from_side",{wall:this._localize(a)})}"
            .value=${this._wizardOffsetFb}
            @input=${e=>{this._wizardOffsetFb=e.target.value;const i=10*(parseFloat(this._wizardOffsetFb)||0),o=this._wizardCorners[t];o&&(o.offset_fb=i)}}
          />
        </div>

        ${this._renderMiniSensorView()}

        ${r?W`
          <p style="font-size: 13px; color: var(--secondary-text-color); margin: 12px 0 4px;">
            ${this._localize("wizard.save_prompt")}
          </p>
        `:W`
          <p class="no-target-warning" style="visibility: ${!i||o?"visible":"hidden"};">
            ${i?this._localize("wizard.multiple_targets"):this._localize("wizard.no_target")}
          </p>
        `}

        <div class="wizard-actions">
          <button
            class="wizard-btn wizard-btn-back"
            @click=${()=>{this._setupStep=null,this._wizardCorners=[null,null,null,null],this._wizardCornerIndex=0,this._wizardOffsetSide="",this._wizardOffsetFb=""}}
          >${this._localize("common.cancel")}</button>
          ${r?W`
            <button
              class="wizard-btn wizard-btn-primary"
              ?disabled=${this._wizardSaving}
              @click=${()=>{this._computeWizardPerspective(),this._wizardFinish()}}
            >
              ${this._wizardSaving?this._localize("common.saving"):this._localize("common.save")}
            </button>
          `:W`
            <button
              class="wizard-btn wizard-btn-primary"
              ?disabled=${!i||o||this._wizardCapturing}
              @click=${()=>this._wizardStartCapture()}
            >
              ${this._localize("wizard.mark_corner",{corner:this._localize(s)})}
            </button>
          `}
        </div>
      </div>
    `}_renderMiniSensorView(){const t=wi,e=Pt,i=200,o=-t,r=e*Math.cos(xi),s=`M 0 0 L ${o} ${r} A 6000 6000 0 0 0 ${t} ${r} Z`,n=[2e3,4e3].map(t=>{const e=t*Math.sin(xi),i=t*Math.cos(xi);return`M ${-e} ${i} A ${t} ${t} 0 0 0 ${e} ${i}`});return W`
      <div class="mini-grid-container">
        <div class="sensor-fov-view">
          <svg
            class="sensor-fov-svg"
            viewBox="${-t-i} ${-200} ${2*t+400} ${6400}"
            preserveAspectRatio="xMidYMid meet"
          >
            <path
              d="${s}"
              fill="rgba(3, 169, 244, 0.10)"
              stroke="rgba(3, 169, 244, 0.3)"
              stroke-width="30"
            />
            ${n.map(t=>Z`
                <path
                  d="${t}"
                  fill="none"
                  stroke="rgba(255,255,255,0.15)"
                  stroke-width="40"
                  stroke-dasharray="80 80"
                />
              `)}
            <!-- Sensor dot -->
            <circle cx="0" cy="0" r="100" fill="var(--primary-color, #03a9f4)" stroke="#fff" stroke-width="40" />
          </svg>
          <!-- Marked corners (positioned via CSS %) -->
          ${this._wizardCorners.filter(t=>null!==t).map((t,e)=>{const{xPct:i,yPct:o}=this._rawToFovPct(t.raw_x,t.raw_y);return W`
                <div
                  class="mini-grid-captured"
                  style="left: ${i}%; top: ${o}%;"
                  title="${this._localize(bi[e])}"
                ></div>
              `})}
          <!-- Live targets (per-target colors) -->
          ${this._rawTargets.map((t,e)=>null!=t.raw_x&&null!=t.raw_y?W`
              <div
                class="mini-grid-target"
                style="${this._getWizardTargetStyle(t)} background: ${vi[e]||vi[0]};"
              ></div>
            `:V)}
        </div>
      </div>
    `}_renderSaveCancelButtons(){const t="settings"===this._view?this._saveSettings:this._applyLayout;return W`
      <div class="save-cancel-bar">
        <button class="wizard-btn wizard-btn-back"
          @click=${()=>{this._dirty=!1,this._view="live",this._loadDeviceConfig(this._selectedMac)}}
        >${this._localize("common.cancel")}</button>
        <button class="wizard-btn wizard-btn-primary"
          ?disabled=${this._saving||!this._dirty}
          @click=${t}
        >${this._saving?this._localize("common.saving"):this._localize("common.save")}</button>
      </div>
    `}_renderLiveOverview(){return W`
      <epp-live-view
        .perspective=${this._perspective}
        .sensorState=${this._sensorState}
        .zoneState=${this._zoneState}
        .zoneConfigs=${this._zoneConfigs}
        .localize=${this._localize}
        .headerTemplate=${this._renderHeader()}
        .gridTemplate=${this._perspective?this._renderLiveGrid():this._renderUncalibratedFov()}
        .debugLogTemplate=${this._perspective?this._renderBackendDebugLog():V}
        @navigate-view=${t=>{const{view:e,sidebarTab:i}=t.detail;this._view=e,i&&(this._sidebarTab=i)}}
        @live-view-action=${t=>{switch(t.detail.action){case"change-placement":this._changePlacement();break;case"show-delete-calibration":this._showDeleteCalibrationDialog=!0;break;case"show-template-save":this._showTemplateSave=!0;break;case"show-template-load":this._showTemplateLoad=!0}}}
      ></epp-live-view>
    `}_renderLiveGrid(){for(let t=0;t<this._targets.length;t++){const e=this._targets[t];null!=e.x&&null!=e.y&&"active"===e.status&&(this._zoneEngineState.targetPrevXY[t]={x:e.x,y:e.y})}const t={};for(const[e,i]of Object.entries(this._zoneState.occupancy))t[Number(e)]=i;return W`
			<epp-grid
				.grid=${this._grid}
				.zoneConfigs=${this._zoneConfigs}
				.targets=${this._targets}
				.roomWidth=${this._roomWidth}
				.roomDepth=${this._roomDepth}
				.perspective=${this._perspective}
				.furniture=${this._furniture}
				.selectedFurnitureId=${this._selectedFurnitureId}
				.sidebarTab=${this._sidebarTab}
				.showHitCounts=${this._showHitCounts}
				.occupancy=${t}
				.targetPrevXY=${this._zoneEngineState.targetPrevXY}
				.heatmapColors=${this._showHitCounts?this._computeHeatmapColors():null}
				.localize=${this._localize}
				.maxGridPx=${480}
				@furniture-select=${t=>{this._selectedFurnitureId=t.detail}}
				@furniture-pointer-down=${t=>{const{e:e,id:i,type:o,handle:r}=t.detail;this._onFurniturePointerDown(e,i,o,r)}}
				@furniture-delete=${t=>{this._removeFurniture(t.detail)}}
			></epp-grid>
		`}_renderTargetDots(t,e,i,o){return W`
      <div class="targets-overlay" style="pointer-events: none;">
        ${this._targets.map((r,s)=>{if("inactive"===r.status)return V;let n=null!=r.x?this._mapTargetToGridCell(r):null;const a=n&&n.col>=t&&n.col<=t+i&&n.row>=e&&n.row<=e+o;if("pending"===r.status&&!a&&this._zoneEngineState.targetPrevXY[s]&&(n=this._mapTargetToGridCell({...r,x:this._zoneEngineState.targetPrevXY[s].x,y:this._zoneEngineState.targetPrevXY[s].y})),!n)return V;const l=Math.max(0,Math.min(100,(n.col-t)/i*100)),c=Math.max(0,Math.min(100,(n.row-e)/o*100));return W`
            <div
              class="target-dot"
              style="left: ${l}%; top: ${c}%; background: ${vi[s]||vi[0]}; opacity: ${"pending"===r.status?.3:1}; transition: opacity 0.5s ease;"
            ></div>
            ${"active"===r.status&&r.signal>0?W`
              <div style="position: absolute; left: ${l}%; top: ${c}%; transform: translate(-50%, -280%); background: rgba(0,0,0,0.7); color: #fff; font-size: 10px; font-weight: bold; padding: 0 4px; border-radius: 6px; pointer-events: none;">
                ${r.signal}
              </div>
            `:V}
          `})}
      </div>
    `}_renderGridDimensions(){const t=this._getGridRoomMetrics();return t?W`
      <div class="grid-dimensions">
        ${t.widthM}m × ${t.depthM}m · Furthest point: ${t.furthestM}m
      </div>
    `:V}_renderUncalibratedFov(){const t=this._sensorState.occupancy,e=t?"#4CAF50":"var(--primary-color, #03a9f4)",i=160,o=14,r=180,s=30*Math.PI/180,n=150*Math.PI/180,a=i+r*Math.cos(s),l=o+r*Math.sin(s),c=i+r*Math.cos(n),h=o+r*Math.sin(n);return W`
      <div style="display: flex; flex-direction: column; align-items: center; padding: 24px;">
        <svg viewBox="0 0 320 210" width="320" height="210" style="display: block;">
          <!-- Sensor at top center -->
          <rect x="${154}" y="0" width="12" height="8" rx="3" fill="${e}"/>
          <circle cx="${i}" cy="0" r="4" fill="${e}" opacity="0.4"/>

          <!-- 120° FOV wedge with rounded arc end -->
          <path d="M ${i} ${o} L ${a} ${l} A ${r} ${r} 0 0 1 ${c} ${h} Z"
                fill="${e}" fill-opacity="${t?.15:.06}"
                stroke="${e}" stroke-width="1" stroke-opacity="0.2"/>

          <!-- Range arcs -->
          ${[60,120,180].map(t=>{const r=i+t*Math.cos(s),a=o+t*Math.sin(s),l=i+t*Math.cos(n),c=o+t*Math.sin(n);return Z`
              <path d="M ${r} ${a} A ${t} ${t} 0 0 1 ${l} ${c}"
                    fill="none" stroke="${e}" stroke-width="1"
                    stroke-dasharray="4 3" opacity="0.2"/>
            `})}

          <!-- Edge lines -->
          <line x1="${i}" y1="${o}" x2="${a}" y2="${l}" stroke="${e}" stroke-width="0.5" opacity="0.2"/>
          <line x1="${i}" y1="${o}" x2="${c}" y2="${h}" stroke="${e}" stroke-width="0.5" opacity="0.2"/>

          <!-- Target dots -->
          ${this._rawTargets.map((t,e)=>{if(null==t.raw_x||null==t.raw_y)return V;const s=Math.sqrt(t.raw_x*t.raw_x+t.raw_y*t.raw_y),n=Math.atan2(t.raw_x,t.raw_y),a=Math.min(s/6e3,1)*r,l=Math.PI/2-n,c=i+a*Math.cos(l),h=o+a*Math.sin(l);return Z`<circle cx="${c}" cy="${h}" r="5" fill="${vi[e]||vi[0]}"/>`})}

          ${t?Z`
            <text x="${i}" y="120" font-size="13" fill="${e}" text-anchor="middle" font-weight="500">${this._localize("live.detected")}</text>
          `:Z`
            <text x="${i}" y="120" font-size="13" fill="var(--secondary-text-color, #aaa)" text-anchor="middle">${this._localize("wizard.no_presence")}</text>
          `}
        </svg>

        <button
          class="live-nav-link" style="margin-top: 16px;"
          @click=${()=>{this._setupStep="guide",this._wizardCorners=[null,null,null,null],this._wizardCornerIndex=0,this._wizardOffsetSide="",this._wizardOffsetFb="",this._view="live"}}
        >
          <ha-icon icon="mdi:target" style="--mdc-icon-size: 16px;"></ha-icon>
          ${this._localize("wizard.calibrate_room_size")}
        </button>
      </div>
    `}_renderNeedsCalibration(){const t=Z`
      <svg viewBox="0 0 200 160" width="200" height="160" style="display: block;">
        <!-- Floor and wall -->
        <line x1="20" y1="150" x2="180" y2="150" stroke="var(--divider-color, #ccc)" stroke-width="2"/>
        <line x1="20" y1="10" x2="20" y2="150" stroke="var(--divider-color, #ccc)" stroke-width="2"/>
        <!-- Person outline -->
        <circle cx="130" cy="50" r="10" fill="none" stroke="var(--secondary-text-color, #888)" stroke-width="1.5"/>
        <line x1="130" y1="60" x2="130" y2="105" stroke="var(--secondary-text-color, #888)" stroke-width="1.5"/>
        <line x1="130" y1="105" x2="118" y2="148" stroke="var(--secondary-text-color, #888)" stroke-width="1.5"/>
        <line x1="130" y1="105" x2="142" y2="148" stroke="var(--secondary-text-color, #888)" stroke-width="1.5"/>
        <line x1="130" y1="75" x2="115" y2="95" stroke="var(--secondary-text-color, #888)" stroke-width="1.5"/>
        <line x1="130" y1="75" x2="145" y2="95" stroke="var(--secondary-text-color, #888)" stroke-width="1.5"/>
        <!-- Sensor on wall -->
        <rect x="14" y="52" width="12" height="8" rx="2" fill="var(--primary-color, #03a9f4)"/>
        <!-- Height bracket -->
        <line x1="40" y1="56" x2="40" y2="150" stroke="var(--primary-color, #03a9f4)" stroke-width="1" stroke-dasharray="4 2"/>
        <line x1="36" y1="56" x2="44" y2="56" stroke="var(--primary-color, #03a9f4)" stroke-width="1.5"/>
        <line x1="36" y1="150" x2="44" y2="150" stroke="var(--primary-color, #03a9f4)" stroke-width="1.5"/>
        <text x="48" y="108" font-size="11" fill="var(--primary-color, #03a9f4)">1.5–2m</text>
        <!-- Detection cone -->
        <path d="M 26 56 L 100 30 L 100 82 Z" fill="var(--primary-color, #03a9f4)" opacity="0.1" stroke="var(--primary-color, #03a9f4)" stroke-width="0.5"/>
      </svg>
    `,e=(()=>{const t=28,e=28,i=180,o=-15*Math.PI/180,r=105*Math.PI/180,s=t+i*Math.cos(o),n=e+i*Math.sin(o),a=t+i*Math.cos(r),l=e+i*Math.sin(r),c=(i,s)=>{const n=t+i*Math.cos(o),a=e+i*Math.sin(o),l=t+i*Math.cos(r),c=e+i*Math.sin(r),h=45*Math.PI/180,d=t+(i-10)*Math.cos(h),p=e+(i-10)*Math.sin(h);return Z`
          <path d="M ${n} ${a} A ${i} ${i} 0 0 1 ${l} ${c}"
                fill="none" stroke="var(--primary-color, #03a9f4)" stroke-width="1"
                stroke-dasharray="4 3" opacity="0.35" clip-path="url(#room-clip)"/>
          <text x="${d}" y="${p}" font-size="8" fill="var(--secondary-text-color, #aaa)"
                text-anchor="middle" clip-path="url(#room-clip)">${s}</text>
        `};return Z`
        <svg viewBox="0 0 200 160" width="200" height="160" style="display: block;">
          <defs>
            <clipPath id="room-clip"><rect x="20" y="20" width="160" height="120"/></clipPath>
          </defs>
          <!-- Room outline -->
          <rect x="20" y="20" width="160" height="120" fill="none" stroke="var(--divider-color, #ccc)" stroke-width="2" rx="2"/>
          <!-- 120° FOV wedge clipped to room -->
          <path d="M ${t} ${e} L ${a} ${l} A ${i} ${i} 0 0 0 ${s} ${n} Z"
                fill="var(--primary-color, #03a9f4)" opacity="0.08"
                clip-path="url(#room-clip)"/>
          <!-- Cone edge lines -->
          <line x1="${t}" y1="${e}" x2="${s}" y2="${n}" stroke="var(--primary-color, #03a9f4)" stroke-width="0.5" opacity="0.3" clip-path="url(#room-clip)"/>
          <line x1="${t}" y1="${e}" x2="${a}" y2="${l}" stroke="var(--primary-color, #03a9f4)" stroke-width="0.5" opacity="0.3" clip-path="url(#room-clip)"/>
          <!-- Range arcs -->
          ${c(60,"2m")}
          ${c(120,"4m")}
          ${c(180,"")}
          <!-- Sensor dot -->
          <circle cx="${t}" cy="${e}" r="6" fill="var(--primary-color, #03a9f4)"/>
          <!-- Labels -->
          <text x="30" y="16" font-size="10" fill="var(--primary-color, #03a9f4)">${this._localize("wizard.sensor")}</text>
          <text x="152" y="136" font-size="8" fill="var(--secondary-text-color, #aaa)" text-anchor="end">6m</text>
        </svg>
      `})(),i=Z`
      <svg viewBox="0 0 200 160" width="200" height="160" style="display: block;">
        <!-- Wall -->
        <line x1="20" y1="10" x2="20" y2="150" stroke="var(--divider-color, #ccc)" stroke-width="2"/>
        <line x1="20" y1="150" x2="180" y2="150" stroke="var(--divider-color, #ccc)" stroke-width="2"/>
        <!-- Sensor -->
        <rect x="14" y="56" width="12" height="8" rx="2" fill="var(--primary-color, #03a9f4)"/>
        <!-- Correct: horizontal beam -->
        <line x1="26" y1="60" x2="170" y2="60" stroke="var(--primary-color, #03a9f4)" stroke-width="1.5"/>
        <polygon points="170,60 162,56 162,64" fill="var(--primary-color, #03a9f4)"/>
        <text x="70" y="52" font-size="10" fill="var(--primary-color, #03a9f4)">${this._localize("wizard.horizontal_correct")}</text>
        <!-- Wrong: angled down -->
        <line x1="26" y1="60" x2="140" y2="140" stroke="var(--error-color, #f44336)" stroke-width="1" stroke-dasharray="4 2" opacity="0.6"/>
        <text x="90" y="118" font-size="10" fill="var(--error-color, #f44336)" opacity="0.7">${this._localize("wizard.angled_wrong")}</text>
        <!-- Wrong: angled up -->
        <line x1="26" y1="60" x2="120" y2="22" stroke="var(--error-color, #f44336)" stroke-width="1" stroke-dasharray="4 2" opacity="0.6"/>
        <text x="75" y="18" font-size="10" fill="var(--error-color, #f44336)" opacity="0.7">${this._localize("wizard.angled_wrong")}</text>
      </svg>
    `;return W`
      <div class="panel">
        ${this._renderHeader()}
        <div style="max-width: 560px; margin: 0 auto; padding: 0 24px;">
          <div class="setting-group">
            <h4>${this._localize("wizard.how_to_position")}</h4>
            <div style="display: flex; flex-direction: column; gap: 20px; padding: 8px 0;">

              <div style="display: flex; align-items: center; gap: 16px;">
                <div style="flex-shrink: 0;">${t}</div>
                <div>
                  <div style="font-weight: 500; margin-bottom: 4px;">${this._localize("wizard.mount_height")}</div>
                  <div style="font-size: 13px; color: var(--secondary-text-color, #757575);">
                    ${Et(this._localize("wizard.mount_height_desc"))}
                  </div>
                </div>
              </div>

              <hr style="border: none; border-top: 1px solid var(--divider-color, #eee); margin: 0;"/>

              <div style="display: flex; align-items: center; gap: 16px;">
                <div style="flex-shrink: 0;">${e}</div>
                <div>
                  <div style="font-weight: 500; margin-bottom: 4px;">${this._localize("wizard.placement")}</div>
                  <div style="font-size: 13px; color: var(--secondary-text-color, #757575);">
                    ${Et(this._localize("wizard.placement_desc"))}
                  </div>
                </div>
              </div>

              <hr style="border: none; border-top: 1px solid var(--divider-color, #eee); margin: 0;"/>

              <div style="display: flex; align-items: center; gap: 16px;">
                <div style="flex-shrink: 0;">${i}</div>
                <div>
                  <div style="font-weight: 500; margin-bottom: 4px;">${this._localize("wizard.beam_direction")}</div>
                  <div style="font-size: 13px; color: var(--secondary-text-color, #757575);">
                    ${Et(this._localize("wizard.beam_direction_desc"))}
                  </div>
                </div>
              </div>

            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; margin-top: 24px;">
            <button
              class="wizard-btn wizard-btn-primary"
              @click=${()=>{this._setupStep="guide",this._wizardCorners=[null,null,null,null],this._wizardCornerIndex=0,this._wizardOffsetSide="",this._wizardOffsetFb=""}}
            >
              ${this._localize("wizard.start_calibration")}
            </button>
          </div>
        </div>
      </div>
    `}_toggleAccordion(t){this._openAccordions=this._openAccordions.has(t)?new Set:new Set([t])}_getSensorRoomPosition(){return qt(this._perspective)}_autoDetectionRange(){return Jt(this._roomWidth,this._roomDepth,this._perspective,this._grid)}_renderSettings(){return W`
      <div class="panel">
        ${this._renderHeader()}
        <epp-settings-view
          .sensorState=${this._sensorState}
          .targetAutoRange=${this._targetAutoRange}
          .targetMaxDistance=${this._targetMaxDistance}
          .staticAutoRange=${this._staticAutoRange}
          .staticMinDistance=${this._staticMinDistance}
          .staticMaxDistance=${this._staticMaxDistance}
          .openAccordions=${this._openAccordions}
          .perspective=${this._perspective}
          .roomWidth=${this._roomWidth}
          .roomDepth=${this._roomDepth}
          .grid=${this._grid}
          .saving=${this._saving}
          .dirty=${this._dirty}
          .reportingConfig=${this._reportingConfig||{}}
          .offsetsConfig=${this._offsetsConfig||{}}
          .localize=${this._localize}
          @accordion-toggle=${t=>{this._openAccordions=t.detail}}
          @setting-change=${t=>{const{key:e,value:i}=t.detail;this["_"+e]=i}}
          @dirty=${()=>{this._dirty=!0}}
          @save=${this._saveSettings}
          @cancel=${()=>{this._dirty=!1,this._view="live",this._loadDeviceConfig(this._selectedMac)}}
        ></epp-settings-view>
      </div>
    `}_renderEditor(){const t=this._runLocalZoneEngine(),e=t.occupancy;for(let e=0;e<t.targets.length&&e<this._targets.length;e++)this._targets[e].status=t.targets[e].status;const i=Object.values(e).some(t=>t);return this._sensorState.occupancy=this._sensorState.static_presence||this._sensorState.motion_presence||i,W`
      <div class="panel" @click=${t=>{if(this._justPainted)return;const e=t.target;e.closest(".grid")||e.closest(".zone-sidebar")||(this._activeZone=null)}}>
        ${this._renderHeader()}

        <div class="editor-layout">
          <div style="flex: 1; min-width: 0;">
            ${V}
            <!-- Grid -->
            <div class="grid-container" @click=${t=>{t.target.closest(".furniture-item")||(this._selectedFurnitureId=null)}}>
            <epp-grid
              .grid=${this._grid}
              .zoneConfigs=${this._zoneConfigs}
              .targets=${this._targets}
              .roomWidth=${this._roomWidth}
              .roomDepth=${this._roomDepth}
              .perspective=${this._perspective}
              .furniture=${this._furniture}
              .selectedFurnitureId=${this._selectedFurnitureId}
              .sidebarTab=${this._sidebarTab}
              .editable=${!0}
              .activeZone=${this._activeZone}
              .showHitCounts=${this._showHitCounts}
              .occupancy=${e}
              .targetPrevXY=${this._zoneEngineState.targetPrevXY}
              .heatmapColors=${this._showHitCounts?this._computeHeatmapColors():null}
              .localize=${this._localize}
              .maxGridPx=${520}
              .frozenBounds=${this._frozenBounds}
              @cell-paint=${t=>{const{index:e,action:i}=t.detail;"down"===i?this._onCellMouseDown(e):"enter"===i?this._onCellMouseEnter(e):"up"===i&&this._onCellMouseUp()}}
              @furniture-select=${t=>{this._selectedFurnitureId=t.detail}}
              @furniture-pointer-down=${t=>{const{e:e,id:i,type:o,handle:r}=t.detail;this._onFurniturePointerDown(e,i,o,r)}}
              @furniture-delete=${t=>{this._removeFurniture(t.detail)}}
            ></epp-grid>
          </div>
            ${"zones"===this._sidebarTab?this._renderDebugLog():V}
          </div>

          <!-- Sidebar -->
          <div class="zone-sidebar">
            <div class="sidebar-title">${"furniture"===this._sidebarTab?this._localize("sidebar.furniture"):this._localize("sidebar.detection_zones")}</div>
            ${"zones"===this._sidebarTab?W`<epp-zone-sidebar
									.zoneConfigs=${this._zoneConfigs}
									.activeZone=${this._activeZone}
									.roomType=${this._roomType}
									.roomTrigger=${this._roomTrigger}
									.roomRenew=${this._roomRenew}
									.roomTimeout=${this._roomTimeout}
									.roomHandoffTimeout=${this._roomHandoffTimeout}
									.roomEntryPoint=${this._roomEntryPoint}
									.localZoneState=${this._zoneEngineState.localZoneState}
									.localize=${this._localize}
									@zone-select=${t=>{this._activeZone=t.detail.zone}}
									@zone-add=${()=>{this._addZone()}}
									@zone-remove=${t=>{this._removeZone(t.detail.slot)}}
									@zone-config-change=${t=>{const{index:e,updates:i}=t.detail,o=[...this._zoneConfigs];o[e]={...o[e],...i},this._zoneConfigs=o}}
									@room-config-change=${t=>{const{updates:e}=t.detail;void 0!==e.roomType&&(this._roomType=e.roomType),void 0!==e.roomTrigger&&(this._roomTrigger=e.roomTrigger),void 0!==e.roomRenew&&(this._roomRenew=e.roomRenew),void 0!==e.roomTimeout&&(this._roomTimeout=e.roomTimeout),void 0!==e.roomHandoffTimeout&&(this._roomHandoffTimeout=e.roomHandoffTimeout),void 0!==e.roomEntryPoint&&(this._roomEntryPoint=e.roomEntryPoint)}}
									@dirty=${()=>{this._dirty=!0}}
								></epp-zone-sidebar>`:W`<epp-furniture-sidebar
									.furniture=${this._furniture}
									.selectedFurnitureId=${this._selectedFurnitureId}
									.hass=${this.hass}
									.localize=${this._localize}
									.showCustomIconPicker=${this._showCustomIconPicker}
									.customIconValue=${this._customIconValue}
									@furniture-add=${t=>{this._addFurniture(t.detail)}}
									@furniture-add-custom=${t=>{this._addCustomFurniture(t.detail)}}
									@furniture-remove=${t=>{this._removeFurniture(t.detail)}}
									@furniture-update=${t=>{this._updateFurniture(t.detail.id,t.detail.updates)}}
									@custom-icon-toggle=${()=>{this._showCustomIconPicker=!this._showCustomIconPicker}}
									@custom-icon-change=${t=>{this._customIconValue=t.detail}}
								></epp-furniture-sidebar>`}
            ${this._renderSaveCancelButtons()}
          </div>
        </div>


      </div>
    `}_renderTemplateSaveDialog(){return W`
      <div class="template-dialog">
        <div class="template-dialog-card">
          <h3>${this._localize("dialogs.save_template")}</h3>
          <input
            type="text"
            class="template-name-input"
            placeholder="${this._localize("dialogs.template_name")}"
            .value=${this._templateName}
            @input=${t=>{this._templateName=t.target.value}}
          />
          <div class="template-dialog-actions">
            <button
              class="wizard-btn wizard-btn-back"
              @click=${()=>{this._showTemplateSave=!1}}
            >${this._localize("common.cancel")}</button>
            <button
              class="wizard-btn wizard-btn-primary"
              ?disabled=${!this._templateName.trim()}
              @click=${()=>this._saveTemplate()}
            >${this._localize("common.save")}</button>
          </div>
        </div>
      </div>
    `}_renderTemplateLoadDialog(){const t=this._getTemplates();return W`
      <div class="template-dialog">
        <div class="template-dialog-card">
          <h3>${this._localize("dialogs.load_template")}</h3>
          ${0===t.length?W`<p class="overlay-help">${this._localize("dialogs.no_templates")}</p>`:t.map(t=>W`
              <div class="template-item">
                <span class="template-item-name">${t.name}</span>
                <span class="template-item-size">${(t.roomWidth/1e3).toFixed(1)}m x ${(t.roomDepth/1e3).toFixed(1)}m</span>
                <button
                  class="wizard-btn wizard-btn-primary template-item-btn"
                  @click=${()=>this._loadTemplate(t.name)}
                >${this._localize("common.load")}</button>
                <button
                  class="zone-remove-btn"
                  @click=${()=>this._deleteTemplate(t.name)}
                >
                  <ha-icon icon="mdi:close"></ha-icon>
                </button>
              </div>
            `)}
          <div class="template-dialog-actions">
            <button
              class="wizard-btn wizard-btn-back"
              @click=${()=>{this._showTemplateLoad=!1}}
            >${this._localize("common.close")}</button>
          </div>
        </div>
      </div>
    `}_renderVisibleCells(t,e,i,o,r,s=!1){const n=this._showHitCounts?this._computeHeatmapColors():null;let a;if(s){a={};for(const[t,e]of Object.entries(this._zoneState.occupancy))a[Number(t)]=e}else{const t=this._runLocalZoneEngine();a=t.occupancy;for(let e=0;e<t.targets.length&&e<this._targets.length;e++)this._targets[e].status=t.targets[e].status;const e=Object.values(a).some(t=>t);this._sensorState.occupancy=this._sensorState.static_presence||this._sensorState.motion_presence||e}const l=[];for(let s=i;s<=o;s++)for(let i=t;i<=e;i++){const t=s*Tt+i,e=this._grid[t];let o=this._getCellColor(t),c="";if(Dt(e)){const t=Ht(e);if(n){const e=n.get(t);e&&(o=`linear-gradient(${e}, ${e}), linear-gradient(${o}, ${o})`)}a[t]&&(c="box-shadow: inset 0 0 0 1px rgba(0,0,0,0.4);")}l.push(W`
          <div
            class="cell"
            style="background: ${o}; width: ${r}px; height: ${r}px; ${c}"
            @mousedown=${()=>{this._onCellMouseDown(t)}}
            @mouseenter=${()=>{this._onCellMouseEnter(t)}}
          ></div>
        `)}return l}_runLocalZoneEngine(){return this._targetCtrl.runLocalZoneEngine()}_enrichDebugLog(t){return this._targetCtrl.enrichDebugLog(t)}_computeHeatmapColors(){return this._targetCtrl.computeHeatmapColors()}_getZoneThresholds(t){return Ot(t,this._zoneConfigs,this._roomType,this._roomTrigger,this._roomRenew,this._roomTimeout,this._roomHandoffTimeout,this._roomEntryPoint)}_renderBackendDebugLog(){return W`
      <div style="margin-top: 8px; min-width: 0;">
        <button
          class="live-section-header live-section-link"
          style="font-size: 12px; gap: 4px;"
          @click=${()=>{this._showBackendDebugLog=!this._showBackendDebugLog,this._showBackendDebugLog||(this._backendDebugLogLines=[],this._backendDebugLogPrev=null)}}
        >
          <ha-icon icon=${this._showBackendDebugLog?"mdi:chevron-down":"mdi:chevron-right"} style="--mdc-icon-size: 14px;"></ha-icon>
          Detection events
        </button>
        ${this._showBackendDebugLog?W`
          <div style="display: flex; justify-content: flex-end; margin-bottom: 4px; gap: 4px;">
            <button
              class="debug-log-btn"
              @click=${()=>{navigator.clipboard.writeText(this._backendDebugLogLines.join("\n"))}}
            >Copy all</button>
            <button
              class="debug-log-btn"
              @click=${()=>{this._backendDebugLogLines=[],this._backendDebugLogPrev=null,this.requestUpdate()}}
            >Clear</button>
          </div>
          <div class="debug-log-container" id="backend-debug-log-scroll">
            ${0===this._backendDebugLogLines.length?W`<div style="color: var(--secondary-text-color, #999); font-style: italic;">Waiting for events...</div>`:this._backendDebugLogLines.map(t=>W`<div class="debug-log-line">${t}</div>`)}
          </div>
        `:V}
      </div>
    `}_renderDebugLog(){return W`
      <div style="margin-top: 8px; min-width: 0;">
        <button
          class="live-section-header live-section-link"
          style="font-size: 12px; gap: 4px;"
          @click=${()=>{this._showDebugLog=!this._showDebugLog,this._showDebugLog||(this._debugLogLines=[],this._debugLogPrev=null)}}
        >
          <ha-icon icon=${this._showDebugLog?"mdi:chevron-down":"mdi:chevron-right"} style="--mdc-icon-size: 14px;"></ha-icon>
          Detection events
        </button>
        ${this._showDebugLog?W`
          <div style="display: flex; justify-content: flex-end; margin-bottom: 4px; gap: 4px;">
            <button
              class="debug-log-btn"
              @click=${()=>{navigator.clipboard.writeText(this._debugLogLines.join("\n"))}}
            >Copy all</button>
            <button
              class="debug-log-btn"
              @click=${()=>{this._debugLogLines=[],this._debugLogPrev=null,this.requestUpdate()}}
            >Clear</button>
          </div>
          <div class="debug-log-container" id="debug-log-scroll">
            ${0===this._debugLogLines.length?W`<div style="color: var(--secondary-text-color, #999); font-style: italic;">Waiting for events...</div>`:this._debugLogLines.map(t=>W`<div class="debug-log-line">${t}</div>`)}
          </div>
        `:V}
      </div>
    `}_renderFurnitureOverlay(t,e,i,o,r){return this._furniture.length?W`
			<epp-furniture-overlay
				.furniture=${this._furniture}
				.selectedFurnitureId=${this._selectedFurnitureId}
				.roomWidth=${this._roomWidth}
				.cellPx=${t}
				.minCol=${e}
				.minRow=${i}
				.visCols=${o}
				.visRows=${r}
				.sidebarTab=${this._sidebarTab}
				.localize=${this._localize}
				@furniture-select=${t=>{this._selectedFurnitureId=t.detail}}
				@furniture-pointer-down=${t=>{const{e:e,id:i,type:o,handle:r}=t.detail;this._onFurniturePointerDown(e,i,o,r)}}
				@furniture-delete=${t=>{this._removeFurniture(t.detail)}}
			></epp-furniture-overlay>
		`:V}}Bi.styles=[dt,pt,ut,gt,ft,mt,bt,_t,n`
    .mode-tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 16px;
    }

    .mode-tab {
      padding: 8px 18px;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 8px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: background 0.2s;
    }

    .mode-tab:hover {
      background: var(--secondary-background-color, #f5f5f5);
    }

    .mode-tab.active {
      background: var(--primary-color, #03a9f4);
      color: #fff;
      border-color: var(--primary-color, #03a9f4);
    }

    .mode-tab.apply-btn {
      background: var(--primary-color, #03a9f4);
      color: #fff;
      border-color: var(--primary-color, #03a9f4);
    }

    .mode-tab.apply-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .editor-layout {
      display: flex;
      gap: 24px;
      align-items: flex-start;
    }


    .grid-container {
      position: relative;
      display: inline-block;
      max-width: 100%;
      overflow: visible;
    }

    .grid {
      display: grid;
      gap: 1px;
      background: var(--divider-color, #e0e0e0);
      border: 2px solid var(--divider-color, #e0e0e0);
      border-radius: 8px;
      overflow: hidden;
      user-select: none;
    }

    .cell {
      cursor: pointer;
      transition: opacity 0.1s;
    }

    .cell:hover {
      opacity: 0.75;
    }

    .overlay-help {
      font-size: 13px;
      color: var(--secondary-text-color, #757575);
      margin: 0;
    }

    /* Furniture overlay styles moved to epp-furniture-overlay component */

    .targets-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      z-index: 20;
    }

    .grid-targets-wrapper {
      position: relative;
      display: inline-block;
    }

    .target-dot {
      position: absolute;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--primary-color, #03a9f4);
      border: 2px solid #fff;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
      transform: translate(-50%, -50%);
      z-index: 10;
    }

    .target-dot.moving {
      background: #4caf50;
    }

    .target-dot.stationary {
      background: #ff9800;
    }

    .sensor-overlay {
      position: absolute;
      top: 0;
      left: 0;
      pointer-events: none;
      z-index: 5;
    }

    .zone-sidebar {
      width: 240px;
      max-height: 70vh;
      background: var(--card-background-color, #fff);
      border-left: 1px solid var(--divider-color, #e0e0e0);
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      overflow: hidden;
    }

    .sidebar-tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 8px;
    }

    .sidebar-tab {
      flex: 1;
      padding: 6px 12px;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 8px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      text-align: center;
    }

    .sidebar-tab.active {
      background: var(--primary-color, #03a9f4);
      color: #fff;
      border-color: var(--primary-color, #03a9f4);
    }

    .zone-sidebar h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      font-size: 20px;
      font-weight: 500;
      margin-bottom: 16px;
      text-align: center;
    }

    .header-settings-btn {
      background: none;
      border: none;
      color: var(--secondary-text-color, #757575);
      cursor: pointer;
      padding: 6px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      transition: background 0.2s;
    }

    .header-settings-btn:hover {
      background: var(--secondary-background-color, #e0e0e0);
      color: var(--primary-text-color, #212121);
    }

    .header-settings-btn ha-icon {
      --mdc-icon-size: 20px;
    }

    .device-select {
      padding: 6px 10px;
      border-radius: 8px;
      border: 1px solid var(--divider-color, #e0e0e0);
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
    }

    .loading-container {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      width: 100%;
      font-size: 16px;
      color: var(--secondary-text-color, #757575);
    }

    /* Setup wizard */
    .wizard-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      width: 100%;
      padding: 32px;
      box-sizing: border-box;
    }

    .wizard-card {
      max-width: 560px;
      width: 100%;
      background: var(--card-background-color, #fff);
      border-radius: 16px;
      padding: 32px;
      display: flex;
      flex-direction: column;
      gap: 24px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
    }

    .wizard-card h2 {
      margin: 0;
      font-size: 22px;
      font-weight: 500;
    }

    .wizard-card p {
      margin: 0;
      color: var(--secondary-text-color, #757575);
      font-size: 15px;
      line-height: 1.5;
    }

    .wizard-card label {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 14px;
      font-weight: 500;
      color: var(--secondary-text-color, #757575);
    }

    .wizard-card input[type="text"] {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 8px;
      font-size: 15px;
      box-sizing: border-box;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
    }


    .wizard-actions {
      display: flex;
      justify-content: space-between;
      gap: 12px;
    }

    .wizard-btn-secondary {
      background: var(--secondary-background-color, #e0e0e0);
      color: var(--primary-text-color, #212121);
    }

    .wizard-btn-secondary:hover {
      opacity: 0.85;
    }

    /* Mini-grid used in orientation and bounds steps */
    .mini-grid-container {
      display: flex;
      justify-content: center;
    }

    .mini-grid {
      width: 280px;
      height: 224px;
      background: var(--secondary-background-color, #f5f5f5);
      border: 2px solid var(--divider-color, #e0e0e0);
      border-radius: 8px;
      position: relative;
      overflow: hidden;
    }

    .mini-grid-label {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      font-size: 11px;
      color: var(--secondary-text-color, #757575);
      pointer-events: none;
      writing-mode: vertical-rl;
      text-orientation: mixed;
    }

    .mini-grid-label.left-label {
      left: 6px;
    }

    .mini-grid-label.right-label {
      right: 6px;
      transform: translateY(-50%) rotate(180deg);
    }

    .mini-grid-sensor {
      position: absolute;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--primary-color, #03a9f4);
      border: 2px solid #fff;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
      z-index: 5;
    }

    .mini-grid-target {
      position: absolute;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #4caf50;
      border: 2px solid #fff;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
      transform: translate(-50%, -50%);
      z-index: 10;
      transition: left 0.15s, top 0.15s;
    }

    .mini-grid-captured {
      position: absolute;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #ff9800;
      border: 2px solid #fff;
      transform: translate(-50%, -50%);
      z-index: 8;
    }

    .sensor-fov-view {
      width: 480px;
      aspect-ratio: 1.732 / 1;
      background: #1a1a2e;
      border: 2px solid var(--divider-color, #e0e0e0);
      border-radius: 8px;
      position: relative;
      overflow: hidden;
    }

    .sensor-fov-svg {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }

    .preview-grid-container {
      display: flex;
      justify-content: center;
      position: relative;
    }

    .preview-grid-wrapper {
      position: relative;
    }

    .preview-grid {
      display: grid;
      gap: 1px;
      width: 100%;
      height: 100%;
      background: var(--divider-color, #e0e0e0);
      border: 2px solid var(--divider-color, #e0e0e0);
      border-radius: 8px;
      overflow: hidden;
    }

    .preview-cell {
      background: var(--card-background-color, #fff);
    }

    .no-target-warning {
      color: var(--error-color, #f44336);
      font-size: 13px;
      text-align: center;
    }

    .corner-progress {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .corner-chip {
      padding: 5px 11px;
      border-radius: 16px;
      font-size: 13px;
      background: var(--secondary-background-color, #e0e0e0);
      color: var(--secondary-text-color, #757575);
      cursor: pointer;
      transition: background 0.2s, border-color 0.2s;
      border: 2px solid transparent;
    }

    .corner-chip.active {
      background: var(--primary-color, #03a9f4);
      color: #fff;
      border-color: var(--primary-color, #03a9f4);
    }

    .corner-chip.done {
      background: #4caf50;
      color: #fff;
    }

    .corner-chip.done.active {
      border-color: var(--primary-color, #03a9f4);
    }

    .corner-arrow {
      font-size: 18px;
      color: var(--disabled-text-color, #ccc);
      font-weight: bold;
    }

    .corner-arrow.done {
      color: var(--primary-color, #03a9f4);
    }

    .corner-instruction {
      font-size: 15px;
      color: var(--primary-text-color, #212121);
    }

    .corner-offsets {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .offset-label {
      font-size: 13px;
      color: var(--secondary-text-color, #888);
      white-space: nowrap;
      flex-shrink: 0;
    }

    .capture-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.4);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .capture-overlay-content {
      background: var(--card-background-color, #fff);
      padding: 24px 32px;
      border-radius: 16px;
      text-align: center;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    }

    .offset-input {
      flex: 1;
      width: 100%;
      padding: 14px 12px 6px;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 10px;
      font-size: 16px;
      box-sizing: border-box;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
    }

    .offset-input::placeholder {
      color: var(--secondary-text-color, #888);
      font-size: 13px;
    }

    .offset-input:focus {
      outline: none;
      border-color: var(--primary-color, #03a9f4);
    }

    .dimension-inputs {
      display: flex;
      gap: 16px;
    }

    .dimension-inputs label {
      flex: 1;
    }

    .dimension-inputs input {
      width: 100%;
      padding: 8px;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 8px;
      font-size: 14px;
      box-sizing: border-box;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
    }

    .capture-progress {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
    }

    .capture-bar {
      flex: 1;
      height: 8px;
      background: var(--secondary-background-color, #e0e0e0);
      border-radius: 4px;
      overflow: hidden;
    }

    .capture-fill {
      height: 100%;
      background: var(--primary-color, #03a9f4);
      border-radius: 4px;
      transition: width 0.1s linear;
    }

    .capture-progress span {
      font-size: 13px;
      color: var(--secondary-text-color, #757575);
      white-space: nowrap;
    }

    /* Live sidebar */
    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 4px 4px 12px;
    }

    .sidebar-title {
      font-size: 15px;
      font-weight: 600;
      padding: 10px 12px 8px;
      color: var(--primary-text-color, #212121);
    }

    .sidebar-header .sidebar-title {
      padding: 0;
    }

    .sidebar-menu-wrapper {
      position: relative;
    }

    .sidebar-menu-btn {
      background: none;
      border: none;
      color: var(--secondary-text-color, #757575);
      cursor: pointer;
      padding: 4px;
      border-radius: 6px;
      display: flex;
    }

    .sidebar-menu-btn:hover {
      background: var(--secondary-background-color, #f0f0f0);
    }

    .sidebar-menu {
      position: absolute;
      top: 100%;
      right: 0;
      background: var(--card-background-color, #fff);
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 10px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
      z-index: 100;
      min-width: 220px;
      padding: 4px 0;
    }

    .sidebar-menu-item {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 8px 14px;
      border: none;
      background: none;
      color: var(--primary-text-color, #212121);
      font-size: 13px;
      cursor: pointer;
      text-align: left;
    }

    .sidebar-menu-item:hover {
      background: var(--secondary-background-color, #f5f5f5);
    }

    .save-cancel-bar {
      display: flex;
      justify-content: space-between;
      padding: 12px;
      border-top: 1px solid var(--divider-color, #eee);
      margin-top: auto;
    }

    .live-section-link {
      cursor: pointer;
      background: none;
      border: none;
      color: var(--primary-color, #03a9f4);
    }

    .live-section-link:hover {
      text-decoration: underline;
    }

    .live-section-header {
      font-size: 11px;
      font-weight: 600;
      color: var(--secondary-text-color, #888);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 4px 12px 6px;
    }

    .live-nav-links {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 16px 12px 8px;
      margin-top: 8px;
      border-top: 1px solid var(--divider-color, #eee);
    }

    .debug-log-container {
      max-height: 200px;
      overflow-y: auto;
      overflow-x: hidden;
      background: var(--card-background-color, #1e1e1e);
      border: 1px solid var(--divider-color, #333);
      border-radius: 6px;
      padding: 6px 8px;
      font-family: monospace;
      font-size: 11px;
      line-height: 1.5;
    }

    .debug-log-line {
      white-space: pre-wrap;
      word-break: break-all;
      color: var(--primary-text-color, #e0e0e0);
    }

    .debug-log-btn {
      background: none;
      border: 1px solid var(--divider-color, #444);
      border-radius: 4px;
      color: var(--secondary-text-color, #999);
      font-size: 10px;
      padding: 2px 8px;
      cursor: pointer;
    }

    .debug-log-btn:hover {
      color: var(--primary-text-color);
      border-color: var(--primary-text-color, #ccc);
    }

    .live-nav-link {
      display: flex;
      align-items: center;
      gap: 8px;
      background: none;
      border: none;
      color: var(--primary-color, #03a9f4);
      cursor: pointer;
      padding: 6px 4px;
      font-size: 13px;
      border-radius: 6px;
      text-align: left;
    }

    .live-nav-link:hover {
      background: var(--secondary-background-color, #f5f5f5);
    }

    /* Settings view */
    .grid-dimensions {
      text-align: center;
      font-size: 12px;
      color: var(--secondary-text-color, #757575);
      margin-top: 8px;
    }

    .settings-container {
      width: 560px;
      max-width: 100%;
      margin: 0 auto;
      padding: 0 16px;
      box-sizing: border-box;
    }

    .setting-input {
      width: 80px;
      padding: 6px 8px;
      font-size: 13px;
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: 8px;
      background: var(--secondary-background-color, #f5f5f5);
      color: var(--primary-text-color, #212121);
      text-align: right;
    }

    select.setting-input {
      flex: 1;
      width: auto;
      text-align: left;
    }

    .setting-toggle {
      width: 18px;
      height: 18px;
      accent-color: var(--primary-color, #03a9f4);
      cursor: pointer;
    }

    .zone-type-group {
      background: var(--secondary-background-color, #f5f5f5);
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 8px;
    }

    .zone-type-group:last-child {
      margin-bottom: 0;
    }

    .zone-type-group h5 {
      margin: 0 0 8px;
      font-size: 13px;
      font-weight: 600;
      color: var(--primary-text-color, #212121);
    }

  `],t([xt({attribute:!1})],Bi.prototype,"hass",void 0),t([wt()],Bi.prototype,"_grid",void 0),t([wt()],Bi.prototype,"_zoneConfigs",void 0),t([wt()],Bi.prototype,"_activeZone",void 0),t([wt()],Bi.prototype,"_roomType",void 0),t([wt()],Bi.prototype,"_roomTrigger",void 0),t([wt()],Bi.prototype,"_roomRenew",void 0),t([wt()],Bi.prototype,"_roomTimeout",void 0),t([wt()],Bi.prototype,"_roomHandoffTimeout",void 0),t([wt()],Bi.prototype,"_roomEntryPoint",void 0),t([wt()],Bi.prototype,"_targetAutoRange",void 0),t([wt()],Bi.prototype,"_targetMaxDistance",void 0),t([wt()],Bi.prototype,"_staticAutoRange",void 0),t([wt()],Bi.prototype,"_staticMinDistance",void 0),t([wt()],Bi.prototype,"_staticMaxDistance",void 0),t([wt()],Bi.prototype,"_sidebarTab",void 0),t([wt()],Bi.prototype,"_showDeleteCalibrationDialog",void 0),t([wt()],Bi.prototype,"_showCustomIconPicker",void 0),t([wt()],Bi.prototype,"_customIconValue",void 0),t([wt()],Bi.prototype,"_furniture",void 0),t([wt()],Bi.prototype,"_selectedFurnitureId",void 0),t([wt()],Bi.prototype,"_targets",void 0),t([wt()],Bi.prototype,"_rawTargets",void 0),t([wt()],Bi.prototype,"_sensorState",void 0),t([wt()],Bi.prototype,"_zoneState",void 0),t([wt()],Bi.prototype,"_showHitCounts",void 0),t([wt()],Bi.prototype,"_showDebugLog",void 0),t([wt()],Bi.prototype,"_showBackendDebugLog",void 0),t([wt()],Bi.prototype,"_isPainting",void 0),t([wt()],Bi.prototype,"_paintAction",void 0),t([wt()],Bi.prototype,"_saving",void 0),t([wt()],Bi.prototype,"_dirty",void 0),t([wt()],Bi.prototype,"_showUnsavedDialog",void 0),t([wt()],Bi.prototype,"_showTemplateSave",void 0),t([wt()],Bi.prototype,"_showTemplateLoad",void 0),t([wt()],Bi.prototype,"_templateName",void 0),t([wt()],Bi.prototype,"_devices",void 0),t([wt()],Bi.prototype,"_selectedMac",void 0),t([wt()],Bi.prototype,"_loading",void 0),t([wt()],Bi.prototype,"_setupStep",void 0),t([wt()],Bi.prototype,"_wizardSaving",void 0),t([wt()],Bi.prototype,"_wizardCornerIndex",void 0),t([wt()],Bi.prototype,"_wizardCorners",void 0),t([wt()],Bi.prototype,"_wizardRoomWidth",void 0),t([wt()],Bi.prototype,"_wizardRoomDepth",void 0),t([wt()],Bi.prototype,"_wizardCapturing",void 0),t([wt()],Bi.prototype,"_wizardCaptureProgress",void 0),t([wt()],Bi.prototype,"_wizardOffsetSide",void 0),t([wt()],Bi.prototype,"_wizardOffsetFb",void 0),t([wt()],Bi.prototype,"_view",void 0),t([wt()],Bi.prototype,"_openAccordions",void 0),t([wt()],Bi.prototype,"_perspective",void 0),t([wt()],Bi.prototype,"_roomWidth",void 0),t([wt()],Bi.prototype,"_roomDepth",void 0),t([wt()],Bi.prototype,"_wizardCapturePaused",void 0),customElements.get("eppgrid-panel")||customElements.define("eppgrid-panel",Bi);export{Bi as EPPGridPanel};
