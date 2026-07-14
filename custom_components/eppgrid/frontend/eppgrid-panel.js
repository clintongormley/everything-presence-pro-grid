function e(e,t,i,s){var r,o=arguments.length,a=o<3?t:null===s?s=Object.getOwnPropertyDescriptor(t,i):s;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)a=Reflect.decorate(e,t,i,s);else for(var n=e.length-1;n>=0;n--)(r=e[n])&&(a=(o<3?r(a):o>3?r(t,i,a):r(t,i))||a);return o>3&&a&&Object.defineProperty(t,i,a),a}"function"==typeof SuppressedError&&SuppressedError;
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const t=globalThis,i=t.ShadowRoot&&(void 0===t.ShadyCSS||t.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,s=Symbol(),r=new WeakMap;let o=class{constructor(e,t,i){if(this._$cssResult$=!0,i!==s)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o;const t=this.t;if(i&&void 0===e){const i=void 0!==t&&1===t.length;i&&(e=r.get(t)),void 0===e&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),i&&r.set(t,e))}return e}toString(){return this.cssText}};const a=e=>new o("string"==typeof e?e:e+"",void 0,s),n=(e,...t)=>{const i=1===e.length?e[0]:t.reduce((t,i,s)=>t+(e=>{if(!0===e._$cssResult$)return e.cssText;if("number"==typeof e)return e;throw Error("Value passed to 'css' function must be a 'css' function result: "+e+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+e[s+1],e[0]);return new o(i,e,s)},l=i?e=>e:e=>e instanceof CSSStyleSheet?(e=>{let t="";for(const i of e.cssRules)t+=i.cssText;return a(t)})(e):e,{is:c,defineProperty:h,getOwnPropertyDescriptor:d,getOwnPropertyNames:p,getOwnPropertySymbols:u,getPrototypeOf:g}=Object,A=globalThis,_=A.trustedTypes,f=_?_.emptyScript:"",m=A.reactiveElementPolyfillSupport,w=(e,t)=>e,v={toAttribute(e,t){switch(t){case Boolean:e=e?f:null;break;case Object:case Array:e=null==e?e:JSON.stringify(e)}return e},fromAttribute(e,t){let i=e;switch(t){case Boolean:i=null!==e;break;case Number:i=null===e?null:Number(e);break;case Object:case Array:try{i=JSON.parse(e)}catch(e){i=null}}return i}},b=(e,t)=>!c(e,t),E={attribute:!0,type:String,converter:v,reflect:!1,useDefault:!1,hasChanged:b};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */Symbol.metadata??=Symbol("metadata"),A.litPropertyMetadata??=new WeakMap;let y=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=E){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){const i=Symbol(),s=this.getPropertyDescriptor(e,i,t);void 0!==s&&h(this.prototype,e,s)}}static getPropertyDescriptor(e,t,i){const{get:s,set:r}=d(this.prototype,e)??{get(){return this[t]},set(e){this[t]=e}};return{get:s,set(t){const o=s?.call(this);r?.call(this,t),this.requestUpdate(e,o,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??E}static _$Ei(){if(this.hasOwnProperty(w("elementProperties")))return;const e=g(this);e.finalize(),void 0!==e.l&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(w("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(w("properties"))){const e=this.properties,t=[...p(e),...u(e)];for(const i of t)this.createProperty(i,e[i])}const e=this[Symbol.metadata];if(null!==e){const t=litPropertyMetadata.get(e);if(void 0!==t)for(const[e,i]of t)this.elementProperties.set(e,i)}this._$Eh=new Map;for(const[e,t]of this.elementProperties){const i=this._$Eu(e,t);void 0!==i&&this._$Eh.set(i,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){const t=[];if(Array.isArray(e)){const i=new Set(e.flat(1/0).reverse());for(const e of i)t.unshift(l(e))}else void 0!==e&&t.push(l(e));return t}static _$Eu(e,t){const i=t.attribute;return!1===i?void 0:"string"==typeof i?i:"string"==typeof e?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),void 0!==this.renderRoot&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){const e=new Map,t=this.constructor.elementProperties;for(const i of t.keys())this.hasOwnProperty(i)&&(e.set(i,this[i]),delete this[i]);e.size>0&&(this._$Ep=e)}createRenderRoot(){const e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((e,s)=>{if(i)e.adoptedStyleSheets=s.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(const i of s){const s=document.createElement("style"),r=t.litNonce;void 0!==r&&s.setAttribute("nonce",r),s.textContent=i.cssText,e.appendChild(s)}})(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,i){this._$AK(e,i)}_$ET(e,t){const i=this.constructor.elementProperties.get(e),s=this.constructor._$Eu(e,i);if(void 0!==s&&!0===i.reflect){const r=(void 0!==i.converter?.toAttribute?i.converter:v).toAttribute(t,i.type);this._$Em=e,null==r?this.removeAttribute(s):this.setAttribute(s,r),this._$Em=null}}_$AK(e,t){const i=this.constructor,s=i._$Eh.get(e);if(void 0!==s&&this._$Em!==s){const e=i.getPropertyOptions(s),r="function"==typeof e.converter?{fromAttribute:e.converter}:void 0!==e.converter?.fromAttribute?e.converter:v;this._$Em=s;const o=r.fromAttribute(t,e.type);this[s]=o??this._$Ej?.get(s)??o,this._$Em=null}}requestUpdate(e,t,i,s=!1,r){if(void 0!==e){const o=this.constructor;if(!1===s&&(r=this[e]),i??=o.getPropertyOptions(e),!((i.hasChanged??b)(r,t)||i.useDefault&&i.reflect&&r===this._$Ej?.get(e)&&!this.hasAttribute(o._$Eu(e,i))))return;this.C(e,t,i)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(e,t,{useDefault:i,reflect:s,wrapped:r},o){i&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,o??t??this[e]),!0!==r||void 0!==o)||(this._$AL.has(e)||(this.hasUpdated||i||(t=void 0),this._$AL.set(e,t)),!0===s&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}const e=this.scheduleUpdate();return null!=e&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[e,t]of this._$Ep)this[e]=t;this._$Ep=void 0}const e=this.constructor.elementProperties;if(e.size>0)for(const[t,i]of e){const{wrapped:e}=i,s=this[t];!0!==e||this._$AL.has(t)||void 0===s||this.C(t,void 0,i,s)}}let e=!1;const t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(e=>e.hostUpdate?.()),this.update(t)):this._$EM()}catch(t){throw e=!1,this._$EM(),t}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(e){}firstUpdated(e){}};y.elementStyles=[],y.shadowRootOptions={mode:"open"},y[w("elementProperties")]=new Map,y[w("finalized")]=new Map,m?.({ReactiveElement:y}),(A.reactiveElementVersions??=[]).push("2.1.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const C=globalThis,x=e=>e,B=C.trustedTypes,S=B?B.createPolicy("lit-html",{createHTML:e=>e}):void 0,I="$lit$",D=`lit$${Math.random().toFixed(9).slice(2)}$`,R="?"+D,M=`<${R}>`,k=document,T=()=>k.createComment(""),F=e=>null===e||"object"!=typeof e&&"function"!=typeof e,P=Array.isArray,z="[ \t\n\f\r]",U=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,O=/-->/g,H=/>/g,Q=RegExp(`>|${z}(?:([^\\s"'>=/]+)(${z}*=${z}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),G=/'/g,L=/"/g,$=/^(?:script|style|textarea|title)$/i,N=e=>(t,...i)=>({_$litType$:e,strings:t,values:i}),Y=N(1),K=N(2),W=Symbol.for("lit-noChange"),J=Symbol.for("lit-nothing"),j=new WeakMap,Z=k.createTreeWalker(k,129);function V(e,t){if(!P(e)||!e.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==S?S.createHTML(t):t}const X=(e,t)=>{const i=e.length-1,s=[];let r,o=2===t?"<svg>":3===t?"<math>":"",a=U;for(let t=0;t<i;t++){const i=e[t];let n,l,c=-1,h=0;for(;h<i.length&&(a.lastIndex=h,l=a.exec(i),null!==l);)h=a.lastIndex,a===U?"!--"===l[1]?a=O:void 0!==l[1]?a=H:void 0!==l[2]?($.test(l[2])&&(r=RegExp("</"+l[2],"g")),a=Q):void 0!==l[3]&&(a=Q):a===Q?">"===l[0]?(a=r??U,c=-1):void 0===l[1]?c=-2:(c=a.lastIndex-l[2].length,n=l[1],a=void 0===l[3]?Q:'"'===l[3]?L:G):a===L||a===G?a=Q:a===O||a===H?a=U:(a=Q,r=void 0);const d=a===Q&&e[t+1].startsWith("/>")?" ":"";o+=a===U?i+M:c>=0?(s.push(n),i.slice(0,c)+I+i.slice(c)+D+d):i+D+(-2===c?t:d)}return[V(e,o+(e[i]||"<?>")+(2===t?"</svg>":3===t?"</math>":"")),s]};class q{constructor({strings:e,_$litType$:t},i){let s;this.parts=[];let r=0,o=0;const a=e.length-1,n=this.parts,[l,c]=X(e,t);if(this.el=q.createElement(l,i),Z.currentNode=this.el.content,2===t||3===t){const e=this.el.content.firstChild;e.replaceWith(...e.childNodes)}for(;null!==(s=Z.nextNode())&&n.length<a;){if(1===s.nodeType){if(s.hasAttributes())for(const e of s.getAttributeNames())if(e.endsWith(I)){const t=c[o++],i=s.getAttribute(e).split(D),a=/([.?@])?(.*)/.exec(t);n.push({type:1,index:r,name:a[2],strings:i,ctor:"."===a[1]?re:"?"===a[1]?oe:"@"===a[1]?ae:se}),s.removeAttribute(e)}else e.startsWith(D)&&(n.push({type:6,index:r}),s.removeAttribute(e));if($.test(s.tagName)){const e=s.textContent.split(D),t=e.length-1;if(t>0){s.textContent=B?B.emptyScript:"";for(let i=0;i<t;i++)s.append(e[i],T()),Z.nextNode(),n.push({type:2,index:++r});s.append(e[t],T())}}}else if(8===s.nodeType)if(s.data===R)n.push({type:2,index:r});else{let e=-1;for(;-1!==(e=s.data.indexOf(D,e+1));)n.push({type:7,index:r}),e+=D.length-1}r++}}static createElement(e,t){const i=k.createElement("template");return i.innerHTML=e,i}}function ee(e,t,i=e,s){if(t===W)return t;let r=void 0!==s?i._$Co?.[s]:i._$Cl;const o=F(t)?void 0:t._$litDirective$;return r?.constructor!==o&&(r?._$AO?.(!1),void 0===o?r=void 0:(r=new o(e),r._$AT(e,i,s)),void 0!==s?(i._$Co??=[])[s]=r:i._$Cl=r),void 0!==r&&(t=ee(e,r._$AS(e,t.values),r,s)),t}class te{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){const{el:{content:t},parts:i}=this._$AD,s=(e?.creationScope??k).importNode(t,!0);Z.currentNode=s;let r=Z.nextNode(),o=0,a=0,n=i[0];for(;void 0!==n;){if(o===n.index){let t;2===n.type?t=new ie(r,r.nextSibling,this,e):1===n.type?t=new n.ctor(r,n.name,n.strings,this,e):6===n.type&&(t=new ne(r,this,e)),this._$AV.push(t),n=i[++a]}o!==n?.index&&(r=Z.nextNode(),o++)}return Z.currentNode=k,s}p(e){let t=0;for(const i of this._$AV)void 0!==i&&(void 0!==i.strings?(i._$AI(e,i,t),t+=i.strings.length-2):i._$AI(e[t])),t++}}class ie{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,i,s){this.type=2,this._$AH=J,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=i,this.options=s,this._$Cv=s?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode;const t=this._$AM;return void 0!==t&&11===e?.nodeType&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=ee(this,e,t),F(e)?e===J||null==e||""===e?(this._$AH!==J&&this._$AR(),this._$AH=J):e!==this._$AH&&e!==W&&this._(e):void 0!==e._$litType$?this.$(e):void 0!==e.nodeType?this.T(e):(e=>P(e)||"function"==typeof e?.[Symbol.iterator])(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==J&&F(this._$AH)?this._$AA.nextSibling.data=e:this.T(k.createTextNode(e)),this._$AH=e}$(e){const{values:t,_$litType$:i}=e,s="number"==typeof i?this._$AC(e):(void 0===i.el&&(i.el=q.createElement(V(i.h,i.h[0]),this.options)),i);if(this._$AH?._$AD===s)this._$AH.p(t);else{const e=new te(s,this),i=e.u(this.options);e.p(t),this.T(i),this._$AH=e}}_$AC(e){let t=j.get(e.strings);return void 0===t&&j.set(e.strings,t=new q(e)),t}k(e){P(this._$AH)||(this._$AH=[],this._$AR());const t=this._$AH;let i,s=0;for(const r of e)s===t.length?t.push(i=new ie(this.O(T()),this.O(T()),this,this.options)):i=t[s],i._$AI(r),s++;s<t.length&&(this._$AR(i&&i._$AB.nextSibling,s),t.length=s)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){const t=x(e).nextSibling;x(e).remove(),e=t}}setConnected(e){void 0===this._$AM&&(this._$Cv=e,this._$AP?.(e))}}class se{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,i,s,r){this.type=1,this._$AH=J,this._$AN=void 0,this.element=e,this.name=t,this._$AM=s,this.options=r,i.length>2||""!==i[0]||""!==i[1]?(this._$AH=Array(i.length-1).fill(new String),this.strings=i):this._$AH=J}_$AI(e,t=this,i,s){const r=this.strings;let o=!1;if(void 0===r)e=ee(this,e,t,0),o=!F(e)||e!==this._$AH&&e!==W,o&&(this._$AH=e);else{const s=e;let a,n;for(e=r[0],a=0;a<r.length-1;a++)n=ee(this,s[i+a],t,a),n===W&&(n=this._$AH[a]),o||=!F(n)||n!==this._$AH[a],n===J?e=J:e!==J&&(e+=(n??"")+r[a+1]),this._$AH[a]=n}o&&!s&&this.j(e)}j(e){e===J?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}}class re extends se{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===J?void 0:e}}class oe extends se{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==J)}}class ae extends se{constructor(e,t,i,s,r){super(e,t,i,s,r),this.type=5}_$AI(e,t=this){if((e=ee(this,e,t,0)??J)===W)return;const i=this._$AH,s=e===J&&i!==J||e.capture!==i.capture||e.once!==i.once||e.passive!==i.passive,r=e!==J&&(i===J||s);s&&this.element.removeEventListener(this.name,this,i),r&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}}class ne{constructor(e,t,i){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=i}get _$AU(){return this._$AM._$AU}_$AI(e){ee(this,e)}}const le=C.litHtmlPolyfillSupport;le?.(q,ie),(C.litHtmlVersions??=[]).push("3.3.2");const ce=globalThis;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let he=class extends y{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){const t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=((e,t,i)=>{const s=i?.renderBefore??t;let r=s._$litPart$;if(void 0===r){const e=i?.renderBefore??null;s._$litPart$=r=new ie(t.insertBefore(T(),e),e,void 0,i??{})}return r._$AI(e),r})(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return W}};he._$litElement$=!0,he.finalized=!0,ce.litElementHydrateSupport?.({LitElement:he});const de=ce.litElementPolyfillSupport;de?.({LitElement:he}),(ce.litElementVersions??=[]).push("4.2.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const pe={attribute:!0,type:String,converter:v,reflect:!1,hasChanged:b},ue=(e=pe,t,i)=>{const{kind:s,metadata:r}=i;let o=globalThis.litPropertyMetadata.get(r);if(void 0===o&&globalThis.litPropertyMetadata.set(r,o=new Map),"setter"===s&&((e=Object.create(e)).wrapped=!0),o.set(i.name,e),"accessor"===s){const{name:s}=i;return{set(i){const r=t.get.call(this);t.set.call(this,i),this.requestUpdate(s,r,e,!0,i)},init(t){return void 0!==t&&this.C(s,void 0,e,t),t}}}if("setter"===s){const{name:s}=i;return function(i){const r=this[s];t.call(this,i),this.requestUpdate(s,r,e,!0,i)}}throw Error("Unsupported decorator location: "+s)};function ge(e){return(t,i)=>"object"==typeof i?ue(e,t,i):((e,t,i)=>{const s=t.hasOwnProperty(i);return t.constructor.createProperty(i,e),s?Object.getOwnPropertyDescriptor(t,i):void 0})(e,t,i)}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function Ae(e){return ge({...e,state:!0,attribute:!1})}class _e extends he{constructor(){super(...arguments),this.variant="neutral",this.disabled=!1,this.type="button",this.icon=""}render(){return Y`
      <button
        class=${this.variant}
        type=${this.type}
        ?disabled=${this.disabled}
      >
        ${this.icon?Y`<ha-icon icon=${this.icon}></ha-icon>`:J}
        <slot></slot>
      </button>
    `}}_e.styles=n`
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
  `,e([ge({type:String})],_e.prototype,"variant",void 0),e([ge({type:Boolean})],_e.prototype,"disabled",void 0),e([ge({type:String})],_e.prototype,"type",void 0),e([ge({type:String})],_e.prototype,"icon",void 0),customElements.get("epp-button")||customElements.define("epp-button",_e);class fe extends he{constructor(){super(...arguments),this.open=!1,this.heading="",this.label="",this._onKeydown=e=>{this.open&&"Escape"===e.key&&this.dispatchEvent(new CustomEvent("dialog-dismiss",{bubbles:!0,composed:!0}))}}connectedCallback(){super.connectedCallback(),document.addEventListener("keydown",this._onKeydown)}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("keydown",this._onKeydown)}render(){return this.open?Y`
      <div class="overlay">
        <div
          class="card"
          role="dialog"
          aria-modal="true"
          aria-label=${this.heading||this.label||J}
        >
          ${this.heading?Y`<h3>${this.heading}</h3>`:J}
          <div class="body"><slot></slot></div>
          <div class="actions"><slot name="actions"></slot></div>
        </div>
      </div>
    `:J}}fe.styles=n`
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
  `,e([ge({type:Boolean})],fe.prototype,"open",void 0),e([ge({type:String})],fe.prototype,"heading",void 0),e([ge({type:String})],fe.prototype,"label",void 0),customElements.get("epp-dialog")||customElements.define("epp-dialog",fe);class me extends he{constructor(){super(...arguments),this.icon="",this.label="",this.disabled=!1,this.variant="default"}render(){return Y`
      <button
        type="button"
        class=${this.variant}
        aria-label=${this.label||J}
        ?disabled=${this.disabled}
      >
        <ha-icon icon=${this.icon}></ha-icon>
      </button>
    `}}me.styles=n`
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
  `,e([ge({type:String})],me.prototype,"icon",void 0),e([ge({type:String})],me.prototype,"label",void 0),e([ge({type:Boolean})],me.prototype,"disabled",void 0),e([ge({type:String})],me.prototype,"variant",void 0),customElements.get("epp-icon-button")||customElements.define("epp-icon-button",me)
/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */;const we=Symbol.for(""),ve=e=>{if(e?.r===we)return e?._$litStatic$},be=(e,...t)=>({_$litStatic$:t.reduce((t,i,s)=>t+(e=>{if(void 0!==e._$litStatic$)return e._$litStatic$;throw Error(`Value passed to 'literal' function must be a 'literal' result: ${e}. Use 'unsafeStatic' to pass non-literal values, but\n            take care to ensure page security.`)})(i)+e[s+1],e[0]),r:we}),Ee=new Map,ye=(e=>(t,...i)=>{const s=i.length;let r,o;const a=[],n=[];let l,c=0,h=!1;for(;c<s;){for(l=t[c];c<s&&void 0!==(o=i[c],r=ve(o));)l+=r+t[++c],h=!0;c!==s&&n.push(o),a.push(l),c++}if(c===s&&a.push(t[s]),h){const e=a.join("$$lit$$");void 0===(t=Ee.get(e))&&(a.raw=a,Ee.set(e,t=a)),i=n}return e(t,...i)})(Y);class Ce extends he{constructor(){super(...arguments),this.label="",this.value="",this.type="text",this.unit="",this.disabled=!1,this.placeholder="",this.min="",this.max="",this.step="",this.autocomplete="",this._tag=customElements.get("ha-input")?be`ha-input`:customElements.get("ha-textfield")?be`ha-textfield`:be`input`,this._isNativeInput=!customElements.get("ha-input")&&!customElements.get("ha-textfield"),this._onInput=e=>{e.stopPropagation();const t=e.target.value;this.value=t,this.dispatchEvent(new CustomEvent("value-changed",{detail:{value:t},bubbles:!0,composed:!0}))},this._onInnerValueChanged=e=>{e.stopPropagation()}}render(){const e=this._tag;return ye`
      <div class="field">
        <${e}
          data-field-control
          type=${this.type}
          .label=${this.label}
          aria-label=${this._isNativeInput&&this.label||J}
          placeholder=${this.placeholder||J}
          min=${this.min||J}
          max=${this.max||J}
          step=${this.step||J}
          autocomplete=${this.autocomplete||J}
          .value=${this.value}
          ?disabled=${this.disabled}
          @input=${this._onInput}
          @value-changed=${this._onInnerValueChanged}
        ></${e}>
        ${this.unit?ye`<span class="unit">${this.unit}</span>`:""}
      </div>
    `}}Ce.styles=n`
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
  `,e([ge({type:String})],Ce.prototype,"label",void 0),e([ge({type:String})],Ce.prototype,"value",void 0),e([ge({type:String})],Ce.prototype,"type",void 0),e([ge({type:String})],Ce.prototype,"unit",void 0),e([ge({type:Boolean})],Ce.prototype,"disabled",void 0),e([ge({type:String})],Ce.prototype,"placeholder",void 0),e([ge({type:String})],Ce.prototype,"min",void 0),e([ge({type:String})],Ce.prototype,"max",void 0),e([ge({type:String})],Ce.prototype,"step",void 0),e([ge({type:String})],Ce.prototype,"autocomplete",void 0),customElements.get("epp-field")||customElements.define("epp-field",Ce);const xe=n`
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
`,Be=n`
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
`,Se=n`
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
`,Ie=n`
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
`,De=n`
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
`,Re=n`
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
`,Me=n`
  .save-cancel-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
  }
`,ke=n`
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
       can't collapse to 0 while ha-select upgrades async — that briefly shifts the
       grid up, inflating its height measurement and flickering the live<->editor
       swap. Intentionally unscoped (not desktop-only): harmless on mobile, where the
       grid sizes off the viewport height, not the header's top. Must stay on this
       (cascade-winning) .panel-header rule; see the root cause + cascade guard in
       panel-layout.test.ts. */
    min-height: 56px;
  }

  .panel-header ha-select {
    --mdc-typography-subtitle1-font-size: 16px;
    --mdc-typography-subtitle1-font-weight: 500;
    min-width: 200px;
  }
`;class Te extends he{constructor(){super(...arguments),this.label="",this.checked=!1,this.disabled=!1,this._onChange=e=>{e.stopPropagation();const t=e.target.checked;this.checked=t,this.dispatchEvent(new CustomEvent("value-changed",{detail:{value:t},bubbles:!0,composed:!0}))}}render(){const e=customElements.get("ha-switch")?Y`<ha-switch
          data-toggle-control
          .checked=${this.checked}
          .disabled=${this.disabled}
          @change=${this._onChange}
        ></ha-switch>`:Y`<label class="toggle-switch">
          <input
            type="checkbox"
            data-toggle-control
            .checked=${this.checked}
            .disabled=${this.disabled}
            @change=${this._onChange}
          />
          <span class="toggle-slider"></span>
        </label>`;return Y`<div class="row">${this.label?Y`<span class="label">${this.label}</span>`:J}${e}</div>`}}Te.styles=[Ie,n`
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
    `],e([ge({type:String})],Te.prototype,"label",void 0),e([ge({type:Boolean})],Te.prototype,"checked",void 0),e([ge({type:Boolean})],Te.prototype,"disabled",void 0),customElements.get("epp-toggle")||customElements.define("epp-toggle",Te);class Fe extends he{constructor(){super(...arguments),this.heading="",this.elevated=!1,this._onActionsSlotChange=()=>this.requestUpdate()}get _hasActions(){return null!==this.querySelector('[slot="actions"]')}render(){return Y`
      <div class="card ${this.elevated?"elevated":""}">
        ${this.heading?Y`<div class="card-heading">${this.heading}</div>`:J}
        <slot></slot>
        <div class="card-actions" ?hidden=${!this._hasActions}>
          <slot name="actions" @slotchange=${this._onActionsSlotChange}></slot>
        </div>
      </div>
    `}}function Pe(e,t){const i=t&&t.cache?t.cache:Le,s=t&&t.serializer?t.serializer:Qe;return(t&&t.strategy?t.strategy:He)(e,{cache:i,serializer:s})}function ze(e,t,i,s){const r=null==(o=s)||"number"==typeof o||"boolean"==typeof o?s:i(s);var o;let a=t.get(r);return void 0===a&&(a=e.call(this,s),t.set(r,a)),a}function Ue(e,t,i){const s=Array.prototype.slice.call(arguments,3),r=i(s);let o=t.get(r);return void 0===o&&(o=e.apply(this,s),t.set(r,o)),o}function Oe(e,t,i,s,r){return i.bind(t,e,s,r)}function He(e,t){return Oe(e,this,1===e.length?ze:Ue,t.cache.create(),t.serializer)}Fe.styles=n`
    :host { display: block; }
    .card {
      background: var(--epp-surface, var(--card-background-color, #fff));
      border: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
      border-radius: var(--epp-radius-lg, 16px);
      padding: var(--epp-space-4, 16px);
    }
    .card.elevated { box-shadow: var(--epp-elevation-1, 0 2px 8px rgba(0, 0, 0, 0.12)); }
    .card-heading {
      font-size: var(--epp-font-lg, 16px);
      font-weight: var(--epp-weight-semibold, 600);
      color: var(--epp-text, var(--primary-text-color, #212121));
      margin-bottom: var(--epp-space-3, 12px);
    }
    .card-actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--epp-space-3, 12px);
      margin-top: var(--epp-space-4, 16px);
    }
    .card-actions[hidden] { display: none; }
  `,e([ge({type:String})],Fe.prototype,"heading",void 0),e([ge({type:Boolean})],Fe.prototype,"elevated",void 0),customElements.get("epp-card")||customElements.define("epp-card",Fe);const Qe=function(){return JSON.stringify(arguments)};class Ge{cache;constructor(){this.cache=Object.create(null)}get(e){return this.cache[e]}set(e,t){this.cache[e]=t}}const Le={create:function(){return new Ge}},$e={variadic:function(e,t){return Oe(e,this,Ue,t.cache.create(),t.serializer)}},Ne=/(?:[Eec]{1,6}|G{1,5}|[Qq]{1,5}|(?:[yYur]+|U{1,5})|[ML]{1,5}|d{1,2}|D{1,3}|F{1}|[abB]{1,5}|[hkHK]{1,2}|w{1,2}|W{1}|m{1,2}|s{1,2}|[zZOvVxX]{1,4})(?=([^']*'[^']*')*[^']*$)/g;function Ye(e){const t={};return e.replace(Ne,e=>{const i=e.length;switch(e[0]){case"G":t.era=4===i?"long":5===i?"narrow":"short";break;case"y":t.year=2===i?"2-digit":"numeric";break;case"Y":case"u":case"U":case"r":throw new RangeError("`Y/u/U/r` (year) patterns are not supported, use `y` instead");case"q":case"Q":throw new RangeError("`q/Q` (quarter) patterns are not supported");case"M":case"L":t.month=["numeric","2-digit","short","long","narrow"][i-1];break;case"w":case"W":throw new RangeError("`w/W` (week) patterns are not supported");case"d":t.day=["numeric","2-digit"][i-1];break;case"D":case"F":case"g":throw new RangeError("`D/F/g` (day) patterns are not supported, use `d` instead");case"E":t.weekday=4===i?"long":5===i?"narrow":"short";break;case"e":if(i<4)throw new RangeError("`e..eee` (weekday) patterns are not supported");t.weekday=["short","long","narrow","short"][i-4];break;case"c":if(i<4)throw new RangeError("`c..ccc` (weekday) patterns are not supported");t.weekday=["short","long","narrow","short"][i-4];break;case"a":t.hour12=!0;break;case"b":case"B":throw new RangeError("`b/B` (period) patterns are not supported, use `a` instead");case"h":t.hourCycle="h12",t.hour=["numeric","2-digit"][i-1];break;case"H":t.hourCycle="h23",t.hour=["numeric","2-digit"][i-1];break;case"K":t.hourCycle="h11",t.hour=["numeric","2-digit"][i-1];break;case"k":t.hourCycle="h24",t.hour=["numeric","2-digit"][i-1];break;case"j":case"J":case"C":throw new RangeError("`j/J/C` (hour) patterns are not supported, use `h/H/K/k` instead");case"m":t.minute=["numeric","2-digit"][i-1];break;case"s":t.second=["numeric","2-digit"][i-1];break;case"S":case"A":throw new RangeError("`S/A` (second) patterns are not supported, use `s` instead");case"z":t.timeZoneName=i<4?"short":"long";break;case"Z":case"O":case"v":case"V":case"X":case"x":throw new RangeError("`Z/O/v/V/X/x` (timeZone) patterns are not supported, use `z` instead")}return""}),t}const Ke=/[\t-\r \x85\u200E\u200F\u2028\u2029]/i;function We(e){return e.replace(/^(.*?)-/,"")}const Je=/^\.(?:(0+)(\*)?|(#+)|(0+)(#+))$/g,je=/^(@+)?(\+|#+)?[rs]?$/g,Ze=/(\*)(0+)|(#+)(0+)|(0+)/g,Ve=/^(0+)$/;function Xe(e){const t={};return"r"===e[e.length-1]?t.roundingPriority="morePrecision":"s"===e[e.length-1]&&(t.roundingPriority="lessPrecision"),e.replace(je,function(e,i,s){return"string"!=typeof s?(t.minimumSignificantDigits=i.length,t.maximumSignificantDigits=i.length):"+"===s?t.minimumSignificantDigits=i.length:"#"===i[0]?t.maximumSignificantDigits=i.length:(t.minimumSignificantDigits=i.length,t.maximumSignificantDigits=i.length+("string"==typeof s?s.length:0)),""}),t}function qe(e){switch(e){case"sign-auto":return{signDisplay:"auto"};case"sign-accounting":case"()":return{currencySign:"accounting"};case"sign-always":case"+!":return{signDisplay:"always"};case"sign-accounting-always":case"()!":return{signDisplay:"always",currencySign:"accounting"};case"sign-except-zero":case"+?":return{signDisplay:"exceptZero"};case"sign-accounting-except-zero":case"()?":return{signDisplay:"exceptZero",currencySign:"accounting"};case"sign-never":case"+_":return{signDisplay:"never"}}}function et(e){let t;if("E"===e[0]&&"E"===e[1]?(t={notation:"engineering"},e=e.slice(2)):"E"===e[0]&&(t={notation:"scientific"},e=e.slice(1)),t){const i=e.slice(0,2);if("+!"===i?(t.signDisplay="always",e=e.slice(2)):"+?"===i&&(t.signDisplay="exceptZero",e=e.slice(2)),!Ve.test(e))throw new Error("Malformed concise eng/scientific notation");t.minimumIntegerDigits=e.length}return t}function tt(e){const t=qe(e);return t||{}}function it(e){let t={};for(const i of e){switch(i.stem){case"percent":case"%":t.style="percent";continue;case"%x100":t.style="percent",t.scale=100;continue;case"currency":t.style="currency",t.currency=i.options[0];continue;case"group-off":case",_":t.useGrouping=!1;continue;case"precision-integer":case".":t.maximumFractionDigits=0;continue;case"measure-unit":case"unit":t.style="unit",t.unit=We(i.options[0]);continue;case"compact-short":case"K":t.notation="compact",t.compactDisplay="short";continue;case"compact-long":case"KK":t.notation="compact",t.compactDisplay="long";continue;case"scientific":t={...t,notation:"scientific",...i.options.reduce((e,t)=>({...e,...tt(t)}),{})};continue;case"engineering":t={...t,notation:"engineering",...i.options.reduce((e,t)=>({...e,...tt(t)}),{})};continue;case"notation-simple":t.notation="standard";continue;case"unit-width-narrow":t.currencyDisplay="narrowSymbol",t.unitDisplay="narrow";continue;case"unit-width-short":t.currencyDisplay="code",t.unitDisplay="short";continue;case"unit-width-full-name":t.currencyDisplay="name",t.unitDisplay="long";continue;case"unit-width-iso-code":t.currencyDisplay="symbol";continue;case"scale":t.scale=parseFloat(i.options[0]);continue;case"rounding-mode-floor":t.roundingMode="floor";continue;case"rounding-mode-ceiling":t.roundingMode="ceil";continue;case"rounding-mode-down":t.roundingMode="trunc";continue;case"rounding-mode-up":t.roundingMode="expand";continue;case"rounding-mode-half-even":t.roundingMode="halfEven";continue;case"rounding-mode-half-down":t.roundingMode="halfTrunc";continue;case"rounding-mode-half-up":t.roundingMode="halfExpand";continue;case"integer-width":if(i.options.length>1)throw new RangeError("integer-width stems only accept a single optional option");i.options[0].replace(Ze,function(e,i,s,r,o,a){if(i)t.minimumIntegerDigits=s.length;else{if(r&&o)throw new Error("We currently do not support maximum integer digits");if(a)throw new Error("We currently do not support exact integer digits")}return""});continue}if(Ve.test(i.stem)){t.minimumIntegerDigits=i.stem.length;continue}if(Je.test(i.stem)){if(i.options.length>1)throw new RangeError("Fraction-precision stems only accept a single optional option");i.stem.replace(Je,function(e,i,s,r,o,a){return"*"===s?t.minimumFractionDigits=i.length:r&&"#"===r[0]?t.maximumFractionDigits=r.length:o&&a?(t.minimumFractionDigits=o.length,t.maximumFractionDigits=o.length+a.length):(t.minimumFractionDigits=i.length,t.maximumFractionDigits=i.length),""});const e=i.options[0];"w"===e?t={...t,trailingZeroDisplay:"stripIfInteger"}:e&&(t={...t,...Xe(e)});continue}if(je.test(i.stem)){t={...t,...Xe(i.stem)};continue}const e=qe(i.stem);e&&(t={...t,...e});const s=et(i.stem);s&&(t={...t,...s})}return t}let st=function(e){return e[e.literal=0]="literal",e[e.argument=1]="argument",e[e.number=2]="number",e[e.date=3]="date",e[e.time=4]="time",e[e.select=5]="select",e[e.plural=6]="plural",e[e.pound=7]="pound",e[e.tag=8]="tag",e}({}),rt=function(e){return e[e.number=0]="number",e[e.dateTime=1]="dateTime",e}({});function ot(e){return e.type===st.literal}function at(e){return e.type===st.argument}function nt(e){return e.type===st.number}function lt(e){return e.type===st.date}function ct(e){return e.type===st.time}function ht(e){return e.type===st.select}function dt(e){return e.type===st.plural}function pt(e){return e.type===st.pound}function ut(e){return e.type===st.tag}function gt(e){return!(!e||"object"!=typeof e||e.type!==rt.number)}function At(e){return!(!e||"object"!=typeof e||e.type!==rt.dateTime)}let _t=function(e){return e[e.EXPECT_ARGUMENT_CLOSING_BRACE=1]="EXPECT_ARGUMENT_CLOSING_BRACE",e[e.EMPTY_ARGUMENT=2]="EMPTY_ARGUMENT",e[e.MALFORMED_ARGUMENT=3]="MALFORMED_ARGUMENT",e[e.EXPECT_ARGUMENT_TYPE=4]="EXPECT_ARGUMENT_TYPE",e[e.INVALID_ARGUMENT_TYPE=5]="INVALID_ARGUMENT_TYPE",e[e.EXPECT_ARGUMENT_STYLE=6]="EXPECT_ARGUMENT_STYLE",e[e.INVALID_NUMBER_SKELETON=7]="INVALID_NUMBER_SKELETON",e[e.INVALID_DATE_TIME_SKELETON=8]="INVALID_DATE_TIME_SKELETON",e[e.EXPECT_NUMBER_SKELETON=9]="EXPECT_NUMBER_SKELETON",e[e.EXPECT_DATE_TIME_SKELETON=10]="EXPECT_DATE_TIME_SKELETON",e[e.UNCLOSED_QUOTE_IN_ARGUMENT_STYLE=11]="UNCLOSED_QUOTE_IN_ARGUMENT_STYLE",e[e.EXPECT_SELECT_ARGUMENT_OPTIONS=12]="EXPECT_SELECT_ARGUMENT_OPTIONS",e[e.EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE=13]="EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE",e[e.INVALID_PLURAL_ARGUMENT_OFFSET_VALUE=14]="INVALID_PLURAL_ARGUMENT_OFFSET_VALUE",e[e.EXPECT_SELECT_ARGUMENT_SELECTOR=15]="EXPECT_SELECT_ARGUMENT_SELECTOR",e[e.EXPECT_PLURAL_ARGUMENT_SELECTOR=16]="EXPECT_PLURAL_ARGUMENT_SELECTOR",e[e.EXPECT_SELECT_ARGUMENT_SELECTOR_FRAGMENT=17]="EXPECT_SELECT_ARGUMENT_SELECTOR_FRAGMENT",e[e.EXPECT_PLURAL_ARGUMENT_SELECTOR_FRAGMENT=18]="EXPECT_PLURAL_ARGUMENT_SELECTOR_FRAGMENT",e[e.INVALID_PLURAL_ARGUMENT_SELECTOR=19]="INVALID_PLURAL_ARGUMENT_SELECTOR",e[e.DUPLICATE_PLURAL_ARGUMENT_SELECTOR=20]="DUPLICATE_PLURAL_ARGUMENT_SELECTOR",e[e.DUPLICATE_SELECT_ARGUMENT_SELECTOR=21]="DUPLICATE_SELECT_ARGUMENT_SELECTOR",e[e.MISSING_OTHER_CLAUSE=22]="MISSING_OTHER_CLAUSE",e[e.INVALID_TAG=23]="INVALID_TAG",e[e.INVALID_TAG_NAME=25]="INVALID_TAG_NAME",e[e.UNMATCHED_CLOSING_TAG=26]="UNMATCHED_CLOSING_TAG",e[e.UNCLOSED_TAG=27]="UNCLOSED_TAG",e}({});const ft=/[ \xA0\u1680\u2000-\u200A\u202F\u205F\u3000]/,mt={"001":["H","h"],419:["h","H","hB","hb"],AC:["H","h","hb","hB"],AD:["H","hB"],AE:["h","hB","hb","H"],AF:["H","hb","hB","h"],AG:["h","hb","H","hB"],AI:["H","h","hb","hB"],AL:["h","H","hB"],AM:["H","hB"],AO:["H","hB"],AR:["h","H","hB","hb"],AS:["h","H"],AT:["H","hB"],AU:["h","hb","H","hB"],AW:["H","hB"],AX:["H"],AZ:["H","hB","h"],BA:["H","hB","h"],BB:["h","hb","H","hB"],BD:["h","hB","H"],BE:["H","hB"],BF:["H","hB"],BG:["H","hB","h"],BH:["h","hB","hb","H"],BI:["H","h"],BJ:["H","hB"],BL:["H","hB"],BM:["h","hb","H","hB"],BN:["hb","hB","h","H"],BO:["h","H","hB","hb"],BQ:["H"],BR:["H","hB"],BS:["h","hb","H","hB"],BT:["h","H"],BW:["H","h","hb","hB"],BY:["H","h"],BZ:["H","h","hb","hB"],CA:["h","hb","H","hB"],CC:["H","h","hb","hB"],CD:["hB","H"],CF:["H","h","hB"],CG:["H","hB"],CH:["H","hB","h"],CI:["H","hB"],CK:["H","h","hb","hB"],CL:["h","H","hB","hb"],CM:["H","h","hB"],CN:["H","hB","hb","h"],CO:["h","H","hB","hb"],CP:["H"],CR:["h","H","hB","hb"],CU:["h","H","hB","hb"],CV:["H","hB"],CW:["H","hB"],CX:["H","h","hb","hB"],CY:["h","H","hb","hB"],CZ:["H"],DE:["H","hB"],DG:["H","h","hb","hB"],DJ:["h","H"],DK:["H"],DM:["h","hb","H","hB"],DO:["h","H","hB","hb"],DZ:["h","hB","hb","H"],EA:["H","h","hB","hb"],EC:["h","H","hB","hb"],EE:["H","hB"],EG:["h","hB","hb","H"],EH:["h","hB","hb","H"],ER:["h","H"],ES:["H","hB","h","hb"],ET:["hB","hb","h","H"],FI:["H"],FJ:["h","hb","H","hB"],FK:["H","h","hb","hB"],FM:["h","hb","H","hB"],FO:["H","h"],FR:["H","hB"],GA:["H","hB"],GB:["H","h","hb","hB"],GD:["h","hb","H","hB"],GE:["H","hB","h"],GF:["H","hB"],GG:["H","h","hb","hB"],GH:["h","H"],GI:["H","h","hb","hB"],GL:["H","h"],GM:["h","hb","H","hB"],GN:["H","hB"],GP:["H","hB"],GQ:["H","hB","h","hb"],GR:["h","H","hb","hB"],GS:["H","h","hb","hB"],GT:["h","H","hB","hb"],GU:["h","hb","H","hB"],GW:["H","hB"],GY:["h","hb","H","hB"],HK:["h","hB","hb","H"],HN:["h","H","hB","hb"],HR:["H","hB"],HU:["H","h"],IC:["H","h","hB","hb"],ID:["H"],IE:["H","h","hb","hB"],IL:["H","hB"],IM:["H","h","hb","hB"],IN:["h","H"],IO:["H","h","hb","hB"],IQ:["h","hB","hb","H"],IR:["hB","H"],IS:["H"],IT:["H","hB"],JE:["H","h","hb","hB"],JM:["h","hb","H","hB"],JO:["h","hB","hb","H"],JP:["H","K","h"],KE:["hB","hb","H","h"],KG:["H","h","hB","hb"],KH:["hB","h","H","hb"],KI:["h","hb","H","hB"],KM:["H","h","hB","hb"],KN:["h","hb","H","hB"],KP:["h","H","hB","hb"],KR:["h","H","hB","hb"],KW:["h","hB","hb","H"],KY:["h","hb","H","hB"],KZ:["H","hB"],LA:["H","hb","hB","h"],LB:["h","hB","hb","H"],LC:["h","hb","H","hB"],LI:["H","hB","h"],LK:["H","h","hB","hb"],LR:["h","hb","H","hB"],LS:["h","H"],LT:["H","h","hb","hB"],LU:["H","h","hB"],LV:["H","hB","hb","h"],LY:["h","hB","hb","H"],MA:["H","h","hB","hb"],MC:["H","hB"],MD:["H","hB"],ME:["H","hB","h"],MF:["H","hB"],MG:["H","h"],MH:["h","hb","H","hB"],MK:["H","h","hb","hB"],ML:["H"],MM:["hB","hb","H","h"],MN:["H","h","hb","hB"],MO:["h","hB","hb","H"],MP:["h","hb","H","hB"],MQ:["H","hB"],MR:["h","hB","hb","H"],MS:["H","h","hb","hB"],MT:["H","h"],MU:["H","h"],MV:["H","h"],MW:["h","hb","H","hB"],MX:["h","H","hB","hb"],MY:["hb","hB","h","H"],MZ:["H","hB"],NA:["h","H","hB","hb"],NC:["H","hB"],NE:["H"],NF:["H","h","hb","hB"],NG:["H","h","hb","hB"],NI:["h","H","hB","hb"],NL:["H","hB"],NO:["H","h"],NP:["H","h","hB"],NR:["H","h","hb","hB"],NU:["H","h","hb","hB"],NZ:["h","hb","H","hB"],OM:["h","hB","hb","H"],PA:["h","H","hB","hb"],PE:["h","H","hB","hb"],PF:["H","h","hB"],PG:["h","H"],PH:["h","hB","hb","H"],PK:["h","hB","H"],PL:["H","h"],PM:["H","hB"],PN:["H","h","hb","hB"],PR:["h","H","hB","hb"],PS:["h","hB","hb","H"],PT:["H","hB"],PW:["h","H"],PY:["h","H","hB","hb"],QA:["h","hB","hb","H"],RE:["H","hB"],RO:["H","hB"],RS:["H","hB","h"],RU:["H"],RW:["H","h"],SA:["h","hB","hb","H"],SB:["h","hb","H","hB"],SC:["H","h","hB"],SD:["h","hB","hb","H"],SE:["H"],SG:["h","hb","H","hB"],SH:["H","h","hb","hB"],SI:["H","hB"],SJ:["H"],SK:["H"],SL:["h","hb","H","hB"],SM:["H","h","hB"],SN:["H","h","hB"],SO:["h","H"],SR:["H","hB"],SS:["h","hb","H","hB"],ST:["H","hB"],SV:["h","H","hB","hb"],SX:["H","h","hb","hB"],SY:["h","hB","hb","H"],SZ:["h","hb","H","hB"],TA:["H","h","hb","hB"],TC:["h","hb","H","hB"],TD:["h","H","hB"],TF:["H","h","hB"],TG:["H","hB"],TH:["H","h"],TJ:["H","h"],TL:["H","hB","hb","h"],TM:["H","h"],TN:["h","hB","hb","H"],TO:["h","H"],TR:["H","hB"],TT:["h","hb","H","hB"],TW:["hB","hb","h","H"],TZ:["hB","hb","H","h"],UA:["H","hB","h"],UG:["hB","hb","H","h"],UM:["h","hb","H","hB"],US:["h","hb","H","hB"],UY:["h","H","hB","hb"],UZ:["H","hB","h"],VA:["H","h","hB"],VC:["h","hb","H","hB"],VE:["h","H","hB","hb"],VG:["h","hb","H","hB"],VI:["h","hb","H","hB"],VN:["H","h"],VU:["h","H"],WF:["H","hB"],WS:["h","H"],XK:["H","hB","h"],YE:["h","hB","hb","H"],YT:["H","hB"],ZA:["H","h","hb","hB"],ZM:["h","hb","H","hB"],ZW:["H","h"],"af-ZA":["H","h","hB","hb"],"ar-001":["h","hB","hb","H"],"ca-ES":["H","h","hB"],"en-001":["h","hb","H","hB"],"en-HK":["h","hb","H","hB"],"en-IL":["H","h","hb","hB"],"en-MY":["h","hb","H","hB"],"es-BR":["H","h","hB","hb"],"es-ES":["H","h","hB","hb"],"es-GQ":["H","h","hB","hb"],"fr-CA":["H","h","hB"],"gl-ES":["H","h","hB"],"gu-IN":["hB","hb","h","H"],"hi-IN":["hB","h","H"],"it-CH":["H","h","hB"],"it-IT":["H","h","hB"],"kn-IN":["hB","h","H"],"ku-SY":["H","hB"],"ml-IN":["hB","h","H"],"mr-IN":["hB","hb","h","H"],"pa-IN":["hB","hb","h","H"],"ta-IN":["hB","h","hb","H"],"te-IN":["hB","h","H"],"zu-ZA":["H","hB","hb","h"]};function wt(e){let t=e.hourCycle;if(void 0===t&&e.hourCycles&&e.hourCycles.length&&(t=e.hourCycles[0]),t)switch(t){case"h24":return"k";case"h23":return"H";case"h12":return"h";case"h11":return"K";default:throw new Error("Invalid hourCycle")}const i=e.language;let s;"root"!==i&&(s=e.maximize().region);return(mt[s||""]||mt[i||""]||mt[`${i}-001`]||mt["001"])[0]}const vt=new RegExp(`^${ft.source}*`),bt=new RegExp(`${ft.source}*$`);function Et(e,t){return{start:e,end:t}}const yt=!!Object.fromEntries,Ct=!!String.prototype.trimStart,xt=!!String.prototype.trimEnd,Bt=yt?Object.fromEntries:function(e){const t={};for(const[i,s]of e)t[i]=s;return t},St=Ct?function(e){return e.trimStart()}:function(e){return e.replace(vt,"")},It=xt?function(e){return e.trimEnd()}:function(e){return e.replace(bt,"")},Dt=new RegExp("([^\\p{White_Space}\\p{Pattern_Syntax}]*)","yu");class Rt{message;position;locale;ignoreTag;requiresOtherClause;shouldParseSkeletons;constructor(e,t={}){this.message=e,this.position={offset:0,line:1,column:1},this.ignoreTag=!!t.ignoreTag,this.locale=t.locale,this.requiresOtherClause=!!t.requiresOtherClause,this.shouldParseSkeletons=!!t.shouldParseSkeletons}parse(){if(0!==this.offset())throw Error("parser can only be used once");return this.parseMessage(0,"",!1)}parseMessage(e,t,i){let s=[];for(;!this.isEOF();){const r=this.char();if(123===r){const t=this.parseArgument(e,i);if(t.err)return t;s.push(t.val)}else{if(125===r&&e>0)break;if(35!==r||"plural"!==t&&"selectordinal"!==t){if(60===r&&!this.ignoreTag&&47===this.peek()){if(i)break;return this.error(_t.UNMATCHED_CLOSING_TAG,Et(this.clonePosition(),this.clonePosition()))}if(60===r&&!this.ignoreTag&&Mt(this.peek()||0)){const i=this.parseTag(e,t);if(i.err)return i;s.push(i.val)}else{const i=this.parseLiteral(e,t);if(i.err)return i;s.push(i.val)}}else{const e=this.clonePosition();this.bump(),s.push({type:st.pound,location:Et(e,this.clonePosition())})}}}return{val:s,err:null}}parseTag(e,t){const i=this.clonePosition();this.bump();const s=this.parseTagName();if(this.bumpSpace(),this.bumpIf("/>"))return{val:{type:st.literal,value:`<${s}/>`,location:Et(i,this.clonePosition())},err:null};if(this.bumpIf(">")){const r=this.parseMessage(e+1,t,!0);if(r.err)return r;const o=r.val,a=this.clonePosition();if(this.bumpIf("</")){if(this.isEOF()||!Mt(this.char()))return this.error(_t.INVALID_TAG,Et(a,this.clonePosition()));const e=this.clonePosition();return s!==this.parseTagName()?this.error(_t.UNMATCHED_CLOSING_TAG,Et(e,this.clonePosition())):(this.bumpSpace(),this.bumpIf(">")?{val:{type:st.tag,value:s,children:o,location:Et(i,this.clonePosition())},err:null}:this.error(_t.INVALID_TAG,Et(a,this.clonePosition())))}return this.error(_t.UNCLOSED_TAG,Et(i,this.clonePosition()))}return this.error(_t.INVALID_TAG,Et(i,this.clonePosition()))}parseTagName(){const e=this.offset();for(this.bump();!this.isEOF()&&kt(this.char());)this.bump();return this.message.slice(e,this.offset())}parseLiteral(e,t){const i=this.clonePosition();let s="";for(;;){const i=this.tryParseQuote(t);if(i){s+=i;continue}const r=this.tryParseUnquoted(e,t);if(r){s+=r;continue}const o=this.tryParseLeftAngleBracket();if(!o)break;s+=o}const r=Et(i,this.clonePosition());return{val:{type:st.literal,value:s,location:r},err:null}}tryParseLeftAngleBracket(){return this.isEOF()||60!==this.char()||!this.ignoreTag&&(Mt(e=this.peek()||0)||47===e)?null:(this.bump(),"<");var e}tryParseQuote(e){if(this.isEOF()||39!==this.char())return null;switch(this.peek()){case 39:return this.bump(),this.bump(),"'";case 123:case 60:case 62:case 125:break;case 35:if("plural"===e||"selectordinal"===e)break;return null;default:return null}this.bump();const t=[this.char()];for(this.bump();!this.isEOF();){const e=this.char();if(39===e){if(39!==this.peek()){this.bump();break}t.push(39),this.bump()}else t.push(e);this.bump()}return String.fromCodePoint(...t)}tryParseUnquoted(e,t){if(this.isEOF())return null;const i=this.char();return 60===i||123===i||35===i&&("plural"===t||"selectordinal"===t)||125===i&&e>0?null:(this.bump(),String.fromCodePoint(i))}parseArgument(e,t){const i=this.clonePosition();if(this.bump(),this.bumpSpace(),this.isEOF())return this.error(_t.EXPECT_ARGUMENT_CLOSING_BRACE,Et(i,this.clonePosition()));if(125===this.char())return this.bump(),this.error(_t.EMPTY_ARGUMENT,Et(i,this.clonePosition()));let s=this.parseIdentifierIfPossible().value;if(!s)return this.error(_t.MALFORMED_ARGUMENT,Et(i,this.clonePosition()));if(this.bumpSpace(),this.isEOF())return this.error(_t.EXPECT_ARGUMENT_CLOSING_BRACE,Et(i,this.clonePosition()));switch(this.char()){case 125:return this.bump(),{val:{type:st.argument,value:s,location:Et(i,this.clonePosition())},err:null};case 44:return this.bump(),this.bumpSpace(),this.isEOF()?this.error(_t.EXPECT_ARGUMENT_CLOSING_BRACE,Et(i,this.clonePosition())):this.parseArgumentOptions(e,t,s,i);default:return this.error(_t.MALFORMED_ARGUMENT,Et(i,this.clonePosition()))}}parseIdentifierIfPossible(){const e=this.clonePosition(),t=this.offset(),i=function(e,t){return Dt.lastIndex=t,Dt.exec(e)[1]??""}(this.message,t),s=t+i.length;this.bumpTo(s);return{value:i,location:Et(e,this.clonePosition())}}parseArgumentOptions(e,t,i,s){let r=this.clonePosition(),o=this.parseIdentifierIfPossible().value,a=this.clonePosition();switch(o){case"":return this.error(_t.EXPECT_ARGUMENT_TYPE,Et(r,a));case"number":case"date":case"time":{this.bumpSpace();let e=null;if(this.bumpIf(",")){this.bumpSpace();const t=this.clonePosition(),i=this.parseSimpleArgStyleIfPossible();if(i.err)return i;const s=It(i.val);if(0===s.length)return this.error(_t.EXPECT_ARGUMENT_STYLE,Et(this.clonePosition(),this.clonePosition()));e={style:s,styleLocation:Et(t,this.clonePosition())}}const t=this.tryParseArgumentClose(s);if(t.err)return t;const r=Et(s,this.clonePosition());if(e&&e.style.startsWith("::")){let t=St(e.style.slice(2));if("number"===o){const s=this.parseNumberSkeletonFromString(t,e.styleLocation);return s.err?s:{val:{type:st.number,value:i,location:r,style:s.val},err:null}}{if(0===t.length)return this.error(_t.EXPECT_DATE_TIME_SKELETON,r);let s=t;this.locale&&(s=function(e,t){let i="";for(let s=0;s<e.length;s++){const r=e.charAt(s);if("j"===r){let o=0;for(;s+1<e.length&&e.charAt(s+1)===r;)o++,s++;let a=1+(1&o),n=o<2?1:3+(o>>1),l="a",c=wt(t);for("H"!=c&&"k"!=c||(n=0);n-- >0;)i+=l;for(;a-- >0;)i=c+i}else i+="J"===r?"H":r}return i}(t,this.locale));const a={type:rt.dateTime,pattern:s,location:e.styleLocation,parsedOptions:this.shouldParseSkeletons?Ye(s):{}};return{val:{type:"date"===o?st.date:st.time,value:i,location:r,style:a},err:null}}}return{val:{type:"number"===o?st.number:"date"===o?st.date:st.time,value:i,location:r,style:e?.style??null},err:null}}case"plural":case"selectordinal":case"select":{const r=this.clonePosition();if(this.bumpSpace(),!this.bumpIf(","))return this.error(_t.EXPECT_SELECT_ARGUMENT_OPTIONS,Et(r,{...r}));this.bumpSpace();let a=this.parseIdentifierIfPossible(),n=0;if("select"!==o&&"offset"===a.value){if(!this.bumpIf(":"))return this.error(_t.EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE,Et(this.clonePosition(),this.clonePosition()));this.bumpSpace();const e=this.tryParseDecimalInteger(_t.EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE,_t.INVALID_PLURAL_ARGUMENT_OFFSET_VALUE);if(e.err)return e;this.bumpSpace(),a=this.parseIdentifierIfPossible(),n=e.val}const l=this.tryParsePluralOrSelectOptions(e,o,t,a);if(l.err)return l;const c=this.tryParseArgumentClose(s);if(c.err)return c;const h=Et(s,this.clonePosition());return"select"===o?{val:{type:st.select,value:i,options:Bt(l.val),location:h},err:null}:{val:{type:st.plural,value:i,options:Bt(l.val),offset:n,pluralType:"plural"===o?"cardinal":"ordinal",location:h},err:null}}default:return this.error(_t.INVALID_ARGUMENT_TYPE,Et(r,a))}}tryParseArgumentClose(e){return this.isEOF()||125!==this.char()?this.error(_t.EXPECT_ARGUMENT_CLOSING_BRACE,Et(e,this.clonePosition())):(this.bump(),{val:!0,err:null})}parseSimpleArgStyleIfPossible(){let e=0;const t=this.clonePosition();for(;!this.isEOF();){switch(this.char()){case 39:{this.bump();let e=this.clonePosition();if(!this.bumpUntil("'"))return this.error(_t.UNCLOSED_QUOTE_IN_ARGUMENT_STYLE,Et(e,this.clonePosition()));this.bump();break}case 123:e+=1,this.bump();break;case 125:if(!(e>0))return{val:this.message.slice(t.offset,this.offset()),err:null};e-=1;break;default:this.bump()}}return{val:this.message.slice(t.offset,this.offset()),err:null}}parseNumberSkeletonFromString(e,t){let i=[];try{i=function(e){if(0===e.length)throw new Error("Number skeleton cannot be empty");const t=e.split(Ke).filter(e=>e.length>0),i=[];for(const e of t){let t=e.split("/");if(0===t.length)throw new Error("Invalid number skeleton");const[s,...r]=t;for(const e of r)if(0===e.length)throw new Error("Invalid number skeleton");i.push({stem:s,options:r})}return i}(e)}catch{return this.error(_t.INVALID_NUMBER_SKELETON,t)}return{val:{type:rt.number,tokens:i,location:t,parsedOptions:this.shouldParseSkeletons?it(i):{}},err:null}}tryParsePluralOrSelectOptions(e,t,i,s){let r=!1;const o=[],a=new Set;let{value:n,location:l}=s;for(;;){if(0===n.length){const e=this.clonePosition();if("select"===t||!this.bumpIf("="))break;{const t=this.tryParseDecimalInteger(_t.EXPECT_PLURAL_ARGUMENT_SELECTOR,_t.INVALID_PLURAL_ARGUMENT_SELECTOR);if(t.err)return t;l=Et(e,this.clonePosition()),n=this.message.slice(e.offset,this.offset())}}if(a.has(n))return this.error("select"===t?_t.DUPLICATE_SELECT_ARGUMENT_SELECTOR:_t.DUPLICATE_PLURAL_ARGUMENT_SELECTOR,l);"other"===n&&(r=!0),this.bumpSpace();const s=this.clonePosition();if(!this.bumpIf("{"))return this.error("select"===t?_t.EXPECT_SELECT_ARGUMENT_SELECTOR_FRAGMENT:_t.EXPECT_PLURAL_ARGUMENT_SELECTOR_FRAGMENT,Et(this.clonePosition(),this.clonePosition()));const c=this.parseMessage(e+1,t,i);if(c.err)return c;const h=this.tryParseArgumentClose(s);if(h.err)return h;o.push([n,{value:c.val,location:Et(s,this.clonePosition())}]),a.add(n),this.bumpSpace(),({value:n,location:l}=this.parseIdentifierIfPossible())}return 0===o.length?this.error("select"===t?_t.EXPECT_SELECT_ARGUMENT_SELECTOR:_t.EXPECT_PLURAL_ARGUMENT_SELECTOR,Et(this.clonePosition(),this.clonePosition())):this.requiresOtherClause&&!r?this.error(_t.MISSING_OTHER_CLAUSE,Et(this.clonePosition(),this.clonePosition())):{val:o,err:null}}tryParseDecimalInteger(e,t){let i=1;const s=this.clonePosition();this.bumpIf("+")||this.bumpIf("-")&&(i=-1);let r=!1,o=0;for(;!this.isEOF();){const e=this.char();if(!(e>=48&&e<=57))break;r=!0,o=10*o+(e-48),this.bump()}const a=Et(s,this.clonePosition());return r?(o*=i,Number.isSafeInteger(o)?{val:o,err:null}:this.error(t,a)):this.error(e,a)}offset(){return this.position.offset}isEOF(){return this.offset()===this.message.length}clonePosition(){return{offset:this.position.offset,line:this.position.line,column:this.position.column}}char(){const e=this.position.offset;if(e>=this.message.length)throw Error("out of bound");const t=this.message.codePointAt(e);if(void 0===t)throw Error(`Offset ${e} is at invalid UTF-16 code unit boundary`);return t}error(e,t){return{val:null,err:{kind:e,message:this.message,location:t}}}bump(){if(this.isEOF())return;const e=this.char();10===e?(this.position.line+=1,this.position.column=1,this.position.offset+=1):(this.position.column+=1,this.position.offset+=e<65536?1:2)}bumpIf(e){if(this.message.startsWith(e,this.offset())){for(let t=0;t<e.length;t++)this.bump();return!0}return!1}bumpUntil(e){const t=this.offset(),i=this.message.indexOf(e,t);return i>=0?(this.bumpTo(i),!0):(this.bumpTo(this.message.length),!1)}bumpTo(e){if(this.offset()>e)throw Error(`targetOffset ${e} must be greater than or equal to the current offset ${this.offset()}`);for(e=Math.min(e,this.message.length);;){const t=this.offset();if(t===e)break;if(t>e)throw Error(`targetOffset ${e} is at invalid UTF-16 code unit boundary`);if(this.bump(),this.isEOF())break}}bumpSpace(){for(;!this.isEOF()&&Tt(this.char());)this.bump()}peek(){if(this.isEOF())return null;const e=this.char(),t=this.offset();return this.message.charCodeAt(t+(e>=65536?2:1))??null}}function Mt(e){return e>=97&&e<=122||e>=65&&e<=90}function kt(e){return 45===e||46===e||e>=48&&e<=57||95===e||e>=97&&e<=122||e>=65&&e<=90||183==e||e>=192&&e<=214||e>=216&&e<=246||e>=248&&e<=893||e>=895&&e<=8191||e>=8204&&e<=8205||e>=8255&&e<=8256||e>=8304&&e<=8591||e>=11264&&e<=12271||e>=12289&&e<=55295||e>=63744&&e<=64975||e>=65008&&e<=65533||e>=65536&&e<=983039}function Tt(e){return e>=9&&e<=13||32===e||133===e||e>=8206&&e<=8207||8232===e||8233===e}function Ft(e){e.forEach(e=>{if(delete e.location,ht(e)||dt(e))for(const t in e.options)delete e.options[t].location,Ft(e.options[t].value);else nt(e)&&gt(e.style)||(lt(e)||ct(e))&&At(e.style)?delete e.style.location:ut(e)&&Ft(e.children)})}function Pt(e,t={}){t={shouldParseSkeletons:!0,requiresOtherClause:!0,...t};const i=new Rt(e,t).parse();if(i.err){const e=SyntaxError(_t[i.err.kind]);throw e.location=i.err.location,e.originalMessage=i.err.message,e}return t?.captureLocation||Ft(i.val),i.val}let zt=function(e){return e.MISSING_VALUE="MISSING_VALUE",e.INVALID_VALUE="INVALID_VALUE",e.MISSING_INTL_API="MISSING_INTL_API",e}({});class Ut extends Error{code;originalMessage;constructor(e,t,i){super(e),this.code=t,this.originalMessage=i}toString(){return`[formatjs Error: ${this.code}] ${this.message}`}}class Ot extends Ut{constructor(e,t,i,s){super(`Invalid values for "${e}": "${t}". Options are "${Object.keys(i).join('", "')}"`,zt.INVALID_VALUE,s)}}class Ht extends Ut{constructor(e,t,i){super(`Value for "${e}" must be of type ${t}`,zt.INVALID_VALUE,i)}}class Qt extends Ut{constructor(e,t){super(`The intl string context variable "${e}" was not provided to the string "${t}"`,zt.MISSING_VALUE,t)}}let Gt=function(e){return e[e.literal=0]="literal",e[e.object=1]="object",e}({});function Lt(e){return"function"==typeof e}function $t(e,t,i,s,r,o,a){if(1===e.length&&ot(e[0]))return[{type:Gt.literal,value:e[0].value}];const n=[];for(const l of e){if(ot(l)){n.push({type:Gt.literal,value:l.value});continue}if(pt(l)){"number"==typeof o&&n.push({type:Gt.literal,value:i.getNumberFormat(t).format(o)});continue}const{value:e}=l;if(!r||!(e in r))throw new Qt(e,a);let c=r[e];if(at(l))c&&"string"!=typeof c&&"number"!=typeof c&&"bigint"!=typeof c||(c="string"==typeof c||"number"==typeof c||"bigint"==typeof c?String(c):""),n.push({type:"string"==typeof c?Gt.literal:Gt.object,value:c});else{if(lt(l)){const e="string"==typeof l.style?s.date[l.style]:At(l.style)?l.style.parsedOptions:void 0;n.push({type:Gt.literal,value:i.getDateTimeFormat(t,e).format(c)});continue}if(ct(l)){const e="string"==typeof l.style?s.time[l.style]:At(l.style)?l.style.parsedOptions:s.time.medium;n.push({type:Gt.literal,value:i.getDateTimeFormat(t,e).format(c)});continue}if(nt(l)){const e="string"==typeof l.style?s.number[l.style]:gt(l.style)?l.style.parsedOptions:void 0;if(e&&e.scale){const t=e.scale||1;if("bigint"==typeof c){if(!Number.isInteger(t))throw new TypeError(`Cannot apply fractional scale ${t} to bigint value. Scale must be an integer when formatting bigint.`);c*=BigInt(t)}else c*=t}n.push({type:Gt.literal,value:i.getNumberFormat(t,e).format(c)});continue}if(ut(l)){const{children:e,value:c}=l,h=r[c];if(!Lt(h))throw new Ht(c,"function",a);let d=h($t(e,t,i,s,r,o).map(e=>e.value));Array.isArray(d)||(d=[d]),n.push(...d.map(e=>({type:"string"==typeof e?Gt.literal:Gt.object,value:e})))}if(ht(l)){const e=c,o=(Object.prototype.hasOwnProperty.call(l.options,e)?l.options[e]:void 0)||l.options.other;if(!o)throw new Ot(l.value,c,Object.keys(l.options),a);n.push(...$t(o.value,t,i,s,r));continue}if(dt(l)){const e=`=${c}`;let o=Object.prototype.hasOwnProperty.call(l.options,e)?l.options[e]:void 0;if(!o){if(!Intl.PluralRules)throw new Ut('Intl.PluralRules is not available in this environment.\nTry polyfilling it using "@formatjs/intl-pluralrules"\n',zt.MISSING_INTL_API,a);const e="bigint"==typeof c?Number(c):c,s=i.getPluralRules(t,{type:l.pluralType}).select(e-(l.offset||0));o=(Object.prototype.hasOwnProperty.call(l.options,s)?l.options[s]:void 0)||l.options.other}if(!o)throw new Ot(l.value,c,Object.keys(l.options),a);const h="bigint"==typeof c?Number(c):c;n.push(...$t(o.value,t,i,s,r,h-(l.offset||0)));continue}}}return(l=n).length<2?l:l.reduce((e,t)=>{const i=e[e.length-1];return i&&i.type===Gt.literal&&t.type===Gt.literal?i.value+=t.value:e.push(t),e},[]);var l}function Nt(e,t){return t?Object.keys(e).reduce((i,s)=>{var r,o;return i[s]=(r=e[s],(o=t[s])?{...r,...o,...Object.keys(r).reduce((e,t)=>(e[t]={...r[t],...o[t]},e),{})}:r),i},{...e}):e}function Yt(e){return{create:()=>({get:t=>e[t],set(t,i){e[t]=i}})}}class Kt{ast;locales;resolvedLocale;formatters;formats;message;formatterCache={number:{},dateTime:{},pluralRules:{}};constructor(e,t=Kt.defaultLocale,i,s){if(this.locales=t,this.resolvedLocale=Kt.resolveLocale(t),"string"==typeof e){if(this.message=e,!Kt.__parse)throw new TypeError("IntlMessageFormat.__parse must be set to process `message` of type `string`");const{...t}=s||{};this.ast=Kt.__parse(e,{...t,locale:this.resolvedLocale})}else this.ast=e;if(!Array.isArray(this.ast))throw new TypeError("A message must be provided as a String or AST.");this.formats=Nt(Kt.formats,i),this.formatters=s&&s.formatters||function(e={number:{},dateTime:{},pluralRules:{}}){return{getNumberFormat:Pe((...e)=>new Intl.NumberFormat(...e),{cache:Yt(e.number),strategy:$e.variadic}),getDateTimeFormat:Pe((...e)=>new Intl.DateTimeFormat(...e),{cache:Yt(e.dateTime),strategy:$e.variadic}),getPluralRules:Pe((...e)=>new Intl.PluralRules(...e),{cache:Yt(e.pluralRules),strategy:$e.variadic})}}(this.formatterCache)}format=e=>{const t=this.formatToParts(e);if(1===t.length)return t[0].value;const i=t.reduce((e,t)=>(e.length&&t.type===Gt.literal&&"string"==typeof e[e.length-1]?e[e.length-1]+=t.value:e.push(t.value),e),[]);return i.length<=1?i[0]||"":i};formatToParts=e=>$t(this.ast,this.locales,this.formatters,this.formats,e,void 0,this.message);resolvedOptions=()=>({locale:this.resolvedLocale?.toString()||Intl.NumberFormat.supportedLocalesOf(this.locales)[0]});getAst=()=>this.ast;static memoizedDefaultLocale=null;static get defaultLocale(){return Kt.memoizedDefaultLocale||(Kt.memoizedDefaultLocale=(new Intl.NumberFormat).resolvedOptions().locale),Kt.memoizedDefaultLocale}static resolveLocale=e=>{if(void 0===Intl.Locale)return;const t=Intl.NumberFormat.supportedLocalesOf(e);return t.length>0?new Intl.Locale(t[0]):new Intl.Locale("string"==typeof e?e:e[0])};static __parse=Pt;static formats={number:{integer:{maximumFractionDigits:0},currency:{style:"currency"},percent:{style:"percent"}},date:{short:{month:"numeric",day:"numeric",year:"2-digit"},medium:{month:"short",day:"numeric",year:"numeric"},long:{month:"long",day:"numeric",year:"numeric"},full:{weekday:"long",month:"long",day:"numeric",year:"numeric"}},time:{short:{hour:"numeric",minute:"numeric"},medium:{hour:"numeric",minute:"numeric",second:"numeric"},long:{hour:"numeric",minute:"numeric",second:"numeric",timeZoneName:"short"},full:{hour:"numeric",minute:"numeric",second:"numeric",timeZoneName:"short"}}}}const Wt={en:{common:{save:"Save",saving:"Saving...",cancel:"Cancel",delete:"Delete",close:"Close",add:"Add",discard:"Discard",loading:"Loading..."},grid:{heatmap_toggle:"Heatmap",heatmap_needs_firmware:"Heatmap needs firmware 1.3.0 or newer.",heatmap_no_memory:"Heatmap is unavailable on this device — not enough memory."},furniture:{armchair:"Armchair",bath:"Bath",bedside_table:"Bedside table",bidet:"Bidet",car:"Car",carpet:"Carpet",cat_bed:"Cat bed",cabinet:"Cabinet",ceiling_fan:"Ceiling fan",counter:"Counter",cupboard:"Cupboard",desk:"Desk",dog_bed:"Dog bed",dining_table:"Dining table",door_left_swing:"Door (left swing)",door_right_swing:"Door (right swing)",double_bed:"Double bed",fridge:"Fridge",hot_tub:"Hot tub",kitchen_island:"Kitchen island",lamp:"Lamp",oven_stove:"Oven / stove",plant:"Plant",pool:"Pool",round_table:"Round table",shower:"Shower",side_table:"Side table",single_bed:"Single bed",sliding_door:"Sliding door",sofa_2_seat:"Sofa (2 seat)",sofa_3_seat:"Sofa (3 seat)",speaker:"Speaker",tv:"TV",washbasin:"Wash basin",washing_machine:"Washing machine",toilet:"Toilet",window:"Window",custom_icon:"Custom icon",custom:"Custom",search_placeholder:"Search furniture...",remove:"Remove"},text_label:{label:"Text label",add:"Add text label",default_text:"Label",text:"Text",font:"Font",size_cm:"Size (cm)",bold:"Bold",italic:"Italic",align:"Alignment",align_left:"Align left",align_center:"Align centre",align_right:"Align right",text_color:"Text colour",auto_color:"Auto",background:"Background",no_background:"None",remove:"Remove label"},corners:{front_left:"Front-left",front_right:"Front-right",back_right:"Back-right",back_left:"Back-left",left_wall:"left wall",right_wall:"right wall",front_wall:"front wall",back_wall:"back wall"},wizard:{how_calibration_works:"How room calibration works",calibrate_room_size:"Calibrate room size",begin_marking:"Start calibration",mark_corner:"Mark {corner}",recording:"Recording... {current}s / {total}s",paused:"Paused — need exactly one target visible",stand_still:"Stand still",no_target:"No target detected. Make sure you are visible to the sensor.",multiple_targets:"Multiple targets detected. Only one person should be in the room during calibration.",save_prompt:"Click Save to store this room's calibration, or click a corner above to re-mark it.",save_failed:"Saving the calibration failed. Check that the device is online and try again.",invalid_corners:"The marked corners don't form a valid room shape. Re-mark the corners and try again.",walk_instruction_full:"<strong>Walk to each corner</strong> in order (1 → 2 → 3 → 4) and click Mark. Stand still for a few seconds so the sensor can lock on.",cant_reach:"<strong>Can't reach a corner?</strong> Stand as close as you can and enter the distance from each wall in the offset fields — like corner 4 in the diagram above, where a plant is in the way.",corner_sensor_hint:"In this example, your sensor is mounted in Corner 2, but it can be anywhere. You can stand right in front of it.",walk_instruction:"Walk to each corner of the room and click Mark. The sensor will record your position over {duration} seconds.",corner_step:"Corner {index}/4: Walk to the {corner}",distance_from:"Distance from:",distance_from_side:"{wall} (cm)",front_wall_label:"Front wall (sensor side)",back_wall_label:"Back wall",sensor:"Sensor",no_presence:"No presence",dont_show_again:"Don't show this again"},dialogs:{delete_calibration_title:"Delete room calibration?",delete_calibration_body:"This will also delete all detection zones and furniture. This cannot be undone.",unsaved_changes:"You have unsaved changes",unsaved_changes_body:"Your changes will be lost if you navigate away without applying.",backup_configuration:"Backup configuration",restore_configuration:"Restore configuration",no_configurations:"No saved configurations.",configuration_name:"Configuration name"},menu:{settings:"Settings",room_calibration:"Calibrate room size",delete_calibration:"Delete room calibration",detection_zones:"Detection zones",furniture:"Furniture",overlays:"Overlays"},settings:{title:"Settings",detection_ranges:"Detection Ranges",sensor_calibration:"Sensor Calibration",entities:"Entities",target_sensor:"Target Sensor",stuck_target_timeout:"Stuck target timeout",assisted_clear:"Sensor-assisted clear",assisted_clear_enabled:"Enabled",assisted_clear_timeout:"Clear delay",static_sensor:"Static Sensor",motion_sensor:"Motion Sensor",environmental:"Environmental",auto:"Auto",max_distance:"Max distance",min_distance:"Min distance",presence_timeout:"Presence timeout",trigger_threshold:"Trigger threshold",renew_threshold:"Renew threshold",illuminance_offset:"Illuminance offset",humidity_offset:"Humidity offset",temperature_offset:"Temperature offset",presence_delay:"Presence delay",furthest_point:"Current furthest point from sensor:",logging:"Logging",log_system:"System",log_epp:"Zone Engine",log_led:"LED",log_networking:"Network",log_ble:"Bluetooth",log_co2:"CO2",led_and_relay:"LED and Relay",led:"LED",led_mode:"Mode",led_brightness:"Brightness",led_presence_color:"Occupancy color",manual_control:"Manual Control",presence:"Occupancy",environmental_presence:"Environmental + Occupancy",relay:"Relay",relay_trigger_mode:"Trigger Mode",relay_contact_mode:"Contact Mode",relay_disabled:"Disabled",relay_motion:"Motion Only",relay_presence:"Presence Only",relay_occupancy:"Occupancy",relay_normally_open:"Normally Open (NO)",relay_normally_closed:"Normally Closed (NC)",update_rate:"Update rate",reset_to_default:"Reset to default",show_info:"Show info",frequency:{"5hz":"5 Hz","2hz":"2 Hz","1hz":"1 Hz","0_5hz":"0.5 Hz"},log_level:{none:"None",error:"Error",warning:"Warning",info:"Info",debug:"Debug"}},sidebar:{detection_zones:"Detection zones",live_overview:"Live overview",add_zone:"Add zone",rest_of_room:"Rest of room",room:"Room"},zones:{type:"Type",default:"Default",bed:"Bed",seating:"Seating",transit:"Transit",custom:"Custom",trigger:"Trigger",renew:"Renew",presence_timeout:"Presence timeout",handoff_timeout:"Handoff timeout",seconds_suffix:"s",remove_zone:"Remove zone"},color:{choose:"Choose colour",custom:"Custom colour…",in_use:"Used by another zone",preset:"Colour {n}"},overlays:{entry_exit:"Entry / Exit",interference:"Interference",suppress:"Suppress",click_to_paint:"Click to paint"},live:{presence:"Presence",detected:"Detected",clear:"Clear",environment:"Environment",occupancy:"Occupancy",static_presence:"Static presence",motion_presence:"Motion presence",target_presence:"Target presence",mmwave:"mmWave",delete_target:"Delete target",mark_interference:"Mark as interference source",suppress_detection:"Suppress detection",grid_dimensions:"{width, number, ::.0}m × {depth, number, ::.0}m · Furthest point: {furthest, number, ::.0}m",illuminance_value:"{value, number, ::.0} lux",temperature_value:"{value, number, ::.0} °C",humidity_value:"{value, number, ::.0} %",co2_value:"{value, number} ppm",debug:{detection_events:"Detection events",copy_all:"Copy all",clear:"Clear",waiting_for_events:"Waiting for events...",static:"Static",motion:"Motion",occ:"Occ",on:"on",off:"off",active:"active",pending:"pending",inactive:"inactive",occupied:"occupied",room:"Room",no_targets:"no targets",all_clear:"all clear",zone_n:"Zone {n}",target_n:"Target {n}"},events:{static_active:"Static presence detected",static_fading:"Static presence fading…",static_cleared:"Static presence cleared",motion_active:"Motion presence detected",motion_fading:"Motion presence fading…",motion_cleared:"Motion presence cleared",zone_occupied:"{zone} occupied",zone_clearing:"{zone} clearing…",zone_cleared:"{zone} cleared",zone_cleared_handoff:"{zone} cleared (handoff)",zone_cleared_overlay:"{zone} cleared (overlay exit)",zone_cleared_force:"{zone} cleared (sensor-assisted)",room_occupied:"Room occupied",room_empty:"Room empty",mmwave_on:"mmWave on",mmwave_off:"mmWave off",force_clear:"{zone} force-cleared (both sensors idle)",stuck_dismiss:"{target} auto-dismissed (stuck {secs}s)",target_entered:"{target} entered {zone}",target_left:"{target} left the room",target_moved:"{target} moved {from} → {to}",dropped:"{n} events dropped"}},entities:{room_level:"Room level",zone_level:"Zone level",target_level:"Target level",occupancy:"Occupancy",static_presence:"Static presence",motion_presence:"Motion presence",target_presence:"Target presence",mmwave:"mmWave presence",target_count:"Target count",zone_presence:"Presence",zone_target_count:"Target count",xy:"XY position",active:"Active",target_signal:"Signal",target_zone:"Zone",illuminance:"Illuminance",humidity:"Humidity",temperature:"Temperature",co2:"CO₂"},info:{occupancy:"Combined occupancy from all sources — PIR motion, static mmWave presence, and zone tracking. Shows detected if any source detects presence.",static_presence:"mmWave radar detects stationary people by measuring micro-movements like breathing. Works through furniture and blankets.",motion_presence:"Passive infrared sensor detects movement by sensing body heat. Fast response but only triggers on motion, not stationary presence.",target_presence:"Whether any target is actively tracked by the mmWave radar. Detected when at least one target point is being reported.",mmwave:"Combines static mmWave presence and the target tracker, ignoring the PIR motion sensor. Detected when either source is on, except while the static sensor is off and the target tracker is only pending.",zone_occupancy:"Zone {slot} occupancy. Currently {count} {count, plural, one {target} other {targets}} detected. Sensitivity determines how many consecutive frames are needed to confirm presence.",rest_of_room_occupancy:"Covers the entire room outside of any defined zones. Currently {count} {count, plural, one {target} other {targets}} detected.",target_auto_range:"Automatically set max distance from room dimensions.",target_max_distance:"Maximum detection distance for the target sensor (LD2450). Hardware limit: 6m.",stuck_target_timeout:"Auto-dismiss a target reported at exactly the same coordinates for this many seconds. Set to 0 to disable. Default is 300 seconds (5 minutes).",assisted_clear_enabled:"When on, pending zones are cleared once both the motion and static sensors report inactive and no zone is occupied. Turn off to rely only on each zone's own clear timeout.",assisted_clear_timeout:"Grace period (seconds) the room must stay empty — both sensors inactive and no occupied zone — before pending zones are cleared. 0 clears immediately. Range 0–600 s.",static_min_distance:"Minimum detection distance for the static sensor.",static_max_distance:"Maximum detection distance for the static sensor. Hardware limit: 16m.",motion_timeout:"Time after last motion before the motion sensor clears.",static_timeout:"Time after last static detection before the sensor clears.",trigger_threshold:"Minimum signal strength needed to initially detect static presence. Higher = harder to trigger.",renew_threshold:"Minimum signal strength needed to maintain static presence detection. Higher = harder to renew.",illuminance_offset:"Adjust the illuminance reading by a fixed amount.",humidity_offset:"Adjust the humidity reading by a fixed amount.",temperature_offset:"Adjust the temperature reading by a fixed amount.",presence_delay:"Delay before reporting presence after initial detection. Helps filter brief false positives.",room_occupancy:"Combined room occupancy from all sensors.",room_static:"mmWave static presence detection.",room_motion:"PIR motion detection.",room_target_presence:"Whether any target is actively tracked.",room_mmwave:"Combined static mmWave + target tracker, ignoring PIR motion. Off when only the target tracker is pending and static is inactive.",room_target_count:"Number of targets detected in the room.",zone_presence:"Per-zone occupancy based on target tracking.",zone_target_count:"Number of targets in each zone.",xy:"XY coordinates mapped to the room grid.",active:"Whether each target slot is actively tracking.",target_signal:"Signal strength for each target (higher = stronger detection).",target_zone:"Which zone each target is currently in.",illuminance:"BH1750 illuminance sensor.",humidity:"SHTC3 humidity sensor.",temperature:"SHTC3 temperature sensor.",co2:"SCD40 CO₂ sensor (optional module).",log_system:"Framework logs: OTA, API, mDNS, I2C, sensor drivers, and control entities. Excludes zone/target updates — those are under Zone Engine.",log_epp:"Zone engine logs — zone detection, target tracking, configuration, and zone/target/motion entity states.",log_led:"LED control script logs — mode transitions and decision tree.",log_networking:"WiFi or Ethernet connection and DHCP logs.",log_ble:"Bluetooth Low Energy scanner and proxy logs.",log_co2:"CO2 sensor (SCD4x) logs.",led_mode:"Controls the RGB LED behavior. Manual Control disables automatic LED and lets you control it as a standard HA light entity.",led_brightness:"Brightness multiplier for the RGB LED in automatic modes.",led_presence_color:"Color used for occupancy indication when LED is in Occupancy or Environmental + Occupancy mode.",relay_trigger_mode:"What activates the relay. Disabled leaves the relay under manual control via the relay switch entity. Any other mode follows the chosen presence signal automatically and overrides manual control.",relay_contact_mode:'Normally Open closes the relay when the trigger fires (typical "active = closed"). Normally Closed opens it instead — useful for security circuits that expect a closed loop in the idle state.'},dimensions:{width_cm:"W (cm)",height_cm:"H (cm)",rotation:"Rot"},protocol:{firmware_behind:"This sensor's firmware needs to be updated to work with this version of the integration.",firmware_ahead:"This sensor's firmware is newer than the integration. Update the Everything Presence Pro Grid integration via HACS.",open_hacs:"Open in HACS",unavailable:"Device is offline — firmware version cannot be determined.",update_firmware:"Update Firmware"},tabs:{device_configuration:"Device Configuration",device_configuration_short:"Config",flash_firmware:"Flash Firmware",flash_firmware_short:"Flash",device_groups:"Device Groups",device_groups_short:"Groups",help:"Open user guide"},flasher:{title:"Flash Firmware",devices_on_network:"Installed Devices",no_devices:"No Everything Presence Pro devices installed.",no_eppgrid_devices:"No devices with Everything Presence Pro Grid firmware found.",flash_from_tab:"Flash your devices from the Flash Firmware tab",offline:"Offline",online:"Online",usb_title:"USB Connection",usb_flash_title:"Flash Firmware",usb_flash_desc:"Install or update firmware and configure WiFi.",usb_wifi_title:"Configure WiFi",usb_wifi_desc:"Set up WiFi on an already flashed device.",usb_browser_warning:"USB flashing requires Chrome or Edge browser.",usb_insecure_warning:"USB flashing needs a secure (HTTPS) connection to Home Assistant — it's blocked over plain HTTP.",usb_web_flasher_link:"Flash from your browser instead",select_variant:"Select firmware variant:",cancelling:"Cancelling...",wifi:"WiFi",ethernet:"Ethernet",go_to_config:"Go to Device Configuration",flash_usb:"Flash firmware over USB",loading:"Loading devices...",configure_wifi:"Configure WiFi",scan:"Scan Again",select_a_network:"Select a network...",manual_ssid:"Enter SSID manually (hidden network)",enter_ssid:"Enter SSID",wifi_password:"WiFi password",show_password:"Show password",ip_address:"IP Address: {ip}",connect:"Connect",usb_flash:"Flash via USB",usb_step_connecting:"Connecting to device...",usb_step_wifi_check:"Checking existing WiFi connection...",usb_step_flashing:"Flashing firmware {version}...",usb_step_scanning:"Scanning for WiFi networks...",wifi_scan_hint:"If the device is already connected to WiFi, scanning may not work. Use manual SSID entry instead.",usb_step_provisioning:"Configuring WiFi...",usb_step_wifi_connecting:"Connecting to WiFi...",usb_step_reading_ip:"Detecting device IP address...",usb_step_adding:"Adding device...",wifi_configured:"WiFi configured successfully",go_to_integrations:"Go to Integrations",copy_ip:"Copy IP address",retry_ha_add:"Retry adding to Home Assistant",flash_another:"Flash another device",ha_add:{adding:"Adding device to Home Assistant...",retrying:"Waiting for device to come online (attempt {attempt} of {max})...",added:"Device added to Home Assistant",already_added:"Device is already in Home Assistant",needs_auth:"Device reached — complete setup in Integrations to provide the encryption key",cannot_connect:"Couldn't reach the device on the network. Check that Home Assistant and the device are on the same network.",failed:"Failed to add: {reason}"},usb_ethernet_complete:"Firmware flashed successfully!",usb_ethernet_hint:"Connect the device to your network via ethernet cable. It will be automatically detected by ESPHome.",go_to_devices:"Go to Settings → Devices",usb_retry:"Retry",confirm_delete_title:"Remove old configuration?",confirm_delete_message:"This device was previously configured with the original firmware. The old configuration will be removed from Home Assistant.",update:"Update",integration_update:"Integration update needed",integration_outdated_title:"Integration update required",integration_outdated_body:"One or more devices have firmware that is newer than this version of the integration. Update the Everything Presence Pro Grid integration to restore full functionality.",open_hacs:"Open in HACS",ota_retry:"Retry",cancel:"Cancel",start_over:"Start over",cancelled_ip_hint:"Device reachable at {ip} — it should appear in Home Assistant discovery shortly.",errors:{start_failed:"Failed to start update. Is the device online?",firmware_not_published:"This firmware version isn't available to download yet. The release is probably still being published — please try again shortly.",connect_failed:"Failed to connect to device",connection_lost:"Connection lost during update",update_timeout:"Update timed out",device_offline:"Device went offline during update",update_failed_generic:"Update failed",ota_failed_version_unchanged:"Update failed — firmware version unchanged",ota_timeout:"OTA update timed out",ota_device_error:"Update failed: {message}",ota_low_memory:"The device couldn't download the firmware — most likely it's low on memory ({message}). It restarts before each attempt to free memory; if updates keep failing, turn off this device's Bluetooth proxy and try again.",flash_cancelled:"Flash cancelled",timeout:"Timeout",aborted:"Cancelled",port_closed:"Serial connection lost — the device may have been unplugged. Reconnect it and try again."}},device_setup:{title:"Set up your device",name_help:'Give this sensor a name you\'ll recognise, like "Living Room".',name_label:"Device name",area_help:"Assign it to an area so it groups with the rest of that room.",area_label:"Area",skip_and_finish:"Skip and finish",finish:"Finish",recreate_entity_ids:"Recreate entity IDs to match new name"},connection:{connecting:"Connecting to device...",offline:"Device is offline",failed:"Cannot connect to device",client_count:"{count} client(s) are currently connected.",check_connections:"Check for other browser tabs with this panel open, ESPHome log sessions, or additional Home Assistant instances.",retry:"Retry",ha_reconnecting:"Reconnecting to Home Assistant..."},usb:{errors:{serial_port_busy:"Serial port is busy from a previous operation. Refresh the page and try again.",serial_port_unavailable:"Serial port not available",device_disconnected:"Device disconnected. Unplug, plug it back in, and try again.",manifest_download_failed:"Failed to download firmware manifest",file_download_failed:"Failed to download firmware file: {file}",port_open_failed:"Could not open serial port. Unplug the device, plug it back in, and try again.",no_device_response:"No response from device — it may be flashed with ethernet firmware which does not support WiFi configuration.",base_url_required:"baseUrl is required for firmware download",flash_failed:"Firmware flash failed."}},wifi:{errors:{provisioning_failed:"WiFi provisioning failed",scan_failed:"WiFi scan failed",connection_failed:"WiFi connection failed — check SSID/password and try again",error_code:"WiFi error (code {code})",invalid_command:"Invalid command — device may need to be power-cycled",unknown_command:"Unknown command",not_authorized:"Not authorized",ssid_too_long:"WiFi network name is too long (max 32 bytes)",password_too_long:"WiFi password is too long (max 64 bytes)"}},errors:{apply_layout:"Saving the room layout failed. Check that the device is online and try again.",save_settings:"Saving the settings failed. Check that the device is online and try again.",save_configuration:"Saving the configuration backup failed. Try again.",load_configuration:"Restoring the configuration failed. It may be in an old format — re-save it and try again."},language_request:{message:"Your Home Assistant language is {language}, but Everything Presence Pro Grid isn't translated into it yet.",action:"Request a translation",dismiss:"Dismiss"},card:{offline:"Device offline",loading:"Loading…",uncalibrated:"This device isn't calibrated yet. Open the Everything Presence Pro Grid panel to set up the room.",no_device:"Select a device in the card editor.",nothing_to_show:"Enable the map or sensors to show this card.",editor:{device_id:"Device",primary:"Primary information",secondary:"Secondary information",layout:"Layout",show_map:"Show map",show_sensors:"Show sensors",show_grid:"Show grid",show_furniture:"Show furniture",show_overlays:"Show overlays",show_heatmap:"Show heatmap",room_color:"Rest-of-room colour",reset_room_color:"Reset to auto",presence:"Presence",zones:"Zones",occupancy:"Occupancy",static_presence:"Static presence",motion_presence:"Motion presence",target_presence:"Target presence",mmwave:"mmWave",temperature:"Temperature",humidity:"Humidity",illuminance:"Illuminance",co2:"CO₂"}}},es:{common:{save:"Guardar",saving:"Guardando...",cancel:"Cancelar",delete:"Eliminar",close:"Cerrar",add:"Añadir",discard:"Descartar",loading:"Cargando..."},grid:{heatmap_toggle:"Mapa de calor",heatmap_needs_firmware:"El mapa de calor necesita el firmware 1.3.0 o posterior.",heatmap_no_memory:"El mapa de calor no está disponible en este dispositivo: no hay memoria suficiente."},furniture:{armchair:"Sillón",bath:"Bañera",bedside_table:"Mesita de noche",bidet:"Bidé",car:"Coche",carpet:"Alfombra",cat_bed:"Cama para gato",cabinet:"Armario",ceiling_fan:"Ventilador de techo",counter:"Mostrador",cupboard:"Alacena",desk:"Escritorio",dog_bed:"Cama para perro",dining_table:"Mesa de comedor",door_left_swing:"Puerta (apertura izquierda)",door_right_swing:"Puerta (apertura derecha)",double_bed:"Cama doble",fridge:"Nevera",hot_tub:"Jacuzzi",kitchen_island:"Isla de cocina",lamp:"Lámpara",oven_stove:"Horno / cocina",plant:"Planta",pool:"Piscina",round_table:"Mesa redonda",shower:"Ducha",side_table:"Mesa auxiliar",single_bed:"Cama individual",sliding_door:"Puerta corredera",sofa_2_seat:"Sofá (2 plazas)",sofa_3_seat:"Sofá (3 plazas)",speaker:"Altavoz",tv:"TV",washbasin:"Lavabo",washing_machine:"Lavadora",toilet:"Inodoro",window:"Ventana",custom_icon:"Icono personalizado",custom:"Personalizado",search_placeholder:"Buscar mobiliario...",remove:"Eliminar"},text_label:{label:"Etiqueta de texto",add:"Añadir etiqueta de texto",default_text:"Etiqueta",text:"Texto",font:"Fuente",size_cm:"Tamaño (cm)",bold:"Negrita",italic:"Cursiva",align:"Alineación",align_left:"Alinear a la izquierda",align_center:"Centrar",align_right:"Alinear a la derecha",text_color:"Color del texto",auto_color:"Auto",background:"Fondo",no_background:"Ninguno",remove:"Eliminar etiqueta"},corners:{front_left:"Frente-izquierda",front_right:"Frente-derecha",back_right:"Fondo-derecha",back_left:"Fondo-izquierda",left_wall:"pared izquierda",right_wall:"pared derecha",front_wall:"pared frontal",back_wall:"pared del fondo"},wizard:{how_calibration_works:"Cómo funciona la calibración de la habitación",calibrate_room_size:"Calibrar tamaño de la habitación",begin_marking:"Iniciar calibración",mark_corner:"Marcar {corner}",recording:"Grabando... {current}s / {total}s",paused:"En pausa — se necesita exactamente un objetivo visible",stand_still:"Permanece inmóvil",no_target:"No se detecta ningún objetivo. Asegúrate de que el sensor pueda verte.",multiple_targets:"Se detectan varios objetivos. Solo debe haber una persona en la habitación durante la calibración.",save_prompt:"Haz clic en Guardar para almacenar la calibración de esta habitación, o haz clic en una esquina superior para volver a marcarla.",save_failed:"No se pudo guardar la calibración. Comprueba que el dispositivo está en línea y vuelve a intentarlo.",invalid_corners:"Las esquinas marcadas no forman una sala válida. Vuelve a marcar las esquinas e inténtalo de nuevo.",walk_instruction_full:"<strong>Camina hasta cada esquina</strong> en orden (1 → 2 → 3 → 4) y haz clic en Marcar. Permanece inmóvil unos segundos para que el sensor pueda registrar tu posición.",cant_reach:"<strong>¿No puedes llegar a una esquina?</strong> Acércate todo lo que puedas e introduce la distancia a cada pared en los campos de desplazamiento, como en la esquina 4 del diagrama superior, donde hay una planta en el camino.",corner_sensor_hint:"En este ejemplo, el sensor está montado en la esquina 2, pero puede estar en cualquier lugar. Puedes colocarte justo delante de él.",walk_instruction:"Camina hasta cada esquina de la habitación y haz clic en Marcar. El sensor registrará tu posición durante {duration} segundos.",corner_step:"Esquina {index}/4: Camina hasta la {corner}",distance_from:"Distancia desde:",distance_from_side:"{wall} (cm)",front_wall_label:"Pared frontal (lado del sensor)",back_wall_label:"Pared del fondo",sensor:"Sensor",no_presence:"Sin presencia",dont_show_again:"No mostrar esto de nuevo"},dialogs:{delete_calibration_title:"¿Eliminar la calibración de la habitación?",delete_calibration_body:"Esto también eliminará todas las zonas de detección y el mobiliario. Esta acción no se puede deshacer.",unsaved_changes:"Tienes cambios sin guardar",unsaved_changes_body:"Los cambios se perderán si navegas a otra página sin aplicarlos.",backup_configuration:"Respaldar configuración",restore_configuration:"Restaurar configuración",no_configurations:"No hay configuraciones guardadas.",configuration_name:"Nombre de la configuración"},menu:{settings:"Ajustes",room_calibration:"Calibrar tamaño de la habitación",delete_calibration:"Eliminar calibración de la habitación",detection_zones:"Zonas de detección",furniture:"Mobiliario",overlays:"Capas"},settings:{title:"Ajustes",detection_ranges:"Rangos de detección",sensor_calibration:"Calibración del sensor",entities:"Entidades",target_sensor:"Sensor de objetivos",stuck_target_timeout:"Tiempo de objetivo atascado",assisted_clear:"Borrado asistido por sensores",assisted_clear_enabled:"Activado",assisted_clear_timeout:"Retardo de borrado",static_sensor:"Sensor estático",motion_sensor:"Sensor de movimiento",environmental:"Ambiental",auto:"Auto",max_distance:"Distancia máxima",min_distance:"Distancia mínima",presence_timeout:"Tiempo de espera de presencia",trigger_threshold:"Umbral de activación",renew_threshold:"Umbral de renovación",illuminance_offset:"Desplazamiento de iluminancia",humidity_offset:"Desplazamiento de humedad",temperature_offset:"Desplazamiento de temperatura",presence_delay:"Retardo de presencia",furthest_point:"Punto más lejano actual del sensor:",logging:"Registro",log_system:"Sistema",log_epp:"Motor de zonas",log_led:"LED",log_networking:"Red",log_ble:"Bluetooth",log_co2:"CO2",led_and_relay:"LED y relé",led:"LED",led_mode:"Modo",led_brightness:"Brillo",led_presence_color:"Color de ocupación",manual_control:"Control manual",presence:"Ocupación",environmental_presence:"Ambiental + Ocupación",relay:"Relé",relay_trigger_mode:"Modo de activación",relay_contact_mode:"Modo de contacto",relay_disabled:"Desactivado",relay_motion:"Solo movimiento",relay_presence:"Solo presencia",relay_occupancy:"Ocupación",relay_normally_open:"Normalmente abierto (NA)",relay_normally_closed:"Normalmente cerrado (NC)",update_rate:"Frecuencia de actualización",reset_to_default:"Restablecer valores predeterminados",show_info:"Mostrar información",frequency:{"5hz":"5 Hz","2hz":"2 Hz","1hz":"1 Hz","0_5hz":"0,5 Hz"},log_level:{none:"Ninguno",error:"Error",warning:"Advertencia",info:"Información",debug:"Depuración"}},sidebar:{detection_zones:"Zonas de detección",live_overview:"Vista en directo",add_zone:"Añadir zona",rest_of_room:"Resto de la habitación",room:"Habitación"},zones:{type:"Tipo",default:"Predeterminado",bed:"Cama",seating:"Asiento",transit:"Tránsito",custom:"Personalizado",trigger:"Activación",renew:"Renovación",presence_timeout:"Tiempo de espera de presencia",handoff_timeout:"Tiempo de espera de transferencia",seconds_suffix:"s",remove_zone:"Eliminar zona"},color:{choose:"Elegir color",custom:"Color personalizado…",in_use:"Usado por otra zona",preset:"Color {n}"},overlays:{entry_exit:"Entrada / Salida",interference:"Interferencia",suppress:"Suprimir",click_to_paint:"Haz clic para pintar"},live:{presence:"Presencia",detected:"Detectado",clear:"Sin detección",environment:"Entorno",occupancy:"Ocupación",static_presence:"Presencia estática",motion_presence:"Presencia en movimiento",target_presence:"Presencia de objetivo",mmwave:"mmWave",delete_target:"Eliminar objetivo",mark_interference:"Marcar como fuente de interferencia",suppress_detection:"Suprimir detección",grid_dimensions:"{width, number, ::.0}m × {depth, number, ::.0}m · Punto más lejano: {furthest, number, ::.0}m",illuminance_value:"{value, number, ::.0} lux",temperature_value:"{value, number, ::.0} °C",humidity_value:"{value, number, ::.0} %",co2_value:"{value, number} ppm",debug:{detection_events:"Eventos de detección",copy_all:"Copiar todo",clear:"Borrar",waiting_for_events:"Esperando eventos...",static:"Estático",motion:"Movimiento",occ:"Ocup",on:"sí",off:"no",active:"activo",pending:"pendiente",inactive:"inactivo",occupied:"ocupada",room:"Habitación",no_targets:"sin objetivos",all_clear:"todo despejado",zone_n:"Zona {n}",target_n:"Objetivo {n}"},events:{static_active:"Presencia estática detectada",static_fading:"Presencia estática desvaneciéndose…",static_cleared:"Presencia estática eliminada",motion_active:"Presencia en movimiento detectada",motion_fading:"Presencia en movimiento desvaneciéndose…",motion_cleared:"Presencia en movimiento eliminada",zone_occupied:"{zone} ocupada",zone_clearing:"{zone} despejándose…",zone_cleared:"{zone} despejada",zone_cleared_handoff:"{zone} despejada (transferencia)",zone_cleared_overlay:"{zone} despejada (salida de capa)",zone_cleared_force:"{zone} despejada (asistida por sensor)",room_occupied:"Habitación ocupada",room_empty:"Habitación vacía",mmwave_on:"mmWave activado",mmwave_off:"mmWave desactivado",force_clear:"{zone} forzada a despejar (ambos sensores inactivos)",stuck_dismiss:"{target} descartado automáticamente (atascado {secs}s)",target_entered:"{target} entró en {zone}",target_left:"{target} salió de la habitación",target_moved:"{target} se movió de {from} → {to}",dropped:"{n} eventos descartados"}},entities:{room_level:"Nivel de habitación",zone_level:"Nivel de zona",target_level:"Nivel de objetivo",occupancy:"Ocupación",static_presence:"Presencia estática",motion_presence:"Presencia en movimiento",target_presence:"Presencia de objetivo",mmwave:"Presencia mmWave",target_count:"Número de objetivos",zone_presence:"Presencia",zone_target_count:"Número de objetivos",xy:"Posición XY",active:"Activo",target_signal:"Señal",target_zone:"Zona",illuminance:"Iluminancia",humidity:"Humedad",temperature:"Temperatura",co2:"CO₂"},info:{occupancy:"Ocupación combinada de todas las fuentes: sensor PIR de movimiento, presencia estática por radar mmWave y seguimiento de zonas. Muestra «detectado» si alguna fuente detecta presencia.",static_presence:"El radar mmWave detecta personas inmóviles midiendo micromovimientos como la respiración. Funciona a través de muebles y mantas.",motion_presence:"El sensor infrarrojo pasivo detecta movimiento captando el calor corporal. Respuesta rápida, pero solo se activa con movimiento, no con presencia estática.",target_presence:"Indica si el radar mmWave está rastreando activamente algún objetivo. Se muestra como detectado cuando se está reportando al menos un punto objetivo.",mmwave:"Combina la presencia mmWave estática y el seguimiento de objetivos, ignorando el sensor PIR de movimiento. Detectado cuando alguna de las dos fuentes está activa, salvo cuando el sensor estático está apagado y el seguimiento de objetivos solo está pendiente.",zone_occupancy:"Ocupación de la zona {slot}. Actualmente se detectan {count} {count, plural, one {objetivo} other {objetivos}}. La sensibilidad determina cuántos fotogramas consecutivos son necesarios para confirmar presencia.",rest_of_room_occupancy:"Cubre toda la habitación fuera de las zonas definidas. Actualmente se detectan {count} {count, plural, one {objetivo} other {objetivos}}.",target_auto_range:"Establece automáticamente la distancia máxima a partir de las dimensiones de la habitación.",target_max_distance:"Distancia máxima de detección para el sensor de objetivos (LD2450). Límite hardware: 6 m.",stuck_target_timeout:"Descarta automáticamente un objetivo reportado exactamente en las mismas coordenadas durante este número de segundos. Establece 0 para deshabilitar. Por defecto 300 segundos (5 minutos).",assisted_clear_enabled:"Cuando está activado, las zonas pendientes se borran en cuanto los sensores de movimiento y estático informan inactividad y ninguna zona está ocupada. Desactívalo para usar solo el tiempo de espera propio de cada zona.",assisted_clear_timeout:"Periodo de gracia (segundos) que la sala debe permanecer vacía — ambos sensores inactivos y ninguna zona ocupada — antes de borrar las zonas pendientes. 0 borra de inmediato. Rango 0–600 s.",static_min_distance:"Distancia mínima de detección para el sensor estático.",static_max_distance:"Distancia máxima de detección para el sensor estático. Límite hardware: 16 m.",motion_timeout:"Tiempo tras el último movimiento antes de que el sensor de movimiento se limpie.",static_timeout:"Tiempo tras la última detección estática antes de que el sensor se limpie.",trigger_threshold:"Intensidad de señal mínima necesaria para detectar inicialmente presencia estática. Más alto = más difícil de activar.",renew_threshold:"Intensidad de señal mínima necesaria para mantener la detección de presencia estática. Más alto = más difícil de renovar.",illuminance_offset:"Ajusta la lectura de iluminancia en un valor fijo.",humidity_offset:"Ajusta la lectura de humedad en un valor fijo.",temperature_offset:"Ajusta la lectura de temperatura en un valor fijo.",presence_delay:"Retardo antes de notificar presencia tras la detección inicial. Ayuda a filtrar falsos positivos breves.",room_occupancy:"Ocupación combinada de la habitación procedente de todos los sensores.",room_static:"Detección de presencia estática por radar mmWave.",room_motion:"Detección de movimiento por PIR.",room_target_presence:"Indica si se está rastreando activamente algún objetivo.",room_mmwave:"Presencia mmWave estática + seguimiento de objetivos, ignorando el PIR de movimiento. Apagado si el sensor estático está inactivo y el seguimiento solo está pendiente.",room_target_count:"Número de objetivos detectados en la habitación.",zone_presence:"Ocupación por zona basada en el seguimiento de objetivos.",zone_target_count:"Número de objetivos en cada zona.",xy:"Coordenadas XY mapeadas a la cuadrícula de la habitación.",active:"Indica si cada ranura de objetivo está rastreando activamente.",target_signal:"Intensidad de señal de cada objetivo (más alta = detección más sólida).",target_zone:"Zona en la que se encuentra actualmente cada objetivo.",illuminance:"Sensor de iluminancia BH1750.",humidity:"Sensor de humedad SHTC3.",temperature:"Sensor de temperatura SHTC3.",co2:"Sensor de CO₂ SCD40 (módulo opcional).",log_system:"Registros del framework: OTA, API, mDNS, I2C, controladores de sensores y entidades de control. Excluye las actualizaciones de zonas/objetivos: están en Motor de zonas.",log_epp:"Registros del motor de zonas: detección de zonas, seguimiento de objetivos, configuración y estados de entidades de zona/objetivo/movimiento.",log_led:"Registros del script de control del LED: transiciones de modo y árbol de decisión.",log_networking:"Registros de conexión WiFi o Ethernet y DHCP.",log_ble:"Registros del escáner y proxy Bluetooth de baja energía.",log_co2:"Registros del sensor de CO2 (SCD4x).",led_mode:"Controla el comportamiento del LED RGB. El control manual desactiva el LED automático y permite controlarlo como una entidad de luz estándar de HA.",led_brightness:"Multiplicador de brillo para el LED RGB en los modos automáticos.",led_presence_color:"Color utilizado para indicar ocupación cuando el LED está en modo Ocupación o Ambiental + Ocupación.",relay_trigger_mode:"Qué activa el relé. Desactivado deja el relé bajo control manual a través de la entidad de interruptor del relé. Cualquier otro modo sigue automáticamente la señal de presencia elegida y anula el control manual.",relay_contact_mode:'Normalmente abierto cierra el relé cuando se dispara el activador (típico "activo = cerrado"). Normalmente cerrado lo abre en su lugar — útil para circuitos de seguridad que esperan un bucle cerrado en estado inactivo.'},dimensions:{width_cm:"An (cm)",height_cm:"Al (cm)",rotation:"Rot"},protocol:{firmware_behind:"El firmware de este sensor debe actualizarse para funcionar con esta versión de la integración.",firmware_ahead:"El firmware de este sensor es más reciente que la integración. Actualiza la integración Everything Presence Pro Grid desde HACS.",open_hacs:"Abrir en HACS",unavailable:"El dispositivo no está disponible — no se puede determinar la versión del firmware.",update_firmware:"Actualizar firmware"},tabs:{device_configuration:"Configuración del dispositivo",device_configuration_short:"Config",flash_firmware:"Instalar firmware",flash_firmware_short:"Flash",device_groups:"Grupos de dispositivos",device_groups_short:"Grupos",help:"Abrir la guía del usuario"},flasher:{title:"Instalar firmware",devices_on_network:"Dispositivos instalados",no_devices:"No hay dispositivos Everything Presence Pro instalados.",no_eppgrid_devices:"No se han encontrado dispositivos con firmware Everything Presence Pro Grid.",flash_from_tab:"Instala el firmware de tus dispositivos desde la pestaña Instalar firmware",offline:"Sin conexión",online:"Conectado",usb_title:"Conexión USB",usb_flash_title:"Instalar firmware",usb_flash_desc:"Instala o actualiza el firmware y configura el WiFi.",usb_wifi_title:"Configurar WiFi",usb_wifi_desc:"Configura el WiFi en un dispositivo que ya tiene firmware instalado.",usb_browser_warning:"La instalación por USB requiere el navegador Chrome o Edge.",usb_insecure_warning:"La instalación por USB necesita una conexión segura (HTTPS) a Home Assistant — está bloqueada por HTTP sin cifrar.",usb_web_flasher_link:"Instala desde tu navegador",select_variant:"Selecciona la variante de firmware:",cancelling:"Cancelando...",wifi:"WiFi",ethernet:"Ethernet",go_to_config:"Ir a la configuración del dispositivo",flash_usb:"Instalar firmware por USB",loading:"Cargando dispositivos...",configure_wifi:"Configurar WiFi",scan:"Buscar de nuevo",select_a_network:"Selecciona una red...",manual_ssid:"Introducir SSID manualmente (red oculta)",enter_ssid:"Introducir SSID",wifi_password:"Contraseña WiFi",show_password:"Mostrar contraseña",ip_address:"Dirección IP: {ip}",connect:"Conectar",usb_flash:"Instalar por USB",usb_step_connecting:"Conectando al dispositivo...",usb_step_wifi_check:"Comprobando conexión WiFi existente...",usb_step_flashing:"Instalando firmware {version}...",usb_step_scanning:"Buscando redes WiFi...",wifi_scan_hint:"Si el dispositivo ya está conectado al WiFi, es posible que la búsqueda no funcione. Usa la entrada manual de SSID en su lugar.",usb_step_provisioning:"Configurando WiFi...",usb_step_wifi_connecting:"Conectando al WiFi...",usb_step_reading_ip:"Detectando la dirección IP del dispositivo...",usb_step_adding:"Añadiendo dispositivo...",wifi_configured:"WiFi configurado correctamente",go_to_integrations:"Ir a Integraciones",copy_ip:"Copiar dirección IP",retry_ha_add:"Reintentar añadir a Home Assistant",flash_another:"Flashear otro dispositivo",ha_add:{adding:"Añadiendo dispositivo a Home Assistant...",retrying:"Esperando a que el dispositivo esté disponible (intento {attempt} de {max})...",added:"Dispositivo añadido a Home Assistant",already_added:"El dispositivo ya está en Home Assistant",needs_auth:"Dispositivo accesible — completa la configuración en Integraciones para proporcionar la clave de cifrado",cannot_connect:"No se pudo conectar al dispositivo en la red. Comprueba que Home Assistant y el dispositivo están en la misma red.",failed:"Error al añadir: {reason}"},usb_ethernet_complete:"¡Firmware instalado correctamente!",usb_ethernet_hint:"Conecta el dispositivo a tu red mediante cable Ethernet. ESPHome lo detectará automáticamente.",go_to_devices:"Ir a Ajustes → Dispositivos",usb_retry:"Reintentar",confirm_delete_title:"¿Eliminar la configuración antigua?",confirm_delete_message:"Este dispositivo se configuró anteriormente con el firmware original. La configuración antigua se eliminará de Home Assistant.",update:"Actualizar",integration_update:"Actualización de la integración necesaria",integration_outdated_title:"Se requiere actualización de la integración",integration_outdated_body:"Uno o más dispositivos tienen un firmware más reciente que esta versión de la integración. Actualiza la integración Everything Presence Pro Grid para restaurar toda la funcionalidad.",open_hacs:"Abrir en HACS",ota_retry:"Reintentar",cancel:"Cancelar",start_over:"Empezar de nuevo",cancelled_ip_hint:"El dispositivo es accesible en {ip} — debería aparecer en la detección de Home Assistant pronto.",errors:{start_failed:"No se ha podido iniciar la actualización. ¿El dispositivo está en línea?",firmware_not_published:"Esta versión del firmware aún no está disponible para descargar. Probablemente la versión todavía se está publicando; inténtalo de nuevo en unos momentos.",connect_failed:"No se ha podido conectar al dispositivo",connection_lost:"Se perdió la conexión durante la actualización",update_timeout:"La actualización ha agotado el tiempo de espera",device_offline:"El dispositivo se desconectó durante la actualización",update_failed_generic:"Error en la actualización",ota_failed_version_unchanged:"Actualización fallida — la versión del firmware no ha cambiado",ota_timeout:"La actualización OTA ha agotado el tiempo de espera",ota_device_error:"Error en la actualización: {message}",ota_low_memory:"El dispositivo no pudo descargar el firmware, probablemente por falta de memoria ({message}). Se reinicia antes de cada intento para liberar memoria; si las actualizaciones siguen fallando, desactiva el proxy Bluetooth de este dispositivo e inténtalo de nuevo.",flash_cancelled:"Instalación cancelada",timeout:"Tiempo de espera agotado",aborted:"Cancelado",port_closed:"Conexión serie perdida — puede que el dispositivo se haya desconectado. Vuelve a conectarlo e inténtalo de nuevo."}},device_setup:{title:"Configura tu dispositivo",name_help:'Dale a este sensor un nombre que reconozcas, como "Salón".',name_label:"Nombre del dispositivo",area_help:"Asígnalo a un área para que se agrupe con el resto de esa habitación.",area_label:"Área",skip_and_finish:"Omitir y finalizar",finish:"Finalizar",recreate_entity_ids:"Recrear los IDs de entidad para que coincidan con el nuevo nombre"},connection:{connecting:"Conectando al dispositivo...",offline:"El dispositivo no está disponible",failed:"No se puede conectar al dispositivo",client_count:"Hay {count} cliente(s) conectados actualmente.",check_connections:"Comprueba si hay otras pestañas del navegador con este panel abierto, sesiones de registro de ESPHome o instancias adicionales de Home Assistant.",retry:"Reintentar",ha_reconnecting:"Reconectando a Home Assistant..."},usb:{errors:{serial_port_busy:"El puerto serie está ocupado por una operación anterior. Actualiza la página e inténtalo de nuevo.",serial_port_unavailable:"Puerto serie no disponible",device_disconnected:"Dispositivo desconectado. Desconéctalo, vuelve a conectarlo e inténtalo de nuevo.",manifest_download_failed:"No se ha podido descargar el manifiesto del firmware",file_download_failed:"No se ha podido descargar el archivo de firmware: {file}",port_open_failed:"No se ha podido abrir el puerto serie. Desconecta el dispositivo, vuelve a conectarlo e inténtalo de nuevo.",no_device_response:"Sin respuesta del dispositivo — puede que tenga instalado el firmware Ethernet, que no admite configuración WiFi.",base_url_required:"baseUrl es obligatorio para la descarga del firmware",flash_failed:"Error al instalar el firmware."}},wifi:{errors:{provisioning_failed:"Error al configurar el WiFi",scan_failed:"Error al buscar redes WiFi",connection_failed:"Error de conexión WiFi — comprueba el SSID y la contraseña e inténtalo de nuevo",error_code:"Error de WiFi (código {code})",invalid_command:"Comando no válido — puede que el dispositivo necesite reiniciarse",unknown_command:"Comando desconocido",not_authorized:"No autorizado",ssid_too_long:"El nombre de la red WiFi es demasiado largo (máximo 32 bytes)",password_too_long:"La contraseña WiFi es demasiado larga (máximo 64 bytes)"}},errors:{apply_layout:"No se pudo guardar la distribución de la habitación. Comprueba que el dispositivo está en línea e inténtalo de nuevo.",save_settings:"No se pudieron guardar los ajustes. Comprueba que el dispositivo está en línea e inténtalo de nuevo.",save_configuration:"No se pudo guardar la copia de seguridad de la configuración. Inténtalo de nuevo.",load_configuration:"No se pudo restaurar la configuración. Puede que esté en un formato antiguo — vuelve a guardarla e inténtalo de nuevo."},language_request:{message:"El idioma de tu Home Assistant es {language}, pero Everything Presence Pro Grid aún no está traducido a ese idioma.",action:"Solicitar una traducción",dismiss:"Descartar"},card:{offline:"Dispositivo sin conexión",loading:"Cargando…",uncalibrated:"Este dispositivo aún no está calibrado. Abre el panel de Everything Presence Pro Grid para configurar la habitación.",no_device:"Selecciona un dispositivo en el editor de tarjetas.",nothing_to_show:"Activa el mapa o los sensores para mostrar esta tarjeta.",editor:{device_id:"Dispositivo",primary:"Información principal",secondary:"Información secundaria",layout:"Disposición",show_map:"Mostrar mapa",show_sensors:"Mostrar sensores",show_grid:"Mostrar cuadrícula",show_furniture:"Mostrar mobiliario",show_overlays:"Mostrar superposiciones",show_heatmap:"Mostrar mapa de calor",room_color:"Color del resto de la sala",reset_room_color:"Restablecer a automático",presence:"Presencia",zones:"Zonas",occupancy:"Ocupación",static_presence:"Presencia estática",motion_presence:"Presencia en movimiento",target_presence:"Presencia de objetivo",mmwave:"mmWave",temperature:"Temperatura",humidity:"Humedad",illuminance:"Iluminancia",co2:"CO₂"}}}},Jt=Object.assign(e=>e,{formatNumber:(e,t=1)=>e.toFixed(t),lang:"en"});function jt(e,t){const i=t.split(".");let s=e;for(const e of i){if(null==s||"object"!=typeof s)return;s=s[e]}return"string"==typeof s?s:void 0}let Zt=null;class Vt extends he{constructor(){super(...arguments),this.text="",this.localize=Jt,this._onKeydown=e=>{"Escape"===e.key&&this._close()},this._onViewportChange=()=>{this._close()},this._onPointerDown=e=>{e.composedPath().includes(this)||this._close()}}render(){return Y`<button
			type="button"
			aria-label=${this.localize("settings.show_info")}
			aria-describedby="tip"
			title=${this.localize("settings.show_info")}
			@click=${this._toggle}
		><ha-icon icon="mdi:help-circle-outline"></ha-icon><span id="tip" class="info-tip-tooltip" role="tooltip">${this.text}</span></button>`}get _tooltip(){return this.shadowRoot?.querySelector(".info-tip-tooltip")??null}_toggle(e){e.stopPropagation();const t=Zt===this;if(Zt?._close(),t)return;const i=this._tooltip,s=e.currentTarget.getBoundingClientRect();i.style.display="block",i.style.left=`${Math.max(8,Math.min(s.right-240,window.innerWidth-256))}px`,i.style.top=`${s.bottom+6}px`,Zt=this,this._attachListeners()}_close(){const e=this._tooltip;e&&(e.style.display="none"),Zt===this&&(Zt=null),this._detachListeners()}_attachListeners(){document.addEventListener("keydown",this._onKeydown),document.addEventListener("pointerdown",this._onPointerDown,!0),window.addEventListener("scroll",this._onViewportChange,!0),window.addEventListener("resize",this._onViewportChange)}_detachListeners(){document.removeEventListener("keydown",this._onKeydown),document.removeEventListener("pointerdown",this._onPointerDown,!0),window.removeEventListener("scroll",this._onViewportChange,!0),window.removeEventListener("resize",this._onViewportChange)}disconnectedCallback(){super.disconnectedCallback(),this._close()}}Vt.styles=[n`
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
    `],e([ge({type:String})],Vt.prototype,"text",void 0),e([ge({attribute:!1})],Vt.prototype,"localize",void 0),customElements.get("epp-info-tip")||customElements.define("epp-info-tip",Vt);class Xt extends he{constructor(){super(...arguments),this.label="",this.helper=""}render(){return Y`
      <div class="row">
        <span class="label">
          ${this.label}
          ${this.helper?Y`<epp-info-tip .text=${this.helper}></epp-info-tip>`:J}
        </span>
        <span class="control"><slot></slot></span>
      </div>
    `}}Xt.styles=n`
    :host { display: block; }
    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: var(--epp-space-2, 8px);
      padding: var(--epp-space-3, 12px) 0;
      border-bottom: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
    }
    :host(:last-of-type) .row { border-bottom: none; }
    .label {
      display: inline-flex;
      align-items: center;
      gap: var(--epp-space-1, 4px);
      font-size: var(--epp-font-base, 14px);
      color: var(--epp-text, var(--primary-text-color, #212121));
      flex: 1;
      min-width: 120px;
    }
    .control {
      display: inline-flex;
      align-items: center;
      gap: var(--epp-space-2, 8px);
      justify-content: flex-end;
    }
  `,e([ge({type:String})],Xt.prototype,"label",void 0),e([ge({type:String})],Xt.prototype,"helper",void 0),customElements.get("epp-section-row")||customElements.define("epp-section-row",Xt);class qt extends he{constructor(){super(...arguments),this.open=!1,this.inline=!1,this._hasActions=!1,this._onActionsSlotChange=e=>{this._hasActions=e.target.assignedNodes({flatten:!0}).length>0}}render(){return Y`
      <div class="handle-bar">
        <div class="handle"></div>
        <slot name="peek"></slot>
      </div>
      <div class="body" ?hidden=${!this.open}><slot></slot></div>
      <div class="actions" ?hidden=${!this.open||!this._hasActions}>
        <slot name="actions" @slotchange=${this._onActionsSlotChange}></slot>
      </div>
    `}}qt.styles=n`
    :host {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 50;
      background: var(--epp-surface, var(--card-background-color, #fff));
      border-top: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
      border-radius: var(--epp-radius-lg, 16px) var(--epp-radius-lg, 16px) 0 0;
      box-shadow: var(--epp-elevation-2, 0 -6px 20px rgba(0, 0, 0, 0.18));
      display: flex;
      flex-direction: column;
      max-height: 85vh;
    }
    :host([inline]) {
      position: relative;
      left: auto;
      right: auto;
      bottom: auto;
      z-index: auto;
      /* Inline (mobile editor): fill the remaining flex height below the grid
         and let the .body scroll internally. Override the fixed-sheet's
         max-height:85vh cap so the sheet reaches the viewport bottom and the
         .actions footer (Save/Cancel) stays pinned there. */
      flex: 1 1 auto;
      min-height: 0;
      max-height: none;
    }
    .handle-bar {
      flex-shrink: 0;
      padding: var(--epp-space-2, 8px) var(--epp-space-3, 12px);
    }
    .handle {
      width: 40px;
      height: 4px;
      border-radius: var(--epp-radius-pill, 9999px);
      background: var(--epp-border, var(--divider-color, #e0e0e0));
      margin: 0 auto var(--epp-space-2, 8px);
    }
    .body {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      /* Reserve the scrollbar gutter so toggling the body's vertical scrollbar
         (e.g. when selecting a zone grows the sheet content) doesn't reflow the
         body width and shift the grid above it. */
      scrollbar-gutter: stable;
      padding: 0 var(--epp-space-3, 12px);
    }
    .body[hidden] { display: none; }
    .actions {
      flex-shrink: 0;
      /* Column flex so the slotted .save-cancel-bar stretches to the full panel
         width (cross-axis), letting ITS space-between spread Cancel-left/Save-right
         like the settings / device-group editor bars. The previous row flex with
         justify-content:flex-end shrink-wrapped the bar to content width and pushed
         it right, so Cancel/Save sat close together. No padding/border here either:
         the bar carries its own 12px padding + border-top divider (adding them here
         double-padded the bar and rendered two stacked lines). */
      display: flex;
      flex-direction: column;
    }
    .actions[hidden] { display: none; }

    /* Desktop side-panel presentation. The same element is the mobile bottom
       sheet (<=819px) and the editor/live side-panel (>=820px). Relative flow as
       a flex child, full-height, card chrome, no grab handle (not draggable on
       desktop and there's no peek affordance to hint at). */
    @media (min-width: 820px) {
      :host {
        position: relative;
        left: auto;
        right: auto;
        bottom: auto;
        z-index: auto;
        border: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
        border-radius: var(--epp-radius-lg, 16px);
        box-shadow: none;
        max-height: none;
        flex: 1 1 auto;
        min-height: 0;
      }
      .handle {
        display: none;
      }
    }
  `,e([ge({type:Boolean,reflect:!0})],qt.prototype,"open",void 0),e([ge({type:Boolean,reflect:!0})],qt.prototype,"inline",void 0),e([Ae()],qt.prototype,"_hasActions",void 0),customElements.get("epp-sheet")||customElements.define("epp-sheet",qt);class ei extends he{constructor(){super(...arguments),this.content=""}render(){return Y`
      <slot></slot>
      <span class="tip" role="tooltip">${this.content}</span>
    `}}ei.styles=n`
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
    :host(:hover) .tip,
    :host(:focus-within) .tip { opacity: 1; visibility: visible; }
  `,e([ge({type:String})],ei.prototype,"content",void 0),customElements.get("epp-tooltip")||customElements.define("epp-tooltip",ei);const ti=n`
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
`
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */,ii=2,si=e=>(...t)=>({_$litDirective$:e,values:t});let ri=class{constructor(e){}get _$AU(){return this._$AM._$AU}_$AT(e,t,i){this._$Ct=e,this._$AM=t,this._$Ci=i}_$AS(e,t){return this.update(e,t)}update(e,t){return this.render(...t)}},oi=class extends ri{constructor(e){if(super(e),this.it=J,e.type!==ii)throw Error(this.constructor.directiveName+"() can only be used in child bindings")}render(e){if(e===J||null==e)return this._t=void 0,this.it=e;if(e===W)return e;if("string"!=typeof e)throw Error(this.constructor.directiveName+"() called with a non-string value");if(e===this.it)return this._t;this.it=e;const t=[e];return t.raw=t,this._t={_$litType$:this.constructor.resultType,strings:t,values:[]}}};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */oi.directiveName="unsafeHTML",oi.resultType=1;const ai=si(oi);
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class ni extends oi{}ni.directiveName="unsafeSVG",ni.resultType=2;const li=si(ni),ci=1,hi=2,di=3,pi=20,ui=20,gi=400,Ai=300,_i=6e3;const fi=e=>!!(1&e),mi=e=>e>>1&7,wi=(e,t)=>-15&e|(7&t)<<1,vi=e=>e>>4&3,bi=(e,t)=>-49&e|(3&t)<<4,Ei={entry:1,interference:2,suppress:3};function yi(e){let t=pi,i=0,s=ui,r=0;for(let o=0;o<gi;o++)if(fi(e[o])){const e=o%pi,a=Math.floor(o/pi);e<t&&(t=e),e>i&&(i=e),a<s&&(s=a),a>r&&(r=a)}return{minCol:t,maxCol:i,minRow:s,maxRow:r}}function Ci(e){const{minCol:t,maxCol:i,minRow:s,maxRow:r}=yi(e);return{minCol:Math.max(0,t-1),maxCol:Math.min(19,i+1),minRow:Math.max(0,s-1),maxRow:Math.min(19,r+1)}}function xi(e){for(let t=0;t<gi;t++)if(fi(e[t]))return!0;return!1}function Bi(e,t,i,s){const r=i??xi(e),o=s??xi(t);if(!r||!o)return{dr:0,dc:0};const a=yi(e),n=yi(t);return{dr:n.minRow-a.minRow,dc:n.minCol-a.minCol}}function Si(e){const t=Math.ceil(e/Ai);return Math.floor((pi-t)/2)}function Ii(e,t,i){return{x:(e-Si(i)+.5)*Ai,y:(t+.5)*Ai}}function Di(e,t){const i=new Uint8Array(gi),s=Math.ceil(e/Ai),r=Math.ceil(t/Ai),o=Si(e);for(let e=0;e<ui;e++)for(let t=0;t<pi;t++){t>=o&&t<o+s&&e>=0&&e<0+r&&(i[e*pi+t]=1)}return i}const Ri={armchair:{viewBox:"4 4 92 82",content:'<path d="M 15,10 Q 15,5 20,5 L 80,5 Q 85,5 85,10 L 85,25 L 15,25 Z" stroke="currentColor" stroke-width="2" fill="none"/><path d="M 10,15 Q 5,15 5,20 L 5,80 Q 5,85 10,85 L 20,85 L 20,15 Z" stroke="currentColor" stroke-width="2" fill="none"/><path d="M 80,15 L 80,85 L 90,85 Q 95,85 95,80 L 95,20 Q 95,15 90,15 Z" stroke="currentColor" stroke-width="2" fill="none"/><rect x="20" y="25" width="60" height="60" rx="3" ry="3" stroke="currentColor" stroke-width="2" fill="none"/>'},car:{viewBox:"-1 4 82 152",content:'<rect x="8" y="5" width="64" height="150" rx="20" ry="20" stroke="currentColor" stroke-width="2" fill="none"/><path d="M 14,35 L 14,50 Q 14,55 20,55 L 60,55 Q 66,55 66,50 L 66,35" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M 14,125 L 14,115 Q 14,110 20,110 L 60,110 Q 66,110 66,115 L 66,125" stroke="currentColor" stroke-width="1.5" fill="none"/><rect x="14" y="55" width="52" height="55" rx="3" ry="3" stroke="currentColor" stroke-width="1.5" fill="none"/><ellipse cx="4" cy="48" rx="4" ry="3" stroke="currentColor" stroke-width="2" fill="none"/><ellipse cx="76" cy="48" rx="4" ry="3" stroke="currentColor" stroke-width="2" fill="none"/><rect x="2" y="25" width="6" height="16" rx="2" ry="2" fill="currentColor"/><rect x="72" y="25" width="6" height="16" rx="2" ry="2" fill="currentColor"/><rect x="2" y="118" width="6" height="16" rx="2" ry="2" fill="currentColor"/><rect x="72" y="118" width="6" height="16" rx="2" ry="2" fill="currentColor"/><circle cx="22" cy="12" r="4" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="58" cy="12" r="4" stroke="currentColor" stroke-width="2" fill="none"/>'},carpet:{viewBox:"4 0.25 132 89.5",content:'<rect x="5" y="5" width="130" height="80" rx="2" ry="2" stroke="currentColor" stroke-width="2" fill="none"/><rect x="15" y="15" width="110" height="60" rx="1" ry="1" stroke="currentColor" stroke-width="1" fill="none"/><line x1="15" y1="5" x2="15" y2="1" stroke="currentColor" stroke-width="1.5"/><line x1="25" y1="5" x2="25" y2="1" stroke="currentColor" stroke-width="1.5"/><line x1="35" y1="5" x2="35" y2="1" stroke="currentColor" stroke-width="1.5"/><line x1="45" y1="5" x2="45" y2="1" stroke="currentColor" stroke-width="1.5"/><line x1="55" y1="5" x2="55" y2="1" stroke="currentColor" stroke-width="1.5"/><line x1="65" y1="5" x2="65" y2="1" stroke="currentColor" stroke-width="1.5"/><line x1="75" y1="5" x2="75" y2="1" stroke="currentColor" stroke-width="1.5"/><line x1="85" y1="5" x2="85" y2="1" stroke="currentColor" stroke-width="1.5"/><line x1="95" y1="5" x2="95" y2="1" stroke="currentColor" stroke-width="1.5"/><line x1="105" y1="5" x2="105" y2="1" stroke="currentColor" stroke-width="1.5"/><line x1="115" y1="5" x2="115" y2="1" stroke="currentColor" stroke-width="1.5"/><line x1="125" y1="5" x2="125" y2="1" stroke="currentColor" stroke-width="1.5"/><line x1="15" y1="85" x2="15" y2="89" stroke="currentColor" stroke-width="1.5"/><line x1="25" y1="85" x2="25" y2="89" stroke="currentColor" stroke-width="1.5"/><line x1="35" y1="85" x2="35" y2="89" stroke="currentColor" stroke-width="1.5"/><line x1="45" y1="85" x2="45" y2="89" stroke="currentColor" stroke-width="1.5"/><line x1="55" y1="85" x2="55" y2="89" stroke="currentColor" stroke-width="1.5"/><line x1="65" y1="85" x2="65" y2="89" stroke="currentColor" stroke-width="1.5"/><line x1="75" y1="85" x2="75" y2="89" stroke="currentColor" stroke-width="1.5"/><line x1="85" y1="85" x2="85" y2="89" stroke="currentColor" stroke-width="1.5"/><line x1="95" y1="85" x2="95" y2="89" stroke="currentColor" stroke-width="1.5"/><line x1="105" y1="85" x2="105" y2="89" stroke="currentColor" stroke-width="1.5"/><line x1="115" y1="85" x2="115" y2="89" stroke="currentColor" stroke-width="1.5"/><line x1="125" y1="85" x2="125" y2="89" stroke="currentColor" stroke-width="1.5"/>'},"cat-bed":{viewBox:"4 4 62 62",content:'<circle cx="35" cy="35" r="30" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="35" cy="35" r="20" stroke="currentColor" stroke-width="2" fill="none"/><path d="M 38,30 Q 45,28 44,35 Q 43,42 35,41 Q 28,40 30,34" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M 36,28 L 38,23 L 41,27" stroke="currentColor" stroke-width="1.5" fill="none"/>'},"ceiling-fan":{viewBox:"6.8107 5.5095 86.3786 83.5837",content:'<g transform="translate(50,50)"><path d="M -4,-10 L 4,-10 L 7,-42 Q 0,-45 -7,-42 Z" stroke="currentColor" stroke-width="2" fill="none"/><path d="M -4,-10 L 4,-10 L 7,-42 Q 0,-45 -7,-42 Z" transform="rotate(72)" stroke="currentColor" stroke-width="2" fill="none"/><path d="M -4,-10 L 4,-10 L 7,-42 Q 0,-45 -7,-42 Z" transform="rotate(144)" stroke="currentColor" stroke-width="2" fill="none"/><path d="M -4,-10 L 4,-10 L 7,-42 Q 0,-45 -7,-42 Z" transform="rotate(216)" stroke="currentColor" stroke-width="2" fill="none"/><path d="M -4,-10 L 4,-10 L 7,-42 Q 0,-45 -7,-42 Z" transform="rotate(288)" stroke="currentColor" stroke-width="2" fill="none"/></g><circle cx="50" cy="50" r="10" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="50" cy="50" r="4" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="50" cy="50" r="1.5" fill="currentColor" stroke="none"/>'},"dog-bed":{viewBox:"4 4 92 72",content:'<ellipse cx="50" cy="40" rx="45" ry="35" stroke="currentColor" stroke-width="2" fill="none"/><ellipse cx="50" cy="40" rx="32" ry="22" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="46" cy="36" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="40" cy="29" r="2" stroke="currentColor" stroke-width="1" fill="none"/><circle cx="47" cy="27" r="2" stroke="currentColor" stroke-width="1" fill="none"/><circle cx="53" cy="29" r="2" stroke="currentColor" stroke-width="1" fill="none"/>'},bath:{viewBox:"4 4 192 82",content:'<rect x="5" y="5" width="190" height="80" rx="20" ry="20" stroke="currentColor" stroke-width="2" fill="none"/><rect x="15" y="15" width="170" height="60" rx="14" ry="14" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="32" cy="38" r="5" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="32" cy="52" r="5" stroke="currentColor" stroke-width="2" fill="none"/><rect x="28" y="40" width="8" height="10" rx="2" ry="2" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="170" cy="45" r="4" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="170" cy="45" r="1.5" fill="currentColor" stroke="none"/>'},"bed-double":{viewBox:"4 4 142 192",content:'<rect x="5" y="5" width="140" height="190" rx="3" ry="3" stroke="currentColor" stroke-width="2" fill="none"/><rect x="5" y="5" width="140" height="20" rx="3" ry="3" stroke="currentColor" stroke-width="2" fill="none"/><rect x="12" y="30" width="58" height="28" rx="6" ry="6" stroke="currentColor" stroke-width="2" fill="none"/><rect x="80" y="30" width="58" height="28" rx="6" ry="6" stroke="currentColor" stroke-width="2" fill="none"/><line x1="15" y1="70" x2="135" y2="70" stroke="currentColor" stroke-width="2"/>'},"bed-single":{viewBox:"4 4 82 192",content:'<rect x="5" y="5" width="80" height="190" rx="3" ry="3" stroke="currentColor" stroke-width="2" fill="none"/><rect x="5" y="5" width="80" height="20" rx="3" ry="3" stroke="currentColor" stroke-width="2" fill="none"/><rect x="12" y="30" width="66" height="28" rx="6" ry="6" stroke="currentColor" stroke-width="2" fill="none"/><line x1="15" y1="70" x2="75" y2="70" stroke="currentColor" stroke-width="2"/>'},"door-left":{viewBox:"-2.5 9.75 105 89.75",content:'<line x1="0" y1="97" x2="7" y2="97" stroke="currentColor" stroke-width="5"/><line x1="93" y1="97" x2="100" y2="97" stroke="currentColor" stroke-width="5"/><line x1="7" y1="97" x2="7" y2="11" stroke="currentColor" stroke-width="2.5"/><path d="M 7,11 A 86,86 0 0,1 93,97" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="4 3"/>'},"door-right":{viewBox:"-2.5 9.75 105 89.75",content:'<line x1="0" y1="97" x2="7" y2="97" stroke="currentColor" stroke-width="5"/><line x1="93" y1="97" x2="100" y2="97" stroke="currentColor" stroke-width="5"/><line x1="93" y1="97" x2="93" y2="11" stroke="currentColor" stroke-width="2.5"/><path d="M 93,11 A 86,86 0 0,0 7,97" stroke="currentColor" stroke-width="1.5" fill="none" stroke-dasharray="4 3"/>'},"hot-tub":{viewBox:"7 7 86 86",content:'<circle cx="50" cy="50" r="42" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="50" cy="50" r="35" stroke="currentColor" stroke-width="2" fill="none"/><path d="M 30,40 Q 33,36 36,40 Q 39,44 42,40" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M 50,35 Q 53,31 56,35 Q 59,39 62,35" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M 38,55 Q 41,51 44,55 Q 47,59 50,55" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M 56,50 Q 59,46 62,50 Q 65,54 68,50" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="50" cy="15" r="2" fill="currentColor" stroke="none"/><circle cx="50" cy="85" r="2" fill="currentColor" stroke="none"/><circle cx="15" cy="50" r="2" fill="currentColor" stroke="none"/><circle cx="85" cy="50" r="2" fill="currentColor" stroke="none"/>'},"floor-lamp":{viewBox:"7 1 34 56",content:'<path d="M 8,56 Q 18,52 28,56" stroke="currentColor" stroke-width="2" fill="none"/><line x1="18" y1="54" x2="18" y2="12" stroke="currentColor" stroke-width="2"/><path d="M 18,12 Q 18,6 24,6 L 30,6" stroke="currentColor" stroke-width="2" fill="none"/><rect x="24" y="2" width="16" height="14" rx="2" ry="2" stroke="currentColor" stroke-width="2" fill="none"/>'},oven:{viewBox:"4 4 92 92",content:'<rect x="5" y="5" width="90" height="90" rx="3" ry="3" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="30" cy="30" r="14" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="30" cy="30" r="7" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="70" cy="30" r="14" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="70" cy="30" r="7" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="30" cy="70" r="14" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="30" cy="70" r="7" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="70" cy="70" r="14" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="70" cy="70" r="7" stroke="currentColor" stroke-width="2" fill="none"/>'},plant:{viewBox:"4.25 4.25 51.5 51.5",content:'<circle cx="30" cy="30" r="25" stroke="currentColor" stroke-width="1.5" fill="none"/><g transform="translate(30,30)"><path d="M 0,0 C -5,-10 -3,-18 0,-20 C 3,-18 5,-10 0,0 Z" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M 0,0 C -5,-10 -3,-18 0,-20 C 3,-18 5,-10 0,0 Z" transform="rotate(72)" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M 0,0 C -5,-10 -3,-18 0,-20 C 3,-18 5,-10 0,0 Z" transform="rotate(144)" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M 0,0 C -5,-10 -3,-18 0,-20 C 3,-18 5,-10 0,0 Z" transform="rotate(216)" stroke="currentColor" stroke-width="1.5" fill="none"/><path d="M 0,0 C -5,-10 -3,-18 0,-20 C 3,-18 5,-10 0,0 Z" transform="rotate(288)" stroke="currentColor" stroke-width="1.5" fill="none"/></g>'},pool:{viewBox:"4 4 172 92",content:'<rect x="5" y="5" width="170" height="90" rx="20" ry="20" stroke="currentColor" stroke-width="2" fill="none"/><rect x="12" y="12" width="156" height="76" rx="16" ry="16" stroke="currentColor" stroke-width="2" fill="none"/><line x1="25" y1="30" x2="155" y2="30" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"/><line x1="25" y1="50" x2="155" y2="50" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"/><line x1="25" y1="70" x2="155" y2="70" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3"/><path d="M 20,12 L 20,25 L 35,25 L 35,18 L 28,18 L 28,12" stroke="currentColor" stroke-width="1.5" fill="none"/>'},shower:{viewBox:"4 4 92 92",content:'<rect x="5" y="5" width="90" height="90" rx="5" ry="5" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="22" cy="22" r="9" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="22" cy="22" r="4" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="50" cy="50" r="5" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="50" cy="50" r="2" fill="currentColor" stroke="none"/>'},"sofa-two-seater":{viewBox:"4 4 152 82",content:'<path d="M 15,10 Q 15,5 20,5 L 140,5 Q 145,5 145,10 L 145,25 L 15,25 Z" stroke="currentColor" stroke-width="2" fill="none"/><path d="M 10,15 Q 5,15 5,20 L 5,80 Q 5,85 10,85 L 20,85 L 20,15 Z" stroke="currentColor" stroke-width="2" fill="none"/><path d="M 140,15 L 140,85 L 150,85 Q 155,85 155,80 L 155,20 Q 155,15 150,15 Z" stroke="currentColor" stroke-width="2" fill="none"/><rect x="20" y="25" width="120" height="60" rx="3" ry="3" stroke="currentColor" stroke-width="2" fill="none"/><line x1="80" y1="28" x2="80" y2="82" stroke="currentColor" stroke-width="2"/>'},"sofa-three-seater":{viewBox:"4 4 212 82",content:'<path d="M 15,10 Q 15,5 20,5 L 200,5 Q 205,5 205,10 L 205,25 L 15,25 Z" stroke="currentColor" stroke-width="2" fill="none"/><path d="M 10,15 Q 5,15 5,20 L 5,80 Q 5,85 10,85 L 20,85 L 20,15 Z" stroke="currentColor" stroke-width="2" fill="none"/><path d="M 200,15 L 200,85 L 210,85 Q 215,85 215,80 L 215,20 Q 215,15 210,15 Z" stroke="currentColor" stroke-width="2" fill="none"/><rect x="20" y="25" width="180" height="60" rx="3" ry="3" stroke="currentColor" stroke-width="2" fill="none"/><line x1="80" y1="28" x2="80" y2="82" stroke="currentColor" stroke-width="2"/><line x1="140" y1="28" x2="140" y2="82" stroke="currentColor" stroke-width="2"/>'},"table-dining-room":{viewBox:"7 4 166 112",content:'<rect x="35" y="28" width="110" height="64" rx="3" ry="3" stroke="currentColor" stroke-width="2" fill="none"/><rect x="52" y="5" width="30" height="16" rx="4" ry="4" stroke="currentColor" stroke-width="2" fill="none"/><rect x="98" y="5" width="30" height="16" rx="4" ry="4" stroke="currentColor" stroke-width="2" fill="none"/><rect x="52" y="99" width="30" height="16" rx="4" ry="4" stroke="currentColor" stroke-width="2" fill="none"/><rect x="98" y="99" width="30" height="16" rx="4" ry="4" stroke="currentColor" stroke-width="2" fill="none"/><rect x="8" y="45" width="16" height="30" rx="4" ry="4" stroke="currentColor" stroke-width="2" fill="none"/><rect x="156" y="45" width="16" height="30" rx="4" ry="4" stroke="currentColor" stroke-width="2" fill="none"/>'},"table-dining-room-round":{viewBox:"7 7 106 106",content:'<circle cx="60" cy="60" r="30" stroke="currentColor" stroke-width="2" fill="none"/><rect x="42" y="8" width="36" height="14" rx="4" ry="4" stroke="currentColor" stroke-width="2" fill="none"/><rect x="42" y="98" width="36" height="14" rx="4" ry="4" stroke="currentColor" stroke-width="2" fill="none"/><rect x="8" y="42" width="14" height="36" rx="4" ry="4" stroke="currentColor" stroke-width="2" fill="none"/><rect x="98" y="42" width="14" height="36" rx="4" ry="4" stroke="currentColor" stroke-width="2" fill="none"/>'},television:{viewBox:"4 1 152 17",content:'<rect x="5" y="2" width="150" height="8" rx="1" ry="1" stroke="currentColor" stroke-width="2" fill="none"/><rect x="60" y="10" width="40" height="7" rx="2" ry="2" stroke="currentColor" stroke-width="2" fill="none"/>'},"bedside-table":{viewBox:"4 4 42 42",content:'<rect x="5" y="5" width="40" height="40" rx="2" ry="2" stroke="currentColor" stroke-width="2" fill="none"/><line x1="5" y1="25" x2="45" y2="25" stroke="currentColor" stroke-width="2"/>'},bidet:{viewBox:"9 9 62 82",content:'<ellipse cx="40" cy="50" rx="30" ry="40" stroke="currentColor" stroke-width="2" fill="none"/><ellipse cx="40" cy="53" rx="20" ry="28" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="40" cy="18" r="4" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="40" cy="18" r="1.5" fill="currentColor" stroke="none"/>'},cabinet:{viewBox:"4 4 72 32",content:'<rect x="5" y="5" width="70" height="30" rx="2" ry="2" stroke="currentColor" stroke-width="2" fill="none"/><line x1="8" y1="15" x2="72" y2="15" stroke="currentColor" stroke-width="1" stroke-dasharray="3 2"/><line x1="8" y1="25" x2="72" y2="25" stroke="currentColor" stroke-width="1" stroke-dasharray="3 2"/>'},counter:{viewBox:"4 4 192 32",content:'<rect x="5" y="5" width="190" height="30" rx="2" ry="2" stroke="currentColor" stroke-width="2" fill="none"/>'},cupboard:{viewBox:"4 4 92 42",content:'<rect x="5" y="5" width="90" height="40" rx="2" ry="2" stroke="currentColor" stroke-width="2" fill="none"/><line x1="50" y1="5" x2="50" y2="45" stroke="currentColor" stroke-width="2"/><circle cx="43" cy="25" r="2" fill="currentColor" stroke="none"/><circle cx="57" cy="25" r="2" fill="currentColor" stroke="none"/>'},desk:{viewBox:"4 4 132 87.2485",content:'<rect x="30" y="64" width="66" height="14" rx="4" ry="4" stroke="currentColor" stroke-width="2" fill="none"/><line x1="33" y1="78" x2="30" y2="86" stroke="currentColor" stroke-width="2"/><line x1="93" y1="78" x2="96" y2="86" stroke="currentColor" stroke-width="2"/><path d="M 30,86 Q 63,94 96,86" stroke="currentColor" stroke-width="2.5" fill="none"/><rect x="5" y="5" width="130" height="55" rx="2" ry="2" stroke="currentColor" stroke-width="2" fill="none"/><rect x="40" y="12" width="42" height="12" rx="1" ry="1" stroke="currentColor" stroke-width="2" fill="none"/><rect x="40" y="26" width="42" height="26" rx="2" ry="2" stroke="currentColor" stroke-width="2" fill="none"/><line x1="45" y1="32" x2="77" y2="32" stroke="currentColor" stroke-width="1"/><line x1="45" y1="37" x2="77" y2="37" stroke="currentColor" stroke-width="1"/><line x1="45" y1="42" x2="77" y2="42" stroke="currentColor" stroke-width="1"/><rect x="54" y="44" width="14" height="6" rx="1" ry="1" stroke="currentColor" stroke-width="1" fill="none"/><circle cx="110" cy="22" r="10" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="110" cy="22" r="4" stroke="currentColor" stroke-width="2" fill="none"/>'},fridge:{viewBox:"4 4 62 62",content:'<rect x="5" y="5" width="60" height="60" rx="3" ry="3" stroke="currentColor" stroke-width="2" fill="none"/><rect x="9" y="9" width="52" height="52" rx="2" ry="2" stroke="currentColor" stroke-width="2" fill="none"/><line x1="14" y1="22" x2="14" y2="48" stroke="currentColor" stroke-width="2.5"/><circle cx="57" cy="20" r="1.5" fill="currentColor" stroke="none"/><circle cx="57" cy="50" r="1.5" fill="currentColor" stroke="none"/>'},"kitchen-island":{viewBox:"4 4 192 72",content:'<rect x="5" y="5" width="190" height="70" rx="3" ry="3" stroke="currentColor" stroke-width="2" fill="none"/><rect x="20" y="35" width="35" height="25" rx="5" ry="5" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="37" cy="47" r="3" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="37" cy="47" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="32" r="3" stroke="currentColor" stroke-width="2" fill="none"/><path d="M 16,32 Q 28,32 28,42" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="130" cy="25" r="10" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="130" cy="25" r="5" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="165" cy="25" r="10" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="165" cy="25" r="5" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="130" cy="55" r="10" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="130" cy="55" r="5" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="165" cy="55" r="10" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="165" cy="55" r="5" stroke="currentColor" stroke-width="2" fill="none"/>'},"side-table":{viewBox:"7.2513 3.5 39.4975 40.5",content:'<circle cx="27" cy="25" r="18" stroke="currentColor" stroke-width="2" fill="none"/><path d="M 21,8 Q 27,1 33,8" stroke="currentColor" stroke-width="2" fill="none"/><path d="M 9,28 Q 6,37 15,39" stroke="currentColor" stroke-width="2" fill="none"/><path d="M 39,39 Q 48,37 45,28" stroke="currentColor" stroke-width="2" fill="none"/>'},"sliding-door":{viewBox:"-2.5 4.75 105 10.5",content:'<line x1="0" y1="10" x2="8" y2="10" stroke="currentColor" stroke-width="5"/><line x1="92" y1="10" x2="100" y2="10" stroke="currentColor" stroke-width="5"/><line x1="8" y1="6" x2="52" y2="6" stroke="currentColor" stroke-width="2.5"/><line x1="48" y1="14" x2="92" y2="14" stroke="currentColor" stroke-width="2.5"/>'},speaker:{viewBox:"2.25 2.25 25.5 35.5",content:'<rect x="3" y="3" width="24" height="34" rx="3" ry="3" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="15" cy="25" r="8" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="15" cy="25" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="15" cy="11" r="4" stroke="currentColor" stroke-width="1.5" fill="none"/><circle cx="15" cy="11" r="1.5" fill="currentColor" stroke="none"/>'},"washing-machine":{viewBox:"4 4 72 72",content:'<rect x="5" y="5" width="70" height="70" rx="5" ry="5" stroke="currentColor" stroke-width="2" fill="none"/><line x1="5" y1="20" x2="75" y2="20" stroke="currentColor" stroke-width="2"/><circle cx="22" cy="13" r="5" stroke="currentColor" stroke-width="2" fill="none"/><line x1="22" y1="13" x2="22" y2="9" stroke="currentColor" stroke-width="1.5"/><circle cx="55" cy="13" r="2.5" fill="currentColor" stroke="none"/><circle cx="65" cy="13" r="2.5" fill="currentColor" stroke="none"/><circle cx="40" cy="48" r="20" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="40" cy="48" r="14" stroke="currentColor" stroke-width="2" fill="none"/>'},window:{viewBox:"-1 1 102 12",content:'<line x1="0" y1="2" x2="100" y2="2" stroke="currentColor" stroke-width="2"/><line x1="0" y1="12" x2="100" y2="12" stroke="currentColor" stroke-width="2"/><line x1="0" y1="7" x2="100" y2="7" stroke="currentColor" stroke-width="1"/><line x1="50" y1="2" x2="50" y2="12" stroke="currentColor" stroke-width="1.5"/>'},toilet:{viewBox:"17 3 66 103",content:'<rect x="18" y="4" width="64" height="24" rx="4" ry="4" stroke="currentColor" stroke-width="2" fill="none"/><rect x="22" y="7" width="56" height="18" rx="2" ry="2" stroke="currentColor" stroke-width="2" fill="none"/><ellipse cx="50" cy="16" rx="6" ry="4" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="30" cy="30" r="2.5" fill="currentColor" stroke="none"/><circle cx="70" cy="30" r="2.5" fill="currentColor" stroke="none"/><path d="M 20,32 L 20,60 Q 20,100 50,105 Q 80,100 80,60 L 80,32" stroke="currentColor" stroke-width="2" fill="none"/><path d="M 24,34 L 24,58 Q 24,94 50,99 Q 76,94 76,58 L 76,34" stroke="currentColor" stroke-width="2" fill="none"/><path d="M 32,40 L 32,58 Q 32,86 50,90 Q 68,86 68,58 L 68,40 Q 68,36 50,36 Q 32,36 32,40 Z" stroke="currentColor" stroke-width="2" fill="none"/><line x1="24" y1="34" x2="76" y2="34" stroke="currentColor" stroke-width="2"/>'},washbasin:{viewBox:"4 4 92 62",content:'<rect x="5" y="5" width="90" height="60" rx="8" ry="8" stroke="currentColor" stroke-width="2" fill="none"/><ellipse cx="50" cy="40" rx="35" ry="20" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="50" cy="12" r="3.5" stroke="currentColor" stroke-width="2" fill="none"/><rect x="48.5" y="13" width="3" height="6" rx="1" ry="1" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="50" cy="40" r="3" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="50" cy="40" r="1" fill="currentColor" stroke="none"/>'}},Mi=[{type:"svg",icon:"armchair",label:"furniture.armchair",defaultWidth:800,defaultHeight:800},{type:"svg",icon:"bath",label:"furniture.bath",defaultWidth:1700,defaultHeight:700},{type:"svg",icon:"bed-double",label:"furniture.double_bed",defaultWidth:1600,defaultHeight:2e3},{type:"svg",icon:"bed-single",label:"furniture.single_bed",defaultWidth:900,defaultHeight:2e3},{type:"svg",icon:"door-left",label:"furniture.door_left_swing",defaultWidth:800,defaultHeight:800},{type:"svg",icon:"door-right",label:"furniture.door_right_swing",defaultWidth:800,defaultHeight:800},{type:"svg",icon:"table-dining-room",label:"furniture.dining_table",defaultWidth:1600,defaultHeight:900},{type:"svg",icon:"table-dining-room-round",label:"furniture.round_table",defaultWidth:1e3,defaultHeight:1e3},{type:"svg",icon:"floor-lamp",label:"furniture.lamp",defaultWidth:400,defaultHeight:400},{type:"svg",icon:"oven",label:"furniture.oven_stove",defaultWidth:600,defaultHeight:600},{type:"svg",icon:"plant",label:"furniture.plant",defaultWidth:400,defaultHeight:400},{type:"svg",icon:"shower",label:"furniture.shower",defaultWidth:900,defaultHeight:900},{type:"svg",icon:"sofa-two-seater",label:"furniture.sofa_2_seat",defaultWidth:1600,defaultHeight:800},{type:"svg",icon:"sofa-three-seater",label:"furniture.sofa_3_seat",defaultWidth:2400,defaultHeight:800},{type:"svg",icon:"television",label:"furniture.tv",defaultWidth:1200,defaultHeight:200},{type:"svg",icon:"toilet",label:"furniture.toilet",defaultWidth:400,defaultHeight:700},{type:"svg",icon:"car",label:"furniture.car",defaultWidth:1800,defaultHeight:4500},{type:"svg",icon:"carpet",label:"furniture.carpet",defaultWidth:2e3,defaultHeight:1400},{type:"svg",icon:"cat-bed",label:"furniture.cat_bed",defaultWidth:500,defaultHeight:500},{type:"svg",icon:"dog-bed",label:"furniture.dog_bed",defaultWidth:800,defaultHeight:600},{type:"svg",icon:"pool",label:"furniture.pool",defaultWidth:5e3,defaultHeight:3e3},{type:"svg",icon:"bedside-table",label:"furniture.bedside_table",defaultWidth:500,defaultHeight:500},{type:"svg",icon:"bidet",label:"furniture.bidet",defaultWidth:400,defaultHeight:500},{type:"svg",icon:"washbasin",label:"furniture.washbasin",defaultWidth:600,defaultHeight:420},{type:"svg",icon:"hot-tub",label:"furniture.hot_tub",defaultWidth:1500,defaultHeight:1500},{type:"svg",icon:"cabinet",label:"furniture.cabinet",defaultWidth:800,defaultHeight:400},{type:"svg",icon:"ceiling-fan",label:"furniture.ceiling_fan",defaultWidth:1200,defaultHeight:1200},{type:"svg",icon:"counter",label:"furniture.counter",defaultWidth:2e3,defaultHeight:400},{type:"svg",icon:"cupboard",label:"furniture.cupboard",defaultWidth:1e3,defaultHeight:500},{type:"svg",icon:"desk",label:"furniture.desk",defaultWidth:1400,defaultHeight:700},{type:"svg",icon:"fridge",label:"furniture.fridge",defaultWidth:700,defaultHeight:700},{type:"svg",icon:"kitchen-island",label:"furniture.kitchen_island",defaultWidth:2e3,defaultHeight:800},{type:"svg",icon:"side-table",label:"furniture.side_table",defaultWidth:500,defaultHeight:500},{type:"svg",icon:"sliding-door",label:"furniture.sliding_door",defaultWidth:1e3,defaultHeight:200},{type:"svg",icon:"speaker",label:"furniture.speaker",defaultWidth:300,defaultHeight:300},{type:"svg",icon:"washing-machine",label:"furniture.washing_machine",defaultWidth:600,defaultHeight:600},{type:"svg",icon:"window",label:"furniture.window",defaultWidth:1e3,defaultHeight:150}],ki=["corners.front_left","corners.front_right","corners.back_right","corners.back_left"],Ti=[["corners.left_wall","corners.front_wall"],["corners.right_wall","corners.front_wall"],["corners.right_wall","corners.back_wall"],["corners.left_wall","corners.back_wall"]],Fi=["#2196F3","#FF5722","#4CAF50"];if(3!==Fi.length)throw new Error(`TARGET_COLORS palette (${Fi.length}) must match MAX_TARGETS (3)`);const Pi=Math.PI/3,zi=_i*Math.sin(Math.PI/3),Ui="var(--card-background-color, #fff)";function Oi(e,t,i=Ui){if(!fi(e))return"var(--secondary-background-color, #e0e0e0)";const s=mi(e);if(s>0&&s<=7){const e=t[s-1];if(e)return e.color}return i}const Hi="var(--error-color, #cc3333)";function Qi(e,t,i){return`repeating-linear-gradient(${e}deg, transparent, transparent ${i}px, ${t} ${i}px, ${t} ${i+2}px)`}function Gi(e,t){switch(e){case 1:return Qi(45,"rgba(60,60,60,0.7)",t);case 2:return Qi(-45,Hi,t);case 3:return`${Qi(-45,Hi,t)}, ${Qi(45,Hi,t)}`;default:return""}}const Li=[[255,224,130],[255,138,0],[221,44,0]];function $i(e){if(e<=0)return"transparent";const t=Math.min(1,Math.max(0,e/255)),i=Math.log1p(9*t)/Math.log(10),s=i>=.5?1:0,r=1===s?2*(i-.5):2*i,[o,a,n]=Li[s],[l,c,h]=Li[s+1];return`rgba(${Math.round(o+(l-o)*r)}, ${Math.round(a+(c-a)*r)}, ${Math.round(n+(h-n)*r)}, ${Math.min(1,.15+.7*i).toFixed(3)})`}let Ni=0;function Yi(e,t,i){const s=e[6]*t+e[7]*i+1;return{x:(e[0]*t+e[1]*i+e[2])/s,y:(e[3]*t+e[4]*i+e[5])/s}}function Ki(e){const t=Yi(e,0,0),i=Yi(e,0,1e3),s=i.x-t.x,r=i.y-t.y,o=Math.sqrt(s*s+r*r);return!Number.isFinite(o)||o<1e-6?null:{sensorPos:t,dirX:s/o,dirY:r/o}}function Wi(e){return e?Yi(e,0,0):null}function Ji(e,t,i,s,r){if(!i)return"in_range";const{x:o,y:a}=Ii(e,t,s),n=o-i.sensorPos.x,l=a-i.sensorPos.y,c=n*n+l*l;if(c<1)return"in_range";const h=n*i.dirX+l*i.dirY;return h<=0||h*h<.25*c||c>36e6?"out_of_cone":c>r*r?"beyond_max_range":"in_range"}function ji(e,t,i,s,r){let o=pi,a=0,n=ui,l=0;for(let c=0;c<gi;c++){if(!fi(e[c]))continue;const h=c%pi,d=Math.floor(c/pi);"out_of_cone"!==Ji(h,d,t,i,s)&&(h<o&&(o=h),h>a&&(a=h),d<n&&(n=d),d>l&&(l=d),r?.(h,d))}return{minCol:o,maxCol:a,minRow:n,maxRow:l}}function Zi(e,t,i,s){const r=ji(e,t,i,s),{minCol:o,maxCol:a,minRow:n,maxRow:l}=r;return o>a?r:{minCol:Math.max(0,o-1),maxCol:Math.min(19,a+1),minRow:Math.max(0,n-1),maxRow:Math.min(19,l+1)}}function Vi(e,t){const i=Si(t);return{minX:(e.minCol-i)*Ai,maxX:(e.maxCol+1-i)*Ai,minY:e.minRow*Ai,maxY:(e.maxRow+1)*Ai}}function Xi(e,t,i,s){if(e<=0||t<=0)return 0;const r=Wi(i);if(r){let t=0;const i=yi(s);for(let o=i.minRow;o<=i.maxRow;o++)for(let a=i.minCol;a<=i.maxCol;a++){if(!fi(s[o*pi+a]))continue;const{x:i,y:n}=Ii(a,o,e),l=i-r.x,c=n-r.y,h=Math.sqrt(l*l+c*c);h>t&&(t=h)}if(t>0){const e=t/1e3;return Math.ceil(2*e)/2}}const o=Math.max(e,t)/1e3;return Math.ceil(2*o)/2}function qi(e){const t=(e,t,i,s,r,o)=>{const a=((e,t)=>Math.sqrt((e.raw_x-t.raw_x)**2+(e.raw_y-t.raw_y)**2))(e,t),n=r-o;return Math.sqrt(Math.max(a*a-n*n,0))+i+s},i=e=>e.offset_side??0,s=e=>e.offset_fb??0,[r,o,a,n]=e,l=Math.round(t(r,o,i(r),i(o),s(r),s(o))),c=t(r,n,s(r),s(n),i(r),i(n)),h=t(o,a,s(o),s(a),i(o),i(a));return{width:l,depth:Math.round((c+h)/2)}}function es(e){if(0===e.length)return 0;const t=[...e].sort((e,t)=>e-t),i=Math.floor(t.length/2);return t.length%2?t[i]:(t[i-1]+t[i])/2}function ts(e,t,i,s,r){const o=s&&null!=r?s:null,a=r??0,n=s?.sensorPos??Wi(i);let l=0;const c=(e,i)=>(s,r)=>{const{x:o,y:a}=Ii(s,r,t),n=o-e,c=a-i,h=n*n+c*c;h>l&&(l=h)},h=ji(e,o,t,a,n?c(n.x,n.y):void 0);if(h.minCol>h.maxCol)return null;const d=(h.maxCol-h.minCol+1)*Ai,p=(h.maxRow-h.minRow+1)*Ai;return n||ji(e,o,t,a,c(d/2,0)),{widthM:d/1e3,depthM:p/1e3,furthestM:Math.sqrt(l)/1e3}}class is extends he{constructor(){super(...arguments),this.localize=Jt,this.showBackup=!1,this.showRestore=!1,this.configurations=[],this.configurationName="",this.perspective=null,this.maxRangeMm=0,this.sensorFov=null,this._configurationMetricsCache=new WeakMap}_getConfigurationMetrics(e){const t=this.perspective,i=this.maxRangeMm,s=this._configurationMetricsCache.get(e);if(s&&s.perspective===t&&s.maxRangeMm===i)return{widthM:s.widthM,depthM:s.depthM};const r=ts(new Uint8Array(e.grid),e.roomWidth,t,this.sensorFov,i),o=r?r.widthM:e.roomWidth/1e3,a=r?r.depthM:e.roomDepth/1e3;return this._configurationMetricsCache.set(e,{perspective:t,maxRangeMm:i,widthM:o,depthM:a}),{widthM:o,depthM:a}}_dispatch(e,t){this.dispatchEvent(new CustomEvent(e,{detail:t,bubbles:!0,composed:!0}))}render(){return Y`
      ${this.showBackup?this._renderBackupDialog():J}
      ${this.showRestore?this._renderRestoreDialog():J}
    `}_renderBackupDialog(){return Y`
      <epp-dialog
        ?open=${this.showBackup}
        heading=${this.localize("dialogs.backup_configuration")}
        @dialog-dismiss=${()=>this._dispatch("backup-cancel")}
      >
        <epp-field
          class="configuration-name-input"
          type="text"
          placeholder="${this.localize("dialogs.configuration_name")}"
          .value=${this.configurationName}
          @value-changed=${e=>{this._dispatch("configuration-name-change",e.detail.value)}}
        ></epp-field>
        <epp-button
          slot="actions"
          class="wizard-btn-back"
          variant="text"
          @click=${()=>this._dispatch("backup-cancel")}
        >${this.localize("common.cancel")}</epp-button>
        <epp-button
          slot="actions"
          class="wizard-btn-primary"
          variant="primary"
          ?disabled=${!this.configurationName.trim()}
          @click=${()=>this._dispatch("configuration-save")}
        >${this.localize("common.save")}</epp-button>
      </epp-dialog>
    `}_renderRestoreDialog(){const e=this.configurations.filter(e=>Array.isArray(e.zones)&&8===e.zones.length);return Y`
      <epp-dialog
        ?open=${this.showRestore}
        heading=${this.localize("dialogs.restore_configuration")}
        @dialog-dismiss=${()=>this._dispatch("restore-close")}
      >
        ${0===e.length?Y`<p class="overlay-help">${this.localize("dialogs.no_configurations")}</p>`:Y`<div class="configuration-card-grid">
                ${e.map(e=>Y`
                  <div class="configuration-card"
                    role="button"
                    tabindex="0"
                    @click=${()=>this._dispatch("configuration-load",e.name)}
                    @keydown=${t=>{"Enter"!==t.key&&" "!==t.key||(t.preventDefault(),this._dispatch("configuration-load",e.name))}}
                  >
                    <epp-icon-button
                      class="configuration-card-delete"
                      icon="mdi:delete"
                      label="${this.localize("common.delete")}"
                      variant="danger"
                      @click=${t=>{t.stopPropagation(),this._dispatch("configuration-delete",e.name)}}
                      @keydown=${e=>{e.stopPropagation()}}
                    ></epp-icon-button>
                    <div class="configuration-card-thumbnail">
                      ${function(e,t,i,s,r){const o=e instanceof Uint8Array?e:new Uint8Array(e),a=Ci(o);if(a.minCol>a.maxCol||a.minRow>a.maxRow)return K`<svg viewBox="0 0 1 1" preserveAspectRatio="xMidYMid meet"></svg>`;const{minCol:n,maxCol:l,minRow:c,maxRow:h}=a,d=l-n+1,p=h-c+1,u=[],g=[],A=new Set,_=++Ni,f=e=>`overlay-${e}-${_}`;for(let e=c;e<=h;e++)for(let i=n;i<=l;i++){const s=o[e*pi+i];if(!fi(s))continue;const r=Oi(s,t);u.push(K`<rect x="${i-n}" y="${e-c}" width="1" height="1" fill="${r}" />`);const a=i-n,l=e-c,h=vi(s);1===h?(A.add("entry"),g.push(K`<rect x="${a}" y="${l}" width="1" height="1" fill="url(#${f("entry")})" />`)):2===h?(A.add("interference"),g.push(K`<rect x="${a}" y="${l}" width="1" height="1" fill="url(#${f("interference")})" />`)):3===h&&(A.add("suppress"),g.push(K`<rect x="${a}" y="${l}" width="1" height="1" fill="url(#${f("suppress")})" />`))}const m=A.size>0?K`<defs>
			${A.has("entry")?K`<pattern id="${f("entry")}" width="0.25" height="0.25" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
				<line x1="0" y1="0" x2="0" y2="0.25" stroke="rgba(80,80,80,0.5)" stroke-width="0.08" />
			</pattern>`:""}
			${A.has("interference")?K`<pattern id="${f("interference")}" width="0.25" height="0.25" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
				<line x1="0" y1="0" x2="0" y2="0.25" stroke="rgba(244,67,54,0.5)" stroke-width="0.08" />
			</pattern>`:""}
			${A.has("suppress")?K`<pattern id="${f("suppress")}" width="0.25" height="0.25" patternUnits="userSpaceOnUse">
				<line x1="0" y1="0" x2="0.25" y2="0.25" stroke="rgba(244,67,54,0.5)" stroke-width="0.06" />
				<line x1="0.25" y1="0" x2="0" y2="0.25" stroke="rgba(244,67,54,0.5)" stroke-width="0.06" />
			</pattern>`:""}
		</defs>`:"",w=Si(i),v=[];for(const e of r){const t=e.x/Ai+w-n,i=e.y/Ai-c,s=e.width/Ai,r=e.height/Ai,o=t+s/2,a=i+r/2,l="svg"===e.type&&Object.hasOwn(Ri,e.icon)?Ri[e.icon]:void 0;if(l){const[n,c,h,d]=l.viewBox.split(" ").map(Number),p=s/h,u=r/d,g=[e.rotation?`rotate(${e.rotation}, ${o}, ${a})`:"",`translate(${t}, ${i})`,`scale(${p}, ${u})`,`translate(${-n}, ${-c})`].filter(Boolean);v.push(K`<g transform="${g.join(" ")}">
					${li(l.content)}
				</g>`)}else{const n=e.rotation?`rotate(${e.rotation}, ${o}, ${a})`:"";v.push(K`<rect x="${t}" y="${i}" width="${s}" height="${r}"
					fill="none" stroke="currentColor" stroke-opacity="0.6" stroke-width="0.15"
					rx="0.1" transform="${n}" />`)}}return K`<svg viewBox="0 0 ${d} ${p}" preserveAspectRatio="xMidYMid meet">
    ${m}
    ${u}
    ${g}
    ${v}
  </svg>`}(e.grid,e.zones?.slice(1)??new Array(7).fill(null),e.roomWidth,e.roomDepth,e.furniture??[])}
                    </div>
                    <div class="configuration-card-info">
                      <div class="configuration-card-name">${e.name}</div>
                      <div class="configuration-card-size">${(()=>{const{widthM:t,depthM:i}=this._getConfigurationMetrics(e);return`${this.localize.formatNumber(t,1)}m × ${this.localize.formatNumber(i,1)}m`})()}</div>
                    </div>
                  </div>
                `)}
              </div>`}
        <epp-button
          slot="actions"
          class="wizard-btn-back"
          variant="text"
          @click=${()=>this._dispatch("restore-close")}
        >${this.localize("common.close")}</epp-button>
      </epp-dialog>
    `}}is.styles=[xe,n`
      .overlay-help {
        font-size: var(--epp-font-sm, 13px);
        color: var(--epp-text-muted, var(--secondary-text-color, #757575));
        margin: 0;
      }
    `],e([ge({attribute:!1})],is.prototype,"localize",void 0),e([ge({type:Boolean})],is.prototype,"showBackup",void 0),e([ge({type:Boolean})],is.prototype,"showRestore",void 0),e([ge({attribute:!1})],is.prototype,"configurations",void 0),e([ge({type:String})],is.prototype,"configurationName",void 0),e([ge({attribute:!1})],is.prototype,"perspective",void 0),e([ge({type:Number})],is.prototype,"maxRangeMm",void 0),e([ge({attribute:!1})],is.prototype,"sensorFov",void 0),customElements.get("epp-configuration-dialogs")||customElements.define("epp-configuration-dialogs",is);class ss extends he{constructor(){super(...arguments),this.name="",this.hass=null,this.localize=e=>e,this._name="",this._areaId=null,this._recreate=!0,this._initialName="",this._initialAreaId=null,this._initialized=!1,this._onNameChanged=e=>{e.stopPropagation(),this._name=e.detail.value},this._onAreaChanged=e=>{e.stopPropagation(),this._areaId=e.detail.value||null},this._onRecreateChanged=e=>{e.stopPropagation(),this._recreate=e.detail.value},this._submit=()=>{this.dispatchEvent(new CustomEvent("setup-submit",{detail:{name:this._name,areaId:this._areaId,recreateEntityIds:this._hasNewName&&this._recreate},bubbles:!0,composed:!0}))}}willUpdate(e){!this._initialized&&e.has("name")&&(this._initialized=!0,this._name=this.name??"",this._initialName=this.name??"")}get _nameChanged(){return this._name!==this._initialName}get _hasNewName(){return this._nameChanged&&""!==this._name.trim()}get _dirty(){return this._nameChanged||this._areaId!==this._initialAreaId}_renderArea(e){return customElements.get("ha-area-picker")?Y`<ha-area-picker .hass=${this.hass} .value=${this._areaId??""} @value-changed=${this._onAreaChanged}></ha-area-picker>`:Y`<epp-field .label=${e("device_setup.area_label")} .value=${this._areaId??""} @value-changed=${this._onAreaChanged}></epp-field>`}render(){const e=this.localize,t=this._dirty?e("device_setup.finish"):e("device_setup.skip_and_finish");return Y`
			<p>${e("device_setup.name_help")}</p>
			<epp-field
				.label=${e("device_setup.name_label")}
				.value=${this._name}
				@value-changed=${this._onNameChanged}
			></epp-field>
			<p>${e("device_setup.area_help")}</p>
			${this._renderArea(e)}
			${this._hasNewName?Y`<epp-toggle
						class="recreate-toggle"
						data-test="recreate"
						.label=${e("device_setup.recreate_entity_ids")}
						.checked=${this._recreate}
						@value-changed=${this._onRecreateChanged}
					></epp-toggle>`:""}
			<div class="setup-form-actions">
				<epp-button variant="primary" @click=${this._submit}>${t}</epp-button>
			</div>
		`}}ss.styles=n`
		.recreate-toggle {
			margin-top: var(--epp-space-3);
		}
		.setup-form-actions {
			display: flex;
			justify-content: flex-end;
			gap: var(--epp-space-3);
			margin-top: var(--epp-space-4);
		}
	`,e([ge({type:String})],ss.prototype,"name",void 0),e([ge({attribute:!1})],ss.prototype,"hass",void 0),e([ge({attribute:!1})],ss.prototype,"localize",void 0),e([Ae()],ss.prototype,"_name",void 0),e([Ae()],ss.prototype,"_areaId",void 0),e([Ae()],ss.prototype,"_recreate",void 0),customElements.get("epp-setup-form")||customElements.define("epp-setup-form",ss);class rs extends he{constructor(){super(...arguments),this.open=!1,this.device=null,this.hass=null,this.localize=e=>e,this._onSubmit=e=>{if(e.stopPropagation(),!this.device)return;const{name:t,areaId:i,recreateEntityIds:s}=e.detail;this.dispatchEvent(new CustomEvent("setup-complete",{detail:{mac:this.device.mac,name:t,areaId:i,recreateEntityIds:s},bubbles:!0,composed:!0}))},this._onSkip=e=>{e?.stopPropagation(),this.device&&this.dispatchEvent(new CustomEvent("setup-skip",{detail:{mac:this.device.mac},bubbles:!0,composed:!0}))}}render(){if(!this.open||!this.device)return J;const e=this.localize;return Y`
			<epp-dialog .open=${this.open} .heading=${e("device_setup.title")} @dialog-dismiss=${this._onSkip}>
				<epp-setup-form
					.name=${this.device.name??""}
					.hass=${this.hass}
					.localize=${this.localize}
					@setup-submit=${this._onSubmit}
				></epp-setup-form>
			</epp-dialog>
		`}}e([ge({type:Boolean})],rs.prototype,"open",void 0),e([ge({attribute:!1})],rs.prototype,"device",void 0),e([ge({attribute:!1})],rs.prototype,"hass",void 0),e([ge({attribute:!1})],rs.prototype,"localize",void 0),customElements.get("epp-device-setup")||customElements.define("epp-device-setup",rs);class os{constructor(e){this._specs=e,this._attached=!1;for(const t of e)if(!t.listener)throw new Error(`DocumentListenerGroup: listener for "${t.type}" is undefined — declare handler fields before the group that references them`)}get attached(){return this._attached}attach(){if(!this._attached){for(const e of this._specs)e.target.addEventListener(e.type,e.listener,e.options);this._attached=!0}}detach(){if(this._attached){for(const e of this._specs)e.target.removeEventListener(e.type,e.listener,e.options);this._attached=!1}}}const as="https://clintongormley.github.io/everything-presence-pro-grid/",ns=`${as}user-guide/web-flasher/`,ls={live:"user-guide/live-overview/",settings:"user-guide/settings/",tutorial:"user-guide/calibration/",calibrate:"user-guide/calibration/"},cs={zones:"user-guide/detection-zones/",overlays:"user-guide/overlays/",furniture:"user-guide/furniture/"};const hs=["M12 13C12.8 13 13.61 13.13 14.38 13.36C14.28 13.73 14.2 14.11 14.2 14.5V14.74C13.5 15.34 13 16.24 13 17.2V20.24L12 21.5C7.88 16.37 4.39 12.06 .365 7C3.69 4.41 7.78 3 12 3C16.2 3 20.31 4.41 23.64 7L20.91 10.39C20.32 10.14 19.68 10 19 10C18.87 10 18.75 10.03 18.62 10.04L20.7 7.45C18.08 5.86 15.06 5 12 5S5.9 5.85 3.26 7.44L8.38 13.8C9.5 13.28 10.74 13 12 13M23 17.3V20.8C23 21.4 22.4 22 21.7 22H16.2C15.6 22 15 21.4 15 20.7V17.2C15 16.6 15.6 16 16.2 16V14.5C16.2 13.1 17.6 12 19 12S21.8 13.1 21.8 14.5V16C22.4 16 23 16.6 23 17.3M20.5 14.5C20.5 13.7 19.8 13.2 19 13.2S17.5 13.7 17.5 14.5V16H20.5V14.5Z","M14.2 14.5V14.74C13.5 15.34 13 16.24 13 17.2V20.24L12 21.5C7.88 16.37 4.39 12.06 .365 7C3.69 4.41 7.78 3 12 3C16.2 3 20.31 4.41 23.64 7L20.91 10.39C20.32 10.14 19.68 10 19 10C18.87 10 18.74 10.03 18.61 10.04L20.7 7.45C18.08 5.86 15.06 5 12 5S5.9 5.85 3.26 7.44L6.5 11.43C7.73 10.75 9.61 10 12 10C13.68 10 15.12 10.38 16.26 10.84C15.03 11.67 14.2 13 14.2 14.5M23 17.3V20.8C23 21.4 22.4 22 21.7 22H16.2C15.6 22 15 21.4 15 20.7V17.2C15 16.6 15.6 16 16.2 16V14.5C16.2 13.1 17.6 12 19 12S21.8 13.1 21.8 14.5V16C22.4 16 23 16.6 23 17.3M20.5 14.5C20.5 13.7 19.8 13.2 19 13.2S17.5 13.7 17.5 14.5V16H20.5V14.5Z","M19 10C19.68 10 20.32 10.14 20.91 10.39L23.64 7C20.31 4.41 16.2 3 12 3C7.78 3 3.69 4.41 .365 7C4.39 12.06 7.88 16.37 12 21.5L13 20.24V17.2C13 16.24 13.5 15.34 14.2 14.74V14.5C14.2 12.06 16.4 10 19 10M12 8C9 8 6.67 9 5.2 9.84L3.26 7.44C5.9 5.85 8.91 5 12 5S18.08 5.86 20.7 7.45L18.76 9.88C17.25 9 14.87 8 12 8M21.8 16V14.5C21.8 13.1 20.4 12 19 12S16.2 13.1 16.2 14.5V16C15.6 16 15 16.6 15 17.2V20.7C15 21.4 15.6 22 16.2 22H21.7C22.4 22 23 21.4 23 20.8V17.3C23 16.6 22.4 16 21.8 16M20.5 16H17.5V14.5C17.5 13.7 18.2 13.2 19 13.2S20.5 13.7 20.5 14.5V16Z","M14.2 14.5V14.74C13.5 15.34 13 16.24 13 17.2V20.24L12 21.5C7.88 16.37 4.39 12.06 .365 7C3.69 4.41 7.78 3 12 3C16.2 3 20.31 4.41 23.64 7L20.91 10.39C20.32 10.14 19.68 10 19 10C16.4 10 14.2 12.06 14.2 14.5M23 17.3V20.8C23 21.4 22.4 22 21.7 22H16.2C15.6 22 15 21.4 15 20.7V17.2C15 16.6 15.6 16 16.2 16V14.5C16.2 13.1 17.6 12 19 12S21.8 13.1 21.8 14.5V16C22.4 16 23 16.6 23 17.3M20.5 14.5C20.5 13.7 19.8 13.2 19 13.2S17.5 13.7 17.5 14.5V16H20.5V14.5Z"],ds=["M12 13C12.74 13 13.5 13.12 14.22 13.31C14.22 13.38 14.2 13.44 14.2 13.5V14.74C13.5 15.34 13 16.24 13 17.2V20.24L12 21.5C7.88 16.37 4.39 12.06 .365 7C3.69 4.41 7.78 3 12 3C16.2 3 20.31 4.41 23.64 7L21.5 9.69C20.86 9.33 20.16 9.11 19.42 9.04L20.7 7.45C18.08 5.86 15.06 5 12 5S5.9 5.85 3.26 7.44L8.38 13.8C9.5 13.28 10.74 13 12 13M21.8 16H17.5V13.5C17.5 12.7 18.2 12.2 19 12.2S20.5 12.7 20.5 13.5V14H21.8V13.5C21.8 12.1 20.4 11 19 11S16.2 12.1 16.2 13.5V16C15.6 16 15 16.6 15 17.2V20.7C15 21.4 15.6 22 16.2 22H21.7C22.4 22 23 21.4 23 20.8V17.3C23 16.6 22.4 16 21.8 16Z","M15.44 10.55C14.68 11.35 14.2 12.38 14.2 13.5V14.74C13.5 15.34 13 16.24 13 17.2V20.24L12 21.5C7.88 16.37 4.39 12.06 .365 7C3.69 4.41 7.78 3 12 3C16.2 3 20.31 4.41 23.64 7L21.5 9.69C20.86 9.33 20.16 9.1 19.41 9.04L20.7 7.45C18.08 5.86 15.06 5 12 5S5.9 5.85 3.26 7.44L6.5 11.43C7.73 10.75 9.61 10 12 10C13.29 10 14.45 10.23 15.44 10.55M21.8 16H17.5V13.5C17.5 12.7 18.2 12.2 19 12.2S20.5 12.7 20.5 13.5V14H21.8V13.5C21.8 12.1 20.4 11 19 11S16.2 12.1 16.2 13.5V16C15.6 16 15 16.6 15 17.2V20.7C15 21.4 15.6 22 16.2 22H21.7C22.4 22 23 21.4 23 20.8V17.3C23 16.6 22.4 16 21.8 16Z","M14.2 13.5V14.74C13.5 15.34 13 16.24 13 17.2V20.24L12 21.5C7.88 16.37 4.39 12.06 .365 7C3.69 4.41 7.78 3 12 3C16.2 3 20.31 4.41 23.64 7L21.5 9.69C20.86 9.33 20.17 9.11 19.42 9.04L20.7 7.45C18.08 5.86 15.06 5 12 5S5.9 5.85 3.26 7.44L5.2 9.84C6.67 9 9 8 12 8C14.18 8 16.08 8.58 17.53 9.25C15.63 9.85 14.2 11.54 14.2 13.5M21.8 16H17.5V13.5C17.5 12.7 18.2 12.2 19 12.2S20.5 12.7 20.5 13.5V14H21.8V13.5C21.8 12.1 20.4 11 19 11S16.2 12.1 16.2 13.5V16C15.6 16 15 16.6 15 17.2V20.7C15 21.4 15.6 22 16.2 22H21.7C22.4 22 23 21.4 23 20.8V17.3C23 16.6 22.4 16 21.8 16Z","M14.2 13.5V14.74C13.5 15.34 13 16.24 13 17.2V20.24L12 21.5C7.88 16.37 4.39 12.06 .365 7C3.69 4.41 7.78 3 12 3C16.2 3 20.31 4.41 23.64 7L21.5 9.69C20.75 9.26 19.9 9 19 9C16.4 9 14.2 11.06 14.2 13.5M21.8 16H17.5V13.5C17.5 12.7 18.2 12.2 19 12.2S20.5 12.7 20.5 13.5V14H21.8V13.5C21.8 12.1 20.4 11 19 11S16.2 12.1 16.2 13.5V16C15.6 16 15 16.6 15 17.2V20.7C15 21.4 15.6 22 16.2 22H21.7C22.4 22 23 21.4 23 20.8V17.3C23 16.6 22.4 16 21.8 16Z"];function ps(e,t){const i=e>=-50?3:e>=-65?2:e>=-75?1:0;return t?hs[i]:ds[i]}const us=n`
  :host {
    display: block;
    padding: var(--epp-space-4, 16px);
  }

  .flasher-content {
    max-width: var(--epp-content-max, 720px);
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: var(--epp-space-4, 16px);
  }

  .card-header {
    font-size: var(--epp-font-xl, 18px);
    font-weight: var(--epp-weight-regular, 400);
    line-height: 48px;
    padding: var(--epp-space-2, 8px) var(--epp-space-4, 16px) 0;
    color: var(--ha-card-header-color, var(--epp-text, var(--primary-text-color, #212121)));
  }

  .card-content {
    padding: var(--epp-space-4, 16px);
  }

  .device-list {
    display: flex;
    flex-direction: column;
    gap: var(--epp-space-2, 8px);
    /* Cap the list so a long roster of devices scrolls inside the card instead
       of growing the page and pushing the USB Connection section off-screen. */
    max-height: 40vh;
    overflow-y: auto;
  }

  .device-row {
    display: flex;
    align-items: center;
    /* Let the OTA error detail (flex-basis: 100%) wrap onto its own full-width
       line below the row, in normal flow — so it can't be clipped by the
       scrolling .device-list the way an absolute popover was. */
    flex-wrap: wrap;
    gap: var(--epp-space-3, 12px);
    padding: var(--epp-space-3, 12px) var(--epp-space-4, 16px);
    min-height: 60px;
    background: var(--epp-surface, var(--card-background-color, #fff));
    border: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
    border-radius: var(--epp-radius-md, 10px);
  }
  .device-info-faded {
    opacity: 0.5;
  }

  .device-info {
    flex: 1;
    min-width: 0;
  }

  .device-name {
    font-size: var(--epp-font-base, 14px);
    font-weight: var(--epp-weight-medium, 500);
    color: var(--epp-text, var(--primary-text-color, #212121));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .device-mac {
    font-weight: var(--epp-weight-regular, 400);
    color: var(--epp-text-muted, var(--secondary-text-color, #757575));
  }
  .device-host {
    font-size: var(--epp-font-xs, 12px);
    color: var(--epp-text-muted, var(--secondary-text-color, #757575));
    margin-top: 2px;
  }

  .firmware-badge {
    font-size: 11px;
    font-weight: var(--epp-weight-semibold, 600);
    padding: 2px var(--epp-space-2, 8px);
    border-radius: var(--epp-radius-md, 10px);
    flex-shrink: 0;
  }

  .firmware-badge-original {
    background: color-mix(in srgb, var(--epp-warning, var(--warning-color, #ff9800)) 12%, transparent);
    color: var(--epp-warning, var(--warning-color, #ff9800));
  }

  .firmware-badge-offline {
    background: color-mix(in srgb, var(--epp-text-muted, var(--secondary-text-color, #757575)) 12%, transparent);
    color: var(--epp-text-muted, var(--secondary-text-color, #757575));
  }

  .firmware-badge-behind {
    background: var(--epp-warning, var(--warning-color, #ff9800));
    color: var(--text-primary-color, #fff);
  }

  .firmware-badge-online {
    background: color-mix(in srgb, var(--epp-success, var(--success-color, #4caf50)) 12%, transparent);
    color: var(--epp-success, var(--success-color, #4caf50));
  }

  .firmware-badge-ahead {
    background: var(--info-color, #2196f3);
    color: var(--text-primary-color, #fff);
  }

  /* OTA progress indicators */
  .ota-progress {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    flex-shrink: 0;
  }
  .ota-progress svg {
    transform: rotate(-90deg);
  }
  .ota-track {
    fill: none;
    stroke: var(--epp-border, var(--divider-color, #e0e0e0));
    stroke-width: 3;
  }
  .ota-fill {
    fill: none;
    stroke: var(--epp-accent, var(--primary-color, #03a9f4));
    stroke-width: 3;
    stroke-linecap: round;
    transition: stroke-dashoffset 0.3s ease;
  }
  .ota-pct {
    position: absolute;
    font-size: 10px;
    font-weight: var(--epp-weight-semibold, 600);
    color: var(--epp-text, var(--primary-text-color, #212121));
  }
  .ota-spinner {
    width: 31px;
    height: 31px;
    border: 3px solid var(--epp-border, var(--divider-color, #e0e0e0));
    border-top-color: var(--epp-accent, var(--primary-color, #03a9f4));
    border-radius: 50%;
    box-sizing: border-box;
    animation: ota-spin 0.8s linear infinite;
    flex-shrink: 0;
  }
  @keyframes ota-spin {
    to { transform: rotate(360deg); }
  }
  .ota-success {
    --mdc-icon-size: 36px;
    color: var(--epp-success, var(--success-color, #4caf50));
    flex-shrink: 0;
  }
  .ota-error {
    display: flex;
    align-items: center;
    gap: var(--epp-space-1, 4px);
    position: relative;
    flex-shrink: 0;
  }
  .ota-error-icon {
    --mdc-icon-size: 20px;
    color: var(--epp-danger, var(--error-color, #f44336));
    cursor: pointer;
  }
  .ota-error-detail {
    /* Full-width line below the row content (wraps via the row's flex-wrap),
       so the message flows in-document and is never clipped. */
    flex-basis: 100%;
    background: var(--epp-danger, var(--error-color, #f44336));
    color: white;
    padding: var(--epp-space-2, 8px) var(--epp-space-3, 12px);
    border-radius: var(--epp-radius-sm, 6px);
    font-size: var(--epp-font-xs, 12px);
    line-height: 1.4;
  }

  .integration-version {
    font-size: 0.8em;
    font-weight: normal;
    opacity: 0.7;
    margin-left: var(--epp-space-2, 8px);
  }

  .update-banner {
    display: flex;
    align-items: flex-start;
    gap: var(--epp-space-3, 12px);
    padding: var(--epp-space-4, 16px);
    margin-bottom: var(--epp-space-4, 16px);
    background: var(--info-color, #2196f3);
    color: white;
    border-radius: var(--epp-radius-sm, 6px);
  }
  .update-banner ha-icon {
    --mdc-icon-size: 24px;
    flex-shrink: 0;
    margin-top: 2px;
  }
  .update-banner p {
    margin: var(--epp-space-1, 4px) 0 var(--epp-space-2, 8px);
  }
  .update-banner .update-link {
    color: white;
    font-weight: var(--epp-weight-medium, 500);
    text-decoration: underline;
  }

  .usb-actions {
    display: flex;
    flex-direction: column;
    gap: var(--epp-space-3, 12px);
  }

  .usb-action {
    display: flex;
    align-items: center;
    gap: var(--epp-space-4, 16px);
    padding: var(--epp-space-4, 16px);
    border: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
    border-radius: var(--epp-radius-md, 10px);
    cursor: pointer;
    transition: background 0.15s;
  }

  .usb-action:hover {
    background: var(--epp-surface-2, var(--secondary-background-color, #f5f5f5));
  }

  .usb-action-disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .usb-action-disabled:hover {
    background: inherit;
  }

  .usb-action ha-icon {
    --mdc-icon-size: 28px;
    color: var(--epp-accent, var(--primary-color, #03a9f4));
    flex-shrink: 0;
  }

  .usb-action-text {
    flex: 1;
    min-width: 0;
  }

  .usb-action-title {
    font-size: var(--epp-font-base, 14px);
    font-weight: var(--epp-weight-medium, 500);
    color: var(--epp-text, var(--primary-text-color, #212121));
  }

  .usb-action-desc {
    font-size: var(--epp-font-sm, 13px);
    color: var(--epp-text-muted, var(--secondary-text-color, #757575));
    margin-top: 2px;
  }

  .browser-warning {
    margin-top: var(--epp-space-2, 8px);
    font-size: var(--epp-font-xs, 12px);
    color: var(--epp-warning, var(--warning-color, #ff9800));
  }

  .browser-warning-link {
    color: var(--epp-accent, var(--primary-color, #03a9f4));
    text-decoration: none;
  }

  .browser-warning-link:hover {
    text-decoration: underline;
  }

  .usb-select-label {
    margin: 0 0 var(--epp-space-3, 12px);
    font-size: var(--epp-font-base, 14px);
    color: var(--epp-text-muted, var(--secondary-text-color, #757575));
  }

  .usb-error {
    text-align: center;
    padding: var(--epp-space-5, 24px) 0;
    color: var(--epp-danger, var(--error-color, #f44336));
  }

  .usb-error ha-icon {
    --mdc-icon-size: 48px;
    margin-bottom: var(--epp-space-2, 8px);
  }

  .usb-error p {
    margin: 0;
    font-size: var(--epp-font-base, 14px);
  }

  .usb-complete {
    text-align: center;
    padding: var(--epp-space-5, 24px) 0;
    color: var(--epp-success, var(--success-color, #4caf50));
    max-width: 400px;
    margin: 0 auto;
  }

  .usb-complete ha-icon {
    --mdc-icon-size: 48px;
    margin-bottom: var(--epp-space-4, 16px);
  }

  .usb-complete p {
    margin: var(--epp-space-1, 4px) 0;
    font-size: var(--epp-font-base, 14px);
  }

  .usb-ip {
    color: var(--epp-text, var(--primary-text-color, #212121));
    font-weight: var(--epp-weight-medium, 500);
    margin-top: var(--epp-space-1, 4px);
  }

  .ha-add-result {
    color: var(--epp-text-muted, var(--secondary-text-color));
    font-size: var(--epp-font-base, 14px);
    margin-top: var(--epp-space-2, 8px);
  }

  .usb-status {
    text-align: center;
    padding: var(--epp-space-5, 24px) 0;
  }

  .usb-status p {
    margin: 0;
    font-size: var(--epp-font-base, 14px);
    color: var(--epp-text, var(--primary-text-color, #212121));
  }

  .usb-hint {
    margin-top: var(--epp-space-3, 12px) !important;
    font-size: var(--epp-font-xs, 12px) !important;
    color: var(--epp-text-muted, var(--secondary-text-color, #757575)) !important;
  }

  .wifi-form {
    display: flex;
    flex-direction: column;
    gap: var(--epp-space-3, 12px);
  }

  ha-select,
  ha-input,
  ha-textfield {
    width: 100%;
  }

  .usb-progress {
    margin-top: var(--epp-space-4, 16px);
    background: var(--epp-border, var(--divider-color, #e0e0e0));
    border-radius: 4px;
    height: 8px;
    position: relative;
    overflow: hidden;
  }

  .usb-progress-bar {
    height: 100%;
    background: var(--epp-accent, var(--primary-color, #03a9f4));
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .usb-progress span {
    display: block;
    text-align: center;
    margin-top: var(--epp-space-2, 8px);
    font-size: var(--epp-font-sm, 13px);
    color: var(--epp-text-muted, var(--secondary-text-color, #757575));
  }

  .flasher-loading {
    padding: 32px var(--epp-space-5, 24px);
    text-align: center;
    color: var(--epp-text-muted, var(--secondary-text-color, #757575));
    font-size: var(--epp-font-base, 14px);
  }

  .flasher-empty {
    padding: var(--epp-space-5, 24px) var(--epp-space-4, 16px) 32px;
    text-align: center;
    color: var(--epp-text-muted, var(--secondary-text-color, #757575));
  }

  .flasher-empty ha-icon {
    --mdc-icon-size: 48px;
    margin-bottom: var(--epp-space-2, 8px);
    opacity: 0.5;
  }

  .flasher-empty p {
    margin: 0;
    font-size: var(--epp-font-base, 14px);
  }

  .variant-selector {
    display: flex;
    gap: var(--epp-space-3, 12px);
    margin-bottom: var(--epp-space-4, 16px);
  }


  .confirm-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--epp-space-3, 12px);
  }

  .ha-add-progress {
    display: flex;
    align-items: center;
    gap: var(--epp-space-3, 12px);
    margin-top: var(--epp-space-4, 16px);
    color: var(--epp-text-muted, var(--secondary-text-color));
    font-size: var(--epp-font-base, 14px);
  }

  .cancelled-ip-hint {
    padding: 10px 14px;
    margin-bottom: var(--epp-space-3, 12px);
    background: var(--info-color, #3b82f6);
    color: var(--text-primary-color, white);
    border-radius: 4px;
    font-size: 0.9em;
  }

`;class gs extends he{constructor(){super(...arguments),this.flashableDevices=[],this.loading=!1,this.localize=Jt,this._selectedVariant="wifi",this.firmwareVersion="",this.integrationVersion="",this.usbFlashState=null,this.wifiNetworks=[],this.otaStates={},this.cancelledDeviceIpHint=null,this._hasWebSerial="undefined"!=typeof navigator&&"serial"in navigator,this._isSecureContext="undefined"==typeof window||window.isSecureContext,this._showUsbFlash=!1,this._cancelling=!1,this._selectedSsid="",this._manualSsid=!1,this._wifiPassword="",this._showPassword=!1,this._errorPopoverMac=null,this._closeErrorPopover=()=>{null!==this._errorPopoverMac&&(this._errorPopoverMac=null),this._popoverListeners.detach()},this._onPopoverKeydown=e=>{"Escape"===e.key&&this._closeErrorPopover()},this._onPopoverPointerDown=e=>{e.composedPath().some(e=>e instanceof HTMLElement&&(e.classList.contains("ota-error")||e.classList.contains("ota-error-detail")))||this._closeErrorPopover()},this._popoverListeners=new os([{target:document,type:"keydown",listener:this._onPopoverKeydown},{target:document,type:"pointerdown",listener:this._onPopoverPointerDown,options:!0},{target:window,type:"scroll",listener:this._closeErrorPopover,options:!0}])}_dispatchUpdateFirmware(e){this.dispatchEvent(new CustomEvent("update-firmware",{detail:{mac:e.mac},bubbles:!0,composed:!0}))}disconnectedCallback(){super.disconnectedCallback(),this._popoverListeners.detach()}_toggleErrorPopover(e,t){e.stopPropagation(),this._errorPopoverMac===t?this._closeErrorPopover():(this._errorPopoverMac=t,this._popoverListeners.attach())}_dispatchRetryOta(e){this._closeErrorPopover(),this.dispatchEvent(new CustomEvent("retry-ota",{detail:{mac:e.mac},bubbles:!0,composed:!0}))}_renderOtaIndicator(e){const t=this.otaStates[e.mac];if(!t)return J;switch(t.state){case"updating":{if(null==t.progress)return Y`<div class="ota-spinner"></div>`;const e=14,i=2*Math.PI*e,s=i-t.progress/100*i;return Y`
					<div class="ota-progress">
						<svg width="36" height="36" viewBox="0 0 36 36">
							<circle class="ota-track" cx="18" cy="18" r="${e}" />
							<circle class="ota-fill" cx="18" cy="18" r="${e}"
								stroke-dasharray="${i}"
								stroke-dashoffset="${s}" />
						</svg>
						<span class="ota-pct">${Math.round(t.progress)}</span>
					</div>`}case"success":return Y`<ha-icon class="ota-success" icon="mdi:check-circle"></ha-icon>`;case"error":return Y`
					<div class="ota-error">
						<ha-icon class="ota-error-icon"
							icon="mdi:alert-circle"
							@click=${t=>this._toggleErrorPopover(t,e.mac)}
						></ha-icon>
						${e.available?Y`<epp-button
									variant="neutral"
									@click=${()=>this._dispatchRetryOta(e)}>
									${this.localize("flasher.ota_retry")}
								</epp-button>`:J}
					</div>`}}_renderOtaErrorDetail(e){const t=this.otaStates[e.mac];return t&&"error"===t.state&&this._errorPopoverMac===e.mac?Y`<div class="ota-error-detail" role="alert">${t.errorKey?this.localize(t.errorKey,t.errorParams):""}</div>`:J}_onUsbConnect(){this._hasWebSerial&&(this._showUsbFlash=!0)}_dispatchFlashComplete(){this.dispatchEvent(new CustomEvent("flash-complete",{bubbles:!0,composed:!0}))}_dispatchUsbFlash(){this.dispatchEvent(new CustomEvent("usb-flash",{detail:{variant:this._getFirmwareVariant()},bubbles:!0,composed:!0}))}_dispatchUsbRetry(){this.dispatchEvent(new CustomEvent("usb-retry",{bubbles:!0,composed:!0}))}_dispatchRetryHaAdd(){this.dispatchEvent(new CustomEvent("retry-ha-add",{bubbles:!0,composed:!0}))}_dispatchCancel(){null==this.usbFlashState?this._showUsbFlash=!1:this._cancelling=!0,this._wifiPassword="",this.dispatchEvent(new CustomEvent("flasher-cancel",{bubbles:!0,composed:!0}))}updated(e){e.has("usbFlashState")&&null==this.usbFlashState&&(this._cancelling=!1)}_renderCancelButton(e){const t=this._cancelling?this.localize("flasher.cancelling"):this.localize("flasher.cancel");return Y`<epp-button
			variant="neutral"
			class=${e??""}
			@click=${this._dispatchCancel}
			?disabled=${this._cancelling}
		>${t}</epp-button>`}async _copyIp(e){if(e&&navigator.clipboard)try{await navigator.clipboard.writeText(e)}catch(e){console.error("failed to copy IP",e)}}_dispatchWifiScan(){this.dispatchEvent(new CustomEvent("wifi-scan",{bubbles:!0,composed:!0}))}_dispatchWifiProvision(){const e={ssid:this._selectedSsid,password:this._wifiPassword};this._wifiPassword="",this.dispatchEvent(new CustomEvent("wifi-provision",{detail:e,bubbles:!0,composed:!0}))}_renderLoading(){return Y`<div class="flasher-loading">${this.localize("flasher.loading")}</div>`}_renderWifiProvisioning(){const e=[...this.wifiNetworks].sort((e,t)=>t.rssi-e.rssi),t=this._manualSsid||0===e.length;return Y`
      <div class="flasher-content">
        <ha-card>
          <div class="card-header">${this.localize("flasher.configure_wifi")}</div>
          <div class="card-content wifi-form">

            ${e.length>0?Y`
                <ha-select
                  .label=${this.localize("flasher.select_a_network")}
                  .value=${this._selectedSsid}
                  .options=${e.map(e=>({value:e.ssid,label:e.ssid,iconPath:ps(e.rssi,e.authRequired)}))}
                  @selected=${e=>{e.detail.value!==this._selectedSsid&&(this._wifiPassword=""),this._selectedSsid=e.detail.value,this._manualSsid=!1}}
                  @closed=${e=>e.stopPropagation()}
                ></ha-select>
              `:J}

            <ha-formfield .label=${this.localize("flasher.manual_ssid")}>
              <ha-checkbox
                .checked=${t}
                @change=${e=>{this._manualSsid=e.target.checked,this._manualSsid||(this._selectedSsid=""),this._wifiPassword=""}}
              ></ha-checkbox>
            </ha-formfield>

            ${t?Y`
                <epp-field
                  type="text"
                  autocomplete="off"
                  .label=${this.localize("flasher.enter_ssid")}
                  .value=${this._selectedSsid}
                  @value-changed=${e=>{this._selectedSsid=e.detail.value}}
                ></epp-field>
              `:J}

            ${(()=>{const e=customElements.get("ha-input")?be`ha-input`:be`ha-textfield`;return ye`
              <${e}
                .label=${this.localize("flasher.wifi_password")}
                type=${this._showPassword?"text":"password"}
                autocomplete="new-password"
                .value=${this._wifiPassword}
                @input=${e=>{this._wifiPassword=e.target.value}}
              ></${e}>
            `})()}

            <ha-formfield
              data-show-password
              .label=${this.localize("flasher.show_password")}
            >
              <ha-checkbox
                .checked=${this._showPassword}
                @change=${e=>{this._showPassword=e.target.checked}}
              ></ha-checkbox>
            </ha-formfield>

            <div class="confirm-actions">
              ${this._renderCancelButton()}
              <epp-button variant="neutral" @click=${this._dispatchWifiScan}>
                ${this.localize("flasher.scan")}
              </epp-button>
              <epp-button
                variant="primary"
                ?disabled=${!this._selectedSsid}
                @click=${this._dispatchWifiProvision}
              >
                ${this.localize("flasher.connect")}
              </epp-button>
            </div>
          </div>
        </ha-card>
      </div>
    `}_deviceRowDescriptor(e){const t=[],i=this.otaStates[e.mac],s="eppgrid"===e.firmware_type;e.available||t.push({cls:"firmware-badge-offline",labelKey:"flasher.offline"}),!s||!e.available||i||e.update_available||"compatible"!==e.firmware_status&&"firmware_ahead"!==e.firmware_status||t.push({cls:"firmware-badge-online",labelKey:"flasher.online"}),"original"===e.firmware_type&&t.push({cls:"firmware-badge-original",labelKey:"flasher.flash_usb"}),s&&"firmware_ahead"===e.firmware_status&&t.push({cls:"firmware-badge-ahead",labelKey:"flasher.integration_update"});return{badges:t,action:i?this._renderOtaIndicator(e):s&&(e.update_available||"firmware_behind"===e.firmware_status)?Y`<epp-button
							variant="primary"
							@click=${()=>this._dispatchUpdateFirmware(e)}
						>${this.localize("flasher.update")}</epp-button>`:J}}_renderDeviceList(){const{flashableDevices:e}=this,t=e.some(e=>"eppgrid"===e.firmware_type&&"firmware_ahead"===e.firmware_status);return Y`
      <div class="flasher-content">
        ${t?Y`
          <div class="update-banner">
            <ha-icon icon="mdi:information"></ha-icon>
            <div>
              <strong>${this.localize("flasher.integration_outdated_title")}</strong>
              <p>${this.localize("flasher.integration_outdated_body")}</p>
              <a href="/hacs/repository/1172848595" class="update-link">${this.localize("flasher.open_hacs")}</a>
            </div>
          </div>
        `:J}
        <ha-card>
          <div class="card-header">
            ${this.localize("flasher.devices_on_network")}
            ${this.integrationVersion?Y`<span class="integration-version">v${this.integrationVersion}</span>`:J}
          </div>
          <div class="card-content">
            ${0===e.length?Y`<div class="flasher-empty">
                  <ha-icon icon="mdi:access-point-off"></ha-icon>
                  <p>${this.localize("flasher.no_devices")}</p>
                </div>`:Y`
                <div class="device-list">
                  ${[...e].sort((e,t)=>e.name.localeCompare(t.name,void 0,{sensitivity:"base"})).map(e=>{const t=!e.available||"original"===e.firmware_type,{badges:i,action:s}=this._deviceRowDescriptor(e);return Y`
                      <div class="device-row">
                        <div class="device-info${t?" device-info-faded":""}">
                          <div class="device-name">${e.name} <span class="device-mac">(${e.mac.replace(/:/g,"").slice(-6).toLowerCase()})</span></div>
                          <div class="device-host">${e.host??this.localize("flasher.offline")}${"eppgrid"===e.firmware_type&&e.firmware_version&&"unknown"!==e.firmware_version?` - v${e.firmware_version}`:""}</div>
                        </div>
                        ${i.map(e=>Y`<span class="firmware-badge ${e.cls}">${this.localize(e.labelKey)}</span>`)}
                        ${s}
                        ${this._renderOtaErrorDetail(e)}
                      </div>
                    `})}
                </div>
              `}
          </div>
        </ha-card>
        ${this._renderUsbSection()}
      </div>
    `}_dispatchUsbWifiConfig(){this._hasWebSerial&&this.dispatchEvent(new CustomEvent("usb-wifi-config",{bubbles:!0,composed:!0}))}_renderUsbSection(){const e=this._hasWebSerial?"":" usb-action-disabled",t=this._hasWebSerial?"false":"true";return Y`
      <ha-card>
        <div class="card-header">${this.localize("flasher.usb_title")}</div>
        <div class="card-content">
          ${this._hasWebSerial?J:Y`<div class="browser-warning">
                ${this.localize(this._isSecureContext?"flasher.usb_browser_warning":"flasher.usb_insecure_warning")}
                <a href=${ns} target="_blank" rel="noopener noreferrer" class="browser-warning-link">${this.localize("flasher.usb_web_flasher_link")}</a>
              </div>`}
          <div class="usb-actions">
            <div class="usb-action${e}" aria-disabled=${t} @click=${this._onUsbConnect}>
              <ha-icon icon="mdi:chip"></ha-icon>
              <div class="usb-action-text">
                <div class="usb-action-title">${this.localize("flasher.usb_flash_title")}</div>
                <div class="usb-action-desc">${this.localize("flasher.usb_flash_desc")}</div>
              </div>
            </div>
            <div class="usb-action${e}" aria-disabled=${t} @click=${this._dispatchUsbWifiConfig}>
              <ha-icon icon="mdi:wifi-cog"></ha-icon>
              <div class="usb-action-text">
                <div class="usb-action-title">${this.localize("flasher.usb_wifi_title")}</div>
                <div class="usb-action-desc">${this.localize("flasher.usb_wifi_desc")}</div>
              </div>
            </div>
          </div>
        </div>
      </ha-card>
    `}render(){return this.loading?this._renderLoading():this._showUsbFlash||this.usbFlashState?this._renderUsbFlash():this._renderDeviceList()}_getFirmwareVariant(){return"wifi"===this._selectedVariant?"wifi-ble-co2":"ethernet-ble-co2"}_renderUsbFlash(){const e=this.usbFlashState;return"wifi_provision"===e?.step?this._renderWifiProvisioning():"error"===e?.step?this._renderUsbError(e):"wifi_configured"===e?.step?this._renderUsbConfigured(e):"complete"===e?.step?this._renderUsbComplete(e):e&&"idle"!==e.step?this._renderUsbProgress(e):this._renderUsbIdle()}_renderUsbError(e){return Y`
			<div class="flasher-content">
				<ha-card>
					<div class="card-content">
						<div class="usb-error">
							<ha-icon icon="mdi:alert-circle-outline"></ha-icon>
							<p>${e.errorKey?this.localize(e.errorKey,e.errorParams):""}</p>
						</div>
						<div class="confirm-actions">
							<epp-button variant="neutral" @click=${this._dispatchCancel}>
								${this.localize("flasher.start_over")}
							</epp-button>
							${e.fatal?J:Y`<epp-button variant="primary" @click=${this._dispatchUsbRetry}>
								${this.localize("flasher.usb_retry")}
							</epp-button>`}
						</div>
					</div>
				</ha-card>
			</div>
		`}_renderUsbConfigured(e){const t=customElements.get("ha-spinner")?Y`<ha-spinner size="small"></ha-spinner>`:Y`<ha-circular-progress indeterminate size="small"></ha-circular-progress>`;return Y`
			<div class="flasher-content">
				<ha-card>
					<div class="card-content">
						<div class="usb-complete">
							<ha-icon icon="mdi:check-circle-outline"></ha-icon>
							<p>${this.localize("flasher.wifi_configured")}</p>
							${e.ip?Y`<p class="usb-ip">${this.localize("flasher.ip_address",{ip:e.ip})}</p>`:J}
						</div>
						<div class="ha-add-progress">
							${t}
							<span>
								${void 0!==e.haAddAttempt&&void 0!==e.haAddMaxAttempts?this.localize("flasher.ha_add.retrying",{attempt:e.haAddAttempt,max:e.haAddMaxAttempts}):this.localize("flasher.ha_add.adding")}
							</span>
						</div>
						<div class="confirm-actions">
							${this._renderCancelButton()}
						</div>
					</div>
				</ha-card>
			</div>
		`}_renderUsbComplete(e){const t=e.variant?.startsWith("ethernet");if(t)return Y`
				<div class="flasher-content">
					<ha-card>
						<div class="card-content">
							<div class="usb-complete">
								<ha-icon icon="mdi:check-circle-outline"></ha-icon>
								<p>${this.localize("flasher.usb_ethernet_complete")}</p>
								<p>${this.localize("flasher.usb_ethernet_hint")}</p>
							</div>
							<div class="confirm-actions">
								<a href="/config/devices/dashboard">
									<epp-button variant="primary">${this.localize("flasher.go_to_devices")}</epp-button>
								</a>
							</div>
						</div>
					</ha-card>
				</div>
			`;const i=e.ip,s=e.haAdd,r="added"===s?.type||"already_added"===s?.type,o=r?"mdi:check-circle-outline":"mdi:alert-outline",a=s?.type??"failed",n="failed"===s?.type?s.reason??"unknown":"";return Y`
			<div class="flasher-content">
				<ha-card>
					<div class="card-content">
						<div class="usb-complete">
							<ha-icon icon=${o}></ha-icon>
							<p>${this.localize("flasher.wifi_configured")}</p>
							${i?Y`<p class="usb-ip">${this.localize("flasher.ip_address",{ip:i})}</p>`:J}
							<p class="ha-add-result">
								${this.localize(`flasher.ha_add.${a}`,{reason:n})}
							</p>
						</div>
						<div class="confirm-actions">
							${r?Y`<epp-button variant="primary" @click=${this._dispatchFlashComplete}>
									${this.localize("flasher.go_to_config")}
								</epp-button>`:"needs_auth"===s?.type?Y`<a href="/config/integrations/dashboard">
										<epp-button variant="primary">${this.localize("flasher.go_to_integrations")}</epp-button>
									</a>`:Y`
										<epp-button variant="neutral" @click=${()=>this._copyIp(i??"")}>
											${this.localize("flasher.copy_ip")}
										</epp-button>
										<epp-button variant="primary" @click=${this._dispatchRetryHaAdd}>
											${this.localize("flasher.retry_ha_add")}
										</epp-button>
									`}
							<epp-button variant="neutral" @click=${this._dispatchCancel}>
								${this.localize("flasher.flash_another")}
							</epp-button>
						</div>
					</div>
				</ha-card>
			</div>
		`}_renderUsbProgress(e){const t={connecting:"flasher.usb_step_connecting",flashing:"flasher.usb_step_flashing",wifi_check:"flasher.usb_step_wifi_check",wifi_scan:"flasher.usb_step_scanning",wifi_provision:"flasher.usb_step_provisioning",wifi_connecting:"flasher.usb_step_wifi_connecting",reading_ip:"flasher.usb_step_reading_ip",adding:"flasher.usb_step_adding"}[e.step]??e.step,i="flashing"===e.step?{version:this.firmwareVersion}:void 0,s="flashing"!==e.step&&"connecting"!==e.step;return Y`
			<div class="flasher-content">
				<ha-card>
					<div class="card-content">
						<div class="usb-status">
							<p>${this.localize(t,i)}</p>
							${"flashing"===e.step&&null!=e.progress?Y`<div class="usb-progress">
										<div class="usb-progress-bar" style="width: ${e.progress}%"></div>
										<span>${e.progress}%</span>
									</div>`:J}
							${"wifi_scan"===e.step?Y`<p class="usb-hint">${this.localize("flasher.wifi_scan_hint")}</p>`:J}
							${s?Y`<div class="confirm-actions">
										${this._renderCancelButton("cancel-btn")}
									</div>`:J}
						</div>
					</div>
				</ha-card>
			</div>
		`}_renderUsbIdle(){return Y`
			<div class="flasher-content">
				${this.cancelledDeviceIpHint?Y`<div class="cancelled-ip-hint">
							${this.localize("flasher.cancelled_ip_hint",{ip:this.cancelledDeviceIpHint})}
						</div>`:J}
				<ha-card>
					<div class="card-header">
						${this.localize("flasher.title")}
						${this.firmwareVersion?Y`<code>${this.firmwareVersion}</code>`:J}
					</div>
					<div class="card-content">
						<p class="usb-select-label">${this.localize("flasher.select_variant")}</p>
						<div class="variant-selector">
							<epp-button
								class="${"wifi"===this._selectedVariant?"selected":"unselected"}"
								variant="${"wifi"===this._selectedVariant?"primary":"neutral"}"
								@click=${()=>{this._selectedVariant="wifi"}}
							>${this.localize("flasher.wifi")}</epp-button>
							<epp-button
								class="${"ethernet"===this._selectedVariant?"selected":"unselected"}"
								variant="${"ethernet"===this._selectedVariant?"primary":"neutral"}"
								@click=${()=>{this._selectedVariant="ethernet"}}
							>${this.localize("flasher.ethernet")}</epp-button>
						</div>
						<div class="confirm-actions">
							${this._renderCancelButton()}
							<epp-button variant="primary" @click=${this._dispatchUsbFlash}>
								${this.localize("flasher.usb_flash")}
							</epp-button>
						</div>
					</div>
				</ha-card>
			</div>
		`}}function As(e,t){return e/(t+1)*Ai}function _s(e,t,i){const s=i*Math.PI/180,r=Math.abs(Math.cos(s)),o=Math.abs(Math.sin(s));return{dxBox:(e*r+t*o-e)/2,dyBox:(e*o+t*r-t)/2}}function fs(e){const t=e.includes("e")||e.includes("w"),i=e.includes("n")||e.includes("s");return t&&i}gs.styles=[us],e([ge({attribute:!1})],gs.prototype,"flashableDevices",void 0),e([ge({type:Boolean})],gs.prototype,"loading",void 0),e([ge({attribute:!1})],gs.prototype,"localize",void 0),e([Ae()],gs.prototype,"_selectedVariant",void 0),e([ge()],gs.prototype,"firmwareVersion",void 0),e([ge()],gs.prototype,"integrationVersion",void 0),e([ge({attribute:!1})],gs.prototype,"usbFlashState",void 0),e([ge({attribute:!1})],gs.prototype,"wifiNetworks",void 0),e([ge({attribute:!1})],gs.prototype,"otaStates",void 0),e([ge({attribute:!1})],gs.prototype,"cancelledDeviceIpHint",void 0),e([Ae()],gs.prototype,"_hasWebSerial",void 0),e([Ae()],gs.prototype,"_isSecureContext",void 0),e([Ae()],gs.prototype,"_showUsbFlash",void 0),e([Ae()],gs.prototype,"_cancelling",void 0),e([Ae()],gs.prototype,"_selectedSsid",void 0),e([Ae()],gs.prototype,"_manualSsid",void 0),e([Ae()],gs.prototype,"_wifiPassword",void 0),e([Ae()],gs.prototype,"_showPassword",void 0),e([Ae()],gs.prototype,"_errorPopoverMac",void 0),customElements.get("epp-flasher-view")||customElements.define("epp-flasher-view",gs);const ms=["n","s","e","w","ne","nw","se","sw"],ws=ms.filter(fs);function vs(e,t,i,s,r,o,a,n,l,c){const h=c*Math.PI/180,d=Math.cos(h),p=Math.sin(h),u=-t*p+i*d,g=As(t*d+i*p,s),A=As(u,s),_=e.includes("e")?1:e.includes("w")?-1:0,f=e.includes("s")?1:e.includes("n")?-1:0;let m=a,w=n;if(function(e,t){return t||fs(e)}(e,l)){const e=0!==_&&(0===f||Math.abs(g)>Math.abs(A))?_*g:f*A,t=a/n;m=Math.max(100,a+e),w=Math.max(100,m/t),m=w*t}else 0!==_&&(m=Math.max(100,a+_*g)),0!==f&&(w=Math.max(100,n+f*A));const v=m-a,b=w-n,E=_*v/2,y=f*b/2;return{x:r-v/2+(E*d-y*p),y:o-b/2+(E*p+y*d),width:m,height:w}}function bs(e,t,i){const s=i-t;return Math.round((e+s+360)%360)}function Es(e,t=15,i=7){const s=(e%360+360)%360,r=Math.round(s/t)*t%360;let o=Math.abs(s-r);return o>180&&(o=360-o),o<i?r:Math.round(s)%360}const ys=[{key:"arial",label:"Arial",stack:"Arial, Helvetica, sans-serif"},{key:"verdana",label:"Verdana",stack:"Verdana, Geneva, sans-serif"},{key:"tahoma",label:"Tahoma",stack:"Tahoma, 'Segoe UI', sans-serif"},{key:"georgia",label:"Georgia",stack:"Georgia, 'Times New Roman', serif"},{key:"times",label:"Times New Roman",stack:"'Times New Roman', Times, serif"},{key:"courier",label:"Courier New",stack:"'Courier New', Courier, monospace"},{key:"trebuchet",label:"Trebuchet MS",stack:"'Trebuchet MS', Verdana, sans-serif"},{key:"comic",label:"Comic Sans MS",stack:"'Comic Sans MS', 'Comic Sans', cursive"}],Cs="arial",xs=200,Bs="center",Ss="text_label.label",Is="mdi:format-text";function Ds(e){return Number.isFinite(e)?Math.min(3e3,Math.max(30,e)):xs}function Rs(e,t,i){const s=e.split("\n"),r=s.reduce((e,t)=>Math.max(e,t.length),1),o=.62*t*(i?1.05:1),a=Math.max(t,r*o),n=Math.max(t,s.length*t*1.3);return{width:Math.round(a),height:Math.round(n)}}class Ms extends he{constructor(){super(...arguments),this.value="#000000",this.presets=[],this.usedColors=[],this.occupiedGlow=!1,this.localize=Jt,this._open=!1,this._toggle=()=>{this._open?this._close():(this._open=!0,this._dismiss.attach())},this._close=()=>{this._open=!1,this._dismiss.detach()},this._onOutside=e=>{e.composedPath().includes(this)||this._close()},this._onKeydown=e=>{"Escape"===e.key&&(this._close(),this._focusTrigger())},this._envClose=()=>{const e=this._containsFocus();this._close(),e&&this._focusTrigger()},this._dismiss=new os([{target:document,type:"pointerdown",listener:this._onOutside,options:!0},{target:document,type:"keydown",listener:this._onKeydown,options:!0},{target:window,type:"scroll",listener:this._envClose,options:!0},{target:window,type:"resize",listener:this._envClose,options:!0}])}disconnectedCallback(){super.disconnectedCallback(),this._dismiss.detach()}render(){const e=this.occupiedGlow?`box-shadow: 0 0 6px 2px ${this.value};`:"";return Y`
			<button
				class="trigger"
				type="button"
				aria-haspopup="dialog"
				aria-expanded=${this._open?"true":"false"}
				aria-label=${this.localize("color.choose")}
				style="background: ${this.value}; ${e}"
				@click=${this._toggle}
			></button>
			${this._open?this._renderPopover():J}
		`}_renderPopover(){const e=this.value.toLowerCase(),t=new Set(this.usedColors.map(e=>e.toLowerCase())),i=!this.presets.some(t=>t.toLowerCase()===e);return Y`
			<div
				class="popover"
				role="dialog"
				aria-label=${this.localize("color.choose")}
			>
				<div class="grid">
					${this.presets.map((i,s)=>{const r=i.toLowerCase()===e,o=t.has(i.toLowerCase())?this.localize("color.in_use"):null,a=this.localize("color.preset",{n:s+1});return Y`<button
							class="swatch preset ${r?"selected":""} ${o?"in-use":""}"
							type="button"
							data-color=${i}
							style="background: ${i};"
							title=${o??J}
							aria-label=${o?`${a}, ${o}`:a}
							aria-pressed=${r?"true":"false"}
							@click=${()=>this._select(i)}
						></button>`})}
					<label
						class="swatch custom ${i?"selected":""}"
						style=${i?`background: ${this.value};`:""}
						title=${this.localize("color.custom")}
					>
						<span class="custom-glyph">${i?"✎":"+"}</span>
						<input
							class="custom-input"
							type="color"
							aria-label=${this.localize("color.custom")}
							.value=${this.value}
							@change=${e=>this._select(e.target.value)}
						/>
					</label>
				</div>
			</div>
		`}_focusTrigger(){this.shadowRoot?.querySelector(".trigger")?.focus()}_select(e){this._close(),this.dispatchEvent(new CustomEvent("value-changed",{detail:{value:e},bubbles:!0,composed:!0})),this._focusTrigger()}_containsFocus(){return document.activeElement===this}updated(){if(!this._open)return;const e=this.shadowRoot?.querySelector(".popover"),t=this.shadowRoot?.querySelector(".trigger");if(!e||!t)return;const i=t.getBoundingClientRect(),{left:s,top:r}=function(e,t,i,s,r,o=6,a=8){let n=e.left;s&&t&&n+t+a>s&&(n=s-t-a),n<a&&(n=a);let l=e.bottom+o;if(r&&i&&l+i+a>r){const t=e.top-o-i;t>=a&&(l=t)}return{left:n,top:l}}(i,e.offsetWidth,e.offsetHeight,window.innerWidth,window.innerHeight);e.style.left=`${s}px`,e.style.top=`${r}px`}}Ms.styles=n`
		:host { display: inline-flex; }
		.trigger {
			width: 16px;
			height: 16px;
			padding: 0;
			border: 1px solid rgba(0, 0, 0, 0.2);
			border-radius: 50%;
			cursor: pointer;
			flex-shrink: 0;
		}
		.popover {
			position: fixed;
			z-index: 30;
			padding: 12px;
			background: var(--card-background-color, #fff);
			border: 1px solid var(--divider-color, #e0e0e0);
			border-radius: 10px;
			box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
		}
		.grid {
			display: grid;
			grid-template-columns: repeat(5, 24px);
			gap: 10px;
		}
		.swatch {
			width: 24px;
			height: 24px;
			padding: 0;
			border: 1px solid rgba(0, 0, 0, 0.25);
			border-radius: 50%;
			cursor: pointer;
			position: relative;
		}
		.swatch.selected {
			box-shadow:
				0 0 0 2px var(--card-background-color, #fff),
				0 0 0 4px var(--primary-color, #03a9f4);
		}
		.swatch.in-use::after {
			content: "";
			position: absolute;
			top: -2px;
			right: -2px;
			width: 9px;
			height: 9px;
			border-radius: 50%;
			background: var(--secondary-text-color, #757575);
			border: 1.5px solid var(--card-background-color, #fff);
		}
		.swatch.custom {
			background: conic-gradient(
				red, orange, yellow, lime, cyan, blue, magenta, red
			);
		}
		/* The custom swatch's <input> is visually hidden, so mirror the
		   selected ring on focus-within for keyboard users. */
		.swatch.custom:focus-within {
			box-shadow:
				0 0 0 2px var(--card-background-color, #fff),
				0 0 0 4px var(--primary-color, #03a9f4);
		}
		.custom-glyph {
			position: absolute;
			inset: 0;
			display: flex;
			align-items: center;
			justify-content: center;
			color: #fff;
			font-size: 15px;
			font-weight: 700;
			line-height: 1;
			text-shadow: 0 0 3px rgba(0, 0, 0, 0.7);
			pointer-events: none;
		}
		.custom-input {
			position: absolute;
			width: 1px;
			height: 1px;
			opacity: 0;
			pointer-events: none;
		}
	`,e([ge({attribute:!1})],Ms.prototype,"value",void 0),e([ge({attribute:!1})],Ms.prototype,"presets",void 0),e([ge({attribute:!1})],Ms.prototype,"usedColors",void 0),e([ge({type:Boolean})],Ms.prototype,"occupiedGlow",void 0),e([ge({attribute:!1})],Ms.prototype,"localize",void 0),e([Ae()],Ms.prototype,"_open",void 0),customElements.get("epp-zone-color-picker")||customElements.define("epp-zone-color-picker",Ms);const ks=["#212121","#ffffff","#f44336","#2196f3","#4caf50","#ff9800","#9c27b0","#000000","#ffeb3b","#795548"],Ts=["#ffffff","#000000","#fff59d","#c8e6c9","#bbdefb","#ffccbc","#e1bee7","#eeeeee","#212121","#b0bec5"],Fs=ys.map(e=>({value:e.key,label:e.label})),Ps=[{value:"left",labelKey:"text_label.align_left",icon:"mdi:format-align-left"},{value:"center",labelKey:"text_label.align_center",icon:"mdi:format-align-center"},{value:"right",labelKey:"text_label.align_right",icon:"mdi:format-align-right"}];class zs extends he{constructor(){super(...arguments),this.furniture=[],this.selectedFurnitureId=null,this.hass=void 0,this.localize=Jt,this.showCustomIconPicker=!1,this.customIconValue="",this._searchQuery="",this._cancelCustomIcon=()=>{this.dispatchEvent(new CustomEvent("custom-icon-toggle",{bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("custom-icon-change",{detail:"",bubbles:!0,composed:!0}))}}render(){return this._renderFurnitureSidebar()}_renderFurnitureSidebar(){const e=this.furniture.find(e=>e.id===this.selectedFurnitureId);return Y`
			<input
				type="search"
				class="furn-search"
				.value=${this._searchQuery}
				placeholder=${this.localize("furniture.search_placeholder")}
				aria-label=${this.localize("furniture.search_placeholder")}
				@input=${e=>{this._searchQuery=e.target.value}}
			/>

			<button
				class="furn-add-text"
				type="button"
				@click=${()=>this._fireAddText()}
			>
				<ha-icon icon="mdi:format-text" style="--mdc-icon-size: 20px;"></ha-icon>
				<span>${this.localize("text_label.add")}</span>
			</button>

			${e&&"text"===e.type?this._renderTextEditor(e):e?Y`
							<div class="furn-selected-info">
								<div class="sidebar-item-row">
									<ha-icon icon="${e.icon}" style="--mdc-icon-size: 20px;"></ha-icon>
									<strong>${this.localize(e.label)}</strong>
									<epp-icon-button icon="mdi:close" label=${this.localize("furniture.remove")} variant="danger" class="sidebar-remove-btn" @click=${()=>this._fireRemove(e.id)}></epp-icon-button>
								</div>
								<div class="furn-dims">
									<label>
										${this.localize("dimensions.width_cm")}
										<input type="number" min="10" step="5" .value=${String(Math.round(e.width/10))}
											@change=${t=>this._fireDimensionUpdate(e.id,"width",t.target.value)}
										/>
									</label>
									<label>
										${this.localize("dimensions.height_cm")}
										<input type="number" min="10" step="5" .value=${String(Math.round(e.height/10))}
											@change=${t=>this._fireDimensionUpdate(e.id,"height",t.target.value)}
										/>
									</label>
									<label>
										${this.localize("dimensions.rotation")}
										<input type="number" step="5" .value=${String(Math.round(10*e.rotation)/10)}
											@change=${t=>{const i=parseFloat(t.target.value);if(!Number.isFinite(i))return;const s=(i%360+360)%360;this._fireUpdate(e.id,{rotation:s})}}
										/>
									</label>
								</div>
							</div>
						`:J}

			<div class="furn-catalog">
				${function(e,t,i){const s=t.trim().toLowerCase(),r=e.map(e=>{const t=i(e.label);return{sticker:e,localizedLabel:t,normalizedLabel:t.toLowerCase()}}),o=s?r.filter(e=>e.normalizedLabel.includes(s)):r;return o.slice().sort((e,t)=>e.localizedLabel.localeCompare(t.localizedLabel)).map(e=>e.sticker)}(Mi,this._searchQuery,this.localize).map(e=>Y`
						<button class="furn-sticker" @click=${()=>this._fireAdd(e)}>
							${"svg"===e.type&&Object.hasOwn(Ri,e.icon)?K`<svg viewBox="${Ri[e.icon].viewBox}" class="furn-sticker-svg">
										${li(Ri[e.icon].content)}
									</svg>`:Y`<ha-icon icon="${e.icon}" style="--mdc-icon-size: 24px;"></ha-icon>`}
							<span>${this.localize(e.label)}</span>
						</button>
					`)}
				<button class="furn-sticker furn-custom" @click=${()=>{this.dispatchEvent(new CustomEvent("custom-icon-toggle",{bubbles:!0,composed:!0}))}}>
					<ha-icon icon="mdi:plus" style="--mdc-icon-size: 24px;"></ha-icon>
					<span>${this.localize("furniture.custom_icon")}</span>
				</button>
			</div>
			<epp-dialog
				?open=${this.showCustomIconPicker}
				heading=${this.localize("furniture.custom_icon")}
				@dialog-dismiss=${this._cancelCustomIcon}
			>
				<ha-icon-picker
					.hass=${this.hass}
					.value=${this.customIconValue}
					@value-changed=${e=>{this.dispatchEvent(new CustomEvent("custom-icon-change",{detail:e.detail?.value??"",bubbles:!0,composed:!0}))}}
				></ha-icon-picker>
				${this.customIconValue.trim()?Y`
							<div style="text-align: center;">
								<ha-icon icon="${this.customIconValue.trim()}" style="--mdc-icon-size: 48px;"></ha-icon>
							</div>
						`:J}
				<epp-button slot="actions" variant="text" class="wizard-btn wizard-btn-back"
						@click=${this._cancelCustomIcon}
					>${this.localize("common.cancel")}</epp-button>
					<epp-button slot="actions" variant="primary" class="wizard-btn wizard-btn-primary"
						?disabled=${!this.customIconValue.trim()}
						@click=${()=>{this.dispatchEvent(new CustomEvent("furniture-add-custom",{detail:this.customIconValue.trim(),bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("custom-icon-change",{detail:"",bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("custom-icon-toggle",{bubbles:!0,composed:!0}))}}
					>${this.localize("common.add")}</epp-button>
			</epp-dialog>
		`}_renderTextEditor(e){return Y`
			<div class="furn-text-editor">
				<div class="sidebar-item-row">
					<ha-icon icon="mdi:format-text" style="--mdc-icon-size: 20px;"></ha-icon>
					<strong>${this.localize("text_label.label")}</strong>
					<epp-icon-button icon="mdi:close" label=${this.localize("text_label.remove")} variant="danger" class="sidebar-remove-btn" @click=${()=>this._fireRemove(e.id)}></epp-icon-button>
				</div>

				<textarea
					class="furn-text-input"
					aria-label=${this.localize("text_label.text")}
					maxlength=${512}
					.value=${e.text??""}
					@input=${t=>this._fireUpdate(e.id,{text:t.target.value})}
				></textarea>

				<div class="furn-dims">
					<label>
						${this.localize("text_label.font")}
						<select
							class="furn-font"
							aria-label=${this.localize("text_label.font")}
							@change=${t=>this._fireUpdate(e.id,{fontFamily:t.target.value})}
						>
							${Fs.map(t=>Y`<option value=${t.value} ?selected=${t.value===(e.fontFamily??Cs)}>${t.label}</option>`)}
						</select>
					</label>
					<label>
						${this.localize("text_label.size_cm")}
						<input
							class="furn-size"
							type="number"
							min="3"
							max="300"
							step="1"
							.value=${String(Math.round((e.fontSize??xs)/10))}
							@change=${t=>{const i=parseFloat(t.target.value);Number.isFinite(i)&&this._fireUpdate(e.id,{fontSize:Ds(10*i)})}}
						/>
					</label>
				</div>

				<div class="furn-row">
					<button
						class="furn-seg-btn furn-bold"
						type="button"
						aria-pressed=${e.bold?"true":"false"}
						style="font-weight:700"
						@click=${()=>this._fireUpdate(e.id,{bold:!e.bold})}
					>${this.localize("text_label.bold")}</button>
					<button
						class="furn-seg-btn furn-italic"
						type="button"
						aria-pressed=${e.italic?"true":"false"}
						style="font-style:italic"
						@click=${()=>this._fireUpdate(e.id,{italic:!e.italic})}
					>${this.localize("text_label.italic")}</button>
					<span class="furn-seg" role="group" aria-label=${this.localize("text_label.align")}>
						${Ps.map(t=>Y`<button
								class="furn-align"
								type="button"
								data-align=${t.value}
								aria-pressed=${(e.align??"center")===t.value?"true":"false"}
								aria-label=${this.localize(t.labelKey)}
								@click=${()=>this._fireUpdate(e.id,{align:t.value})}
							><ha-icon icon="${t.icon}" style="--mdc-icon-size:16px"></ha-icon></button>`)}
					</span>
				</div>

				<div class="furn-row">
					<span class="furn-color-label">${this.localize("text_label.text_color")}</span>
					<button
						class="furn-seg-btn furn-color-auto"
						type="button"
						aria-pressed=${e.color?"false":"true"}
						@click=${()=>this._fireUpdate(e.id,{color:void 0})}
					>${this.localize("text_label.auto_color")}</button>
					<epp-zone-color-picker
						class="furn-text-color"
						.value=${e.color??""}
						.presets=${ks}
						.localize=${this.localize}
						@value-changed=${t=>{t.stopPropagation(),this._fireUpdate(e.id,{color:t.detail.value})}}
					></epp-zone-color-picker>
				</div>

				<div class="furn-row">
					<span class="furn-color-label">${this.localize("text_label.background")}</span>
					<button
						class="furn-seg-btn furn-bg-none"
						type="button"
						aria-pressed=${e.background?"false":"true"}
						@click=${()=>this._fireUpdate(e.id,{background:void 0})}
					>${this.localize("text_label.no_background")}</button>
					<epp-zone-color-picker
						class="furn-bg-color"
						.value=${e.background??"#ffffff"}
						.presets=${Ts}
						.localize=${this.localize}
						@value-changed=${t=>{t.stopPropagation(),this._fireUpdate(e.id,{background:t.detail.value})}}
					></epp-zone-color-picker>
				</div>
			</div>
		`}_fireAddText(){this.dispatchEvent(new CustomEvent("furniture-add-text",{bubbles:!0,composed:!0}))}_fireAdd(e){this.dispatchEvent(new CustomEvent("furniture-add",{detail:e,bubbles:!0,composed:!0}))}_fireRemove(e){this.dispatchEvent(new CustomEvent("furniture-remove",{detail:e,bubbles:!0,composed:!0}))}_fireUpdate(e,t){this.dispatchEvent(new CustomEvent("furniture-update",{detail:{id:e,updates:t},bubbles:!0,composed:!0}))}_fireDimensionUpdate(e,t,i){const s=parseInt(i,10);Number.isFinite(s)&&this._fireUpdate(e,{[t]:Math.max(100,10*s)})}}function Us(e,t,i,s){if(i<=0||s<=0)return null;return{col:Si(i)+e/Ai,row:t/Ai}}function Os(e){const t=Math.floor(e.col),i=Math.floor(e.row);return t<0||t>=pi||i<0||i>=ui?null:i*pi+t}function Hs(e,t){return{xPct:(e+zi)/(2*zi)*100,yPct:t/_i*100}}zs.styles=[xe,De,n`
			:host {
				display: block;
			}

			.furn-selected-info {
				display: flex;
				flex-direction: column;
				gap: var(--epp-space-2, 8px);
				padding: var(--epp-space-2, 8px);
				border: 2px solid var(--epp-accent, var(--primary-color, #03a9f4));
				border-radius: 8px;
				margin-bottom: var(--epp-space-2, 8px);
			}

			.furn-dims {
				display: flex;
				gap: 6px;
			}

			.furn-dims label {
				flex: 1;
				font-size: 11px;
				color: var(--epp-text-muted, var(--secondary-text-color, #757575));
				display: flex;
				flex-direction: column;
				gap: 2px;
			}

			.furn-dims input,
			.furn-dims select {
				width: 100%;
				padding: var(--epp-space-1, 4px);
				border: 1px solid var(--divider-color, #e0e0e0);
				border-radius: 4px;
				font-size: var(--epp-font-xs, 12px);
				box-sizing: border-box;
				background: var(--card-background-color, #fff);
				color: var(--primary-text-color, #212121);
			}

			.furn-text-editor {
				display: flex;
				flex-direction: column;
				gap: var(--epp-space-2, 8px);
				padding: var(--epp-space-2, 8px);
				border: 2px solid var(--epp-accent, var(--primary-color, #03a9f4));
				border-radius: 8px;
				margin-bottom: var(--epp-space-2, 8px);
			}
			.furn-text-input {
				width: 100%;
				min-height: 44px;
				resize: vertical;
				box-sizing: border-box;
				padding: var(--epp-space-1, 4px);
				border: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
				border-radius: var(--epp-radius-sm, 6px);
				font: inherit;
				background: var(--epp-surface, var(--card-background-color, #fff));
				color: var(--epp-text, var(--primary-text-color, #212121));
			}
			.furn-row {
				display: flex;
				align-items: center;
				gap: var(--epp-space-2, 8px);
			}
			.furn-seg {
				display: inline-flex;
				border: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
				border-radius: var(--epp-radius-sm, 6px);
				overflow: hidden;
			}
			.furn-seg > button {
				border: 0;
				background: var(--epp-surface, #fff);
				color: var(--epp-text-muted, var(--secondary-text-color, #757575));
				padding: 6px 10px;
				cursor: pointer;
				font: inherit;
				border-right: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
			}
			.furn-seg > button:last-child { border-right: 0; }
			.furn-seg > button[aria-pressed="true"] {
				background: var(--epp-accent, var(--primary-color, #03a9f4));
				color: var(--epp-accent-text, #fff);
			}
			.furn-seg-btn {
				border: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
				border-radius: var(--epp-radius-sm, 6px);
				background: var(--epp-surface, #fff);
				color: var(--epp-text-muted, var(--secondary-text-color, #757575));
				padding: 6px 10px;
				cursor: pointer;
				font: inherit;
			}
			.furn-seg-btn[aria-pressed="true"] {
				background: var(--epp-accent, var(--primary-color, #03a9f4));
				color: var(--epp-accent-text, #fff);
				border-color: var(--epp-accent, var(--primary-color, #03a9f4));
			}
			.furn-add-text {
				display: flex;
				align-items: center;
				justify-content: center;
				gap: var(--epp-space-1, 4px);
				width: 100%;
				margin-bottom: 6px;
				padding: var(--epp-space-2, 8px);
				border: 1px dashed var(--epp-accent, var(--primary-color, #03a9f4));
				border-radius: 8px;
				background: transparent;
				color: var(--epp-accent, var(--primary-color, #03a9f4));
				cursor: pointer;
				font: inherit;
			}
			.furn-color-label { flex: 1; font-size: var(--epp-font-xs, 12px); color: var(--epp-text-muted, #757575); }

			.furn-search {
				position: sticky;
				top: 0;
				z-index: 2;
				width: 100%;
				padding: 6px var(--epp-space-2, 8px);
				margin-bottom: 6px;
				border: 1px solid var(--divider-color, #e0e0e0);
				border-radius: 4px;
				font-size: var(--epp-font-xs, 12px);
				box-sizing: border-box;
				background: var(--card-background-color, #fff);
				color: var(--primary-text-color, #212121);
			}

			.furn-catalog {
				display: grid;
				grid-template-columns: 1fr 1fr;
				gap: var(--epp-space-1, 4px);
				overflow-y: auto;
				flex: 1;
				min-height: 0;
			}

			.furn-sticker {
				display: flex;
				flex-direction: column;
				align-items: center;
				gap: var(--epp-space-1, 4px);
				padding: var(--epp-space-2, 8px) var(--epp-space-1, 4px);
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
		`],e([ge({attribute:!1})],zs.prototype,"furniture",void 0),e([ge({attribute:!1})],zs.prototype,"selectedFurnitureId",void 0),e([ge({attribute:!1})],zs.prototype,"hass",void 0),e([ge({attribute:!1})],zs.prototype,"localize",void 0),e([ge({attribute:!1})],zs.prototype,"showCustomIconPicker",void 0),e([ge({attribute:!1})],zs.prototype,"customIconValue",void 0),e([Ae()],zs.prototype,"_searchQuery",void 0),customElements.get("epp-furniture-sidebar")||customElements.define("epp-furniture-sidebar",zs);const Qs={light:{color:"var(--epp-furniture-on-dark, #eef2f7)",halo:"var(--epp-furniture-halo-on-dark, rgba(0, 0, 0, 0.85))"},dark:{color:"var(--epp-furniture-on-light, #28303c)",halo:"var(--epp-furniture-halo-on-light, rgba(255, 255, 255, 0.95))"}};function Gs([e,t,i]){const s=e=>{const t=Math.min(1,Math.max(0,e/255));return t<=.03928?t/12.92:((t+.055)/1.055)**2.4};return.2126*s(e)+.7152*s(t)+.0722*s(i)}function Ls(e,t){return(Math.max(e,t)+.05)/(Math.min(e,t)+.05)}function $s(e){const t=/^rgba?\(\s*([0-9.]+)[\s,]+([0-9.]+)[\s,]+([0-9.]+)/i.exec(e);if(!t)return null;const i=[Number(t[1]),Number(t[2]),Number(t[3])];return function(e){return!(!Array.isArray(e)||3!==e.length)&&"number"==typeof e[0]&&Number.isFinite(e[0])&&"number"==typeof e[1]&&Number.isFinite(e[1])&&"number"==typeof e[2]&&Number.isFinite(e[2])}(i)?i:null}function Ns(e){const t=/^#([0-9a-fA-F]{6})$/.exec(e);if(!t)return null;const i=Number.parseInt(t[1],16);return[i>>16&255,i>>8&255,255&i]}const Ys=Gs([238,242,247]),Ks=Gs([40,48,60]);function Ws(e){const t=Gs(e),i=Ls(t,Ys)>=Ls(t,Ks)?"light":"dark";return{tone:i,...Qs[i]}}
/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Js={},js=si(class extends ri{constructor(){super(...arguments),this.ot=Js}render(e,t){return t()}update(e,[t,i]){if(Array.isArray(t)){if(Array.isArray(this.ot)&&this.ot.length===t.length&&t.every((e,t)=>e===this.ot[t]))return W}else if(this.ot===t)return W;return this.ot=Array.isArray(t)?Array.from(t):t,this.render(t,i)}});class Zs extends he{constructor(){super(...arguments),this.furniture=[],this.selectedFurnitureId=null,this.roomWidth=3e3,this.cellPx=28,this.gapPx=1,this.minCol=0,this.minRow=0,this.visCols=20,this.visRows=20,this.sidebarTab="zones",this.localize=Jt,this._isNarrow=!1,this._onNarrowMql=e=>{this._isNarrow=e.matches}}connectedCallback(){super.connectedCallback(),this._narrowMql=window.matchMedia("(max-width: 819px)"),this._isNarrow=this._narrowMql.matches,this._narrowMql.addEventListener("change",this._onNarrowMql)}disconnectedCallback(){super.disconnectedCallback(),this._narrowMql?.removeEventListener("change",this._onNarrowMql)}_mmToPx(e){return function(e,t,i=1){return e/Ai*(t+i)}(e,this.cellPx,this.gapPx)}_fireEvent(e,t){this.dispatchEvent(new CustomEvent(e,{bubbles:!0,composed:!0,detail:t}))}_itemRotation(e){return this.furniture.find(t=>t.id===e)?.rotation??0}_onItemPointerDown(e,t){this._fireEvent("furniture-select",t),this._fireEvent("furniture-pointer-down",{e:e,id:t,type:"move",rotation:this._itemRotation(t)})}_onResizePointerDown(e,t,i){this._fireEvent("furniture-pointer-down",{e:e,id:t,type:"resize",handle:i,rotation:this._itemRotation(t)})}_onRotatePointerDown(e,t){this._fireEvent("furniture-pointer-down",{e:e,id:t,type:"rotate",rotation:this._itemRotation(t)})}_onDeletePointerDown(e,t){e.stopPropagation(),this._fireEvent("furniture-delete",t)}_renderSelectionControls(e){return Y`
			<div class="furn-rotate-stem"></div>
			<div class="furn-rotate-handle" @pointerdown=${t=>this._onRotatePointerDown(t,e.id)}>
				<ha-icon icon="mdi:rotate-right" style="--mdc-icon-size: 14px;"></ha-icon>
			</div>
			<div class="furn-delete-btn" @pointerdown=${t=>this._onDeletePointerDown(t,e.id)}>
				<ha-icon icon="mdi:close" style="--mdc-icon-size: 14px;"></ha-icon>
			</div>
		`}render(){if(!this.furniture.length)return J;const e=Si(this.roomWidth),t=this.cellPx+this.gapPx,i=this._isNarrow?44:30,s="furniture"===this.sidebarTab;return Y`
			<div class="furniture-overlay ${s?"":"non-interactive"}">
				${this.furniture.map(r=>{const o=(e-this.minCol)*t+this._mmToPx(r.x),a=(0-this.minRow)*t+this._mmToPx(r.y),n=s&&this.selectedFurnitureId===r.id,l=this.furnitureTones?.get(r.id);if("text"===r.type){const e=this._mmToPx(r.fontSize??xs),t=r.background?Ns(r.background):null,i=t?`background: color-mix(in srgb, ${r.background} 85%, transparent);`:"",s=r.color&&Ns(r.color)?r.color:null,h="var(--epp-text, var(--primary-text-color, #212121))";let d,p=null;s?d=s:t?d=Ws(t).color:l?(d=l.color,p=l.halo):d=h;const u=[`font-family: ${c=r.fontFamily??Cs,(ys.find(e=>e.key===c)??ys[0]).stack};`,`font-size: ${e}px;`,`font-weight: ${r.bold?700:400};`,`font-style: ${r.italic?"italic":"normal"};`,`color: ${d};`,`text-align: ${r.align??Bs};`,i].join(" ");return Y`
							<div
								class="furniture-item furniture-item--text${n?" selected":""}${p?" has-halo":""}"
								data-id="${r.id}"
								style="${p?`--epp-furniture-halo-color:${p};`:""}left: ${o}px; top: ${a}px; transform: rotate(${r.rotation}deg);"
								@pointerdown=${e=>this._onItemPointerDown(e,r.id)}
							>
								<span class="furniture-text-content" style="${u}">${r.text??""}</span>
								${n?this._renderSelectionControls(r):J}
							</div>
						`}var c;const h=this._mmToPx(r.width),d=this._mmToPx(r.height),p="svg"===r.type&&Object.hasOwn(Ri,r.icon)?Ri[r.icon]:null;return Y`
						<div
							class="furniture-item${n?" selected":""}${l?" has-halo":""}"
							data-id="${r.id}"
							style="
								${l?`--epp-furniture-color:${l.color};--epp-furniture-halo-color:${l.halo};`:""}
								left: ${o}px; top: ${a}px;
								width: ${h}px; height: ${d}px;
								transform: rotate(${r.rotation}deg);
							"
							@pointerdown=${e=>this._onItemPointerDown(e,r.id)}
						>
							${p?js([r.icon,h,d],()=>K`<svg viewBox="${p.viewBox}" preserveAspectRatio="none" class="furn-svg">
												${li(function(e,t){return e.replace(/stroke-width="(\d*\.?\d+)"/g,(e,i)=>`stroke-width="${Math.round(Number(i)*t*1e3)/1e3}"`)}(p.content,function(e,t,i){const[,,s,r]=e.trim().split(/\s+/).map(Number),o=Math.sqrt(t/s*(i/r));return Number.isFinite(o)&&o>0?o:1}(p.viewBox,h,d)))}
											</svg>`):Y`<ha-icon icon="${r.icon}" style="--mdc-icon-size: ${.6*Math.min(h,d)}px;"></ha-icon>`}
							${n?Y`
										<!-- Resize handles (cursor follows visual rotation) -->
										${function(e,t,i,s){if(e)return ws;const r=t>=s,o=i>=s;return ms.filter(e=>!!fs(e)||("n"===e||"s"===e?r:o))}(r.lockAspect,h,d,i).map(e=>Y`
												<div
													class="furn-handle furn-handle-${e}"
													style="cursor: ${function(e,t){const i=e.includes("e")?1:e.includes("w")?-1:0,s=e.includes("s")?1:e.includes("n")?-1:0,r=((180*Math.atan2(i,-s)/Math.PI+t)%180+180)%180;switch(45*Math.round(r/45)%180){case 0:return"ns-resize";case 45:return"nesw-resize";case 90:return"ew-resize";default:return"nwse-resize"}}(e,r.rotation)};"
													@pointerdown=${t=>this._onResizePointerDown(t,r.id,e)}
												></div>
											`)}
										${this._renderSelectionControls(r)}
									`:J}
						</div>
					`})}
			</div>
		`}}Zs.styles=n`
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
	`,e([ge({attribute:!1})],Zs.prototype,"furniture",void 0),e([ge({attribute:!1})],Zs.prototype,"selectedFurnitureId",void 0),e([ge({type:Number})],Zs.prototype,"roomWidth",void 0),e([ge({type:Number})],Zs.prototype,"cellPx",void 0),e([ge({type:Number})],Zs.prototype,"gapPx",void 0),e([ge({type:Number})],Zs.prototype,"minCol",void 0),e([ge({type:Number})],Zs.prototype,"minRow",void 0),e([ge({type:Number})],Zs.prototype,"visCols",void 0),e([ge({type:Number})],Zs.prototype,"visRows",void 0),e([ge({attribute:!1})],Zs.prototype,"sidebarTab",void 0),e([ge({attribute:!1})],Zs.prototype,"localize",void 0),e([ge({attribute:!1})],Zs.prototype,"furnitureTones",void 0),e([Ae()],Zs.prototype,"_isNarrow",void 0),customElements.get("epp-furniture-overlay")||customElements.define("epp-furniture-overlay",Zs);const Vs={[ci]:`background-image: ${Gi(1,6)};`,[hi]:`background-image: ${Gi(2,5)};`,[di]:`background-image: ${Gi(3,5)};`};class Xs extends he{constructor(){super(...arguments),this.grid=new Uint8Array(0),this.zoneConfigs=[],this.targets=[],this.roomWidth=0,this.roomDepth=0,this.perspective=null,this.furniture=[],this.selectedFurnitureId=null,this.sidebarTab="zones",this.editable=!1,this.activeZone=null,this.occupancy={},this.targetPrevXY=[],this.localize=Jt,this.maxRangeMm=_i,this.maxGridPx=480,this.showOverlays=!0,this.showDimensions=!0,this.plain=!1,this.fill=!1,this.fadeUncovered=!1,this.capHeightToHalfViewport=!1,this.heightReservePx=130,this.dismissedTargets=new Map,this.frozenBounds=null,this.heatmapCells=[],this.showHeatmap=!1,this.trails=[],this._availPx=0,this._availHeightPx=0,this._onResize=()=>{this._measureAvail()},this._fovCache=null,this._fovPerspective=Xs._FOV_UNCACHED,this._scanCache=null,this._lastEnterIdx=-1,this._onStrokeEnd=()=>{this._lastEnterIdx=-1,this.dispatchEvent(new CustomEvent("cell-paint",{detail:{action:"up"},bubbles:!0,composed:!0}))}}connectedCallback(){super.connectedCallback(),"undefined"!=typeof ResizeObserver&&(this._ro=new ResizeObserver(e=>{const t=e[0]?.contentRect.width??0;t&&Math.abs(t-this._availPx)>=1&&(this._availPx=Math.floor(t))}),this._ro.observe(this)),window.addEventListener("resize",this._onResize)}disconnectedCallback(){super.disconnectedCallback(),this._ro?.disconnect(),window.removeEventListener("resize",this._onResize),void 0!==this._settleRaf&&(cancelAnimationFrame(this._settleRaf),this._settleRaf=void 0)}firstUpdated(){this._measureAvail(),"undefined"!=typeof requestAnimationFrame&&(this._settleRaf=requestAnimationFrame(()=>{this._settleRaf=void 0,this.isConnected&&this._measureAvail()}))}updated(e){this._measureAvail(),this._updateFurnitureTones(e)}_updateFurnitureTones(e){if(!this.furniture.length)return void(this._furnitureTones=void 0);if(!(e.has("furniture")||e.has("grid")||e.has("zoneConfigs")||e.has("roomColor")||e.has("roomWidth")||e.has("roomDepth")||e.has("plain")||e.has("perspective")||e.has("maxRangeMm")||e.has("frozenBounds"))&&void 0!==this._furnitureTones)return;this._furnitureTones=function(e,t,i,s){const r=new Map;for(const o of e){const e=Us(o.x+o.width/2,o.y+o.height/2,t,i);if(!e)continue;const a=Os(e);if(null===a)continue;const n=s(a);if(!n)continue;const{color:l,halo:c}=Ws(n);r.set(o.id,{color:l,halo:c})}return r}(this.furniture,this.roomWidth,this.roomDepth,e=>this._readCellRgb(e));const t=this.shadowRoot?.querySelector("epp-furniture-overlay");t&&(t.furnitureTones=this._furnitureTones)}_readCellRgb(e){const t=this.shadowRoot?.querySelector(`.cell[data-idx="${e}"]`);return t?$s(getComputedStyle(t).backgroundColor):null}_measureAvail(){const e=this.clientWidth;if(e&&Math.abs(e-this._availPx)>=1&&(this._availPx=e),!this.capHeightToHalfViewport){const e=this.getBoundingClientRect().top,t=Math.floor(window.innerHeight-e-this.heightReservePx);t>0&&Math.abs(t-this._availHeightPx)>=1&&(this._availHeightPx=t)}}willUpdate(e){if((e.has("targets")||e.has("dismissedTargets")||e.has("roomWidth")||e.has("roomDepth"))&&0!==this.dismissedTargets.size)for(const[e,t]of this.dismissedTargets){const i=this.targets[e];if(!i||"inactive"===i.status||null==i.x||null==i.y)continue;const s=Us(i.x,i.y,this.roomWidth,this.roomDepth);if(!s)continue;Os(s)!==t&&this.dispatchEvent(new CustomEvent("target-undismissed",{detail:{targetIndex:e},bubbles:!0,composed:!0}))}}render(){const e=this._getScan(),t=this.frozenBounds??e.bounds,i=t.minCol>t.maxCol,s=i?0:t.minCol,r=i?19:t.maxCol,o=i?0:t.minRow,a=i?19:t.maxRow,n=r-s+1,l=a-o+1,c=this.plain?0:1,h=this._availPx>0?4+(n-1)*c:0,d=!this.capHeightToHalfViewport,p=this.fill&&this._availPx>0,u=p?Number.POSITIVE_INFINITY:d?960:this.maxGridPx,g=p?Number.POSITIVE_INFINITY:d?48:32,A=this.fill?0:this.capHeightToHalfViewport?.45*window.innerHeight:this._availHeightPx>=200?this._availHeightPx:0,_=A>0?4+(l-1)*c:0,f=function(e,t,i,s,r,o=32){const a=Math.min(Math.floor(e/s),Math.floor(e/r),o),n=t>0?Math.min(a,Math.floor(t/s)):a,l=i>0?Math.floor(i/r):Number.POSITIVE_INFINITY;return Math.max(1,Math.min(n,l,o))}(u,this._availPx>0?Math.max(1,this._availPx-h):this._availPx,A>0?Math.max(1,A-_):0,n,l,g);return Y`
			<div class="grid-targets-wrapper">
				<div
					class="grid"
					style="grid-template-columns: repeat(${n}, ${f}px); grid-template-rows: repeat(${l}, ${f}px);"
					@pointerup=${this.editable?this._onStrokeEnd:J}
					@pointercancel=${this.editable?this._onStrokeEnd:J}
				>
					${this._renderVisibleCells(e.status,s,r,o,a,f,e.rawBounds)}
				</div>
				${this._renderFurnitureOverlay(f,c,s,o,n,l)}
				${this._renderTargetDots(s,r,o,a,n,l)}
				${this._renderHeatmap(f,s,o,n,l)}
			</div>
			${this.showDimensions?this._renderGridDimensions(e.metrics):J}
		`}_getSensorFov(){return this.perspective?(this._fovPerspective===this.perspective||(this._fovCache=Ki(this.perspective),this._fovPerspective=this.perspective),this._fovCache):null}_getScan(){const e=this._getSensorFov(),t=this._scanCache;if(t&&t.grid===this.grid&&t.fov===e&&t.perspective===this.perspective&&t.roomWidth===this.roomWidth&&t.maxRangeMm===this.maxRangeMm&&t.showDimensions===this.showDimensions)return t;const i=new Array(gi);for(let t=0;t<ui;t++)for(let s=0;s<pi;s++)i[t*pi+s]=Ji(s,t,e,this.roomWidth,this.maxRangeMm);return this._scanCache={grid:this.grid,fov:e,perspective:this.perspective,roomWidth:this.roomWidth,maxRangeMm:this.maxRangeMm,showDimensions:this.showDimensions,status:i,bounds:Zi(this.grid,e,this.roomWidth,this.maxRangeMm),rawBounds:yi(this.grid),metrics:this.showDimensions?ts(this.grid,this.roomWidth,this.perspective,e,this.maxRangeMm):null},this._scanCache}_renderVisibleCells(e,t,i,s,r,o,a){const n=this.occupancy,l=this.plain,c=this.showOverlays,h=l?[]:this.zoneConfigs,d=e=>Oi(e,h,this.roomColor),p=this.fadeUncovered?function(e=Ui){return`color-mix(in srgb, ${e} 88%, #808080)`}(this.roomColor):"",u=(e,t)=>e>=a.minCol&&e<=a.maxCol&&t>=a.minRow&&t<=a.maxRow,g=[];for(let a=s;a<=r;a++)for(let s=t;s<=i;s++){const t=a*pi+s,i=this.grid[t],r=e[t],h="in_range"===r,A=fi(i);let _;_=h?d(i):this.fadeUncovered?u(s,a)?p:d(i):"beyond_max_range"===r&&A?"repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,0.13) 3px, rgba(0,0,0,0.13) 4px), repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(0,0,0,0.13) 3px, rgba(0,0,0,0.13) 4px), #fff":"beyond_max_range"===r?d(i):"repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,0.13) 3px, rgba(0,0,0,0.13) 4px), repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(0,0,0,0.13) 3px, rgba(0,0,0,0.13) 4px), #c8c8c8";let f="";if(!l&&h&&A){const e=mi(i);if(n[e]){const t=e>0?this.zoneConfigs[e-1]?.color:null;f=`position: relative; z-index: 1; box-shadow: 0 0 8px 1px color-mix(in srgb, ${t??"#999"} 60%, ${t?"#222":"#444"});`}}const m=!l&&c&&h&&A?Vs[vi(i)]??"":"",w=this.editable&&h;g.push(Y`
					<div
						class="cell"
						data-idx="${t}"
						style="background: ${_}; width: ${o}px; height: ${o}px; ${f} ${m}"
						@pointerdown=${w?e=>this._onCellPointerDown(t,e):J}
						@pointerenter=${w?()=>this._onCellPointerEnter(t):J}
					></div>
				`)}return g}_onCellPointerDown(e,t){const i=t.target;i?.hasPointerCapture?.(t.pointerId)&&i.releasePointerCapture(t.pointerId),this._lastEnterIdx=-1,this.dispatchEvent(new CustomEvent("cell-paint",{detail:{index:e,action:"down"},bubbles:!0,composed:!0}))}_onCellPointerEnter(e){e!==this._lastEnterIdx&&(this._lastEnterIdx=e,this.dispatchEvent(new CustomEvent("cell-paint",{detail:{index:e,action:"enter"},bubbles:!0,composed:!0})))}_renderTargetDots(e,t,i,s,r,o){const a=[],n=Math.min(this.targets.length,3);for(let l=0;l<n;l++)a.push(this._renderTargetDot(this.targets[l],l,e,t,i,s,r,o));return Y`
			<div class="targets-overlay" style="pointer-events: none;">${a}</div>
		`}_renderTargetDot(e,t,i,s,r,o,a,n){if("inactive"===e.status)return J;const l=e=>null!==e&&e.col>=i&&e.col<=s&&e.row>=r&&e.row<=o;let c=null!=e.x&&null!=e.y?Us(e.x,e.y,this.roomWidth,this.roomDepth):null;if("pending"===e.status&&!l(c)&&this.targetPrevXY[t]&&(c=Us(this.targetPrevXY[t].x,this.targetPrevXY[t].y,this.roomWidth,this.roomDepth)),null===c||!l(c))return J;const h=Math.max(0,Math.min(100,(c.col-i)/a*100)),d=Math.max(0,Math.min(100,(c.row-r)/n*100)),p=Os(c);if(null!==p&&this.dismissedTargets.get(t)===p)return J;if(null!==p&&p<this.grid.length){const e=vi(this.grid[p]);if(2===e||3===e){const e=mi(this.grid[p]);if(!this.occupancy[e])return J}}const u="pending"===e.status?.3:1;return Y`
			<div
				class="target-dot ${this.editable?"":"clickable"}"
				style="left: ${h}%; top: ${d}%; background: ${Fi[t]}; opacity: ${u}; transition: opacity 0.5s ease;"
				@click=${i=>{this.editable||(i.stopPropagation(),this.dispatchEvent(new CustomEvent("target-click",{detail:{targetIndex:t,x:e.x,y:e.y,pctX:h,pctY:d},bubbles:!0,composed:!0})))}}
			></div>
			${"active"===e.status&&e.signal>0?Y`
						<div style="position: absolute; left: ${h}%; top: ${d}%; transform: translate(-50%, -280%); background: rgba(0,0,0,0.7); color: #fff; font-size: 10px; font-weight: bold; padding: 0 4px; border-radius: 6px; pointer-events: none;">
							${e.signal}
						</div>
					`:J}
		`}_renderHeatmap(e,t,i,s,r){if(!this.showHeatmap)return J;const o=this.heatmapCells,a=[];for(let n=0;n<o.length;n++){const l=o[n];if(!l)continue;const c=(n%pi+.5-t)/s*100,h=(Math.floor(n/pi)+.5-i)/r*100;c<0||c>100||h<0||h>100||a.push(Y`<div
				class="heat-cell"
				style="left:${c}%;top:${h}%;width:${e}px;height:${e}px;background:${$i(l)};"
			></div>`)}return Y`<div class="heatmap-overlay">
			${a}
			${this._renderTrails(t,i,s,r)}
		</div>`}_renderTrails(e,t,i,s){const r=this.trails.map(r=>this._trailPolyline(r,e,t,i,s)).filter(e=>null!==e);return 0===r.length?J:Y`<svg class="trail" viewBox="0 0 100 100" preserveAspectRatio="none">${r}</svg>`}_trailPolyline(e,t,i,s,r){if(e.length<2)return null;const o=e.map(e=>{const o=Us(e.x,e.y,this.roomWidth,this.roomDepth);if(!o)return null;return`${(o.col-t)/s*100},${(o.row-i)/r*100}`}).filter(e=>null!==e);return o.length<2?null:K`<polyline
			points=${o.join(" ")}
			fill="none" stroke="rgba(3,169,244,0.7)" stroke-width="0.6"
			stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"
		/>`}_renderGridDimensions(e){return e?Y`
			<div class="grid-dimensions">
				${this.localize("live.grid_dimensions",{width:e.widthM,depth:e.depthM,furthest:e.furthestM})}
			</div>
		`:J}_renderFurnitureOverlay(e,t,i,s,r,o){return this.furniture.length?Y`
			<epp-furniture-overlay
				.furniture=${this.furniture}
				.selectedFurnitureId=${this.selectedFurnitureId}
				.roomWidth=${this.roomWidth}
				.cellPx=${e}
				.gapPx=${t}
				.minCol=${i}
				.minRow=${s}
				.visCols=${r}
				.visRows=${o}
				.sidebarTab=${this.sidebarTab}
				.localize=${this.localize}
				.furnitureTones=${this._furnitureTones}
			></epp-furniture-overlay>
		`:J}}Xs.styles=n`
		:host {
			display: block;
			/* Centre the inline-block .grid-targets-wrapper horizontally within
			   the host. The host fills its container width (display:block), so
			   without this the inline-block grid hugs the LEFT edge whenever the
			   grid is narrower than its region (tall/narrow rooms, or any room
			   narrower than the column). The furniture/target overlays are
			   absolutely positioned relative to .grid-targets-wrapper (which is
			   position:relative), so centring the wrapper moves the whole
			   positioning context together — overlay math is unaffected. */
			text-align: center;
		}

		.grid-targets-wrapper {
			position: relative;
			display: inline-block;
			vertical-align: top;
			/* Reset text-align inside the wrapper so the centred host doesn't
			   leak into the grid-dimensions caption / cell content. */
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

		.grid {
			display: grid;
			gap: 1px;
			background: var(--divider-color, #e0e0e0);
			border: 2px solid var(--divider-color, #e0e0e0);
			border-radius: 8px;
			overflow: hidden;
			user-select: none;
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
	`,Xs._FOV_UNCACHED={},e([ge({attribute:!1})],Xs.prototype,"grid",void 0),e([ge({attribute:!1})],Xs.prototype,"zoneConfigs",void 0),e([ge({attribute:!1})],Xs.prototype,"targets",void 0),e([ge({type:Number})],Xs.prototype,"roomWidth",void 0),e([ge({type:Number})],Xs.prototype,"roomDepth",void 0),e([ge({attribute:!1})],Xs.prototype,"perspective",void 0),e([ge({attribute:!1})],Xs.prototype,"furniture",void 0),e([ge({attribute:!1})],Xs.prototype,"selectedFurnitureId",void 0),e([ge({attribute:!1})],Xs.prototype,"sidebarTab",void 0),e([ge({type:Boolean,reflect:!0})],Xs.prototype,"editable",void 0),e([ge({attribute:!1})],Xs.prototype,"activeZone",void 0),e([ge({attribute:!1})],Xs.prototype,"occupancy",void 0),e([ge({attribute:!1})],Xs.prototype,"targetPrevXY",void 0),e([ge({attribute:!1})],Xs.prototype,"localize",void 0),e([ge({type:Number})],Xs.prototype,"maxRangeMm",void 0),e([ge({type:Number})],Xs.prototype,"maxGridPx",void 0),e([ge({type:Boolean})],Xs.prototype,"showOverlays",void 0),e([ge({type:Boolean})],Xs.prototype,"showDimensions",void 0),e([ge({type:Boolean,reflect:!0})],Xs.prototype,"plain",void 0),e([ge({attribute:!1})],Xs.prototype,"roomColor",void 0),e([ge({type:Boolean})],Xs.prototype,"fill",void 0),e([ge({type:Boolean})],Xs.prototype,"fadeUncovered",void 0),e([ge({type:Boolean})],Xs.prototype,"capHeightToHalfViewport",void 0),e([ge({type:Number})],Xs.prototype,"heightReservePx",void 0),e([ge({attribute:!1})],Xs.prototype,"dismissedTargets",void 0),e([ge({attribute:!1})],Xs.prototype,"frozenBounds",void 0),e([ge({attribute:!1})],Xs.prototype,"heatmapCells",void 0),e([ge({type:Boolean})],Xs.prototype,"showHeatmap",void 0),e([ge({attribute:!1})],Xs.prototype,"trails",void 0),e([Ae()],Xs.prototype,"_availPx",void 0),e([Ae()],Xs.prototype,"_availHeightPx",void 0),e([Ae()],Xs.prototype,"_furnitureTones",void 0),customElements.get("epp-grid")||customElements.define("epp-grid",Xs);class qs extends he{constructor(){super(...arguments),this.items=[],this._open=!1,this._onReposition=()=>{this._open&&this._positionFallbackMenu()},this._onOutside=e=>{e.composedPath().includes(this)||(this._open=!1,this._dismiss.detach())},this._onKeydown=e=>{"Escape"===e.key&&(this._open=!1,this._dismiss.detach())},this._dismiss=new os([{target:document,type:"pointerdown",listener:this._onOutside,options:!0},{target:document,type:"keydown",listener:this._onKeydown,options:!0},{target:window,type:"scroll",listener:this._onReposition,options:!0},{target:window,type:"resize",listener:this._onReposition}])}disconnectedCallback(){super.disconnectedCallback(),this._dismiss.detach()}updated(){this._open&&this._positionFallbackMenu()}_positionFallbackMenu(){const e=this.renderRoot.querySelector(".menu"),t=this.renderRoot.querySelector('[data-testid="kebab-trigger"]');if(!e||!t)return;const i=t.getBoundingClientRect(),s=e.offsetWidth||160,r=e.scrollHeight,o=window.innerHeight-i.bottom-8,a=i.top-8,n=r>o&&a>o,l=Math.max(96,n?a:o),c=Math.max(8,Math.min(i.right-s,window.innerWidth-s-8)),h=n?Math.max(8,i.top-Math.min(r,l)):i.bottom;e.style.top=`${h}px`,e.style.left=`${c}px`,e.style.maxHeight=`${l}px`,e.style.overflowY="auto"}render(){return Y`
			<epp-icon-button
				data-testid="kebab-trigger"
				icon="mdi:dots-vertical"
				label="More"
				@click=${this._toggle}
			></epp-icon-button>
			${this._open?Y`<div class="menu">
							${this.items.map(e=>function(e){return!0===e.divider}(e)?Y`<hr class="kebab-divider" data-testid="kebab-divider" />`:Y`<button
											class="item ${e.danger?"danger":""}"
											data-testid="kebab-item"
											data-id=${e.id}
											@click=${()=>this._emit(e.id)}
										>
											${e.icon?Y`<ha-icon icon=${e.icon}></ha-icon>`:J}
											${e.label}
										</button>`)}
						</div>`:J}
		`}_toggle(){this._open=!this._open,this._open?this._dismiss.attach():this._dismiss.detach()}_emit(e){this._open=!1,this._dismiss.detach(),this.dispatchEvent(new CustomEvent("item-select",{detail:{id:e},bubbles:!0,composed:!0}))}}qs.styles=n`
		:host { position: relative; display: inline-flex; }
		.menu {
			/* position:fixed + JS anchoring (see _positionFallbackMenu): the popover
			   escapes any overflow/clip ancestor, flips above the trigger when there's
			   more room there, and caps its height to the viewport with its own scroll
			   — so the full menu is reachable on mobile / short viewports. top/left are
			   set inline by JS. */
			position: fixed;
			top: 0;
			left: 0;
			z-index: 20;
			min-width: 160px;
			/* So the JS max-height cap (which uses the available viewport space) bounds
			   the border box — padding + border included — and the popover never spills
			   a few px past the edge. */
			box-sizing: border-box;
			padding: var(--epp-space-1, 4px) 0;
			background: var(--epp-surface, var(--card-background-color, #fff));
			border: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
			border-radius: var(--epp-radius-sm, 6px);
			box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		}
		.item {
			display: flex;
			align-items: center;
			gap: 10px;
			width: 100%;
			padding: var(--epp-space-2, 8px) var(--epp-space-4, 16px);
			border: none;
			background: none;
			text-align: left;
			font-size: var(--epp-font-base, 14px);
			cursor: pointer;
			color: var(--epp-text, var(--primary-text-color, #212121));
		}
		.item:hover { background: var(--epp-surface-2, var(--secondary-background-color, #f5f5f5)); }
		.item.danger { color: var(--epp-danger, var(--error-color, #f44336)); }
		.item ha-icon { --mdc-icon-size: 18px; }
		.kebab-divider {
			height: 0;
			margin: var(--epp-space-1, 4px) 0;
			border: none;
			border-top: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
		}
	`,e([ge({attribute:!1})],qs.prototype,"items",void 0),e([Ae()],qs.prototype,"_open",void 0),customElements.get("epp-kebab-menu")||customElements.define("epp-kebab-menu",qs);const er="epp_selected_mac";function tr(){try{return localStorage.getItem(er)}catch{return null}}function ir(e){try{""===e?localStorage.removeItem(er):localStorage.setItem(er,e)}catch{}}const sr="epp_lang_request_dismissed";function rr(){try{const e=localStorage.getItem(sr);if(!e)return[];const t=JSON.parse(e);return Array.isArray(t)?t.filter(e=>"string"==typeof e):[]}catch{return[]}}const or="epp_heatmap_enabled_";function ar(e,t){return`https://github.com/clintongormley/everything-presence-pro-grid/issues/new?${new URLSearchParams({template:"translation_request.md",labels:"translation",title:`Translation request: ${t} (${e})`}).toString()}`}class nr extends he{constructor(){super(...arguments),this.localize=Jt,this._dismissedCode=null,this._nudge=null}willUpdate(e){if(!e.has("hass"))return;const t=function(e){const t=e?.locale?.language??e?.language??"";if(!t)return{available:!0,code:"",baseCode:""};const i=t.split("-")[0];return{available:Boolean(Wt[t])||Boolean(Wt[i]),code:t,baseCode:i}}(this.hass);if(t.available||(i=t.code,rr().includes(i)))return void(this._nudge=null);var i;const s=function(e){if(!e)return e;try{const t=new Intl.DisplayNames([e],{type:"language"}).of(e);if(t&&t!==e)return t}catch{}try{const t=new Intl.DisplayNames(["en"],{type:"language"}).of(e);if(t)return t}catch{}return e}(t.code);this._nudge={code:t.code,name:s,url:ar(t.code,s)}}render(){const e=this._nudge;return e&&this._dismissedCode!==e.code?Y`
			<div class="banner" role="status">
				<ha-icon icon="mdi:translate"></ha-icon>
				<span class="message"
					>${this.localize("language_request.message",{language:e.name})}</span
				>
				<a
					class="action"
					href=${e.url}
					target="_blank"
					rel="noopener noreferrer"
					>${this.localize("language_request.action")}</a
				>
				<epp-icon-button
					icon="mdi:close"
					.label=${this.localize("language_request.dismiss")}
					@click=${t=>this._dismiss(t,e.code)}
				></epp-icon-button>
			</div>
		`:J}_dismiss(e,t){e.stopPropagation(),function(e){try{const t=rr();if(t.includes(e))return;t.push(e),localStorage.setItem(sr,JSON.stringify(t))}catch{}}(t),this._dismissedCode=t}}nr.styles=n`
		:host {
			display: block;
		}
		.banner {
			display: flex;
			align-items: center;
			gap: var(--epp-space-2, 8px);
			margin: var(--epp-space-3, 12px) var(--epp-space-4, 16px) 0;
			padding: var(--epp-space-2, 8px) var(--epp-space-3, 12px);
			border: 1px solid var(--epp-border, #e0e0e0);
			border-radius: var(--epp-radius-md, 10px);
			background: var(--epp-surface-2, #f5f5f5);
			color: var(--epp-text, #212121);
			font-size: var(--epp-font-base, 14px);
		}
		.banner > ha-icon {
			flex: 0 0 auto;
			color: var(--epp-accent, #03a9f4);
		}
		.message {
			flex: 1;
		}
		.action {
			white-space: nowrap;
			color: var(--epp-accent, #03a9f4);
			font-weight: var(--epp-weight-medium, 500);
			text-decoration: none;
		}
		.action:hover {
			text-decoration: underline;
		}
	`,e([ge({attribute:!1})],nr.prototype,"hass",void 0),e([ge({attribute:!1})],nr.prototype,"localize",void 0),e([Ae()],nr.prototype,"_dismissedCode",void 0),e([Ae()],nr.prototype,"_nudge",void 0),customElements.get("epp-language-banner")||customElements.define("epp-language-banner",nr);class lr extends he{constructor(){super(...arguments),this.sensorState={occupancy:!1,static_presence:!1,motion_presence:!1,target_presence:!1,mmwave:!1,illuminance:null,temperature:null,humidity:null,co2:null},this.zoneState={occupancy:{},target_counts:{},frame_count:0},this.zoneConfigs=[],this.hasPerspective=!1,this.localize=Jt,this.presenceKeys=null,this.showZones=!0,this.envKeys=null,this.interactive=!0,this.showInfoTips=!0}_renderRow(e){const t=void 0!==e.color?Y`
					<div
						class="live-sensor-dot"
						style=${e.color?`background: ${e.color};${e.on?` box-shadow: 0 0 6px 2px ${e.color};`:""}`:"background: #fff; border: 1px solid #ccc;"+(e.on?" box-shadow: 0 0 6px 2px #999;":"")}
					></div>
				`:Y`<div class="live-sensor-dot ${e.on?"on":"off"}"></div>`;return Y`
			<div class="live-sensor-row">
				${t}
				<span class="live-sensor-label">${e.label}</span>
				<span class="live-sensor-state ${e.on?"detected":""}">${e.on?this.localize("live.detected"):this.localize("live.clear")}</span>
				${this.showInfoTips?Y`<epp-info-tip .text=${e.info} .localize=${this.localize}></epp-info-tip>`:J}
			</div>
		`}render(){const e=this.sensorState,t=this.zoneState,i=[{id:"occupancy",label:this.localize("live.occupancy"),on:e.occupancy_state??e.occupancy,info:this.localize("info.occupancy")},{id:"static_presence",label:this.localize("live.static_presence"),on:e.static_state?"I"!==e.static_state:e.static_presence,info:this.localize("info.static_presence")},{id:"motion_presence",label:this.localize("live.motion_presence"),on:e.motion_state?"I"!==e.motion_state:e.motion_presence,info:this.localize("info.motion_presence")},{id:"target_presence",label:this.localize("live.target_presence"),on:e.target_presence,info:this.localize("info.target_presence")},{id:"mmwave",label:this.localize("live.mmwave"),on:e.mmwave,info:this.localize("info.mmwave")}],s=this.presenceKeys?i.filter(e=>this.presenceKeys?.includes(e.id)):i,r=[],o=t.occupancy[0]??!1,a=t.target_counts[0]??0;r.push({id:"zone_0",label:this.localize("sidebar.rest_of_room"),on:o,info:this.localize("info.rest_of_room_occupancy",{count:a}),color:null});for(let e=0;e<7;e++){const i=this.zoneConfigs[e];if(!i)continue;const s=e+1,o=t.occupancy[s]??!1,a=t.target_counts[s]??0;r.push({id:`zone_${s}`,label:i.name,on:o,info:this.localize("info.zone_occupancy",{slot:s,count:a}),color:i.color})}const n=[];null!==e.illuminance&&n.push({id:"illuminance",label:this.localize("entities.illuminance"),value:this.localize("live.illuminance_value",{value:e.illuminance})}),null!==e.temperature&&n.push({id:"temperature",label:this.localize("entities.temperature"),value:this.localize("live.temperature_value",{value:e.temperature})}),null!==e.humidity&&n.push({id:"humidity",label:this.localize("entities.humidity"),value:this.localize("live.humidity_value",{value:e.humidity})}),null!==e.co2&&n.push({id:"co2",label:this.localize("entities.co2"),value:this.localize("live.co2_value",{value:e.co2})});const l=this.envKeys?n.filter(e=>this.envKeys?.includes(e.id)):n,c=s.length>0,h=this.showZones&&this.hasPerspective,d=l.length>0,p=Y`<hr style="border: none; border-top: 1px solid var(--divider-color, #eee); margin: 10px 12px;"/>`,u=this.interactive?Y`<button class="live-section-header live-section-link" @click=${()=>{this.dispatchEvent(new CustomEvent("view-change",{detail:{view:"editor",sidebarTab:"zones"},bubbles:!0,composed:!0}))}}>${this.localize("sidebar.detection_zones")}</button>`:Y`<div class="live-section-header">${this.localize("sidebar.detection_zones")}</div>`;return Y`
      <div style="padding: 8px 0;">
        ${c?Y`<div class="live-section-header">${this.localize("live.presence")}</div>
            ${s.map(e=>this._renderRow(e))}`:J}
        ${h?Y`${c?p:J}${u}
            ${r.map(e=>this._renderRow(e))}`:J}
        ${d?Y`${c||h?p:J}
            <div class="live-section-header">${this.localize("live.environment")}</div>
            ${l.map(e=>Y`
              <div class="live-sensor-row">
                <span class="live-sensor-label">${e.label}</span>
                <span class="live-sensor-value">${e.value}</span>
              </div>`)}`:J}
      </div>
    `}}lr.styles=n`
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

  `,e([ge({attribute:!1})],lr.prototype,"sensorState",void 0),e([ge({attribute:!1})],lr.prototype,"zoneState",void 0),e([ge({attribute:!1})],lr.prototype,"zoneConfigs",void 0),e([ge({attribute:!1})],lr.prototype,"hasPerspective",void 0),e([ge({attribute:!1})],lr.prototype,"localize",void 0),e([ge({attribute:!1})],lr.prototype,"presenceKeys",void 0),e([ge({type:Boolean})],lr.prototype,"showZones",void 0),e([ge({attribute:!1})],lr.prototype,"envKeys",void 0),e([ge({type:Boolean})],lr.prototype,"interactive",void 0),e([ge({type:Boolean})],lr.prototype,"showInfoTips",void 0),customElements.get("epp-live-sidebar")||customElements.define("epp-live-sidebar",lr);const cr={room_occupancy:!0,zone_presence:!0,room_target_presence:!1,room_static_presence:!1,room_motion_presence:!1,room_mmwave:!1,target_active:!1,target_xy:!1,target_signal:!1,target_zone:!1,zone_target_count:!1,target_count:!1,env_temperature:!1,env_humidity:!1,env_illuminance:!1,env_co2:!1},hr={temperature_offset:0,humidity_offset:0,illuminance_offset:0,motion_timeout:5,target_auto_distance:!0,target_max_distance:6,stuck_target_timeout:300,assisted_clear_enabled:!0,assisted_clear_timeout:5,static_auto_distance:!0,static_min_distance:.3,static_max_distance:16,static_trigger_threshold:3,static_renew_threshold:3,static_timeout:30,static_on_delay:0,led_mode:"Manual Control",led_brightness:1,led_presence_color:"#CC33FF",relay_trigger_mode:"disabled",relay_contact_mode:"no",target_update_rate_ms:1e3,zone_update_rate_ms:1e3,entities:{...cr},log_levels:{}};function dr(e){const t=hr[e];return"object"==typeof t&&null!==t?{...t}:t}function pr(e,t){return"object"==typeof t&&null!==t?0===Object.keys(t).length&&("object"==typeof e&&null!==e&&0===Object.keys(e).length):e===t}Object.freeze(cr),Object.freeze(hr.entities),Object.freeze(hr.log_levels),Object.freeze(hr);const ur=[["temperature_offset","_temperatureOffset"],["humidity_offset","_humidityOffset"],["illuminance_offset","_illuminanceOffset"],["motion_timeout","_motionTimeout"],["target_auto_distance","_targetAutoDistance"],["target_max_distance","_targetMaxDistance"],["stuck_target_timeout","_stuckTargetTimeout"],["assisted_clear_enabled","_assistedClearEnabled"],["assisted_clear_timeout","_assistedClearTimeout"],["static_auto_distance","_staticAutoDistance"],["static_min_distance","_staticMinDistance"],["static_max_distance","_staticMaxDistance"],["static_trigger_threshold","_staticTriggerThreshold"],["static_renew_threshold","_staticRenewThreshold"],["static_timeout","_staticTimeout"],["static_on_delay","_staticOnDelay"],["led_mode","_ledMode"],["led_brightness","_ledBrightness"],["led_presence_color","_ledPresenceColor"],["relay_trigger_mode","_relayTriggerMode"],["relay_contact_mode","_relayContactMode"],["target_update_rate_ms","_targetUpdateRateMs"],["zone_update_rate_ms","_zoneUpdateRateMs"],["entities","_entitiesConfig"],["log_levels","_logLevels"]];const gr=[{type:"default"},null,null,null,null,null,null,null],Ar={default:{trigger:5,renew:3,timeout:10,handoff_timeout:3},bed:{trigger:8,renew:2,timeout:600,handoff_timeout:10},seating:{trigger:7,renew:1,timeout:30,handoff_timeout:10},transit:{trigger:3,renew:2,timeout:3,handoff_timeout:1}},_r=["default","bed","seating","transit","custom"],fr=["#B8E7FF","#CFDB70","#FFC4CF","#F3E7AC","#7CCFB8","#A0C4E7","#F3AC94"],mr=[...fr,"#4FC3F7","#9CCC65","#F06292","#FFD54F","#4DB6AC","#7986CB"];function wr(e){const t=Ar[e.type]??Ar.default,i="custom"===e.type;return{type:e.type,trigger:i?e.trigger??t.trigger:t.trigger,renew:i?e.renew??t.renew:t.renew,timeout:i?e.timeout??t.timeout:t.timeout,handoff_timeout:i?e.handoff_timeout??t.handoff_timeout:t.handoff_timeout}}function vr(e){return Math.max(1,e)}function br(e,t,i,s,r,o,a){if(0===e){const e=Ar[i]||Ar.default;return"custom"===i?{trigger:vr(s),renew:vr(r),timeout:o,handoffTimeout:a}:{trigger:vr(e.trigger),renew:vr(e.renew),timeout:e.timeout,handoffTimeout:e.handoff_timeout}}if(e>0&&e<=t.length){const i=t[e-1];if(i){const e=Ar[i.type]||Ar.default;return"custom"===i.type?{trigger:vr(i.trigger??e.trigger),renew:vr(i.renew??e.renew),timeout:i.timeout??e.timeout,handoffTimeout:i.handoff_timeout??e.handoff_timeout}:{trigger:vr(e.trigger),renew:vr(e.renew),timeout:e.timeout,handoffTimeout:e.handoff_timeout}}}throw new Error(`getZoneThresholds: zone ${e} is not configured`)}const Er={rest:"bed",thoroughfare:"transit"};function yr(e){const t="string"==typeof e&&e in Er?Er[e]:e;return _r.includes(t)?t:"default"}const Cr=/^#[0-9a-fA-F]{6}$/;function xr(e){return"string"==typeof e&&Cr.test(e)?e:void 0}function Br(e,t){const i="number"==typeof e?e:"string"==typeof e?Number(e):NaN;return Number.isFinite(i)?i:t}function Sr(e,t){const i=Br(e,t);return i>0?i:t}function Ir(e,t){return"string"==typeof e&&e.length>0?e:"number"==typeof e&&Number.isFinite(e)?String(e):t}function Dr(e,t,i){const s=e||{},r=hr;return{temperatureOffset:s.temperature_offset??r.temperature_offset,humidityOffset:s.humidity_offset??r.humidity_offset,illuminanceOffset:s.illuminance_offset??r.illuminance_offset,motionTimeout:s.motion_timeout??r.motion_timeout,targetAutoDistance:s.target_auto_distance??r.target_auto_distance,targetMaxDistance:s.target_max_distance??r.target_max_distance,stuckTargetTimeout:s.stuck_target_timeout??r.stuck_target_timeout,assistedClearEnabled:s.assisted_clear_enabled??r.assisted_clear_enabled,assistedClearTimeout:s.assisted_clear_timeout??r.assisted_clear_timeout,staticAutoDistance:s.static_auto_distance??r.static_auto_distance,staticMinDistance:s.static_min_distance??r.static_min_distance,staticMaxDistance:s.static_max_distance??r.static_max_distance,staticTriggerThreshold:s.static_trigger_threshold??r.static_trigger_threshold,staticRenewThreshold:s.static_renew_threshold??r.static_renew_threshold,staticTimeout:s.static_timeout??r.static_timeout,staticOnDelay:Math.min(Math.max(s.static_on_delay??r.static_on_delay,0),2),entities:t||{},logLevels:i??{},ledMode:s.led_mode??r.led_mode,ledBrightness:s.led_brightness??r.led_brightness,ledPresenceColor:s.led_presence_color??r.led_presence_color,relayTriggerMode:s.relay_trigger_mode??r.relay_trigger_mode,relayContactMode:s.relay_contact_mode??r.relay_contact_mode,targetUpdateRateMs:s.target_update_rate_ms??r.target_update_rate_ms,zoneUpdateRateMs:s.zone_update_rate_ms??r.zone_update_rate_ms}}function Rr(e){const t=function(e){const t=e?.calibration,i=t?.perspective,s=Array.isArray(i)&&8===i.length&&i.every(e=>"number"==typeof e&&Number.isFinite(e))&&i.some(e=>Math.abs(e)>1e-9);return s&&t.room_width>0?{perspective:i,roomWidth:t.room_width||0,roomDepth:t.room_depth||0}:{perspective:null,roomWidth:0,roomDepth:0}}(e),i=e?.room_layout||{},s=(r=i.furniture,(Array.isArray(r)?r:[]).map((e,t)=>{const i=Ir(e?.type,"icon"),s="svg"===i?"svg":"text"===i?"text":"icon",r={id:Ir(e?.id,`f_load_${t}`),type:s,icon:Ir(e?.icon,"text"===s?Is:"mdi:help"),label:Ir(e?.label,"text"===s?Ss:"Item"),x:Br(e?.x,0),y:Br(e?.y,0),width:Sr(e?.width,600),height:Sr(e?.height,600),rotation:Br(e?.rotation,0),lockAspect:"boolean"==typeof e?.lockAspect?e.lockAspect:"svg"!==s};if("text"!==s)return r;const o=ys.some(t=>t.key===e?.fontFamily)?e.fontFamily:Cs,a="left"===e?.align||"right"===e?.align||"center"===e?.align?e.align:Bs;return{...r,text:"string"==typeof e?.text?e.text.slice(0,512):"",fontFamily:o,fontSize:Ds(Br(e?.fontSize,xs)),color:xr(e?.color),bold:!0===e?.bold,italic:!0===e?.italic,align:a,background:xr(e?.background)}}));var r;const o=function(e,t,i){if(e?.grid_bytes&&Array.isArray(e.grid_bytes)){const t=new Uint8Array(gi),i=e.grid_bytes,s=Math.min(i.length,gi);for(let e=0;e<s;e++)t[e]=i[e];return t}return t>0&&i>0?Di(t,i):new Uint8Array(gi)}(i,t.roomWidth,t.roomDepth),{zone0:a,zones:n}=function(e){const t={zone0:{type:"default"},zones:Array(7).fill(null)},i=e?.zone_slots;if(!Array.isArray(i)||8!==i.length)return t;if(!i[0]||"object"!=typeof i[0])return t;const s={type:yr(i[0].type),trigger:i[0].trigger,renew:i[0].renew,timeout:i[0].timeout,handoff_timeout:i[0].handoff_timeout},r=Array.from({length:7},(e,t)=>{const s=i[t+1];return s&&"object"==typeof s?{...s,type:yr(s.type),color:(r=s.color,o=t+1,"string"==typeof r&&Cr.test(r)?r:fr[(o-1)%fr.length])}:null;var r,o});return{zone0:s,zones:r}}(i);return{calibration:t,furniture:s,grid:o,zone0:a,zoneConfigs:n,settings:Dr(e?.settings,e?.entities,e?.log_levels)}}function Mr(e){const{saving:t,dirty:i,localize:s,onSave:r,onCancel:o}=e,a=s(t?"common.saving":"common.save"),n=t||!i;return Y`
      <div class="save-cancel-bar">
        <epp-button class="cancel-btn" variant="text" @click=${o}
          >${s("common.cancel")}</epp-button
        >
        <epp-button
          class="save-btn"
          variant="primary"
          ?disabled=${n}
          @click=${r}
          >${a}</epp-button
        >
      </div>
    `}const kr=["None","Error","Warning","Info","Debug"],Tr=[{key:"system",label:"settings.log_system",tip:"info.log_system"},{key:"epp",label:"settings.log_epp",tip:"info.log_epp"},{key:"led",label:"settings.log_led",tip:"info.log_led"},{key:"networking",label:"settings.log_networking",tip:"info.log_networking"},{key:"ble",label:"settings.log_ble",tip:"info.log_ble"},{key:"co2",label:"settings.log_co2",tip:"info.log_co2"}],Fr=Object.fromEntries(ur.flatMap(([e,t])=>{const i=hr[e];return"number"==typeof i?[[t.slice(1),i]]:[]})),Pr=n`
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
`,zr=n`
  .setting-info {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    margin-left: 8px;
  }

  button.setting-info {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: inherit;
    font: inherit;
  }

  .setting-info ha-icon {
    --mdc-icon-size: 18px;
    color: var(--primary-text-color, #212121);
  }

  epp-info-tip {
    margin-left: 8px;
  }

  /* Grey out a disabled row's controls but keep the info tip usable — the
     documentation must stay available even when the option it documents is
     disabled. */
  .setting-row.row-disabled > :not(epp-info-tip) {
    opacity: 0.5;
    pointer-events: none;
  }
`;class Ur extends he{constructor(){super(...arguments),this.sensorState={occupancy:!1,static_presence:!1,motion_presence:!1,target_presence:!1,illuminance:null,temperature:null,humidity:null,co2:null},this.targetAutoDistance=!0,this.targetMaxDistance=6,this.stuckTargetTimeout=300,this.assistedClearEnabled=!0,this.assistedClearTimeout=5,this.staticAutoDistance=!0,this.staticMinDistance=.3,this.staticMaxDistance=16,this.openAccordions=new Set,this.perspective=null,this.roomWidth=0,this.roomDepth=0,this.grid=new Uint8Array(0),this.saving=!1,this.dirty=!1,this.temperatureOffset=0,this.humidityOffset=0,this.illuminanceOffset=0,this.motionTimeout=5,this.staticTimeout=30,this.staticTriggerThreshold=3,this.staticRenewThreshold=3,this.staticOnDelay=0,this.entitiesConfig={},this.logLevels={},this.co2Enabled=!1,this.ledMode="Manual Control",this.ledBrightness=1,this.ledPresenceColor="#CC33FF",this.relayTriggerMode="disabled",this.relayContactMode="no",this.targetUpdateRateMs=1e3,this.zoneUpdateRateMs=1e3,this._overrides={},this._localDirty=!1,this.localize=Jt,this._stopClosed=e=>{e.stopPropagation()},this._optionCache=null,this._geomCache=null}_getOptions(){const e=this._optionCache;if(e&&e.localize===this.localize&&e.co2Enabled===this.co2Enabled)return e;const t=this.localize,i=[{value:"Manual Control",label:t("settings.manual_control")},{value:"Presence",label:t("settings.presence")}];return this.co2Enabled&&i.push({value:"Environmental",label:t("settings.environmental")},{value:"Environmental + Presence",label:t("settings.environmental_presence")}),this._optionCache={localize:t,co2Enabled:this.co2Enabled,rateOptions:[{value:"200",label:t("settings.frequency.5hz")},{value:"500",label:t("settings.frequency.2hz")},{value:"1000",label:t("settings.frequency.1hz")},{value:"2000",label:t("settings.frequency.0_5hz")}],logLevelOptions:kr.map(e=>({value:e,label:t(`settings.log_level.${e.toLowerCase()}`)})),ledModes:i,relayTriggerModes:[{value:"disabled",label:t("settings.relay_disabled")},{value:"motion",label:t("settings.relay_motion")},{value:"presence",label:t("settings.relay_presence")},{value:"occupancy",label:t("settings.relay_occupancy")}],relayContactModes:[{value:"no",label:t("settings.relay_normally_open")},{value:"nc",label:t("settings.relay_normally_closed")}]},this._optionCache}_getGeometry(){const e=this._geomCache;return e&&e.grid===this.grid&&e.perspective===this.perspective&&e.roomWidth===this.roomWidth&&e.roomDepth===this.roomDepth?e:(this._geomCache={grid:this.grid,perspective:this.perspective,roomWidth:this.roomWidth,roomDepth:this.roomDepth,autoRange:Xi(this.roomWidth,this.roomDepth,this.perspective,this.grid),metrics:ts(this.grid,this.roomWidth,this.perspective)},this._geomCache)}render(){return Y`
      <div class="settings-container">
        <div class="settings-scroll">
        <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 500;">${this.localize("settings.title")}</h2>
        ${[{id:"reporting",label:"settings.entities",icon:"mdi:format-list-checks"},{id:"detection",label:"settings.detection_ranges",icon:"mdi:signal-distance-variant"},{id:"sensitivity",label:"settings.sensor_calibration",icon:"mdi:tune-vertical"},{id:"led_relay",label:"settings.led_and_relay",icon:"mdi:led-variant-on"},{id:"logging",label:"settings.logging",icon:"mdi:math-log"}].map(e=>{const t=this.openAccordions.has(e.id);return Y`
            <div class="accordion">
              <button class="accordion-header" ?data-open=${t} @click=${()=>this.toggleAccordion(e.id)}>
                <ha-icon icon=${e.icon}></ha-icon>
                <span class="accordion-title">${this.localize(e.label)}</span>
                <ha-icon class="accordion-chevron" icon="mdi:chevron-down" ?data-open=${t}></ha-icon>
              </button>
              ${t?Y`
                <div class="accordion-body">
                  ${this.renderSettingsSection(e.id)}
                </div>
              `:J}
            </div>
          `})}
        </div>
        ${this.renderSaveCancelButtons()}
      </div>
    `}toggleAccordion(e){const t=this.openAccordions.has(e)?new Set:new Set([e]);this.openAccordions=t,this.dispatchEvent(new CustomEvent("accordion-toggle",{detail:t,bubbles:!0,composed:!0}))}renderSettingsSection(e){switch(e){case"detection":return this.renderDetectionRanges();case"sensitivity":return this.renderSensitivities();case"reporting":return this.renderEntities();case"led_relay":return Y`${this.renderLed()}${this.renderRelay()}`;case"logging":return this.renderLogging();default:return J}}renderEnvOffset(e,t,i,s,r,o,a,n,l,c=-1/0,h=1/0){const d=`${i}Offset`,p="function"==typeof t?t:()=>t,u=p(),g=this[d]??0,A=this._overrides[`${i}Offset`]??g,_=null!=u?u-g:null,f=e=>Math.max(c,Math.min(h,e)),m=null!=_?this.localize.formatNumber(f(_+A),n):"—";return Y`
      <div class="setting-row">
        <label>${e}</label>
        <span class="setting-input-unit"><input type="range" class="setting-range" data-offset-key=${i} data-precision=${n} data-display-min=${c} data-display-max=${h} min=${s} max=${r} step=${o} .value=${String(A)} @input=${e=>{const t=e.target,s=parseFloat(t.value),r=p(),o=this[d]??0,a=null!=r?r-o:null,l=null!=a?this.localize.formatNumber(f(a+s),n):"—";this._setSettingValue(t,l),this._overrides[`${i}Offset`]=s,this._fireDirty()}} /><span class="setting-value">${m}</span> ${a}</span>
        ${this.resetBtn(0)}${this.infoTip(l)}
      </div>
    `}_setText(e,t){const i=document.createTreeWalker(e,NodeFilter.SHOW_TEXT).nextNode();i?i.data=t:e.textContent=t}_setSettingValue(e,t){const i=e.parentElement?.querySelector(".setting-value");i instanceof HTMLElement&&this._setText(i,t)}_resetSlider(e,t,i){const s=e.querySelector(".setting-range");if(!s)return;s.value=String(t);const r=s.parentElement?.querySelector(".setting-value");if(r)if(s.dataset.offsetKey){const e=s.dataset.offsetKey,i=this.sensorState[e];if(null==i)this._setText(r,"—");else{const o=i-(this[`${e}Offset`]??0),a=parseInt(s.dataset.precision??"0",10),n=parseFloat(s.dataset.displayMin??"-Infinity"),l=parseFloat(s.dataset.displayMax??"Infinity"),c=Math.max(n,Math.min(l,o+t));this._setText(r,this.localize.formatNumber(c,a))}this._overrides[`${s.dataset.offsetKey}Offset`]=t}else this._setText(r,String(t));i&&(this._overrides[i]=t),this._localDirty=!0}resetBtn(e,t){return Y`<button
			type="button"
			class="setting-info"
			aria-label=${this.localize("settings.reset_to_default")}
			title=${this.localize("settings.reset_to_default")}
			@click=${i=>{i.stopPropagation();const s=i.currentTarget.closest(".setting-row");s&&this._resetSlider(s,e,t),t?this._fireChange(t,e):this._fireDirty()}}
		><ha-icon icon="mdi:restart"></ha-icon></button>`}infoTip(e){return Y`<epp-info-tip .text=${e} .localize=${this.localize}></epp-info-tip>`}renderDetectionRanges(){const{autoRange:e,metrics:t}=this._getGeometry(),i=e>0?Math.min(e,6):6,s=e>0?Math.min(e,16):16,r=this.targetAutoDistance?i:this.targetMaxDistance,o=this.staticAutoDistance?s:this.staticMaxDistance;return Y`
      <div class="settings-section">
        ${t?Y`<p style="font-size: 13px; color: var(--secondary-text-color, #757575); margin: 0 0 12px;">${this.localize("settings.furthest_point")} <span style="font-weight: 700; color: var(--error-color, #db4437);">${this.localize.formatNumber(t.furthestM,1)}m</span></p>`:J}
        <epp-card heading=${this.localize("settings.target_sensor")}>
          <!-- .setting-row conversion to epp-section-row is deferred: _resetSlider
               uses closest(".setting-row") and slider rows don't map cleanly to
               the label/control shape. -->
          <div class="setting-row">
            <label>${this.localize("settings.auto")}</label>
            <epp-toggle
              .checked=${this.targetAutoDistance}
              @value-changed=${e=>{e.stopPropagation();const t=e.detail.value;t||(this._overrides.targetMaxDistance=r,this._fireChange("targetMaxDistance",r)),this._overrides.targetAutoDistance=t,this._fireChange("targetAutoDistance",t)}}
            ></epp-toggle>
            ${this.infoTip(this.localize("info.target_auto_range"))}
          </div>
          <div class="setting-row${this.targetAutoDistance?" row-disabled":""}">
            <label>${this.localize("settings.max_distance")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" .value=${String(r)} min="0.5" max="6" step="0.1"
              @input=${e=>{const t=e.target,i=Number(t.value);this._overrides.targetMaxDistance=i,this._fireChange("targetMaxDistance",i),this._setSettingValue(t,this.localize.formatNumber(i,1))}} /><span class="setting-value">${this.localize.formatNumber(r,1)}</span><span class="setting-unit">m</span></span>
            ${this.resetBtn(i,"targetMaxDistance")}${this.infoTip(this.localize("info.target_max_distance"))}
          </div>
        </epp-card>
        <epp-card heading=${this.localize("settings.static_sensor")}>
          <!-- .setting-row conversion deferred — see comment above -->
          <div class="setting-row">
            <label>${this.localize("settings.auto")}</label>
            <epp-toggle
              .checked=${this.staticAutoDistance}
              @value-changed=${e=>{e.stopPropagation();const t=e.detail.value;t||(this._overrides.staticMinDistance=.3,this._fireChange("staticMinDistance",.3),this._overrides.staticMaxDistance=o,this._fireChange("staticMaxDistance",o)),this._overrides.staticAutoDistance=t,this._fireChange("staticAutoDistance",t)}}
            ></epp-toggle>
            ${this.infoTip(this.localize("info.target_auto_range"))}
          </div>
          <div class="setting-row${this.staticAutoDistance?" row-disabled":""}">
            <label>${this.localize("settings.min_distance")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" .value=${String(this.staticAutoDistance?.3:this.staticMinDistance)} min="0.3" max="16" step="0.1"
              @input=${e=>{const t=e.target;let i=Number(t.value);const s=this._overrides.staticMaxDistance??this.staticMaxDistance;i>=s&&(i=Math.round(10*(s-.1))/10,t.value=String(i)),this._overrides.staticMinDistance=i,this._fireChange("staticMinDistance",i),this._setSettingValue(t,this.localize.formatNumber(i,1))}} /><span class="setting-value">${this.localize.formatNumber(this.staticAutoDistance?.3:this.staticMinDistance,1)}</span><span class="setting-unit">m</span></span>
            ${this.resetBtn(.3,"staticMinDistance")}${this.infoTip(this.localize("info.static_min_distance"))}
          </div>
          <div class="setting-row${this.staticAutoDistance?" row-disabled":""}">
            <label>${this.localize("settings.max_distance")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" .value=${String(o)} min="2.4" max="16" step="0.1"
              @input=${e=>{const t=e.target;let i=Number(t.value);const s=this._overrides.staticMinDistance??this.staticMinDistance;i<=s&&(i=Math.round(10*(s+.1))/10,t.value=String(i)),this._overrides.staticMaxDistance=i,this._fireChange("staticMaxDistance",i),this._setSettingValue(t,this.localize.formatNumber(i,1))}} /><span class="setting-value">${this.localize.formatNumber(o,1)}</span><span class="setting-unit">m</span></span>
            ${this.resetBtn(s,"staticMaxDistance")}${this.infoTip(this.localize("info.static_max_distance"))}
          </div>
        </epp-card>
      </div>
    `}renderSliderRow(e){return Y`
      <div class="setting-row${e.disabled?" row-disabled":""}">
        <label>${this.localize(e.label)}</label>
        <span class="setting-input-unit"><input type="range" class="setting-range" ?disabled=${e.disabled??!1} .value=${String(e.value)} min=${e.min} max=${e.max} step=${e.step??1} @input=${t=>{const i=t.target,s=Number(i.value);this._overrides[e.key]=s,this._setSettingValue(i,i.value),this._fireChange(e.key,s)}} /><span class="setting-value">${e.value}</span><span class="setting-unit">${e.unit}</span></span>
        ${this.resetBtn(e.defaultValue,e.key)}${this.infoTip(this.localize(e.tip))}
      </div>
    `}renderSensitivities(){const e=[{title:"settings.motion_sensor",rows:[{label:"settings.presence_timeout",key:"motionTimeout",value:this.motionTimeout,min:0,max:120,unit:"s",defaultValue:Fr.motionTimeout,tip:"info.motion_timeout"}]},{title:"settings.static_sensor",rows:[{label:"settings.presence_delay",key:"staticOnDelay",value:this.staticOnDelay,min:0,max:2,step:.1,unit:"s",defaultValue:Fr.staticOnDelay,tip:"info.presence_delay"},{label:"settings.presence_timeout",key:"staticTimeout",value:this.staticTimeout,min:0,max:120,unit:"s",defaultValue:Fr.staticTimeout,tip:"info.static_timeout"},{label:"settings.trigger_threshold",key:"staticTriggerThreshold",value:this.staticTriggerThreshold,min:1,max:9,unit:"",defaultValue:Fr.staticTriggerThreshold,tip:"info.trigger_threshold"},{label:"settings.renew_threshold",key:"staticRenewThreshold",value:this.staticRenewThreshold,min:1,max:9,unit:"",defaultValue:Fr.staticRenewThreshold,tip:"info.renew_threshold"}]},{title:"settings.target_sensor",rows:[{label:"settings.stuck_target_timeout",key:"stuckTargetTimeout",value:this.stuckTargetTimeout,min:0,max:600,unit:"s",defaultValue:Fr.stuckTargetTimeout,tip:"info.stuck_target_timeout"}]}];return Y`
      <div class="settings-section">
        ${e.map(e=>Y`
        <epp-card heading=${this.localize(e.title)}>
          <!-- .setting-row conversion to epp-section-row is deferred: _resetSlider
               uses closest(".setting-row") and slider rows don't map cleanly to
               the label/control shape. -->
          ${e.rows.map(e=>this.renderSliderRow(e))}
        </epp-card>
        `)}
        <epp-card heading=${this.localize("settings.assisted_clear")}>
          <!-- .setting-row conversion deferred — see comment above -->
          <div class="setting-row">
            <label>${this.localize("settings.assisted_clear_enabled")}</label>
            <epp-toggle
              .checked=${this.assistedClearEnabled}
              @value-changed=${e=>{e.stopPropagation();const t=e.detail.value;this._overrides.assistedClearEnabled=t,this._fireChange("assistedClearEnabled",t)}}
            ></epp-toggle>
            ${this.infoTip(this.localize("info.assisted_clear_enabled"))}
          </div>
          ${this.renderSliderRow({label:"settings.assisted_clear_timeout",key:"assistedClearTimeout",value:this.assistedClearTimeout,min:0,max:600,unit:"s",defaultValue:Fr.assistedClearTimeout,tip:"info.assisted_clear_timeout",disabled:!this.assistedClearEnabled})}
        </epp-card>
        <epp-card heading=${this.localize("settings.environmental")}>
          <!-- .setting-row conversion deferred — see comment above -->
          ${this.renderEnvOffset(this.localize("settings.illuminance_offset"),()=>this.sensorState.illuminance,"illuminance",-500,500,1,"lux",1,this.localize("info.illuminance_offset"),0)}
          ${this.renderEnvOffset(this.localize("settings.humidity_offset"),()=>this.sensorState.humidity,"humidity",-50,50,.1,"%",1,this.localize("info.humidity_offset"),0,100)}
          ${this.renderEnvOffset(this.localize("settings.temperature_offset"),()=>this.sensorState.temperature,"temperature",-20,20,.1,"°C",1,this.localize("info.temperature_offset"))}
        </epp-card>
      </div>
    `}renderEntityToggleRow(e,t,i){return Y`
      <div class="setting-row">
        <label>${this.localize(e.label)}</label>
        <epp-toggle
          data-entity-key=${e.key}
          .checked=${t(e.key,e.defaultValue)}
          .disabled=${e.disabled??!1}
          @value-changed=${t=>{t.stopPropagation(),i(e.key,t.detail.value)}}
        ></epp-toggle>
        ${this.infoTip(this.localize(e.tip))}
      </div>
    `}renderEntities(){const e=this.entitiesConfig||{},t=this._overrides.entities||{},i=(i,s)=>t[i]??e[i]??s,s=(e,t)=>{this._overrides.entities||(this._overrides.entities={}),this._overrides.entities[e]=t,this._fireChange("entitiesConfig",{...this.entitiesConfig||{},...this._overrides.entities})},r=this._overrides,o=i("zone_presence",!0)||i("zone_target_count",!1),a=i("target_xy",!1)||i("target_active",!1)||i("target_signal",!1)||i("target_zone",!1)||i("target_count",!1),n=!this.perspective,l=[{label:"entities.zone_presence",key:"zone_presence",defaultValue:!0,tip:"info.zone_presence",disabled:n},{label:"entities.zone_target_count",key:"zone_target_count",defaultValue:!1,tip:"info.zone_target_count",disabled:n}],c=[{label:"entities.xy",key:"target_xy",defaultValue:!1,tip:"info.xy",disabled:n},{label:"entities.active",key:"target_active",defaultValue:!1,tip:"info.active"},{label:"entities.target_signal",key:"target_signal",defaultValue:!1,tip:"info.target_signal"},{label:"entities.target_zone",key:"target_zone",defaultValue:!1,tip:"info.target_zone"}],h=e=>e.map(e=>this.renderEntityToggleRow(e,i,s)),d=this._getOptions().rateOptions;return Y`
      <div class="settings-section">
        <epp-card heading=${this.localize("entities.room_level")}>
          <!-- .setting-row conversion to epp-section-row is deferred: _resetSlider
               uses closest(".setting-row") and slider rows don't map cleanly to
               the label/control shape. -->
          ${h([{label:"entities.occupancy",key:"room_occupancy",defaultValue:!0,tip:"info.room_occupancy"},{label:"entities.static_presence",key:"room_static_presence",defaultValue:!1,tip:"info.room_static"},{label:"entities.motion_presence",key:"room_motion_presence",defaultValue:!1,tip:"info.room_motion"},{label:"entities.target_presence",key:"room_target_presence",defaultValue:!1,tip:"info.room_target_presence"},{label:"entities.mmwave",key:"room_mmwave",defaultValue:!1,tip:"info.room_mmwave"},{label:"entities.target_count",key:"target_count",defaultValue:!1,tip:"info.room_target_count"}])}
        </epp-card>
        <epp-card heading=${this.localize("entities.zone_level")}>
          <!-- .setting-row conversion deferred — see comment above -->
          ${h(l)}
          <div class="setting-row">
            <label>${this.localize("settings.update_rate")}</label>
            <ha-select
              .value=${String(r.zoneUpdateRateMs??this.zoneUpdateRateMs)}
              .options=${d}
              .disabled=${!o}
              @selected=${e=>{const t=e.detail.value;if(t){const e=Number(t);this._overrides.zoneUpdateRateMs=e,this._fireChange("zoneUpdateRateMs",e),this.requestUpdate()}}}
              @closed=${this._stopClosed}>
            </ha-select>
          </div>
        </epp-card>
        <epp-card heading=${this.localize("entities.target_level")}>
          <!-- .setting-row conversion deferred — see comment above -->
          ${h(c)}
          <div class="setting-row">
            <label>${this.localize("settings.update_rate")}</label>
            <ha-select
              .value=${String(r.targetUpdateRateMs??this.targetUpdateRateMs)}
              .options=${d}
              .disabled=${!a}
              @selected=${e=>{const t=e.detail.value;if(t){const e=Number(t);this._overrides.targetUpdateRateMs=e,this._fireChange("targetUpdateRateMs",e),this.requestUpdate()}}}
              @closed=${this._stopClosed}>
            </ha-select>
          </div>
        </epp-card>
        <epp-card heading=${this.localize("settings.environmental")}>
          <!-- .setting-row conversion deferred — see comment above -->
          ${h([{label:"entities.illuminance",key:"env_illuminance",defaultValue:!1,tip:"info.illuminance"},{label:"entities.humidity",key:"env_humidity",defaultValue:!1,tip:"info.humidity"},{label:"entities.temperature",key:"env_temperature",defaultValue:!1,tip:"info.temperature"},{label:"entities.co2",key:"env_co2",defaultValue:!1,tip:"info.co2"}])}
        </epp-card>
      </div>
    `}renderLogging(){const e=this._getOptions().logLevelOptions;return Y`
      <div class="settings-section">
        <epp-card>
          <!-- .setting-row conversion to epp-section-row is deferred: _resetSlider
               uses closest(".setting-row") and slider rows don't map cleanly to
               the label/control shape. -->
          ${Tr.map(t=>{const i=(this._overrides.logLevels||{})[t.key]??this.logLevels[t.key]??"None";return Y`
              <div class="setting-row">
                <label>${this.localize(t.label)}</label>
                <ha-select
                  .value=${i}
                  .options=${e}
                  @selected=${e=>{const s=e.detail.value;s&&s!==i&&(this._overrides.logLevels||(this._overrides.logLevels={}),this._overrides.logLevels[t.key]=s,this._fireChange("logLevels",{...this.logLevels||{},...this._overrides.logLevels}),this.requestUpdate())}}
                  @closed=${this._stopClosed}
                ></ha-select>
                <button
								type="button"
								class="setting-info"
								aria-label=${this.localize("settings.reset_to_default")}
								title=${this.localize("settings.reset_to_default")}
								@click=${e=>{e.stopPropagation(),this._overrides.logLevels||(this._overrides.logLevels={}),this._overrides.logLevels[t.key]="None",this._fireChange("logLevels",{...this.logLevels||{},...this._overrides.logLevels}),this.requestUpdate()}}
							><ha-icon icon="mdi:restart"></ha-icon></button>
                ${this.infoTip(this.localize(t.tip))}
              </div>
            `})}
        </epp-card>
      </div>
    `}renderLed(){const e=this._overrides.ledMode??this.ledMode,t="Manual Control"!==e,i="Presence"===e||"Environmental + Presence"===e,s=this._getOptions().ledModes,r=this._overrides.ledBrightness??this.ledBrightness,o=this._overrides.ledPresenceColor??this.ledPresenceColor;return Y`
      <div class="settings-section">
        <epp-card heading=${this.localize("settings.led")}>
          <!-- .setting-row conversion to epp-section-row is deferred: _resetSlider
               uses closest(".setting-row") and slider rows don't map cleanly to
               the label/control shape. -->
          <div class="setting-row">
            <label>${this.localize("settings.led_mode")}</label>
            <ha-select class="wide-select" .value=${e} .options=${s} @selected=${e=>{const t=e.detail.value;t&&(this._overrides.ledMode=t,this._fireChange("ledMode",t),this.requestUpdate())}} @closed=${this._stopClosed}>
            </ha-select>
            ${this.infoTip(this.localize("info.led_mode"))}
          </div>
          ${t?Y`
          <div class="setting-row">
            <label>${this.localize("settings.led_brightness")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" data-led-brightness min="0.1" max="1" step="0.05" .value=${String(r)} @input=${e=>{const t=e.target,i=parseFloat(t.value);this._overrides.ledBrightness=i,this._setSettingValue(t,`${Math.round(100*i)}%`),this._fireChange("ledBrightness",i)}} /><span class="setting-value">${Math.round(100*r)}%</span></span>
            ${this.resetBtn(Fr.ledBrightness,"ledBrightness")}${this.infoTip(this.localize("info.led_brightness"))}
          </div>`:J}
          ${i?Y`
          <div class="setting-row">
            <label>${this.localize("settings.led_presence_color")}</label>
            <input type="color" .value=${o} @input=${e=>{const t=e.target.value;this._overrides.ledPresenceColor=t,this._fireChange("ledPresenceColor",t)}} />
            ${this.infoTip(this.localize("info.led_presence_color"))}
          </div>`:J}
        </epp-card>
      </div>
    `}renderRelay(){const{relayTriggerModes:e,relayContactModes:t}=this._getOptions(),i=this._overrides.relayTriggerMode??this.relayTriggerMode,s=this._overrides.relayContactMode??this.relayContactMode,r="disabled"!==i;return Y`
      <div class="settings-section">
        <epp-card heading=${this.localize("settings.relay")}>
          <!-- .setting-row conversion to epp-section-row is deferred: _resetSlider
               uses closest(".setting-row") and slider rows don't map cleanly to
               the label/control shape. -->
          <div class="setting-row">
            <label>${this.localize("settings.relay_trigger_mode")}</label>
            <ha-select class="wide-select"
              .value=${i}
              .options=${e}
              @selected=${e=>{const t=e.detail.value;t&&t!==i&&(this._overrides.relayTriggerMode=t,this._fireChange("relayTriggerMode",t),this.requestUpdate())}}
              @closed=${this._stopClosed}
            ></ha-select>
            ${this.infoTip(this.localize("info.relay_trigger_mode"))}
          </div>
          ${r?Y`
            <div class="setting-row">
              <label>${this.localize("settings.relay_contact_mode")}</label>
              <ha-select class="wide-select"
                .value=${s}
                .options=${t}
                @selected=${e=>{const t=e.detail.value;t&&t!==s&&(this._overrides.relayContactMode=t,this._fireChange("relayContactMode",t),this.requestUpdate())}}
                @closed=${this._stopClosed}
              ></ha-select>
              ${this.infoTip(this.localize("info.relay_contact_mode"))}
            </div>
          `:J}
        </epp-card>
      </div>
    `}renderSaveCancelButtons(){this.dirty||!this._localDirty||this.saving||(this._localDirty=!1);const e=this.dirty||this._localDirty;return Mr({saving:this.saving,dirty:e,localize:this.localize,onSave:()=>this._emitSave(),onCancel:()=>{this.dispatchEvent(new CustomEvent("cancel",{bubbles:!0,composed:!0}))}})}_emitSave(){const e=this._overrides,t=e.targetAutoDistance??this.targetAutoDistance,i=e.staticAutoDistance??this.staticAutoDistance;let s=e.targetMaxDistance??this.targetMaxDistance,r=e.staticMinDistance??this.staticMinDistance,o=e.staticMaxDistance??this.staticMaxDistance;if(t||i){const{autoRange:e}=this._getGeometry();t&&(s=e>0?Math.min(e,6):6),i&&(r=.3,o=e>0?Math.min(e,16):16)}const a={target_auto_distance:t,target_max_distance:s,static_auto_distance:i,static_min_distance:r,static_max_distance:o,entities:{...this.entitiesConfig,...e.entities||{}},log_levels:{...this.logLevels,...e.logLevels||{}}},n={};for(const[t,i]of ur)if(t in a)n[t]=a[t];else{const s=i.slice(1);n[t]=e[s]??this[s]}this.dispatchEvent(new CustomEvent("save",{detail:n,bubbles:!0,composed:!0}))}_fireChange(e,t){this.dispatchEvent(new CustomEvent("setting-change",{detail:{key:e,value:t},bubbles:!0,composed:!0})),this._fireDirty()}_fireDirty(){this._localDirty=!0,this.dispatchEvent(new CustomEvent("dirty",{bubbles:!0,composed:!0}))}}Ur.styles=[Pr,Be,Se,Ie,zr,Me,n`
      /* Fill the panel height and pin the Save/Cancel bar to the bottom while the
         accordion list scrolls inside .settings-scroll. Fill-height chain:
         :host -> .settings-container -> .settings-scroll (flex columns), fed by the
         bounded .panel--settings host. Applies at all widths (desktop + mobile). */
      :host {
        display: flex;
        flex-direction: column;
        min-height: 0;
      }

      .settings-container {
        max-width: var(--epp-content-max, 720px);
        width: 100%;
        margin: 0 auto;
        padding: 0 16px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
      }

      .settings-scroll {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
      }

      .setting-row ha-select {
        width: 140px;
        flex-shrink: 0;
      }

      .setting-row ha-select.wide-select {
        width: 220px;
      }

      .save-cancel-bar {
        /* Shared chrome (display/justify/align/border-top) is in saveCancelBarStyles. */
        padding: var(--epp-space-3, 12px);
        margin-top: auto;
        flex-shrink: 0;
        /* Sit on the surface (white) so the bar matches the editor sidebar +
           device-group editor bars, which sit on their white sheet/card. Without
           this the settings bar showed the grey page behind it. */
        background: var(--epp-surface, var(--card-background-color, #fff));
      }
    `],e([ge({attribute:!1})],Ur.prototype,"sensorState",void 0),e([ge({type:Boolean})],Ur.prototype,"targetAutoDistance",void 0),e([ge({type:Number})],Ur.prototype,"targetMaxDistance",void 0),e([ge({type:Number})],Ur.prototype,"stuckTargetTimeout",void 0),e([ge({type:Boolean})],Ur.prototype,"assistedClearEnabled",void 0),e([ge({type:Number})],Ur.prototype,"assistedClearTimeout",void 0),e([ge({type:Boolean})],Ur.prototype,"staticAutoDistance",void 0),e([ge({type:Number})],Ur.prototype,"staticMinDistance",void 0),e([ge({type:Number})],Ur.prototype,"staticMaxDistance",void 0),e([ge({attribute:!1})],Ur.prototype,"openAccordions",void 0),e([ge({attribute:!1})],Ur.prototype,"perspective",void 0),e([ge({type:Number})],Ur.prototype,"roomWidth",void 0),e([ge({type:Number})],Ur.prototype,"roomDepth",void 0),e([ge({attribute:!1})],Ur.prototype,"grid",void 0),e([ge({type:Boolean})],Ur.prototype,"saving",void 0),e([ge({type:Boolean})],Ur.prototype,"dirty",void 0),e([ge({type:Number})],Ur.prototype,"temperatureOffset",void 0),e([ge({type:Number})],Ur.prototype,"humidityOffset",void 0),e([ge({type:Number})],Ur.prototype,"illuminanceOffset",void 0),e([ge({type:Number})],Ur.prototype,"motionTimeout",void 0),e([ge({type:Number})],Ur.prototype,"staticTimeout",void 0),e([ge({type:Number})],Ur.prototype,"staticTriggerThreshold",void 0),e([ge({type:Number})],Ur.prototype,"staticRenewThreshold",void 0),e([ge({type:Number})],Ur.prototype,"staticOnDelay",void 0),e([ge({attribute:!1})],Ur.prototype,"entitiesConfig",void 0),e([ge({attribute:!1})],Ur.prototype,"logLevels",void 0),e([ge({type:Boolean})],Ur.prototype,"co2Enabled",void 0),e([ge({type:String})],Ur.prototype,"ledMode",void 0),e([ge({type:Number})],Ur.prototype,"ledBrightness",void 0),e([ge({type:String})],Ur.prototype,"ledPresenceColor",void 0),e([ge({type:String})],Ur.prototype,"relayTriggerMode",void 0),e([ge({type:String})],Ur.prototype,"relayContactMode",void 0),e([ge({type:Number})],Ur.prototype,"targetUpdateRateMs",void 0),e([ge({type:Number})],Ur.prototype,"zoneUpdateRateMs",void 0),e([ge({attribute:!1})],Ur.prototype,"localize",void 0),customElements.get("epp-settings-view")||customElements.define("epp-settings-view",Ur);class Or extends he{constructor(){super(...arguments),this.rawTargets=[],this.sensorState={occupancy:!1},this.localize=Jt,this.initialRoomWidth=0,this.initialRoomDepth=0,this.initialStep=null,this.mode="wizard",this._setupStep="guide",this._wizardSaving=!1,this._wizardCornerIndex=0,this._wizardCorners=[null,null,null,null],this._wizardRoomWidth=0,this._wizardRoomDepth=0,this._wizardCapturing=!1,this._wizardCaptureProgress=0,this._wizardCapturePaused=!1,this._wizardOffsetSide="",this._wizardOffsetFb="",this._dismissTutorial=!1,this._saveError=null,this._wizardCaptureCancelled=!1,this._captureRafId=null,this._initializedFromProps=!1,this._perspective=null,this._onCaptureOverlayKeydown=e=>{const t=e.key;if("Escape"===t)e.preventDefault(),this._wizardCancelCapture();else if("Tab"===t){e.preventDefault();const t=this.shadowRoot?.querySelector(".capture-overlay .wizard-btn-back");t?.focus()}},this._captureOverlayListeners=new os([{target:document,type:"keydown",listener:this._onCaptureOverlayKeydown}])}connectedCallback(){super.connectedCallback(),this._initializedFromProps||(this._initializedFromProps=!0,this._wizardRoomWidth=this.initialRoomWidth,this._wizardRoomDepth=this.initialRoomDepth,null!==this.initialStep&&(this._setupStep=this.initialStep))}updated(e){if(e.has("_wizardCapturing"))if(this._wizardCapturing){this._captureOverlayListeners.attach();const e=this.shadowRoot?.querySelector(".capture-overlay .wizard-btn-back");e?.focus()}else this._captureOverlayListeners.detach();if(e.has("_wizardCornerIndex")){const e=this.shadowRoot?.querySelector(".corner-progress .corner-chip.active");e?.scrollIntoView?.({behavior:"smooth",inline:"center",block:"nearest"})}}disconnectedCallback(){super.disconnectedCallback(),this._captureOverlayListeners.detach(),this._wizardCaptureCancelled=!0,this._wizardCapturing=!1,this._wizardCapturePaused=!1,null!==this._captureRafId&&(cancelAnimationFrame(this._captureRafId),this._captureRafId=null)}_syncCornerOffsets(){const e=this._wizardCorners[this._wizardCornerIndex];this._wizardOffsetSide=e?.offset_side?String(e.offset_side/10):"",this._wizardOffsetFb=e?.offset_fb?String(e.offset_fb/10):""}_wizardCancelCapture(){this._wizardCaptureCancelled=!0,this._wizardCapturing=!1,this._wizardCapturePaused=!1}_wizardStartCapture(){const e=this.rawTargets.find(e=>null!=e.raw_x&&null!=e.raw_y);if(!e)return;this._wizardCapturing=!0,this._wizardCaptureProgress=0,this._wizardCapturePaused=!1,this._wizardCaptureCancelled=!1;const t=[];let i=0,s=Date.now();const r=()=>{if(this._wizardCaptureCancelled)return;const e=Date.now(),o=e-s;s=e;const a=this.rawTargets.filter(e=>null!=e.raw_x&&null!=e.raw_y),n=1===a.length;if(this._wizardCapturePaused=!n,n&&(i+=o,t.push({x:a[0].raw_x,y:a[0].raw_y})),this._wizardCaptureProgress=Math.min(i/5e3,1),i<5e3)return void(this._captureRafId=requestAnimationFrame(r));if(this._captureRafId=null,this._wizardCapturing=!1,this._wizardCapturePaused=!1,0===t.length)return;const l=function(e){return 0===e.length?null:{x:es(e.map(e=>e.x)),y:es(e.map(e=>e.y))}}(t);if(!l)return;const c=this._wizardCornerIndex;this._wizardCorners=[...this._wizardCorners],this._wizardCorners[c]={raw_x:l.x,raw_y:l.y,offset_side:10*(parseFloat(this._wizardOffsetSide)||0),offset_fb:10*(parseFloat(this._wizardOffsetFb)||0)},c<3&&(this._wizardCornerIndex=c+1),this._syncCornerOffsets(),this._wizardCorners.every(e=>null!==e)&&this._autoComputeRoomDimensions()};this._captureRafId=requestAnimationFrame(r)}_autoComputeRoomDimensions(){const e=qi(this._wizardCorners);this._wizardRoomWidth=e.width,this._wizardRoomDepth=e.depth}_recomputeDimsIfAllMarked(){this._wizardCorners.every(e=>null!==e)&&this._autoComputeRoomDimensions()}_computeWizardPerspective(){const e=this._wizardCorners;if(!e.every(e=>null!==e))return;const t=this._wizardRoomWidth,i=this._wizardRoomDepth,s=e.map(e=>({x:e.raw_x,y:e.raw_y})),r=[{x:e[0].offset_side,y:e[0].offset_fb},{x:t-e[1].offset_side,y:e[1].offset_fb},{x:t-e[2].offset_side,y:i-e[2].offset_fb},{x:e[3].offset_side,y:i-e[3].offset_fb}];this._perspective=function(e,t){const i=Math.max(1,...e.map(e=>Math.abs(e.x))),s=Math.max(1,...e.map(e=>Math.abs(e.y))),r=[],o=[];for(let a=0;a<4;a++){const n=e[a].x/i,l=e[a].y/s,c=t[a].x,h=t[a].y;r.push([n,l,1,0,0,0,-n*c,-l*c]),o.push(c),r.push([0,0,0,n,l,1,-n*h,-l*h]),o.push(h)}const a=r.map((e,t)=>[...e,o[t]]);for(let e=0;e<8;e++){let t=Math.abs(a[e][e]),i=e;for(let s=e+1;s<8;s++)Math.abs(a[s][e])>t&&(t=Math.abs(a[s][e]),i=s);if(t<1e-12)return null;[a[e],a[i]]=[a[i],a[e]];for(let t=e+1;t<8;t++){const i=a[t][e]/a[e][e];for(let s=e;s<=8;s++)a[t][s]-=i*a[e][s]}}const n=new Array(8);for(let e=7;e>=0;e--){n[e]=a[e][8];for(let t=e+1;t<8;t++)n[e]-=a[e][t]*n[t];n[e]/=a[e][e]}return[n[0]/i,n[1]/s,n[2],n[3]/i,n[4]/s,n[5],n[6]/i,n[7]/s]}(s,r)}_wizardFinish(){this._computeWizardPerspective(),this._perspective?(this._saveError=null,this._wizardSaving=!0,this.dispatchEvent(new CustomEvent("wizard-save",{detail:{perspective:this._perspective,roomWidth:this._wizardRoomWidth,roomDepth:this._wizardRoomDepth},bubbles:!0,composed:!0}))):this._saveError="wizard.invalid_corners"}saveFailed(){this._wizardSaving=!1,this._saveError="wizard.save_failed"}_getWizardTargetStyle(e){const{xPct:t,yPct:i}=Hs(e.raw_x??0,e.raw_y??0);return`left: ${t}%; top: ${i}%;`}render(){return"uncalibrated-fov"===this.mode?this._renderUncalibratedFov():null===this._setupStep?J:this._renderWizard()}_renderWizard(){let e;switch(this._setupStep){case"guide":e=this._renderWizardGuide();break;case"corners":e=this._renderWizardCorners()}return Y`
      ${e}
      ${this._wizardCapturing?Y`
        <div class="capture-overlay">
          <div class="capture-overlay-content">
            <div class="capture-progress" style="width: 200px;">
              <div class="capture-bar">
                <div class="capture-fill" style="width: ${100*this._wizardCaptureProgress}%"></div>
              </div>
              <span>${this.localize("wizard.recording",{current:Math.round(5*this._wizardCaptureProgress),total:5})}</span>
            </div>
            <p style="margin: 8px 0 0; font-size: var(--epp-font-sm, 13px); color: ${this._wizardCapturePaused?"var(--error-color, #e53935)":"var(--secondary-text-color)"};">
              ${this._wizardCapturePaused?this.localize("wizard.paused"):this.localize("wizard.stand_still")}
            </p>
            <button
              class="wizard-btn wizard-btn-back"
              style="margin-top: var(--epp-space-3, 12px);"
              @click=${()=>this._wizardCancelCapture()}
            >${this.localize("common.cancel")}</button>
          </div>
        </div>
      `:J}
    `}_renderWizardGuide(){const e=(e,t,i=!1,s=0)=>K`
      <g transform="translate(${e}, ${t}) rotate(${s}) scale(${i?-.7:.7}, 0.7)">
        <circle cx="0" cy="-12" r="4" fill="var(--primary-color, #03a9f4)"/>
        <line x1="0" y1="-8" x2="0" y2="2" stroke="var(--primary-color, #03a9f4)" stroke-width="2" stroke-linecap="round"/>
        <line x1="0" y1="2" x2="-4" y2="10" stroke="var(--primary-color, #03a9f4)" stroke-width="2" stroke-linecap="round"/>
        <line x1="0" y1="2" x2="4" y2="10" stroke="var(--primary-color, #03a9f4)" stroke-width="2" stroke-linecap="round"/>
        <line x1="0" y1="-4" x2="-5" y2="2" stroke="var(--primary-color, #03a9f4)" stroke-width="2" stroke-linecap="round"/>
        <line x1="0" y1="-4" x2="5" y2="-1" stroke="var(--primary-color, #03a9f4)" stroke-width="2" stroke-linecap="round"/>
      </g>
    `,t=(e,t,i,s)=>{const r=i-e,o=s-t,a=Math.sqrt(r*r+o*o),n=r/a,l=o/a,c=i-40*n,h=s-40*l;return K`
        <line x1="${e+40*n}" y1="${t+40*l}" x2="${c}" y2="${h}" stroke="var(--primary-color, #03a9f4)" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
        <polygon points="${c},${h} ${c-8*n+4*l},${h-8*l-4*n} ${c-8*n-4*l},${h-8*l+4*n}" fill="var(--primary-color, #03a9f4)" opacity="0.5"/>
      `},i=50,s=55,r=290,o=55,a=290,n=225,l=50,c=235,h=98,d=225,p=K`
      <svg viewBox="0 0 360 290" width="360" height="290" style="display: block; margin: 0 auto;">
        <!-- Room with rounded corners, soft fill -->
        <rect x="30" y="35" width="280" height="210" rx="8"
              fill="var(--secondary-background-color, #f5f5f5)"
              stroke="var(--divider-color, #d0d0d0)" stroke-width="2.5"/>

        <!-- Wall labels -->
        <text x="170" y="28" font-size="9" fill="var(--secondary-text-color, #aaa)" text-anchor="middle">${this.localize("wizard.front_wall_label")}</text>
        <text x="170" y="262" font-size="9" fill="var(--secondary-text-color, #aaa)" text-anchor="middle">${this.localize("wizard.back_wall_label")}</text>

        <!-- Arrows with walking figures: 1->2->3->4 -->
        ${t(i,s,r,o)}
        ${e(170,72)}
        ${t(r,o,a,n)}
        ${e(265,145,!1,90)}
        <!-- 3rd arrow flat from 3 to 4 badge, same gap as arrow 1 has from 2 -->
        ${t(a,n,h-15,n)}
        ${e(190,n-17,!0)}

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
        <circle cx="${i}" cy="${s}" r="14" fill="#4CAF50" opacity="0.15"/>
        <circle cx="${i}" cy="${s}" r="14" fill="none" stroke="#4CAF50" stroke-width="2.5"/>
        <text x="${i}" y="${s+5}" font-size="14" fill="#4CAF50" font-weight="bold" text-anchor="middle">1</text>

        <!-- Corner 2: front-right (sensor here) -->
        <circle cx="${r}" cy="${o}" r="14" fill="#4CAF50" opacity="0.15"/>
        <circle cx="${r}" cy="${o}" r="14" fill="none" stroke="#4CAF50" stroke-width="2.5"/>
        <text x="${r}" y="${o+5}" font-size="14" fill="#4CAF50" font-weight="bold" text-anchor="middle">2</text>

        <!-- Corner 3: back-right -->
        <circle cx="${a}" cy="${n}" r="14" fill="#4CAF50" opacity="0.15"/>
        <circle cx="${a}" cy="${n}" r="14" fill="none" stroke="#4CAF50" stroke-width="2.5"/>
        <text x="${a}" y="${n+5}" font-size="14" fill="#4CAF50" font-weight="bold" text-anchor="middle">3</text>

        <!-- Sensor icon outside the top-right corner -->
        <g transform="translate(${r+18}, ${o-18}) rotate(-45)">
          <rect x="-5" y="-7" width="10" height="14" rx="3" fill="var(--primary-color, #03a9f4)"/>
          <circle cx="0" cy="-11" r="3.5" fill="var(--primary-color, #03a9f4)" opacity="0.4"/>
        </g>
        <text x="${r+24}" y="${o-24}" font-size="10" fill="var(--primary-color, #03a9f4)" font-weight="500">${this.localize("wizard.sensor")}</text>
      </svg>
    `;return Y`
      <div style="max-width: 560px; margin: 0 auto;">
        <div class="setting-group">
          <h4 style="text-align: center; margin-bottom: var(--epp-space-4, 16px);">${this.localize("wizard.how_calibration_works")}</h4>

          ${p}

          <div style="display: flex; flex-direction: column; gap: 14px; padding: var(--epp-space-4, 16px) 4px 0;">
            <div style="display: flex; align-items: flex-start; gap: 10px;">
              <div style="min-width: 22px; height: 22px; border-radius: 50%; background: #4CAF50; display: flex; align-items: center; justify-content: center; font-size: var(--epp-font-xs, 12px); font-weight: bold; color: white;">1</div>
              <div style="font-size: var(--epp-font-sm, 13px);">
                ${ai(this.localize("wizard.walk_instruction_full"))}
              </div>
            </div>

            <div style="display: flex; align-items: flex-start; gap: 10px;">
              <div style="min-width: 22px; height: 22px; border-radius: 50%; background: #FF9800; display: flex; align-items: center; justify-content: center; font-size: var(--epp-font-xs, 12px); font-weight: bold; color: white;">!</div>
              <div style="font-size: var(--epp-font-sm, 13px);">
                ${ai(this.localize("wizard.cant_reach"))}
              </div>
            </div>

            <div style="display: flex; align-items: flex-start; gap: 10px;">
              <ha-icon icon="mdi:information-outline" style="--mdc-icon-size: 20px; color: var(--primary-color); flex-shrink: 0; margin-top: 1px;"></ha-icon>
              <div style="font-size: var(--epp-font-sm, 13px); color: var(--secondary-text-color, #757575);">
                ${this.localize("wizard.corner_sensor_hint")}
              </div>
            </div>
          </div>
        </div>

        <ha-formfield class="dont-show-again" .label=${this.localize("wizard.dont_show_again")}>
          <ha-checkbox
            .checked=${this._dismissTutorial}
            @change=${e=>{this._dismissTutorial=e.currentTarget.checked}}
          ></ha-checkbox>
        </ha-formfield>

        <div style="display: flex; justify-content: space-between; margin-top: 20px;">
          <epp-button variant="text"
            @click=${()=>{this._fireCancel()}}
          >${this.localize("common.cancel")}</epp-button>
          <epp-button variant="primary"
            @click=${()=>this._onBeginMarking()}
          >${this.localize("wizard.begin_marking")}</epp-button>
        </div>
      </div>
    `}_renderWizardCorners(){const e=this._wizardCornerIndex,t=this.rawTargets.filter(e=>null!=e.raw_x&&null!=e.raw_y),i=t.length>0,s=t.length>1,r=this._wizardCorners.every(e=>null!==e),o=ki[e]||"",[a,n]=Ti[e]||["",""];return Y`
      <div class="wizard-card">
        <h2>${this.localize("wizard.calibrate_room_size")}</h2>
        <p>
          ${this.localize("wizard.walk_instruction",{duration:5})}
        </p>

        ${r?J:Y`
            <p class="corner-instruction">
              ${this.localize("wizard.corner_step",{index:e+1,corner:this.localize(o)})}
            </p>
        `}

        <div class="corner-progress">
          ${ki.map((t,i)=>{const s=!!this._wizardCorners[i],r=i<3,o=i<e;return Y`
                <span
                  class="corner-chip ${s?"done":""} ${i===e?"active":""}"
                  @click=${()=>{const e=this._wizardCorners[i];this._wizardCornerIndex=i,this._wizardCorners=[...this._wizardCorners],this._wizardCorners[i]=null,this._perspective=null,this._saveError=null,this._wizardOffsetSide=e?.offset_side?String(e.offset_side/10):"",this._wizardOffsetFb=e?.offset_fb?String(e.offset_fb/10):""}}
                >
                  ${this.localize(t)} ${s?"✓":""}
                </span>
                ${r?Y`
                  <span class="corner-arrow ${o?"done":""}">›</span>
                `:J}
              `})}
        </div>

        <div class="corner-offsets">
          <span class="offset-label">${this.localize("wizard.distance_from")}</span>
          <div class="offset-inputs">
            <epp-field
            class="offset-input"
            type="number"
            min="0"
            step="1"
            placeholder="${this.localize("wizard.distance_from_side",{wall:this.localize(a)})}"
            .value=${this._wizardOffsetSide}
            @value-changed=${t=>{t.stopPropagation(),this._wizardOffsetSide=t.detail.value;const i=10*(parseFloat(this._wizardOffsetSide)||0),s=this._wizardCorners[e];s&&(s.offset_side=i,this._recomputeDimsIfAllMarked())}}
          ></epp-field>
          <epp-field
            class="offset-input"
            type="number"
            min="0"
            step="1"
            placeholder="${this.localize("wizard.distance_from_side",{wall:this.localize(n)})}"
            .value=${this._wizardOffsetFb}
            @value-changed=${t=>{t.stopPropagation(),this._wizardOffsetFb=t.detail.value;const i=10*(parseFloat(this._wizardOffsetFb)||0),s=this._wizardCorners[e];s&&(s.offset_fb=i,this._recomputeDimsIfAllMarked())}}
          ></epp-field>
          </div>
        </div>

        ${this._renderMiniSensorView()}

        ${r?Y`
          <p style="font-size: var(--epp-font-sm, 13px); color: var(--secondary-text-color); margin: var(--epp-space-3, 12px) 0 4px;">
            ${this.localize("wizard.save_prompt")}
          </p>
        `:Y`
          <p class="no-target-warning" style="visibility: ${!i||s?"visible":"hidden"};">
            ${i?this.localize("wizard.multiple_targets"):this.localize("wizard.no_target")}
          </p>
        `}

        ${null!==this._saveError?Y`<p class="save-error" role="alert">${this.localize(this._saveError)}</p>`:J}

        <div class="wizard-actions">
          <epp-button
            variant="text"
            @click=${()=>{this._fireCancel()}}
          >${this.localize("common.cancel")}</epp-button>
          ${r?Y`
            <epp-button
              variant="primary"
              ?disabled=${this._wizardSaving}
              @click=${()=>this._wizardFinish()}
            >
              ${this._wizardSaving?this.localize("common.saving"):this.localize("common.save")}
            </epp-button>
          `:Y`
            <epp-button
              variant="primary"
              ?disabled=${!i||s||this._wizardCapturing}
              @click=${()=>this._wizardStartCapture()}
            >
              ${this.localize("wizard.mark_corner",{corner:this.localize(o)})}
            </epp-button>
          `}
        </div>
      </div>
    `}_renderMiniSensorView(){const e=zi,t=_i,i=200,s=-e,r=t*Math.cos(Pi),o=`M 0 0 L ${s} ${r} A 6000 6000 0 0 0 ${e} ${r} Z`,a=[2e3,4e3].map(e=>{const t=e*Math.sin(Pi),i=e*Math.cos(Pi);return`M ${-t} ${i} A ${e} ${e} 0 0 0 ${t} ${i}`});return Y`
      <div class="mini-grid-container">
        <div class="sensor-fov-view">
          <svg
            class="sensor-fov-svg"
            viewBox="${-e-i} ${-200} ${2*e+400} ${6400}"
            preserveAspectRatio="xMidYMid meet"
          >
            <path
              d="${o}"
              fill="rgba(3, 169, 244, 0.10)"
              stroke="rgba(3, 169, 244, 0.3)"
              stroke-width="30"
            />
            ${a.map(e=>K`
                <path
                  d="${e}"
                  fill="none"
                  stroke="rgba(255,255,255,0.15)"
                  stroke-width="40"
                  stroke-dasharray="80 80"
                />
              `)}
            <!-- Sensor dot -->
            <circle cx="0" cy="0" r="100" fill="var(--primary-color, #03a9f4)" stroke="#fff" stroke-width="40" />
          </svg>
          <!-- Marked corners (positioned via CSS %). Map over ALL corners and
               skip nulls so each dot keeps its ORIGINAL corner index — a
               filter+map would shift labels when an earlier corner is being
               re-marked. -->
          ${this._wizardCorners.map((e,t)=>{if(null===e)return J;const{xPct:i,yPct:s}=Hs(e.raw_x,e.raw_y);return Y`
                <div
                  class="mini-grid-captured"
                  style="left: ${i}%; top: ${s}%;"
                  title="${this.localize(ki[t])}"
                ></div>
              `})}
          <!-- Live targets (per-target colors) -->
          ${this.rawTargets.map((e,t)=>null!=e.raw_x&&null!=e.raw_y?Y`
              <div
                class="mini-grid-target"
                style="${this._getWizardTargetStyle(e)} background: ${Fi[t]||Fi[0]};"
              ></div>
            `:J)}
        </div>
      </div>
    `}_renderUncalibratedFov(){const e=this.sensorState.occupancy,t=e?"#4CAF50":"var(--primary-color, #03a9f4)",i=160,s=14,r=180,o=30*Math.PI/180,a=150*Math.PI/180,n=i+r*Math.cos(o),l=s+r*Math.sin(o),c=i+r*Math.cos(a),h=s+r*Math.sin(a);return Y`
      <div style="display: flex; flex-direction: column; align-items: center; padding: var(--epp-space-5, 24px);">
        <svg viewBox="0 0 320 210" style="display: block; width: 320px; max-width: 100%; height: auto;">
          <!-- Sensor at top center -->
          <rect x="${154}" y="0" width="12" height="8" rx="3" fill="${t}"/>
          <circle cx="${i}" cy="0" r="4" fill="${t}" opacity="0.4"/>

          <!-- 120 deg FOV wedge with rounded arc end -->
          <path d="M ${i} ${s} L ${n} ${l} A ${r} ${r} 0 0 1 ${c} ${h} Z"
                fill="${t}" fill-opacity="${e?.15:.06}"
                stroke="${t}" stroke-width="1" stroke-opacity="0.2"/>

          <!-- Range arcs -->
          ${[60,120,180].map(e=>{const r=i+e*Math.cos(o),n=s+e*Math.sin(o),l=i+e*Math.cos(a),c=s+e*Math.sin(a);return K`
              <path d="M ${r} ${n} A ${e} ${e} 0 0 1 ${l} ${c}"
                    fill="none" stroke="${t}" stroke-width="1"
                    stroke-dasharray="4 3" opacity="0.2"/>
            `})}

          <!-- Edge lines -->
          <line x1="${i}" y1="${s}" x2="${n}" y2="${l}" stroke="${t}" stroke-width="0.5" opacity="0.2"/>
          <line x1="${i}" y1="${s}" x2="${c}" y2="${h}" stroke="${t}" stroke-width="0.5" opacity="0.2"/>

          <!-- Target dots -->
          ${this.rawTargets.map((e,t)=>{if(null==e.raw_x||null==e.raw_y)return J;const o=Math.sqrt(e.raw_x*e.raw_x+e.raw_y*e.raw_y),a=Math.atan2(e.raw_x,e.raw_y),n=Math.min(o/6e3,1)*r,l=Math.PI/2-a,c=i+n*Math.cos(l),h=s+n*Math.sin(l);return K`<circle cx="${c}" cy="${h}" r="5" fill="${Fi[t]||Fi[0]}"/>`})}

          ${e?K`
            <text x="${i}" y="120" font-size="13" fill="${t}" text-anchor="middle" font-weight="500">${this.localize("live.detected")}</text>
          `:K`
            <text x="${i}" y="120" font-size="13" fill="var(--secondary-text-color, #aaa)" text-anchor="middle">${this.localize("wizard.no_presence")}</text>
          `}
        </svg>

        <epp-button
          variant="primary"
          icon="mdi:target"
          style="margin-top: var(--epp-space-4, 16px);"
          @click=${()=>{this._fireStartCalibration()}}
        >${this.localize("wizard.calibrate_room_size")}</epp-button>
      </div>
    `}_fireStartCalibration(){this.dispatchEvent(new CustomEvent("start-calibration",{bubbles:!0,composed:!0}))}_fireDismissTutorial(){this.dispatchEvent(new CustomEvent("dismiss-tutorial",{bubbles:!0,composed:!0}))}_onBeginMarking(){this._dismissTutorial&&this._fireDismissTutorial(),this._setupStep="corners",this.dispatchEvent(new CustomEvent("begin-corners",{bubbles:!0,composed:!0}))}_fireCancel(){this._setupStep=null,this._wizardCorners=[null,null,null,null],this._wizardCornerIndex=0,this._wizardOffsetSide="",this._wizardOffsetFb="",this._perspective=null,this._saveError=null,this.dispatchEvent(new CustomEvent("wizard-cancel",{bubbles:!0,composed:!0}))}}Or.styles=[Be,Se,n`
      :host {
        display: block;
      }

      .wizard-card {
        max-width: 560px;
        width: 100%;
        box-sizing: border-box;
        background: var(--card-background-color, #fff);
        border-radius: var(--epp-radius-lg, 16px);
        padding: 32px;
        display: flex;
        flex-direction: column;
        gap: var(--epp-space-5, 24px);
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
      }

      .wizard-card h2 {
        margin: 0;
        font-size: var(--epp-font-2xl, 20px);
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
        font-size: var(--epp-font-base, 14px);
        font-weight: 500;
        color: var(--secondary-text-color, #757575);
      }

      .wizard-card input[type="text"] {
        width: 100%;
        padding: 10px var(--epp-space-3, 12px);
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
        gap: var(--epp-space-3, 12px);
      }

      .wizard-btn-secondary {
        background: var(--secondary-background-color, #e0e0e0);
        color: var(--primary-text-color, #212121);
      }

      .wizard-btn-secondary:hover {
        opacity: 0.85;
      }

      .mini-grid-container {
        display: flex;
        justify-content: center;
      }

      .mini-grid-target {
        position: absolute;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--success-color, #4caf50);
        border: 2px solid var(--card-background-color, #fff);
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
        background: var(--warning-color, #ff9800);
        border: 2px solid var(--card-background-color, #fff);
        transform: translate(-50%, -50%);
        z-index: 8;
      }

      .sensor-fov-view {
        width: 480px;
        aspect-ratio: 1.732 / 1;
        background: var(--secondary-background-color, #1a1a2e);
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

      .no-target-warning {
        color: var(--error-color, #f44336);
        font-size: var(--epp-font-sm, 13px);
        text-align: center;
      }

      .save-error {
        color: var(--error-color, #f44336);
        font-size: var(--epp-font-sm, 13px);
        text-align: center;
        margin: 0;
      }

      .corner-progress {
        display: flex;
        gap: var(--epp-space-2, 8px);
        flex-wrap: wrap;
      }

      .corner-chip {
        padding: 5px 11px;
        border-radius: var(--epp-radius-lg, 16px);
        font-size: var(--epp-font-sm, 13px);
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
        font-size: var(--epp-font-xl, 18px);
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
        gap: var(--epp-space-2, 8px);
      }

      /* The two distance inputs always share one row (flex row); on mobile the
         label stacks above this row (see the media query below). */
      .offset-inputs {
        display: flex;
        flex: 1;
        min-width: 0;
        gap: var(--epp-space-2, 8px);
      }

      .offset-label {
        font-size: var(--epp-font-sm, 13px);
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
        padding: var(--epp-space-5, 24px) 32px;
        border-radius: var(--epp-radius-lg, 16px);
        text-align: center;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      }

      .offset-input {
        flex: 1;
        min-width: 0;
        width: 100%;
        padding: 14px var(--epp-space-3, 12px) 6px;
        border: 1px solid var(--divider-color, #e0e0e0);
        border-radius: var(--epp-radius-md, 10px);
        font-size: var(--epp-font-lg, 16px);
        box-sizing: border-box;
        background: var(--card-background-color, #fff);
        color: var(--primary-text-color, #212121);
      }

      .offset-input::placeholder {
        color: var(--secondary-text-color, #888);
        font-size: var(--epp-font-sm, 13px);
      }

      .offset-input:focus {
        outline: none;
        border-color: var(--primary-color, #03a9f4);
      }

      .capture-progress {
        display: flex;
        align-items: center;
        gap: var(--epp-space-3, 12px);
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
        font-size: var(--epp-font-sm, 13px);
        color: var(--secondary-text-color, #757575);
        white-space: nowrap;
      }

      .dont-show-again {
        margin-top: var(--epp-space-4, 16px);
      }

      /* Mobile overrides — placed AFTER all base rules so they win at equal
         specificity (media queries add no specificity; later source order wins). */
      @media (max-width: 819px) {
        .wizard-card {
          padding: var(--epp-space-4, 16px);
        }
        .sensor-fov-view {
          width: 100%;
          max-width: 480px;
        }
        /* Label on its own line; the two inputs share the row below it (the
           .offset-inputs flex row, now stretched full-width, keeps them
           side-by-side instead of overflowing). */
        .corner-offsets {
          flex-direction: column;
          align-items: stretch;
        }
        /* Corner chips on a single row (scroll if they don't all fit) rather
           than wrapping to two lines; shrink them so they usually do fit. */
        .corner-progress {
          flex-wrap: nowrap;
          overflow-x: auto;
        }
        .corner-chip {
          padding: 4px 9px;
          font-size: var(--epp-font-xs, 12px);
          white-space: nowrap;
        }
        .corner-arrow {
          font-size: var(--epp-font-base, 14px);
        }
      }
    `],e([ge({attribute:!1})],Or.prototype,"rawTargets",void 0),e([ge({attribute:!1})],Or.prototype,"sensorState",void 0),e([ge({attribute:!1})],Or.prototype,"localize",void 0),e([ge({type:Number})],Or.prototype,"initialRoomWidth",void 0),e([ge({type:Number})],Or.prototype,"initialRoomDepth",void 0),e([ge({type:String})],Or.prototype,"initialStep",void 0),e([ge({type:String})],Or.prototype,"mode",void 0),e([Ae()],Or.prototype,"_setupStep",void 0),e([Ae()],Or.prototype,"_wizardSaving",void 0),e([Ae()],Or.prototype,"_wizardCornerIndex",void 0),e([Ae()],Or.prototype,"_wizardCorners",void 0),e([Ae()],Or.prototype,"_wizardRoomWidth",void 0),e([Ae()],Or.prototype,"_wizardRoomDepth",void 0),e([Ae()],Or.prototype,"_wizardCapturing",void 0),e([Ae()],Or.prototype,"_wizardCaptureProgress",void 0),e([Ae()],Or.prototype,"_wizardCapturePaused",void 0),e([Ae()],Or.prototype,"_wizardOffsetSide",void 0),e([Ae()],Or.prototype,"_wizardOffsetFb",void 0),e([Ae()],Or.prototype,"_dismissTutorial",void 0),e([Ae()],Or.prototype,"_saveError",void 0),customElements.get("epp-wizard")||customElements.define("epp-wizard",Or);const Hr=[{mode:"entry",labelKey:"overlays.entry_exit",dotCss:Gi(1,4)},{mode:"interference",labelKey:"overlays.interference",dotCss:Gi(2,4)},{mode:"suppress",labelKey:"overlays.suppress",dotCss:Gi(3,4)}];class Qr extends he{constructor(){super(...arguments),this.overlayMode=null,this.localize=Jt}render(){return Y`
			<div class="overlay-scroll-area">
				${Hr.map(e=>Y`
						<button
							type="button"
							class="overlay-item ${this.overlayMode===e.mode?"active":""}"
							@click=${()=>{this.dispatchEvent(new CustomEvent("overlay-select",{detail:{mode:this.overlayMode===e.mode?null:e.mode},bubbles:!0,composed:!0}))}}
						>
							<div class="overlay-item-row">
								<div
									class="overlay-dot"
									style="background: ${e.dotCss};"
								></div>
								<span class="overlay-name"
									>${this.localize(e.labelKey)}</span
								>
								<span class="overlay-hint"
									>${this.localize("overlays.click_to_paint")}</span
								>
							</div>
						</button>
					`)}
			</div>
		`}}Qr.styles=n`
		:host {
			display: block;
		}

		.overlay-scroll-area {
			display: flex;
			flex-direction: column;
			gap: 6px;
		}

		/* Real <button>s for keyboard access; reset the UA button chrome. */
		.overlay-item {
			display: flex;
			flex-direction: column;
			gap: var(--epp-space-1, 4px);
			padding: 6px var(--epp-space-2, 8px);
			border-radius: 8px;
			cursor: pointer;
			border: 2px solid var(--divider-color, #e0e0e0);
			transition: border-color 0.2s;
			background: none;
			font: inherit;
			color: inherit;
			text-align: left;
			width: 100%;
		}

		.overlay-item:hover {
			background: var(--secondary-background-color, #f5f5f5);
		}

		.overlay-item.active {
			border-color: var(--epp-accent, var(--primary-color, #03a9f4));
		}

		.overlay-item-row {
			display: flex;
			align-items: center;
			gap: var(--epp-space-2, 8px);
		}

		.overlay-dot {
			width: 16px;
			height: 16px;
			border-radius: 50%;
			flex-shrink: 0;
			border: 1px solid var(--epp-border, #ccc);
		}

		.overlay-name {
			flex: 1;
			font-size: var(--epp-font-base, 14px);
		}

		.overlay-hint {
			font-size: 11px;
			color: var(--epp-text-muted, var(--secondary-text-color, #757575));
		}

	`,e([ge({attribute:!1})],Qr.prototype,"overlayMode",void 0),e([ge({attribute:!1})],Qr.prototype,"localize",void 0),customElements.get("epp-overlay-sidebar")||customElements.define("epp-overlay-sidebar",Qr);class Gr extends he{constructor(){super(...arguments),this.zoneConfigs=[],this.activeZone=null,this.zone0={type:"default"},this.localZoneState=new Map,this.localize=Jt,this._nameDebounceTimer=null,this._pendingNameUpdate=null,this._flushPendingName=()=>{this._nameDebounceTimer=null;const e=this._pendingNameUpdate;e&&(this._pendingNameUpdate=null,this.dispatchEvent(new CustomEvent("zone-config-change",{detail:{index:e.index,updates:{name:e.name}},bubbles:!0,composed:!0})))}}_onNameInput(e,t){this._pendingNameUpdate={index:e,name:t},null!==this._nameDebounceTimer&&clearTimeout(this._nameDebounceTimer),this._nameDebounceTimer=setTimeout(this._flushPendingName,Gr.NAME_DEBOUNCE_MS)}_usedColorsExcept(e){return this.zoneConfigs.filter((t,i)=>null!==t&&i!==e).map(e=>e.color)}disconnectedCallback(){super.disconnectedCallback(),null!==this._nameDebounceTimer&&(clearTimeout(this._nameDebounceTimer),this._flushPendingName())}render(){return this._renderZoneSidebar()}updated(){for(const e of this.renderRoot.querySelectorAll(".sensitivity-select")){const t=e.dataset.value;null!=t&&e.value!==t&&(e.value=t)}}_renderZoneSidebar(){return Y`
			<div class="zone-scroll-area">
				<!-- Room. The selectable row is a real <button> for keyboard
				     access; named-zone rows below can't be (they contain a name
				     <input> and a remove <button> — interactive content is
				     invalid inside a button — and already have a keyboard path
				     via the name input's focus handler). -->
				<div class="zone-item ${0===this.activeZone?"active":""}">
					<button
						type="button"
						class="sidebar-item-row"
						@click=${()=>{this.dispatchEvent(new CustomEvent("zone-select",{detail:{zone:0},bubbles:!0,composed:!0}))}}
					>
						<div
							class="zone-color-dot"
							style="background: #fff; border: 1px solid #ccc;${this.localZoneState.get(0)?.occupied?" box-shadow: 0 0 6px 2px #999;":""}"
						></div>
						<span class="zone-name"
							>${this.localize("sidebar.room")}</span
						>
					</button>
					${0===this.activeZone?Y` ${this._renderBoundaryTypeControls()} `:J}
				</div>

				<hr class="zone-separator" />
				<!-- Named zones 1..N -->
				${this.zoneConfigs.map((e,t)=>{if(null===e)return J;const i=t+1;return Y`
						<div
							class="zone-item ${this.activeZone===i?"active":""}"
							@click=${()=>{this.dispatchEvent(new CustomEvent("zone-select",{detail:{zone:i},bubbles:!0,composed:!0}))}}
						>
							<div class="sidebar-item-row">
								${this.activeZone===i?Y`
											<epp-zone-color-picker
												.value=${e.color}
												.presets=${mr}
												.usedColors=${this._usedColorsExcept(t)}
												.occupiedGlow=${this.localZoneState.get(i)?.occupied??!1}
												.localize=${this.localize}
												@value-changed=${e=>{e.stopPropagation(),this.dispatchEvent(new CustomEvent("zone-config-change",{detail:{index:t,updates:{color:e.detail.value}},bubbles:!0,composed:!0}))}}
												@click=${e=>e.stopPropagation()}
											></epp-zone-color-picker>
										`:Y`
											<div
												class="zone-color-dot"
												style="background: ${e.color};${this.localZoneState.get(i)?.occupied?` box-shadow: 0 0 6px 2px ${e.color};`:""}"
											></div>
										`}
								<input
									class="zone-name-input"
									type="text"
									?readonly=${this.activeZone!==i}
									.value=${e.name}
									@input=${e=>{const i=e.target.value;this._onNameInput(t,i)}}
									@blur=${()=>{null!==this._nameDebounceTimer&&(clearTimeout(this._nameDebounceTimer),this._flushPendingName())}}
									@click=${e=>{e.stopPropagation(),this.dispatchEvent(new CustomEvent("zone-select",{detail:{zone:i},bubbles:!0,composed:!0}))}}
									@focus=${()=>{this.dispatchEvent(new CustomEvent("zone-select",{detail:{zone:i},bubbles:!0,composed:!0}))}}
								/>
								<epp-icon-button
									icon="mdi:close"
									label=${this.localize("zones.remove_zone")}
									variant="danger"
									class="sidebar-remove-btn"
									@click=${e=>{e.stopPropagation(),this.dispatchEvent(new CustomEvent("zone-remove",{detail:{slot:i},bubbles:!0,composed:!0}))}}
								></epp-icon-button>
							</div>
							${this.activeZone===i?Y`
										${this._renderZoneTypeControls(e,t)}
									`:J}
						</div>
					`})}

				${this.zoneConfigs.some(e=>null===e)?Y`
							<button
								class="add-zone-btn"
								@click=${()=>{this.dispatchEvent(new CustomEvent("zone-add",{bubbles:!0,composed:!0}))}}
							>
								<ha-icon icon="mdi:plus"></ha-icon>
								${this.localize("sidebar.add_zone")}
							</button>
						`:J}

			</div>
		`}_emitZone0Change(e){this.dispatchEvent(new CustomEvent("zone0-change",{detail:e,bubbles:!0,composed:!0}))}_renderBoundaryTypeControls(){return this._renderTypeControls(this.zone0,wr(this.zone0),e=>this._emitZone0Change(e))}_renderZoneTypeControls(e,t){return this._renderTypeControls(e,wr(e),e=>{this.dispatchEvent(new CustomEvent("zone-config-change",{detail:{index:t,updates:e},bubbles:!0,composed:!0}))})}_renderTypeControls(e,t,i){const s="custom"===e.type,r=`width: 100%; display: flex; align-items: center; gap: 4px; font-size: 12px; opacity: ${s?1:.5};`,o=(e,t,s)=>{const r=Number(t);r>0&&i({[e]:Math.min(Math.max(r,1),s)})};return Y`
			<div
				class="sidebar-item-row zone-settings-row"
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
						data-value=${e.type}
						@change=${e=>{const s=e.target.value;i("custom"===s?{...t,type:s}:{type:s,trigger:void 0,renew:void 0,timeout:void 0,handoff_timeout:void 0})}}
						@click=${e=>e.stopPropagation()}
					>
						${_r.map(e=>Y`<option value=${e}>${this.localize(`zones.${e}`)}</option>`)}
					</select>
				</div>
				<div style="${r}">
					<label style="width: 80px; flex-shrink: 0;"
						>${this.localize("zones.trigger")}</label
					>
					<input
						type="range"
						min="1"
						max="9"
						style="flex: 1; min-width: 0;"
						.value=${String(t.trigger)}
						?disabled=${!s}
						@input=${e=>{i({trigger:Number(e.target.value)})}}
						@click=${e=>e.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0;"
						>${t.trigger}</span
					>
				</div>
				<div style="${r}">
					<label style="width: 80px; flex-shrink: 0;"
						>${this.localize("zones.renew")}</label
					>
					<input
						type="range"
						min="1"
						max="9"
						style="flex: 1; min-width: 0;"
						.value=${String(t.renew)}
						?disabled=${!s}
						@input=${e=>{i({renew:Number(e.target.value)})}}
						@click=${e=>e.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0;"
						>${t.renew}</span
					>
				</div>
				<div style="${r}">
					<label style="width: 80px; flex-shrink: 0;"
						>${this.localize("zones.presence_timeout")}</label
					>
					<span style="flex: 1;"></span>
					<input
						type="number"
						min="1"
						max="3600"
						style="width: 48px; text-align: right; font: inherit; font-size: 12px;"
						.value=${String(t.timeout)}
						?disabled=${!s}
						@input=${e=>{o("timeout",e.target.value,3600)}}
						@click=${e=>e.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0; font-size: 12px;"
						>${this.localize("zones.seconds_suffix")}</span
					>
				</div>
				<div style="${r}">
					<label style="width: 80px; flex-shrink: 0;"
						>${this.localize("zones.handoff_timeout")}</label
					>
					<span style="flex: 1;"></span>
					<input
						type="number"
						min="1"
						max="300"
						style="width: 48px; text-align: right; font: inherit; font-size: 12px;"
						.value=${String(t.handoff_timeout)}
						?disabled=${!s}
						@input=${e=>{o("handoff_timeout",e.target.value,300)}}
						@click=${e=>e.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0; font-size: 12px;"
						>${this.localize("zones.seconds_suffix")}</span
					>
				</div>
			</div>
		`}}Gr.NAME_DEBOUNCE_MS=150,Gr.styles=[De,n`
			:host {
				display: block;
			}

			.zone-name-input {
				flex: 1;
				border: none;
				border-bottom: 1px solid var(--divider-color, #e0e0e0);
				background: transparent;
				font-size: var(--epp-font-base, 14px);
				color: var(--primary-text-color, #212121);
				padding: 2px var(--epp-space-1, 4px);
				min-width: 0;
			}

			.zone-name-input:focus {
				outline: none;
				border-bottom: 1px solid var(--epp-accent, var(--primary-color, #03a9f4));
			}

			.sensitivity-select {
				padding: 2px var(--epp-space-1, 4px);
				border: 1px solid var(--divider-color, #e0e0e0);
				border-radius: 4px;
				font-size: var(--epp-font-xs, 12px);
				background: var(--card-background-color, #fff);
				color: var(--primary-text-color, #212121);
				cursor: pointer;
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
				gap: var(--epp-space-1, 4px);
				padding: 6px var(--epp-space-2, 8px);
				border-radius: 8px;
				cursor: pointer;
				border: 2px solid var(--divider-color, #e0e0e0);
				transition: border-color 0.2s;
			}

			.zone-item:hover {
				background: var(--secondary-background-color, #f5f5f5);
			}

			.zone-item.active {
				border-color: var(--epp-accent, var(--primary-color, #03a9f4));
			}

			/* Reset for the zone-0 row, which is a real <button> for keyboard
			   access (it has no interactive children, unlike named-zone rows). */
			button.sidebar-item-row {
				width: 100%;
				background: none;
				border: none;
				padding: 0;
				font: inherit;
				color: inherit;
				text-align: left;
				cursor: pointer;
			}

			.zone-settings-row {
				padding-left: 24px;
				gap: 6px;
			}

			.zone-separator {
				border: none;
				border-top: 1px solid var(--divider-color, #e0e0e0);
				margin: var(--epp-space-1, 4px) 0;
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
				font-size: var(--epp-font-base, 14px);
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
				color: var(--epp-accent, var(--primary-color, #03a9f4));
				cursor: pointer;
				font-size: var(--epp-font-base, 14px);
				transition: background 0.2s;
			}

			.add-zone-btn:hover {
				background: var(--secondary-background-color, #f5f5f5);
			}
		`],e([ge({attribute:!1})],Gr.prototype,"zoneConfigs",void 0),e([ge({attribute:!1})],Gr.prototype,"activeZone",void 0),e([ge({attribute:!1})],Gr.prototype,"zone0",void 0),e([ge({attribute:!1})],Gr.prototype,"localZoneState",void 0),e([ge({attribute:!1})],Gr.prototype,"localize",void 0),customElements.get("epp-zone-sidebar")||customElements.define("epp-zone-sidebar",Gr);class Lr extends he{constructor(){super(...arguments),this.open=!1,this.heading="",this.message="",this.confirmLabel="Confirm",this.cancelLabel="Cancel",this.danger=!1,this.hideCancel=!1}render(){return Y`
			<epp-dialog
				?open=${this.open}
				.heading=${this.heading}
				.label=${this.heading||this.confirmLabel}
				@dialog-dismiss=${this._cancel}
			>
				${this.message?Y`<p class="message">${this.message}</p>`:J}
				${this.hideCancel?J:Y`<epp-button
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
		`}_confirm(){this.dispatchEvent(new CustomEvent("confirm",{bubbles:!0,composed:!0}))}_cancel(){this.dispatchEvent(new CustomEvent("cancel",{bubbles:!0,composed:!0}))}}Lr.styles=n`
		.message {
			margin: 0;
			font-size: var(--epp-font-base, 14px);
			color: var(--epp-text-muted, var(--secondary-text-color, #757575));
		}
	`,e([ge({type:Boolean})],Lr.prototype,"open",void 0),e([ge()],Lr.prototype,"heading",void 0),e([ge()],Lr.prototype,"message",void 0),e([ge()],Lr.prototype,"confirmLabel",void 0),e([ge()],Lr.prototype,"cancelLabel",void 0),e([ge({type:Boolean})],Lr.prototype,"danger",void 0),e([ge({type:Boolean})],Lr.prototype,"hideCancel",void 0),customElements.define("epp-confirm-dialog",Lr);class $r extends he{constructor(){super(...arguments),this.availableDevices=[],this.selectedMacs=[],this.missingSources=[]}_label(e){return e.area?`${e.name} (${e.area})`:e.name}render(){const e=new Set(this.selectedMacs),t=this.availableDevices.filter(t=>e.has(t.mac)),i=this.availableDevices.filter(t=>!e.has(t.mac)),s=0===t.length&&0===this.missingSources.length;return Y`
			${i.length?this._renderAddPicker(i):J}
			<div class="source-box">
				${s?Y`<p class="empty" data-testid="no-devices">No devices added yet.</p>`:J}
				${t.map(e=>this._renderAddedRow(e))}
				${this.missingSources.map(e=>this._renderMissingRow(e))}
			</div>
			${this.missingSources.length?Y`<div class="missing-warning" data-testid="missing-warning">
							<ha-icon icon="mdi:alert"></ha-icon>
							Some source devices no longer exist. Remove them and save.
						</div>`:J}
		`}_renderAddPicker(e){const t=e.map(e=>({value:e.mac,label:this._label(e)}));return customElements.get("ha-select")?Y`<ha-select
				class="add-picker"
				data-testid="add-picker"
				label="Add a device"
				.value=${""}
				.options=${t}
				@selected=${e=>this._add(e.detail.value)}
				@closed=${e=>e.stopPropagation()}
			></ha-select>`:Y`<select
			class="add-picker"
			data-testid="add-picker"
			data-value=""
			@change=${e=>this._add(e.target.value)}
		>
			<option value="" disabled selected>Add a device</option>
			${t.map(e=>Y`<option value=${e.value}>${e.label}</option>`)}
		</select>`}updated(){const e=this.renderRoot.querySelector("select.add-picker");e&&""!==e.value&&(e.value="")}_add(e){e&&this._emitSourceToggled(e,!0)}_renderAddedRow(e){const t=e.available?Y`<span class="badge online" data-testid="device-badge">● Online</span>`:Y`<span class="badge offline" data-testid="device-badge">● Offline</span>`;return Y`<div class="source-row" data-testid="device-row">
			<span class="source-name">${this._label(e)}</span>
			${t} ${this._renderDelete(e.mac)}
		</div>`}_renderMissingRow(e){return Y`<div class="source-row missing" data-testid="device-row">
			<span class="source-name">${e.name}</span>
			<span class="badge missing" data-testid="device-badge">⚠ no longer exists</span>
			${this._renderDelete(e.mac)}
		</div>`}_renderDelete(e){return Y`<epp-tooltip content="Remove device">
			<epp-icon-button
				data-testid="device-delete"
				data-mac=${e}
				icon="mdi:delete"
				label="Remove device"
				variant="danger"
				@click=${()=>this._emitSourceToggled(e,!1)}
			></epp-icon-button>
		</epp-tooltip>`}_emitSourceToggled(e,t){this.dispatchEvent(new CustomEvent("source-toggled",{detail:{mac:e,on:t},bubbles:!0,composed:!0}))}}$r.styles=n`
		:host { display: block; }
		.add-picker { display: block; width: 100%; margin-bottom: var(--epp-space-2, 8px); }
		.source-box {
			border: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
			border-radius: var(--epp-radius-md, 10px);
			padding: 2px var(--epp-space-3, 12px);
		}
		.source-row {
			display: flex;
			align-items: center;
			gap: var(--epp-space-3, 12px);
			padding: 6px 0;
			min-height: 36px;
		}
		.source-row + .source-row {
			border-top: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
		}
		.source-name {
			flex: 1;
			min-width: 0;
			font-size: var(--epp-font-base, 14px);
			color: var(--epp-text, var(--primary-text-color, #212121));
		}
		.source-row.missing .source-name {
			color: var(--epp-warning, var(--warning-color, #ff9800));
		}
		.empty {
			color: var(--epp-text-muted, var(--secondary-text-color, #757575));
			font-size: var(--epp-font-sm, 13px);
			padding: 6px 0;
			margin: 0;
		}
		.missing-warning {
			display: flex;
			align-items: center;
			gap: 6px;
			margin-top: 6px;
			font-size: var(--epp-font-sm, 13px);
			color: var(--epp-warning, var(--warning-color, #ff9800));
		}
		.missing-warning ha-icon { --mdc-icon-size: 18px; }
		.badge { font-size: var(--epp-font-sm, 13px); white-space: nowrap; }
		.badge.online { color: var(--epp-success, var(--success-color, #43a047)); }
		.badge.offline { color: var(--epp-text-muted, var(--secondary-text-color, #757575)); }
		.badge.missing { color: var(--epp-warning, var(--warning-color, #ff9800)); }
	`,e([ge({attribute:!1})],$r.prototype,"availableDevices",void 0),e([ge({attribute:!1})],$r.prototype,"selectedMacs",void 0),e([ge({attribute:!1})],$r.prototype,"missingSources",void 0),customElements.get("epp-device-source-list")||customElements.define("epp-device-source-list",$r);const Nr=[{id:"edit",label:"Edit",icon:"mdi:pencil"},{divider:!0},{id:"delete",label:"Delete",icon:"mdi:delete",danger:!0}],Yr={occupancy:"Occupancy",static_presence:"Static presence",motion_presence:"Motion presence",target_presence:"Target presence",mmwave_presence:"mmWave presence"};function Kr(e,t){return`${e} · ${t}`}const Wr=["occupancy","static_presence","motion_presence","target_presence","mmwave_presence"],Jr="rest_of_room";function jr(e,t){return`${e}|${t}`}function Zr(e){const t=e.lastIndexOf("|");return{mac:e.slice(0,t),zone_index:Number(e.slice(t+1))}}function Vr(e,t){return e.mac===t.mac&&e.zone_index===t.zone_index}class Xr extends he{constructor(){super(...arguments),this.sources=[],this.zoneGroups=[],this.excludedPresence=[],this.excludedZones=[],this.excludedZoneGroups=[],this._mode="list",this._merge=null}render(){const e="merge"===this._mode,t=Wr.filter(e=>this.sources.some(t=>t.enabled_presence.includes(e))),i=this.sources.some(e=>e.zones.some(e=>0===e.index)),s=e?this._checkableZones():this._passthroughZones(),r=[];for(const i of t)r.push(this._renderPresence(i,e));i&&r.push(this._renderRoom(e));for(const t of s)r.push(e?this._renderZoneCheck(t):this._renderZone(t));if(!e)for(const e of this.zoneGroups)r.push(this._renderMergedGroup(e));return Y`
			${this._renderHeader()}
			${r.length?Y`<div class="sensor-box">${r}</div>`:Y`<p class="empty">No sensors.</p>`}
			${e?this._renderMergeControls():J}
		`}_renderHeader(){const e="merge"===this._mode;return Y`<div class="header">
			<h4>Sensors</h4>
			<div class="segmented" role="group" aria-label="Sensor list mode">
				<button
					type="button"
					data-testid="mode-list"
					class=${e?"":"active"}
					aria-pressed=${!e}
					@click=${this._toList}
				>
					List
				</button>
				<button
					type="button"
					data-testid="mode-merge"
					class=${e?"active":""}
					aria-pressed=${e}
					@click=${this._toMerge}
				>
					Merge zones
				</button>
			</div>
		</div>`}_toList(){this._mode="list",this._merge=null}_toMerge(){this._mode="merge",this._merge={editingId:null,name:"",checked:new Set}}_renderPresence(e,t){const i=!this.excludedPresence.includes(e),s=function(e,t){const i=[],s=[];for(const r of t)r.enabled_presence.includes(e)?i.push(r.name):s.push(r.name);return{provided:i,missing:s}}(e,this.sources);return Y`<div
			class="sensor-row ${t?"disabled":""}"
			data-testid="presence-row"
			data-slot=${e}
		>
			<div class="sensor-main">
				<div class="sensor-label">
					<span class="sensor-name">${Yr[e]??e}</span>
				</div>
				<div class="coverage" data-testid="coverage">
					${this._renderCoverage(s.provided,s.missing)}
				</div>
			</div>
			<epp-toggle
				data-testid="presence-toggle"
				.checked=${i}
				.disabled=${t}
				@value-changed=${t=>{t.stopPropagation(),this.excludedPresence=qr(this.excludedPresence,e,!t.detail.value,(e,t)=>e===t),this._emitExclusions()}}
			></epp-toggle>
		</div>`}_renderCoverage(e,t){const i=[...e.map(e=>({name:e,off:!1})),...t.map(e=>({name:e,off:!0}))];return i.map((e,t)=>Y`${t>0?" · ":J}<span
						class=${e.off?"off":""}
						data-testid=${e.off?"coverage-off":"coverage-on"}
						>${e.name}</span
					>`)}_renderRoom(e){const t=!this.excludedZoneGroups.includes(Jr);return Y`<div
			class="sensor-row ${e?"disabled":""}"
			data-testid="rest-of-room-row"
		>
			<div class="sensor-main">
				<div class="sensor-label">
					<span class="sensor-name">${"Zone Rest of Room"}</span>
				</div>
			</div>
			<epp-toggle
				data-testid="rest-of-room-toggle"
				.checked=${t}
				.disabled=${e}
				@value-changed=${e=>{e.stopPropagation(),this.excludedZoneGroups=qr(this.excludedZoneGroups,Jr,!e.detail.value,(e,t)=>e===t),this._emitExclusions()}}
			></epp-toggle>
		</div>`}_renderZone(e){const t={mac:e.mac,zone_index:e.index},i=!this.excludedZones.some(e=>Vr(e,t));return Y`<div
			class="sensor-row"
			data-testid="zone-row"
			data-key=${jr(e.mac,e.index)}
		>
			<div class="sensor-main">
				<div class="sensor-label">
					<span class="sensor-name"
						>${Kr(e.zoneName,e.deviceName)}</span
					>
				</div>
			</div>
			<epp-toggle
				data-testid="zone-toggle"
				.checked=${i}
				@value-changed=${e=>{e.stopPropagation(),this.excludedZones=qr(this.excludedZones,t,!e.detail.value,Vr),this._emitExclusions()}}
			></epp-toggle>
		</div>`}_renderZoneCheck(e){const t=jr(e.mac,e.index),i=this._merge?.checked.has(t)??!1,s=e=>this._toggleCheck(t,e.target.checked),r=customElements.get("ha-checkbox")?Y`<ha-checkbox
					data-testid="merge-checkbox"
					data-key=${t}
					.checked=${i}
					@change=${s}
				></ha-checkbox>`:Y`<input
					type="checkbox"
					data-testid="merge-checkbox"
					data-key=${t}
					.checked=${i}
					@change=${s}
				/>`;return Y`<label
			class="sensor-row"
			data-testid="zone-row"
			data-key=${t}
		>
			<div class="sensor-main">
				<div class="sensor-label">
					<span class="sensor-name"
						>${Kr(e.zoneName,e.deviceName)}</span
					>
				</div>
			</div>
			${r}
		</label>`}_renderMergeControls(){const e=this._merge;return Y`
			${this._renderNameField(e.name)}
			<div class="actions">
				<epp-button
					variant="text"
					data-testid="merge-cancel"
					@click=${this._cancelMerge}
					>Cancel</epp-button
				>
				<epp-button
					variant="primary"
					data-testid="merge-confirm"
					.disabled=${!this._canMerge()}
					@click=${this._confirmMerge}
					>${e.editingId?"Save":"Merge"}</epp-button
				>
			</div>
		`}_renderNameField(e){return Y`
			<epp-field
				class="merge-name"
				data-testid="merge-name"
				type="text"
				.label=${"Merged zone name"}
				.value=${e}
				@value-changed=${e=>{e.stopPropagation(),this._merge={...this._merge,name:e.detail.value}}}
			></epp-field>
		`}_renderMergedGroup(e){const t=e.members.map(e=>{const t=this._resolveMember(e);return Kr(t.zoneName,t.deviceName)}).join(", ");return Y`<div class="sensor-row merged-zone" data-testid="merged-zone">
			<div class="sensor-main">
				<div class="sensor-label">
					<span class="sensor-name">${e.name}</span>
					<span class="chip zone">merged</span>
				</div>
				${t?Y`<div class="coverage" data-testid="merged-members">${t}</div>`:J}
			</div>
			<epp-kebab-menu
				.items=${Nr}
				@item-select=${t=>this._onKebab(e,t.detail.id)}
			></epp-kebab-menu>
		</div>`}_onKebab(e,t){"edit"===t?this._startEdit(e):"delete"===t&&this._deleteGroup(e.id)}_resolveMember(e){const t=this.sources.find(t=>t.mac===e.mac),i=t?.zones.find(t=>t.index===e.zone_index);return{mac:e.mac,deviceName:t?.name??"Unknown device",index:e.zone_index,zoneName:i?.name??`Zone ${e.zone_index}`}}_passthroughZones(){return this._ungroupedZones().filter(e=>e.index>=1).sort((e,t)=>e.zoneName.localeCompare(t.zoneName,void 0,{numeric:!0})||e.deviceName.localeCompare(t.deviceName,void 0,{numeric:!0}))}_ungroupedZones(){const e=new Set(this.zoneGroups.flatMap(e=>e.members.map(e=>jr(e.mac,e.zone_index)))),t=[];for(const i of this.sources)for(const s of i.zones)s.enabled&&(e.has(jr(i.mac,s.index))||t.push({mac:i.mac,deviceName:i.name,index:s.index,zoneName:s.name}));return t}_checkableZones(){const e=this._passthroughZones(),t=null!=this._merge?.editingId?this.zoneGroups.find(e=>e.id===this._merge?.editingId):void 0;if(t)for(const i of t.members)e.push(this._resolveMember(i));return e.sort((e,t)=>e.zoneName.localeCompare(t.zoneName,void 0,{numeric:!0})||e.deviceName.localeCompare(t.deviceName,void 0,{numeric:!0}))}_startEdit(e){this._mode="merge",this._merge={editingId:e.id,name:e.name,checked:new Set(e.members.map(e=>jr(e.mac,e.zone_index)))}}_toggleCheck(e,t){if(!this._merge)return;const i=new Set(this._merge.checked);t?i.add(e):i.delete(e),this._merge={...this._merge,checked:i}}_canMerge(){return!!this._merge&&""!==this._merge.name.trim()&&this._merge.checked.size>=2}_cancelMerge(){this._mode="list",this._merge=null}_confirmMerge(){if(!this._canMerge())return;const e=this._merge;if(!e)return;const t=[...e.checked].map(Zr),i=e.name.trim();let s;if(e.editingId)s=this.zoneGroups.map(s=>s.id===e.editingId?{...s,name:i,members:t}:s);else{const e=`zg_${crypto.randomUUID().slice(0,8)}`;s=[...this.zoneGroups,{id:e,name:i,members:t}]}this._mode="list",this._merge=null,this._emit(s)}_deleteGroup(e){this._emit(this.zoneGroups.filter(t=>t.id!==e))}_emit(e){this.dispatchEvent(new CustomEvent("zone-groups-changed",{detail:{zone_groups:e},bubbles:!0,composed:!0}))}_emitExclusions(){this.dispatchEvent(new CustomEvent("exclusions-changed",{detail:{excluded_presence:this.excludedPresence,excluded_zones:this.excludedZones,excluded_zone_groups:this.excludedZoneGroups},bubbles:!0,composed:!0}))}}function qr(e,t,i,s){const r=e.some(e=>s(e,t));return i&&!r?[...e,t]:!i&&r?e.filter(e=>!s(e,t)):e}function eo(e){return JSON.stringify({name:e.name,area_id:e.area_id,sourceMacs:[...e.sourceMacs].sort(),zone_groups:[...e.zone_groups].map(e=>({id:e.id,name:e.name,members:e.members.map(e=>`${e.mac}|${e.zone_index}`).sort()})).sort((e,t)=>e.id.localeCompare(t.id)),excludedPresence:[...e.excludedPresence].sort(),excludedZones:[...e.excludedZones].map(e=>`${e.mac}|${e.zone_index}`).sort(),excludedZoneGroups:[...e.excludedZoneGroups].sort()})}Xr.styles=[Re,n`
			:host { display: block; }
			h4 {
				margin: 0 0 var(--epp-space-2, 8px) 0;
				font-size: var(--epp-font-md, 15px);
				font-weight: var(--epp-weight-semibold, 600);
			}
			/* Kept as an in-place tokenised container rather than <epp-card>: it's a
			   tight inset list of rows (4px 12px padding, internal row dividers, 10px
			   radius), not a card-padded surface — epp-card bakes in 16px padding +
			   16px radius on its shadow .card with no external override, which would
			   loosen the dense row list and change its look. */
			.sensor-box {
				border: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
				border-radius: var(--epp-radius-md, 10px);
				padding: var(--epp-space-1, 4px) var(--epp-space-3, 12px);
			}
			.sensor-row {
				display: flex;
				align-items: center;
				gap: var(--epp-space-3, 12px);
				min-height: 36px;
				padding: 6px 0;
			}
			.sensor-row + .sensor-row {
				border-top: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
			}
			.sensor-row.disabled {
				opacity: 0.55;
				pointer-events: none;
			}
			.sensor-main {
				flex: 1;
				min-width: 0;
				display: flex;
				flex-direction: column;
				gap: 2px;
			}
			.sensor-label {
				display: flex;
				align-items: center;
				gap: var(--epp-space-2, 8px);
				font-size: var(--epp-font-base, 14px);
				color: var(--epp-text, var(--primary-text-color, #212121));
			}
			.sensor-name { min-width: 0; }
			.coverage {
				color: var(--epp-text-muted, var(--secondary-text-color, #757575));
				font-size: var(--epp-font-sm, 13px);
			}
			.coverage .off { text-decoration: line-through; }
			.sensor-row epp-toggle { flex-shrink: 0; }
			.sensor-row ha-checkbox,
			.sensor-row input[type="checkbox"] {
				flex-shrink: 0;
				margin: 0;
			}
			.empty { color: var(--epp-text-muted, var(--secondary-text-color, #757575)); }
			.header {
				display: flex;
				align-items: center;
				justify-content: space-between;
				gap: var(--epp-space-2, 8px);
				margin-bottom: var(--epp-space-2, 8px);
			}
			.segmented {
				display: inline-flex;
				border: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
				border-radius: var(--epp-radius-pill, 9999px);
				overflow: hidden;
			}
			.segmented button {
				border: none;
				background: none;
				padding: 4px var(--epp-space-3, 12px);
				font-size: var(--epp-font-sm, 13px);
				cursor: pointer;
				color: var(--epp-text, var(--primary-text-color, #212121));
			}
			.segmented button.active {
				background: var(--epp-accent, var(--primary-color, #03a9f4));
				color: var(--epp-accent-text, var(--text-primary-color, #fff));
			}
			.merge-name {
				display: block;
				width: 100%;
				margin-top: var(--epp-space-3, 12px);
			}
			.actions {
				display: flex;
				justify-content: flex-end;
				gap: var(--epp-space-2, 8px);
				margin-top: var(--epp-space-3, 12px);
			}
			.merged-zone .sensor-name { font-weight: var(--epp-weight-medium, 500); }
			.merged-zone epp-kebab-menu { margin: -6px 0; }
		`],e([ge({attribute:!1})],Xr.prototype,"sources",void 0),e([ge({attribute:!1})],Xr.prototype,"zoneGroups",void 0),e([ge({attribute:!1})],Xr.prototype,"excludedPresence",void 0),e([ge({attribute:!1})],Xr.prototype,"excludedZones",void 0),e([ge({attribute:!1})],Xr.prototype,"excludedZoneGroups",void 0),e([Ae()],Xr.prototype,"_mode",void 0),e([Ae()],Xr.prototype,"_merge",void 0),customElements.get("epp-sensor-list")||customElements.define("epp-sensor-list",Xr);class to extends he{constructor(){super(...arguments),this.availableDevices=[],this.existingGroup=null,this.sourcesByMac={},this._draft={id:null,name:"",area_id:null,sourceMacs:[],zone_groups:[],excludedPresence:[],excludedZones:[],excludedZoneGroups:[]},this._pristine=eo(this._draft),this._emittedDirty=!1}willUpdate(e){e.has("existingGroup")&&(this._draft=this.existingGroup?{id:this.existingGroup.id,name:this.existingGroup.name,area_id:this.existingGroup.area_id,sourceMacs:this.existingGroup.sources.map(e=>e.mac),zone_groups:this.existingGroup.zone_groups,excludedPresence:this.existingGroup.excluded_presence??[],excludedZones:this.existingGroup.excluded_zones??[],excludedZoneGroups:this.existingGroup.excluded_zone_groups??[]}:{id:null,name:"",area_id:null,sourceMacs:[],zone_groups:[],excludedPresence:[],excludedZones:[],excludedZoneGroups:[]},this._pristine=eo(this._draft))}updated(){const e=this._isDirty();e!==this._emittedDirty&&(this._emittedDirty=e,this.dispatchEvent(new CustomEvent("dirty-changed",{detail:{dirty:e},bubbles:!0,composed:!0})))}_isDirty(){return eo(this._draft)!==this._pristine}render(){return Y`
			<ha-card>
				<div class="card-content">
					<div class="editor-scroll">
						<div class="field">${this._renderNameField()}</div>
						<div class="field">
							<ha-area-picker
								.hass=${this.hass}
								.value=${this._draft.area_id??""}
								@value-changed=${e=>{e.stopPropagation(),this._update({area_id:e.detail.value||null})}}
							></ha-area-picker>
						</div>

						<div class="section">
							<h3>Source devices</h3>
							<epp-device-source-list
								.availableDevices=${this.availableDevices}
								.selectedMacs=${this._draft.sourceMacs}
								.missingSources=${this._missingSources()}
								@source-toggled=${e=>{e.stopPropagation(),this._toggleSource(e.detail.mac,e.detail.on)}}
							></epp-device-source-list>
						</div>

						<div class="section">
							<epp-sensor-list
								.sources=${this._draftSources()}
								.zoneGroups=${this._draft.zone_groups}
								.excludedPresence=${this._draft.excludedPresence}
								.excludedZones=${this._draft.excludedZones}
								.excludedZoneGroups=${this._draft.excludedZoneGroups}
								@zone-groups-changed=${e=>{e.stopPropagation(),this._update({zone_groups:e.detail.zone_groups})}}
								@exclusions-changed=${e=>{e.stopPropagation(),this._update({excludedPresence:e.detail.excluded_presence,excludedZones:e.detail.excluded_zones,excludedZoneGroups:e.detail.excluded_zone_groups})}}
							></epp-sensor-list>
						</div>
					</div>

					<div class="save-cancel-bar">
						<epp-button variant="text" @click=${this._cancel}>Cancel</epp-button>
						<epp-button
							variant="primary"
							.disabled=${!(this._canSave()&&this._isDirty())}
							@click=${this._save}
							>Save</epp-button
						>
					</div>
				</div>
			</ha-card>
		`}_renderNameField(){return Y`
			<epp-field
				data-testid="name-field"
				type="text"
				.label=${"Device name"}
				.value=${this._draft.name}
				@value-changed=${e=>{e.stopPropagation(),this._update({name:e.detail.value})}}
			></epp-field>
		`}_missingSources(){return this.existingGroup?this.existingGroup.sources.filter(e=>!e.available&&this._draft.sourceMacs.includes(e.mac)).map(e=>({mac:e.mac,name:e.name})):[]}_draftSources(){return this._draft.sourceMacs.map(e=>this.sourcesByMac[e]).filter(e=>Boolean(e))}_canSave(){return""!==this._draft.name.trim()&&this._draft.sourceMacs.length>=1}_update(e){this._draft={...this._draft,...e}}_toggleSource(e,t){t?this._update({sourceMacs:[...this._draft.sourceMacs,e]}):this._update({sourceMacs:this._draft.sourceMacs.filter(t=>t!==e),zone_groups:this._draft.zone_groups.map(t=>({...t,members:t.members.filter(t=>t.mac!==e)})).filter(e=>e.members.length>0),excludedZones:this._draft.excludedZones.filter(t=>t.mac!==e)})}_save(){this.dispatchEvent(new CustomEvent("save",{detail:{id:this._draft.id,name:this._draft.name.trim(),sources:this._draft.sourceMacs,area_id:this._draft.area_id,zone_groups:this._draft.zone_groups,excluded_presence:this._draft.excludedPresence,excluded_zones:this._draft.excludedZones,excluded_zone_groups:this._draft.excludedZoneGroups},bubbles:!0,composed:!0}))}_cancel(){this.dispatchEvent(new CustomEvent("cancel",{bubbles:!0,composed:!0}))}}to.styles=[Me,n`
		/* Fill the device-groups view's bounded .content and pin the Cancel/Save
		   .save-cancel-bar to the bottom while the form scrolls inside .editor-scroll.
		   Fill-height chain: :host -> ha-card -> .card-content -> .editor-scroll
		   (flex columns). Applies at all widths (desktop + mobile). */
		:host {
			display: flex;
			flex-direction: column;
			flex: 1;
			min-height: 0;
		}
		ha-card {
			display: flex;
			flex-direction: column;
			flex: 1;
			min-height: 0;
		}
		.card-content {
			padding: var(--epp-space-4, 16px);
			display: flex;
			flex-direction: column;
			flex: 1;
			min-height: 0;
		}
		/* The form rows live in .editor-scroll, which carries the column layout +
		   16px row gap that .card-content used to apply directly (before .card-content
		   became the fill-height flex parent for the scroll region + pinned actions).
		   .editor-scroll fills the card and scrolls; the .save-cancel-bar footer pins
		   below it with its own top divider. */
		.editor-scroll {
			display: flex;
			flex-direction: column;
			gap: var(--epp-space-4, 16px);
			flex: 1;
			min-height: 0;
			overflow-y: auto;
		}
		.field { display: block; }
		ha-area-picker {
			display: block;
			width: 100%;
		}
		.section h3 {
			margin: 0 0 var(--epp-space-2, 8px) 0;
			font-size: var(--epp-font-md, 15px);
			font-weight: var(--epp-weight-semibold, 600);
		}
		.save-cancel-bar {
			/* Shared chrome (display/justify/align/border-top) is in saveCancelBarStyles.
			   Consistent footer with the editor sidebar / settings Save/Cancel bars:
			   a transparent footer with a 1px top divider. Negative margins break it
			   out of .card-content's 16px padding so the line spans the card width;
			   the buttons re-inset via padding. */
			gap: var(--epp-space-2, 8px);
			flex-shrink: 0;
			margin: 0 calc(-1 * var(--epp-space-4, 16px)) calc(-1 * var(--epp-space-4, 16px));
			padding: var(--epp-space-3, 12px) var(--epp-space-4, 16px);
		}
	`],e([ge({attribute:!1})],to.prototype,"hass",void 0),e([ge({attribute:!1})],to.prototype,"availableDevices",void 0),e([ge({attribute:!1})],to.prototype,"existingGroup",void 0),e([ge({attribute:!1})],to.prototype,"sourcesByMac",void 0),e([Ae()],to.prototype,"_draft",void 0),customElements.define("epp-device-group-editor",to);class io extends he{constructor(){super(...arguments),this.availableDevices=[],this._groups=[],this._editingGroup=null,this._creatingNew=!1,this._editorDirty=!1,this._dialog=null,this._unsub=null}connectedCallback(){super.connectedCallback(),this._unsub=this.controller.onChange(e=>{this._groups=e}),this._groups=this.controller.groups,this.controller.subscribe()}disconnectedCallback(){super.disconnectedCallback(),this._unsub?.()}render(){const e=this._editingGroup||this._creatingNew?this._renderEditor():this._renderList();return Y`${e}${this._renderDialog()}`}_renderEditor(){return Y`
			<div class="content">
				<epp-device-group-editor
					.hass=${this.hass}
					.availableDevices=${this.availableDevices}
					.existingGroup=${this._editingGroup}
					.sourcesByMac=${this._sourcesByMac()}
					@save=${this._handleSave}
					@cancel=${this._handleCancel}
					@dirty-changed=${this._onEditorDirty}
				></epp-device-group-editor>
			</div>
		`}_renderList(){return Y`
			<div class="content">
				<ha-card>
					<div class="card-header">Device Groups</div>
					<div class="card-content">
						<div class="group-list">
							${0===this._groups.length?Y`<p class="empty">No device groups yet.</p>`:this._groups.map(e=>this._renderGroupCard(e))}
						</div>
						<div class="footer">
							<epp-button
								variant="primary"
								data-testid="create-group"
								@click=${()=>{this._creatingNew=!0}}
							>
								Add a device group
							</epp-button>
						</div>
					</div>
				</ha-card>
			</div>
		`}_renderGroupCard(e){const t=e.sources.map(e=>e.name).sort((e,t)=>e.localeCompare(t,void 0,{numeric:!0})).join(", "),i=function(e){const t=[...e.presence.map(e=>({name:Yr[e]??e,kind:"presence",rank:"occupancy"===e?0:1})),...e.zones.map(e=>({name:e.name,kind:"zone",rank:2}))];return t.sort((e,t)=>e.rank-t.rank||e.name.localeCompare(t.name,void 0,{numeric:!0,sensitivity:"base"})),t.map(({name:e,kind:t})=>({name:e,kind:t}))}(e.exposed_entities),s=e.sources.some(e=>!e.available);return Y`
			<epp-card>
				<div class="group-card">
					<div class="group-info">
						<div class="group-name">${e.name}</div>
						${s?Y`<div class="group-warning" data-testid="group-warning">
										<ha-icon icon="mdi:alert"></ha-icon>
										Some source devices no longer exist
									</div>`:J}
						${t?Y`<div class="group-devices">${t}</div>`:J}
						${i.length?Y`<div class="group-sensors">
										${i.map(e=>Y`<span
													class="chip ${"zone"===e.kind?"zone":""}"
													data-testid="sensor-chip"
													>${e.name}</span
												>`)}
									</div>`:J}
					</div>
					<epp-kebab-menu
						.items=${Nr}
						@item-select=${t=>this._onKebab(e,t.detail.id)}
					></epp-kebab-menu>
				</div>
			</epp-card>
		`}_onKebab(e,t){"edit"===t?this._editingGroup=e:"delete"===t&&(this._dialog={kind:"delete",id:e.id})}_onEditorDirty(e){e.stopPropagation(),this._setDirty(e.detail.dirty)}_setDirty(e){e!==this._editorDirty&&(this._editorDirty=e,this.dispatchEvent(new CustomEvent("form-dirty-changed",{detail:{dirty:e},bubbles:!0,composed:!0})))}_closeEditor(){this._setDirty(!1),this._editingGroup=null,this._creatingNew=!1}_renderDialog(){const e=this._dialog,t="delete"===e?.kind?{heading:"Delete device group?",message:"This removes the group and all its helper entities.",confirmLabel:"Delete",danger:!0,hideCancel:!1}:"error"===e?.kind?{heading:e.heading,message:e.message,confirmLabel:"OK",danger:!1,hideCancel:!0}:{heading:"",message:"",confirmLabel:"OK",danger:!1,hideCancel:!1};return Y`<epp-confirm-dialog
			.open=${null!==e}
			.heading=${t.heading}
			.message=${t.message}
			.confirmLabel=${t.confirmLabel}
			.danger=${t.danger}
			.hideCancel=${t.hideCancel}
			@confirm=${this._onDialogConfirm}
			@cancel=${this._onDialogCancel}
		></epp-confirm-dialog>`}_onDialogConfirm(){const e=this._dialog;this._dialog=null,e&&"delete"===e.kind&&this._deleteById(e.id)}_onDialogCancel(){this._dialog=null}_sourcesByMac(){const e={};for(const t of this._groups)for(const i of t.sources)e[i.mac]=i;for(const t of this.controller.candidateSources)e[t.mac]=t;return e}async _handleSave(e){e.stopPropagation();const t=e.detail;try{t.id?await this.controller.update(t):await this.controller.create({name:t.name,sources:t.sources,area_id:t.area_id,zone_groups:t.zone_groups,excluded_presence:t.excluded_presence,excluded_zones:t.excluded_zones,excluded_zone_groups:t.excluded_zone_groups}),this._closeEditor()}catch(e){console.error("Failed to save device group",e),this._dialog={kind:"error",heading:"Save failed",message:e instanceof Error?e.message:String(e)}}}_handleCancel(e){e.stopPropagation(),this._closeEditor()}async _deleteById(e){try{await this.controller.delete(e),this._closeEditor()}catch(e){console.error("Failed to delete device group",e),this._dialog={kind:"error",heading:"Delete failed",message:e instanceof Error?e.message:String(e)}}}}function so(e){if(e)try{e()}catch(e){console.debug("safeUnsub: callback threw (ignored):",e)}}io.styles=[Re,n`
		/* A bounded flex column at all widths: lets EDITOR mode (which reuses
		   .content) fill the height and pin its Cancel/Save. The per-width @media
		   blocks below only tune .content's width cap. */
		:host {
			display: flex;
			flex-direction: column;
			min-height: 0;
			padding: 16px;
		}
		.content {
			max-width: var(--epp-content-max, 720px);
			margin: 0 auto;
		}
		.card-header {
			font-size: var(--epp-font-xl, 18px);
			font-weight: 400;
			line-height: 48px;
			padding: var(--epp-space-2, 8px) var(--epp-space-4, 16px) 0;
			color: var(--ha-card-header-color, var(--primary-text-color, #212121));
		}
		.card-content {
			padding: var(--epp-space-4, 16px);
			display: flex;
			flex-direction: column;
			gap: var(--epp-space-3, 12px);
		}
		.group-list {
			display: flex;
			flex-direction: column;
			gap: var(--epp-space-3, 12px);
		}
		/* epp-card supplies the surface (border/radius/padding); .group-card is the
		   flex row laid out inside its default slot. */
		.group-card {
			display: flex;
			align-items: flex-start;
			gap: var(--epp-space-3, 12px);
		}
		.group-info { flex: 1; min-width: 0; }
		.group-name {
			font-size: var(--epp-font-base, 14px);
			font-weight: var(--epp-weight-semibold, 600);
			color: var(--epp-text, var(--primary-text-color, #212121));
		}
		.group-devices {
			font-size: var(--epp-font-sm, 13px);
			color: var(--epp-text-muted, var(--secondary-text-color, #757575));
			margin-top: var(--epp-space-1, 4px);
		}
		.group-warning {
			display: flex;
			align-items: center;
			gap: 6px;
			margin-top: var(--epp-space-1, 4px);
			font-size: var(--epp-font-sm, 13px);
			color: var(--epp-warning, var(--warning-color, #ff9800));
		}
		.group-warning ha-icon { --mdc-icon-size: 18px; }
		.group-sensors {
			display: flex;
			align-items: baseline;
			flex-wrap: wrap;
			gap: 6px;
			font-size: var(--epp-font-sm, 13px);
			color: var(--epp-text-muted, var(--secondary-text-color, #757575));
			margin-top: 6px;
		}
		.empty {
			color: var(--epp-text-muted, var(--secondary-text-color, #757575));
			text-align: center;
			padding: var(--epp-space-2, 8px) 0;
		}
		.footer {
			display: flex;
			justify-content: flex-end;
			margin-top: var(--epp-space-1, 4px);
		}
		epp-card { display: block; }
		epp-kebab-menu { flex-shrink: 0; margin: -6px -8px -6px 0; }

		/* Mobile: fill the panel height so the editor's Save/Cancel bar can pin to
		   the bottom of the screen while its body scrolls. :host and the .content
		   wrapper become a flex column that fills the height handed down by the
		   panel (.tab-layout > epp-device-groups-view), letting the editor inside
		   establish its own scroll/pin regions. .content drops its 600px reading
		   cap and goes full-width — full-width is fine on a phone. The list mode
		   reuses the same .content, but its single ha-card simply sits at the top
		   and the view scrolls naturally (overflow inherited from .tab-layout), so
		   a long list still scrolls rather than clipping. Placed AFTER the base
		   rules so it wins on source order (mobile @media before base rules go
		   silently dead). */
		@media (max-width: 819px) {
			.content {
				flex: 1;
				min-height: 0;
				display: flex;
				flex-direction: column;
				width: 100%;
				max-width: none;
			}
		}

		/* Desktop: a content-sized card on the grey page (matching the Installed
		   Devices / flasher view), NOT a full-height white sheet. The card sizes to
		   its content and the whole view scrolls if the group list is long; the list
		   is deliberately NOT given its own overflow scroll cap — the whole view
		   scrolling is enough (and the kebab's fixed-position popover escapes any
		   overflow ancestor anyway). .content stays a bounded flex column so EDITOR
		   mode (which reuses it) can fill the height and pin its Cancel/Save; in list
		   mode the card sits at the top of that column with grey below. */
		@media (min-width: 820px) {
			.content {
				flex: 1;
				min-height: 0;
				display: flex;
				flex-direction: column;
				width: 100%;
				box-sizing: border-box;
			}
		}
	`],e([ge({attribute:!1})],io.prototype,"hass",void 0),e([ge({attribute:!1})],io.prototype,"controller",void 0),e([ge({attribute:!1})],io.prototype,"availableDevices",void 0),e([Ae()],io.prototype,"_groups",void 0),e([Ae()],io.prototype,"_editingGroup",void 0),e([Ae()],io.prototype,"_creatingNew",void 0),e([Ae()],io.prototype,"_editorDirty",void 0),e([Ae()],io.prototype,"_dialog",void 0),customElements.define("epp-device-groups-view",io);const ro="eppgrid/subscribe_device_list";class oo{constructor(e){this.devices=[],this.selectedMac="",this.showRoomCalibrationTutorial=!0,this._hass=null,this._reopenAttempts={},this._heatmapEnabled=!1,this._streamAvailability={},this._deviceListReopenPending=!1,this._reconnecting=!1,this._connectionFailed=!1,this._targetsGen=0,this._displayGen=0,this._heatmapGen=0,this._deviceListGen=0,this._sessionGen=0,this._wantDeviceListSub=!1,this._disposed=!1,this._host=e,e.addController(this)}_claimGen(e){const t=++this[e];return{stale:()=>this[e]!==t}}hostConnected(){this._disposed=!1}hostDisconnected(){this._disposed=!0,this.unsubscribeDeviceList(),this.closeDeviceSession()}get hass(){return this._hass}set hass(e){const t=this._hass?.connection;if(this._hass=e,e?.connection&&e.connection!==t&&t){const e=this._wantDeviceListSub;this._unsubDevice=void 0,this._unsubTargets=void 0,this._unsubDisplay=void 0,this._unsubHeatmap=void 0,this._unsubDeviceList=void 0,this._targetRetryTimer&&(clearTimeout(this._targetRetryTimer),this._targetRetryTimer=void 0),this._displayRetryTimer&&(clearTimeout(this._displayRetryTimer),this._displayRetryTimer=void 0),this._heatmapRetryTimer&&(clearTimeout(this._heatmapRetryTimer),this._heatmapRetryTimer=void 0),this._deviceListRetryTimer&&(clearTimeout(this._deviceListRetryTimer),this._deviceListRetryTimer=void 0),this._deviceListReopenPending=!1,this._reopenAttempts[ro]=0,this._targetsGen++,this._displayGen++,this._heatmapGen++,this._deviceListGen++,this._sessionGen++,e&&this.subscribeDeviceList().catch(()=>{})}}get hasDeviceSession(){return!!this._unsubDevice}get reconnecting(){return this._reconnecting}get connectionFailed(){return this._connectionFailed}setShowRoomCalibrationTutorial(e){this.showRoomCalibrationTutorial!==e&&(this.showRoomCalibrationTutorial=e,this._host.requestUpdate())}async loadDevices(){if(!this._hass)return;try{const e=await this._hass.callWS({type:"eppgrid/list_devices"});this.devices=[...e.devices].sort((e,t)=>(e.name||"").localeCompare(t.name||"")),this.setShowRoomCalibrationTutorial(e.show_room_calibration_tutorial??!0)}catch{return this.devices=[],void this._host.requestUpdate()}const e=tr(),t=e&&this.devices.find(t=>t.mac===e);this.selectedMac=t?e:this.devices[0]?.mac??"",this._host.requestUpdate()}async subscribeDeviceList(){if(this._wantDeviceListSub=!0,so(this._unsubDeviceList),this._unsubDeviceList=void 0,!this._hass)return;const e=this._claimGen("_deviceListGen");try{const t=await this._hass.connection.subscribeMessage(e=>{this.setShowRoomCalibrationTutorial(e.show_room_calibration_tutorial??!0),this._applyDeviceList(e.devices??[])},{type:"eppgrid/subscribe_device_list"});if(e.stale())return void so(t);this._unsubDeviceList=t}catch{await this.loadDevices()}}unsubscribeDeviceList(){this._wantDeviceListSub=!1,this._deviceListGen++,this._deviceListRetryTimer&&(clearTimeout(this._deviceListRetryTimer),this._deviceListRetryTimer=void 0),this._deviceListReopenPending=!1,this._reopenAttempts[ro]=0,so(this._unsubDeviceList),this._unsubDeviceList=void 0}_resubscribeDeviceListOnClosed(){this._wantDeviceListSub&&!this._deviceListReopenPending&&(this._deviceListReopenPending=!0,this._retryDeviceListSubscribe())}_retryDeviceListSubscribe(){const e=this._hass?.connection;this.subscribeDeviceList().finally(()=>{if(this._unsubDeviceList)return this._deviceListReopenPending=!1,void(this._reopenAttempts[ro]=0);if(!this._wantDeviceListSub||this._hass?.connection!==e)return void(this._deviceListReopenPending=!1);const t=(this._reopenAttempts[ro]??0)+1;this._reopenAttempts[ro]=t;const i=Math.min(500*2**(t-1),3e4);this._deviceListRetryTimer&&clearTimeout(this._deviceListRetryTimer),this._deviceListRetryTimer=setTimeout(()=>{this._deviceListRetryTimer=void 0,this._hass?.connection===e?this._retryDeviceListSubscribe():this._deviceListReopenPending=!1},i)})}_applyDeviceList(e){const t=this.selectedMac;this.devices=[...e].sort((e,t)=>(e.name||"").localeCompare(t.name||"")),""===t||e.some(e=>e.mac===t)||this.closeDeviceSession();const i=tr();if(this.devices.length>0){const e=i&&this.devices.find(e=>e.mac===i),t=e?i:this.devices[0].mac,s=t!==this.selectedMac&&!!this.selectedMac&&!this.devices.some(e=>e.mac===this.selectedMac)&&(this.isHostDirty?.()??!1);s||(this.selectedMac=t)}else!this.selectedMac&&i&&(this.selectedMac=i);this.onDeviceListChanged?.(),this._host.requestUpdate()}async loadDeviceConfig(e){const t=this._loadConfigInFlight;if(t){if(t.mac===e)return t.promise;if(await t.promise.catch(()=>{}),this._disposed)return null}const i={mac:e,promise:void 0};return i.promise=(async()=>{this._reconnecting=!0,this._host.requestUpdate();try{const t=this._sessionGen;let i=null;try{i=(await this._hass.callWS({type:"eppgrid/get_config",mac:e})).config}catch{}return this._sessionGen!==t||await this.reopenSession(e),i}finally{this._reconnecting=!1,this._loadConfigInFlight===i&&(this._loadConfigInFlight=void 0),this._host.requestUpdate()}})(),this._loadConfigInFlight=i,i.promise}async reopenSession(e){if(!this._hass||!e)return;const t=this._reopenInFlight;if(t){if(t.mac===e)return t.promise;if(await t.promise.catch(()=>{}),this._disposed)return}const i={mac:e,promise:void 0};return i.promise=(async()=>{try{await this.openDeviceSession(e),this._unsubDevice&&this.subscribeTargets(e)}finally{this._reopenInFlight===i&&(this._reopenInFlight=void 0)}})(),this._reopenInFlight=i,i.promise}async openDeviceSession(e){if(this.closeDeviceSession(),!this._hass||!e)return;const t=this._claimGen("_sessionGen");try{const i=await this._hass.connection.subscribeMessage(()=>{},{type:"eppgrid/subscribe_device",mac:e});if(t.stale())return void so(i);this._unsubDevice=i,this._connectionFailed=!1,this._host.requestUpdate()}catch(e){if(t.stale())return;console.warn("Failed to open device session:",e);const i=e;this._connectionFailed="connection_failed"===i?.code||"not_found"===i?.code,this._host.requestUpdate()}}closeDeviceSession(){this._sessionGen++,this.unsubscribeTargets(),this._unsubscribeHeatmap(),so(this._unsubDevice),this._unsubDevice=void 0}subscribeTargets(e){if(this.unsubscribeTargets(),this._streamAvailability={},this._lastReportedAvailable=void 0,!this._hass||!e)return;const t=this._hass.connection;this._subscribeGridTargets(t,e),this.subscribeDisplay(e),this._heatmapEnabled&&this._subscribeHeatmap()}unsubscribeTargets(){this.unsubscribeDisplay(),this._targetsGen++,this._targetRetryTimer&&(clearTimeout(this._targetRetryTimer),this._targetRetryTimer=void 0),this._reopenAttempts["eppgrid/subscribe_grid_targets"]=0,delete this._streamAvailability["eppgrid/subscribe_grid_targets"],so(this._unsubTargets),this._unsubTargets=void 0}_subscribeGridTargets(e,t){this._subscribeStream(e,t,{type:"eppgrid/subscribe_grid_targets",genField:"_targetsGen",timerField:"_targetRetryTimer",unsubField:"_unsubTargets",onEvent:e=>{const t=(e.targets||[]).map(e=>({x:e.x,y:e.y,status:e.status??"inactive",signal:e.signal??0})),i=e.sensors?{occupancy:e.sensors.occupancy??!1,static_presence:e.sensors.static_presence??!1,motion_presence:e.sensors.motion_presence??!1,target_presence:e.sensors.target_presence??!1,mmwave:e.sensors.mmwave??!1,static_state:e.sensors.static_state,motion_state:e.sensors.motion_state,occupancy_state:e.sensors.occupancy_state,illuminance:e.sensors.illuminance??null,temperature:e.sensors.temperature??null,humidity:e.sensors.humidity??null,co2:e.sensors.co2??null}:{occupancy:!1,static_presence:!1,motion_presence:!1,target_presence:!1,mmwave:!1,static_state:void 0,motion_state:void 0,occupancy_state:void 0,illuminance:null,temperature:null,humidity:null,co2:null},s=e.zones?{occupancy:e.zones.occupancy??{},target_counts:e.zones.target_counts??{},frame_count:e.zones.frame_count??0,debug_log:e.zones.debug_log,events:e.zones.events}:null;this.onTargetData?.({targets:t,sensors:i,zones:s})}})}subscribeDisplay(e){this.unsubscribeDisplay(),this._hass&&e&&this._subscribeRawTargets(this._hass.connection,e)}_subscribeRawTargets(e,t){this._subscribeStream(e,t,{type:"eppgrid/subscribe_raw_targets",genField:"_displayGen",timerField:"_displayRetryTimer",unsubField:"_unsubDisplay",onEvent:e=>{const t=(e.targets||[]).map(e=>({raw_x:e.raw_x,raw_y:e.raw_y}));this.onRawTargetData?.(t)}})}_reportStreamAvailability(e,t,i){this._streamAvailability[e]=i;const s=Object.values(this._streamAvailability).some(e=>e);s!==this._lastReportedAvailable&&(this._lastReportedAvailable=s,this.onAvailability?.(t,s))}_subscribeStream(e,t,i,s=1){const r=this._claimGen(i.genField);e.subscribeMessage(s=>{if(!r.stale())return s?.closed?(this._reportStreamAvailability(i.type,t,!1),this._resubscribeDeviceListOnClosed(),void this._reopenStream(e,t,i)):void(s&&"available"in s?this._reportStreamAvailability(i.type,t,!!s.available):i.onEvent(s))},{type:i.type,mac:t,availability:!0}).then(e=>{r.stale()?so(e):(this[i.unsubField]=e,this._reopenAttempts[i.type]=0,this._connectionFailed&&(this._connectionFailed=!1,this._host.requestUpdate()))}).catch(()=>{if(r.stale())return;if((this._reopenAttempts[i.type]??0)>0)return void this._reopenStream(e,t,i);if(s>=5)return void(i.optional||(this._connectionFailed=!0,this._host.requestUpdate()));const o=this[i.timerField];o&&clearTimeout(o),this[i.timerField]=setTimeout(()=>{this[i.timerField]=void 0,this._hass?.connection===e&&this._subscribeStream(e,t,i,s+1)},2e3)})}_reopenStream(e,t,i){const s=this[i.unsubField];this[i.genField]++,so(s),this[i.unsubField]=void 0;const r=(this._reopenAttempts[i.type]??0)+1;this._reopenAttempts[i.type]=r;const o=Math.min(500*2**(r-1),3e4),a=this[i.timerField];a&&clearTimeout(a),this[i.timerField]=setTimeout(()=>{this[i.timerField]=void 0,this._hass?.connection===e&&this._subscribeStream(e,t,i)},o)}unsubscribeDisplay(){this._displayGen++,this._displayRetryTimer&&(clearTimeout(this._displayRetryTimer),this._displayRetryTimer=void 0),this._reopenAttempts["eppgrid/subscribe_raw_targets"]=0,delete this._streamAvailability["eppgrid/subscribe_raw_targets"],so(this._unsubDisplay),this._unsubDisplay=void 0}setHeatmapEnabled(e){this._heatmapEnabled=e,e?this._subscribeHeatmap():this._unsubscribeHeatmap()}_subscribeHeatmap(){this._unsubscribeHeatmap(),this._hass&&this.selectedMac&&this._heatmapEnabled&&this._subscribeStream(this._hass.connection,this.selectedMac,{type:"eppgrid/subscribe_heatmap",genField:"_heatmapGen",timerField:"_heatmapRetryTimer",unsubField:"_unsubHeatmap",optional:!0,onEvent:e=>{this.onHeatmapData?.(e.cells??[])}})}_unsubscribeHeatmap(){this._heatmapGen++,this._heatmapRetryTimer&&(clearTimeout(this._heatmapRetryTimer),this._heatmapRetryTimer=void 0),this._reopenAttempts["eppgrid/subscribe_heatmap"]=0,delete this._streamAvailability["eppgrid/subscribe_heatmap"],so(this._unsubHeatmap),this._unsubHeatmap=void 0}selectDevice(e){this.selectedMac=e,this._connectionFailed=!1,ir(e),this._host.requestUpdate()}}class ao{constructor(e){this._unsub=null,this._listeners=[],this._cache=[],this._candidateSources=[],this._conn=e}get groups(){return this._cache}get candidateSources(){return this._candidateSources}onChange(e){return this._listeners.push(e),()=>{this._listeners=this._listeners.filter(t=>t!==e)}}async subscribe(){this._unsub||(this._unsub=await this._conn.subscribeMessage(e=>{this._cache=e.device_groups,this._candidateSources=e.candidate_sources??[];for(const e of this._listeners)e(this._cache)},{type:"eppgrid/subscribe_device_groups"}))}unsubscribe(){so(this._unsub),this._unsub=null}async create(e){return(await this._conn.sendMessagePromise({type:"eppgrid/create_device_group",name:e.name,sources:e.sources,area_id:e.area_id,zone_groups:e.zone_groups,excluded_presence:e.excluded_presence,excluded_zones:e.excluded_zones,excluded_zone_groups:e.excluded_zone_groups})).device_group}async update(e){return(await this._conn.sendMessagePromise({type:"eppgrid/update_device_group",group_id:e.id,name:e.name,sources:e.sources,area_id:e.area_id,zone_groups:e.zone_groups,excluded_presence:e.excluded_presence,excluded_zones:e.excluded_zones,excluded_zone_groups:e.excluded_zone_groups})).device_group}async delete(e){await this._conn.sendMessagePromise({type:"eppgrid/delete_device_group",group_id:e})}}const no=[73,77,80,82,79,86],lo=no.length+3+255+1;new TextDecoder("utf-8",{fatal:!1});const co=new WeakMap;function ho(e){co.delete(e);try{e.releaseLock()}catch{}}function po(e,t){const i=no.length+1+1+1+t.length+1+1,s=new Uint8Array(i);let r=0;for(const e of no)s[r++]=e;s[r++]=1,s[r++]=e,s[r++]=t.length;for(const e of t)s[r++]=e;let o=0;for(let e=0;e<r;e++)o=o+s[e]&255;return s[r++]=o,s[r]=10,s}function uo(){return po(3,[4,0])}function go(){return po(3,[2,0])}function Ao(e){switch(e.type){case 1:{const t=e.data[0];return`CURRENT_STATE ${2===t?"AUTHORIZED":4===t?"PROVISIONED":`state=0x${t?.toString(16).padStart(2,"0")}`}`}case 2:{const t=e.data[0];return`ERROR_STATE 0x${t?.toString(16).padStart(2,"0")}`}case 3:{const t=e.data[0];return`RPC_COMMAND 0x${t?.toString(16).padStart(2,"0")}`}case 4:{const t=e.data[0],i=2===t?"GET_CURRENT_STATE":3===t?"GET_DEVICE_INFO":4===t?"WIFI_SCAN":1===t?"WIFI_SETTINGS":`cmd=0x${t?.toString(16).padStart(2,"0")}`;if((2===t||1===t)&&e.data.length>=3){const t=e.data[2];if(e.data.length>=3+t){return`RPC_RESULT ${i} url="${(new TextDecoder).decode(e.data.slice(3,3+t))}"`}}return`RPC_RESULT ${i} (${e.data.length} bytes)`}default:return`type=0x${e.type.toString(16).padStart(2,"0")} (${e.data.length} bytes)`}}function _o(e){const t=[],i=no.length,s=no[0];let r=e.indexOf(s);if(r<0)return{packets:t,consumed:0};let o=0;for(;r>=0&&r<=e.length-i;){let a=!0;for(let t=0;t<i;t++)if(e[r+t]!==no[t]){a=!1;break}if(!a){r=e.indexOf(s,r+1);continue}const n=r+i;if(n+3>=e.length)break;const l=e[n+1],c=e[n+2],h=n+3+c+1;if(h>e.length)break;let d=0;for(let t=r;t<h-1;t++)d=d+e[t]&255;if(d!==e[h-1]){r=e.indexOf(s,r+1);continue}const p=e.slice(n+3,n+3+c);t.push({type:l,data:p}),r=h,r<e.length&&10===e[r]&&r++,o=r,r=e.indexOf(s,r)}return{packets:t,consumed:o}}async function fo(e,t){await e.write(t)}async function mo(e,t,i){const s=i??[],r=Date.now()+t,o=Symbol();for(;Date.now()<r;){const t=r-Date.now();if(t<=0)break;let i,a,n=co.get(e);n||(n=e.read(),co.set(e,n));try{a=await Promise.race([n,new Promise(e=>{i=setTimeout(()=>e(o),t)})])}catch(t){throw co.delete(e),t}finally{clearTimeout(i)}if(a===o)break;co.delete(e);const l=a;if(l.value){for(let e=0;e<l.value.length;e++)s.push(l.value[e]);const{packets:e,consumed:t}=_o(new Uint8Array(s));if(e.length>0){for(const t of e)console.debug(`[improv] ${Ao(t)}`);return s.splice(0,t),{packets:e,buffer:s}}wo(s)}if(l.done)throw Object.assign(new Error("serial port closed"),{errorKey:"flasher.errors.port_closed"})}throw Object.assign(new Error("timeout"),{errorKey:"flasher.errors.timeout"})}function wo(e){if(e.length<=lo)return;const t=e.length-lo;let i=e.length;for(let s=t;s<e.length;s++){if(e[s]!==no[0])continue;let t=!0;for(let i=1;i<no.length&&s+i<e.length;i++)if(e[s+i]!==no[i]){t=!1;break}if(t){i=s;break}}e.splice(0,i)}function vo(e){if(0===e.length)return null;const t=new TextDecoder;let i=0;const s=(s=Number.POSITIVE_INFINITY)=>{if(i>=e.length)return null;const r=e[i++];if(i+r>e.length)return null;const o=Math.min(r,s),a=t.decode(e.slice(i,i+o));return i+=r,a},r=s(32);if(null===r)return null;const o=s();if(null===o)return null;const a=s();if(null===a)return null;const n=Number.parseInt(o,10);if(Number.isNaN(n))return null;return{ssid:r.replace(/[\x00-\x1f\x7f]/g,""),rssi:n,authRequired:"YES"===a}}class bo extends Error{}
/*! pako 2.1.0 https://github.com/nodeca/pako @license (MIT AND Zlib) */function Eo(e){let t=e.length;for(;--t>=0;)e[t]=0}const yo=256,Co=286,xo=30,Bo=15,So=new Uint8Array([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0]),Io=new Uint8Array([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13]),Do=new Uint8Array([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7]),Ro=new Uint8Array([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]),Mo=new Array(576);Eo(Mo);const ko=new Array(60);Eo(ko);const To=new Array(512);Eo(To);const Fo=new Array(256);Eo(Fo);const Po=new Array(29);Eo(Po);const zo=new Array(xo);function Uo(e,t,i,s,r){this.static_tree=e,this.extra_bits=t,this.extra_base=i,this.elems=s,this.max_length=r,this.has_stree=e&&e.length}let Oo,Ho,Qo;function Go(e,t){this.dyn_tree=e,this.max_code=0,this.stat_desc=t}Eo(zo);const Lo=e=>e<256?To[e]:To[256+(e>>>7)],$o=(e,t)=>{e.pending_buf[e.pending++]=255&t,e.pending_buf[e.pending++]=t>>>8&255},No=(e,t,i)=>{e.bi_valid>16-i?(e.bi_buf|=t<<e.bi_valid&65535,$o(e,e.bi_buf),e.bi_buf=t>>16-e.bi_valid,e.bi_valid+=i-16):(e.bi_buf|=t<<e.bi_valid&65535,e.bi_valid+=i)},Yo=(e,t,i)=>{No(e,i[2*t],i[2*t+1])},Ko=(e,t)=>{let i=0;do{i|=1&e,e>>>=1,i<<=1}while(--t>0);return i>>>1},Wo=(e,t,i)=>{const s=new Array(16);let r,o,a=0;for(r=1;r<=Bo;r++)a=a+i[r-1]<<1,s[r]=a;for(o=0;o<=t;o++){let t=e[2*o+1];0!==t&&(e[2*o]=Ko(s[t]++,t))}},Jo=e=>{let t;for(t=0;t<Co;t++)e.dyn_ltree[2*t]=0;for(t=0;t<xo;t++)e.dyn_dtree[2*t]=0;for(t=0;t<19;t++)e.bl_tree[2*t]=0;e.dyn_ltree[512]=1,e.opt_len=e.static_len=0,e.sym_next=e.matches=0},jo=e=>{e.bi_valid>8?$o(e,e.bi_buf):e.bi_valid>0&&(e.pending_buf[e.pending++]=e.bi_buf),e.bi_buf=0,e.bi_valid=0},Zo=(e,t,i,s)=>{const r=2*t,o=2*i;return e[r]<e[o]||e[r]===e[o]&&s[t]<=s[i]},Vo=(e,t,i)=>{const s=e.heap[i];let r=i<<1;for(;r<=e.heap_len&&(r<e.heap_len&&Zo(t,e.heap[r+1],e.heap[r],e.depth)&&r++,!Zo(t,s,e.heap[r],e.depth));)e.heap[i]=e.heap[r],i=r,r<<=1;e.heap[i]=s},Xo=(e,t,i)=>{let s,r,o,a,n=0;if(0!==e.sym_next)do{s=255&e.pending_buf[e.sym_buf+n++],s+=(255&e.pending_buf[e.sym_buf+n++])<<8,r=e.pending_buf[e.sym_buf+n++],0===s?Yo(e,r,t):(o=Fo[r],Yo(e,o+yo+1,t),a=So[o],0!==a&&(r-=Po[o],No(e,r,a)),s--,o=Lo(s),Yo(e,o,i),a=Io[o],0!==a&&(s-=zo[o],No(e,s,a)))}while(n<e.sym_next);Yo(e,256,t)},qo=(e,t)=>{const i=t.dyn_tree,s=t.stat_desc.static_tree,r=t.stat_desc.has_stree,o=t.stat_desc.elems;let a,n,l,c=-1;for(e.heap_len=0,e.heap_max=573,a=0;a<o;a++)0!==i[2*a]?(e.heap[++e.heap_len]=c=a,e.depth[a]=0):i[2*a+1]=0;for(;e.heap_len<2;)l=e.heap[++e.heap_len]=c<2?++c:0,i[2*l]=1,e.depth[l]=0,e.opt_len--,r&&(e.static_len-=s[2*l+1]);for(t.max_code=c,a=e.heap_len>>1;a>=1;a--)Vo(e,i,a);l=o;do{a=e.heap[1],e.heap[1]=e.heap[e.heap_len--],Vo(e,i,1),n=e.heap[1],e.heap[--e.heap_max]=a,e.heap[--e.heap_max]=n,i[2*l]=i[2*a]+i[2*n],e.depth[l]=(e.depth[a]>=e.depth[n]?e.depth[a]:e.depth[n])+1,i[2*a+1]=i[2*n+1]=l,e.heap[1]=l++,Vo(e,i,1)}while(e.heap_len>=2);e.heap[--e.heap_max]=e.heap[1],((e,t)=>{const i=t.dyn_tree,s=t.max_code,r=t.stat_desc.static_tree,o=t.stat_desc.has_stree,a=t.stat_desc.extra_bits,n=t.stat_desc.extra_base,l=t.stat_desc.max_length;let c,h,d,p,u,g,A=0;for(p=0;p<=Bo;p++)e.bl_count[p]=0;for(i[2*e.heap[e.heap_max]+1]=0,c=e.heap_max+1;c<573;c++)h=e.heap[c],p=i[2*i[2*h+1]+1]+1,p>l&&(p=l,A++),i[2*h+1]=p,h>s||(e.bl_count[p]++,u=0,h>=n&&(u=a[h-n]),g=i[2*h],e.opt_len+=g*(p+u),o&&(e.static_len+=g*(r[2*h+1]+u)));if(0!==A){do{for(p=l-1;0===e.bl_count[p];)p--;e.bl_count[p]--,e.bl_count[p+1]+=2,e.bl_count[l]--,A-=2}while(A>0);for(p=l;0!==p;p--)for(h=e.bl_count[p];0!==h;)d=e.heap[--c],d>s||(i[2*d+1]!==p&&(e.opt_len+=(p-i[2*d+1])*i[2*d],i[2*d+1]=p),h--)}})(e,t),Wo(i,c,e.bl_count)},ea=(e,t,i)=>{let s,r,o=-1,a=t[1],n=0,l=7,c=4;for(0===a&&(l=138,c=3),t[2*(i+1)+1]=65535,s=0;s<=i;s++)r=a,a=t[2*(s+1)+1],++n<l&&r===a||(n<c?e.bl_tree[2*r]+=n:0!==r?(r!==o&&e.bl_tree[2*r]++,e.bl_tree[32]++):n<=10?e.bl_tree[34]++:e.bl_tree[36]++,n=0,o=r,0===a?(l=138,c=3):r===a?(l=6,c=3):(l=7,c=4))},ta=(e,t,i)=>{let s,r,o=-1,a=t[1],n=0,l=7,c=4;for(0===a&&(l=138,c=3),s=0;s<=i;s++)if(r=a,a=t[2*(s+1)+1],!(++n<l&&r===a)){if(n<c)do{Yo(e,r,e.bl_tree)}while(0!==--n);else 0!==r?(r!==o&&(Yo(e,r,e.bl_tree),n--),Yo(e,16,e.bl_tree),No(e,n-3,2)):n<=10?(Yo(e,17,e.bl_tree),No(e,n-3,3)):(Yo(e,18,e.bl_tree),No(e,n-11,7));n=0,o=r,0===a?(l=138,c=3):r===a?(l=6,c=3):(l=7,c=4)}};let ia=!1;const sa=(e,t,i,s)=>{No(e,0+(s?1:0),3),jo(e),$o(e,i),$o(e,~i),i&&e.pending_buf.set(e.window.subarray(t,t+i),e.pending),e.pending+=i};var ra=e=>{ia||((()=>{let e,t,i,s,r;const o=new Array(16);for(i=0,s=0;s<28;s++)for(Po[s]=i,e=0;e<1<<So[s];e++)Fo[i++]=s;for(Fo[i-1]=s,r=0,s=0;s<16;s++)for(zo[s]=r,e=0;e<1<<Io[s];e++)To[r++]=s;for(r>>=7;s<xo;s++)for(zo[s]=r<<7,e=0;e<1<<Io[s]-7;e++)To[256+r++]=s;for(t=0;t<=Bo;t++)o[t]=0;for(e=0;e<=143;)Mo[2*e+1]=8,e++,o[8]++;for(;e<=255;)Mo[2*e+1]=9,e++,o[9]++;for(;e<=279;)Mo[2*e+1]=7,e++,o[7]++;for(;e<=287;)Mo[2*e+1]=8,e++,o[8]++;for(Wo(Mo,287,o),e=0;e<xo;e++)ko[2*e+1]=5,ko[2*e]=Ko(e,5);Oo=new Uo(Mo,So,257,Co,Bo),Ho=new Uo(ko,Io,0,xo,Bo),Qo=new Uo(new Array(0),Do,0,19,7)})(),ia=!0),e.l_desc=new Go(e.dyn_ltree,Oo),e.d_desc=new Go(e.dyn_dtree,Ho),e.bl_desc=new Go(e.bl_tree,Qo),e.bi_buf=0,e.bi_valid=0,Jo(e)},oa=(e,t,i,s)=>{let r,o,a=0;e.level>0?(2===e.strm.data_type&&(e.strm.data_type=(e=>{let t,i=4093624447;for(t=0;t<=31;t++,i>>>=1)if(1&i&&0!==e.dyn_ltree[2*t])return 0;if(0!==e.dyn_ltree[18]||0!==e.dyn_ltree[20]||0!==e.dyn_ltree[26])return 1;for(t=32;t<yo;t++)if(0!==e.dyn_ltree[2*t])return 1;return 0})(e)),qo(e,e.l_desc),qo(e,e.d_desc),a=(e=>{let t;for(ea(e,e.dyn_ltree,e.l_desc.max_code),ea(e,e.dyn_dtree,e.d_desc.max_code),qo(e,e.bl_desc),t=18;t>=3&&0===e.bl_tree[2*Ro[t]+1];t--);return e.opt_len+=3*(t+1)+5+5+4,t})(e),r=e.opt_len+3+7>>>3,o=e.static_len+3+7>>>3,o<=r&&(r=o)):r=o=i+5,i+4<=r&&-1!==t?sa(e,t,i,s):4===e.strategy||o===r?(No(e,2+(s?1:0),3),Xo(e,Mo,ko)):(No(e,4+(s?1:0),3),((e,t,i,s)=>{let r;for(No(e,t-257,5),No(e,i-1,5),No(e,s-4,4),r=0;r<s;r++)No(e,e.bl_tree[2*Ro[r]+1],3);ta(e,e.dyn_ltree,t-1),ta(e,e.dyn_dtree,i-1)})(e,e.l_desc.max_code+1,e.d_desc.max_code+1,a+1),Xo(e,e.dyn_ltree,e.dyn_dtree)),Jo(e),s&&jo(e)},aa=(e,t,i)=>(e.pending_buf[e.sym_buf+e.sym_next++]=t,e.pending_buf[e.sym_buf+e.sym_next++]=t>>8,e.pending_buf[e.sym_buf+e.sym_next++]=i,0===t?e.dyn_ltree[2*i]++:(e.matches++,t--,e.dyn_ltree[2*(Fo[i]+yo+1)]++,e.dyn_dtree[2*Lo(t)]++),e.sym_next===e.sym_end),na=e=>{No(e,2,3),Yo(e,256,Mo),(e=>{16===e.bi_valid?($o(e,e.bi_buf),e.bi_buf=0,e.bi_valid=0):e.bi_valid>=8&&(e.pending_buf[e.pending++]=255&e.bi_buf,e.bi_buf>>=8,e.bi_valid-=8)})(e)},la={_tr_init:ra,_tr_stored_block:sa,_tr_flush_block:oa,_tr_tally:aa,_tr_align:na};var ca=(e,t,i,s)=>{let r=65535&e,o=e>>>16&65535,a=0;for(;0!==i;){a=i>2e3?2e3:i,i-=a;do{r=r+t[s++]|0,o=o+r|0}while(--a);r%=65521,o%=65521}return r|o<<16};const ha=new Uint32Array((()=>{let e,t=[];for(var i=0;i<256;i++){e=i;for(var s=0;s<8;s++)e=1&e?3988292384^e>>>1:e>>>1;t[i]=e}return t})());var da=(e,t,i,s)=>{const r=ha,o=s+i;e^=-1;for(let i=s;i<o;i++)e=e>>>8^r[255&(e^t[i])];return-1^e},pa={2:"need dictionary",1:"stream end",0:"","-1":"file error","-2":"stream error","-3":"data error","-4":"insufficient memory","-5":"buffer error","-6":"incompatible version"},ua={Z_NO_FLUSH:0,Z_PARTIAL_FLUSH:1,Z_SYNC_FLUSH:2,Z_FULL_FLUSH:3,Z_FINISH:4,Z_BLOCK:5,Z_TREES:6,Z_OK:0,Z_STREAM_END:1,Z_NEED_DICT:2,Z_STREAM_ERROR:-2,Z_DATA_ERROR:-3,Z_MEM_ERROR:-4,Z_BUF_ERROR:-5,Z_DEFAULT_COMPRESSION:-1,Z_FILTERED:1,Z_HUFFMAN_ONLY:2,Z_RLE:3,Z_FIXED:4,Z_DEFAULT_STRATEGY:0,Z_UNKNOWN:2,Z_DEFLATED:8};const{_tr_init:ga,_tr_stored_block:Aa,_tr_flush_block:_a,_tr_tally:fa,_tr_align:ma}=la,{Z_NO_FLUSH:wa,Z_PARTIAL_FLUSH:va,Z_FULL_FLUSH:ba,Z_FINISH:Ea,Z_BLOCK:ya,Z_OK:Ca,Z_STREAM_END:xa,Z_STREAM_ERROR:Ba,Z_DATA_ERROR:Sa,Z_BUF_ERROR:Ia,Z_DEFAULT_COMPRESSION:Da,Z_FILTERED:Ra,Z_HUFFMAN_ONLY:Ma,Z_RLE:ka,Z_FIXED:Ta,Z_DEFAULT_STRATEGY:Fa,Z_UNKNOWN:Pa,Z_DEFLATED:za}=ua,Ua=258,Oa=262,Ha=42,Qa=113,Ga=666,La=(e,t)=>(e.msg=pa[t],t),$a=e=>2*e-(e>4?9:0),Na=e=>{let t=e.length;for(;--t>=0;)e[t]=0},Ya=e=>{let t,i,s,r=e.w_size;t=e.hash_size,s=t;do{i=e.head[--s],e.head[s]=i>=r?i-r:0}while(--t);t=r,s=t;do{i=e.prev[--s],e.prev[s]=i>=r?i-r:0}while(--t)};let Ka=(e,t,i)=>(t<<e.hash_shift^i)&e.hash_mask;const Wa=e=>{const t=e.state;let i=t.pending;i>e.avail_out&&(i=e.avail_out),0!==i&&(e.output.set(t.pending_buf.subarray(t.pending_out,t.pending_out+i),e.next_out),e.next_out+=i,t.pending_out+=i,e.total_out+=i,e.avail_out-=i,t.pending-=i,0===t.pending&&(t.pending_out=0))},Ja=(e,t)=>{_a(e,e.block_start>=0?e.block_start:-1,e.strstart-e.block_start,t),e.block_start=e.strstart,Wa(e.strm)},ja=(e,t)=>{e.pending_buf[e.pending++]=t},Za=(e,t)=>{e.pending_buf[e.pending++]=t>>>8&255,e.pending_buf[e.pending++]=255&t},Va=(e,t,i,s)=>{let r=e.avail_in;return r>s&&(r=s),0===r?0:(e.avail_in-=r,t.set(e.input.subarray(e.next_in,e.next_in+r),i),1===e.state.wrap?e.adler=ca(e.adler,t,r,i):2===e.state.wrap&&(e.adler=da(e.adler,t,r,i)),e.next_in+=r,e.total_in+=r,r)},Xa=(e,t)=>{let i,s,r=e.max_chain_length,o=e.strstart,a=e.prev_length,n=e.nice_match;const l=e.strstart>e.w_size-Oa?e.strstart-(e.w_size-Oa):0,c=e.window,h=e.w_mask,d=e.prev,p=e.strstart+Ua;let u=c[o+a-1],g=c[o+a];e.prev_length>=e.good_match&&(r>>=2),n>e.lookahead&&(n=e.lookahead);do{if(i=t,c[i+a]===g&&c[i+a-1]===u&&c[i]===c[o]&&c[++i]===c[o+1]){o+=2,i++;do{}while(c[++o]===c[++i]&&c[++o]===c[++i]&&c[++o]===c[++i]&&c[++o]===c[++i]&&c[++o]===c[++i]&&c[++o]===c[++i]&&c[++o]===c[++i]&&c[++o]===c[++i]&&o<p);if(s=Ua-(p-o),o=p-Ua,s>a){if(e.match_start=t,a=s,s>=n)break;u=c[o+a-1],g=c[o+a]}}}while((t=d[t&h])>l&&0!==--r);return a<=e.lookahead?a:e.lookahead},qa=e=>{const t=e.w_size;let i,s,r;do{if(s=e.window_size-e.lookahead-e.strstart,e.strstart>=t+(t-Oa)&&(e.window.set(e.window.subarray(t,t+t-s),0),e.match_start-=t,e.strstart-=t,e.block_start-=t,e.insert>e.strstart&&(e.insert=e.strstart),Ya(e),s+=t),0===e.strm.avail_in)break;if(i=Va(e.strm,e.window,e.strstart+e.lookahead,s),e.lookahead+=i,e.lookahead+e.insert>=3)for(r=e.strstart-e.insert,e.ins_h=e.window[r],e.ins_h=Ka(e,e.ins_h,e.window[r+1]);e.insert&&(e.ins_h=Ka(e,e.ins_h,e.window[r+3-1]),e.prev[r&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=r,r++,e.insert--,!(e.lookahead+e.insert<3)););}while(e.lookahead<Oa&&0!==e.strm.avail_in)},en=(e,t)=>{let i,s,r,o=e.pending_buf_size-5>e.w_size?e.w_size:e.pending_buf_size-5,a=0,n=e.strm.avail_in;do{if(i=65535,r=e.bi_valid+42>>3,e.strm.avail_out<r)break;if(r=e.strm.avail_out-r,s=e.strstart-e.block_start,i>s+e.strm.avail_in&&(i=s+e.strm.avail_in),i>r&&(i=r),i<o&&(0===i&&t!==Ea||t===wa||i!==s+e.strm.avail_in))break;a=t===Ea&&i===s+e.strm.avail_in?1:0,Aa(e,0,0,a),e.pending_buf[e.pending-4]=i,e.pending_buf[e.pending-3]=i>>8,e.pending_buf[e.pending-2]=~i,e.pending_buf[e.pending-1]=~i>>8,Wa(e.strm),s&&(s>i&&(s=i),e.strm.output.set(e.window.subarray(e.block_start,e.block_start+s),e.strm.next_out),e.strm.next_out+=s,e.strm.avail_out-=s,e.strm.total_out+=s,e.block_start+=s,i-=s),i&&(Va(e.strm,e.strm.output,e.strm.next_out,i),e.strm.next_out+=i,e.strm.avail_out-=i,e.strm.total_out+=i)}while(0===a);return n-=e.strm.avail_in,n&&(n>=e.w_size?(e.matches=2,e.window.set(e.strm.input.subarray(e.strm.next_in-e.w_size,e.strm.next_in),0),e.strstart=e.w_size,e.insert=e.strstart):(e.window_size-e.strstart<=n&&(e.strstart-=e.w_size,e.window.set(e.window.subarray(e.w_size,e.w_size+e.strstart),0),e.matches<2&&e.matches++,e.insert>e.strstart&&(e.insert=e.strstart)),e.window.set(e.strm.input.subarray(e.strm.next_in-n,e.strm.next_in),e.strstart),e.strstart+=n,e.insert+=n>e.w_size-e.insert?e.w_size-e.insert:n),e.block_start=e.strstart),e.high_water<e.strstart&&(e.high_water=e.strstart),a?4:t!==wa&&t!==Ea&&0===e.strm.avail_in&&e.strstart===e.block_start?2:(r=e.window_size-e.strstart,e.strm.avail_in>r&&e.block_start>=e.w_size&&(e.block_start-=e.w_size,e.strstart-=e.w_size,e.window.set(e.window.subarray(e.w_size,e.w_size+e.strstart),0),e.matches<2&&e.matches++,r+=e.w_size,e.insert>e.strstart&&(e.insert=e.strstart)),r>e.strm.avail_in&&(r=e.strm.avail_in),r&&(Va(e.strm,e.window,e.strstart,r),e.strstart+=r,e.insert+=r>e.w_size-e.insert?e.w_size-e.insert:r),e.high_water<e.strstart&&(e.high_water=e.strstart),r=e.bi_valid+42>>3,r=e.pending_buf_size-r>65535?65535:e.pending_buf_size-r,o=r>e.w_size?e.w_size:r,s=e.strstart-e.block_start,(s>=o||(s||t===Ea)&&t!==wa&&0===e.strm.avail_in&&s<=r)&&(i=s>r?r:s,a=t===Ea&&0===e.strm.avail_in&&i===s?1:0,Aa(e,e.block_start,i,a),e.block_start+=i,Wa(e.strm)),a?3:1)},tn=(e,t)=>{let i,s;for(;;){if(e.lookahead<Oa){if(qa(e),e.lookahead<Oa&&t===wa)return 1;if(0===e.lookahead)break}if(i=0,e.lookahead>=3&&(e.ins_h=Ka(e,e.ins_h,e.window[e.strstart+3-1]),i=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart),0!==i&&e.strstart-i<=e.w_size-Oa&&(e.match_length=Xa(e,i)),e.match_length>=3)if(s=fa(e,e.strstart-e.match_start,e.match_length-3),e.lookahead-=e.match_length,e.match_length<=e.max_lazy_match&&e.lookahead>=3){e.match_length--;do{e.strstart++,e.ins_h=Ka(e,e.ins_h,e.window[e.strstart+3-1]),i=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart}while(0!==--e.match_length);e.strstart++}else e.strstart+=e.match_length,e.match_length=0,e.ins_h=e.window[e.strstart],e.ins_h=Ka(e,e.ins_h,e.window[e.strstart+1]);else s=fa(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++;if(s&&(Ja(e,!1),0===e.strm.avail_out))return 1}return e.insert=e.strstart<2?e.strstart:2,t===Ea?(Ja(e,!0),0===e.strm.avail_out?3:4):e.sym_next&&(Ja(e,!1),0===e.strm.avail_out)?1:2},sn=(e,t)=>{let i,s,r;for(;;){if(e.lookahead<Oa){if(qa(e),e.lookahead<Oa&&t===wa)return 1;if(0===e.lookahead)break}if(i=0,e.lookahead>=3&&(e.ins_h=Ka(e,e.ins_h,e.window[e.strstart+3-1]),i=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart),e.prev_length=e.match_length,e.prev_match=e.match_start,e.match_length=2,0!==i&&e.prev_length<e.max_lazy_match&&e.strstart-i<=e.w_size-Oa&&(e.match_length=Xa(e,i),e.match_length<=5&&(e.strategy===Ra||3===e.match_length&&e.strstart-e.match_start>4096)&&(e.match_length=2)),e.prev_length>=3&&e.match_length<=e.prev_length){r=e.strstart+e.lookahead-3,s=fa(e,e.strstart-1-e.prev_match,e.prev_length-3),e.lookahead-=e.prev_length-1,e.prev_length-=2;do{++e.strstart<=r&&(e.ins_h=Ka(e,e.ins_h,e.window[e.strstart+3-1]),i=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart)}while(0!==--e.prev_length);if(e.match_available=0,e.match_length=2,e.strstart++,s&&(Ja(e,!1),0===e.strm.avail_out))return 1}else if(e.match_available){if(s=fa(e,0,e.window[e.strstart-1]),s&&Ja(e,!1),e.strstart++,e.lookahead--,0===e.strm.avail_out)return 1}else e.match_available=1,e.strstart++,e.lookahead--}return e.match_available&&(s=fa(e,0,e.window[e.strstart-1]),e.match_available=0),e.insert=e.strstart<2?e.strstart:2,t===Ea?(Ja(e,!0),0===e.strm.avail_out?3:4):e.sym_next&&(Ja(e,!1),0===e.strm.avail_out)?1:2};function rn(e,t,i,s,r){this.good_length=e,this.max_lazy=t,this.nice_length=i,this.max_chain=s,this.func=r}const on=[new rn(0,0,0,0,en),new rn(4,4,8,4,tn),new rn(4,5,16,8,tn),new rn(4,6,32,32,tn),new rn(4,4,16,16,sn),new rn(8,16,32,32,sn),new rn(8,16,128,128,sn),new rn(8,32,128,256,sn),new rn(32,128,258,1024,sn),new rn(32,258,258,4096,sn)];function an(){this.strm=null,this.status=0,this.pending_buf=null,this.pending_buf_size=0,this.pending_out=0,this.pending=0,this.wrap=0,this.gzhead=null,this.gzindex=0,this.method=za,this.last_flush=-1,this.w_size=0,this.w_bits=0,this.w_mask=0,this.window=null,this.window_size=0,this.prev=null,this.head=null,this.ins_h=0,this.hash_size=0,this.hash_bits=0,this.hash_mask=0,this.hash_shift=0,this.block_start=0,this.match_length=0,this.prev_match=0,this.match_available=0,this.strstart=0,this.match_start=0,this.lookahead=0,this.prev_length=0,this.max_chain_length=0,this.max_lazy_match=0,this.level=0,this.strategy=0,this.good_match=0,this.nice_match=0,this.dyn_ltree=new Uint16Array(1146),this.dyn_dtree=new Uint16Array(122),this.bl_tree=new Uint16Array(78),Na(this.dyn_ltree),Na(this.dyn_dtree),Na(this.bl_tree),this.l_desc=null,this.d_desc=null,this.bl_desc=null,this.bl_count=new Uint16Array(16),this.heap=new Uint16Array(573),Na(this.heap),this.heap_len=0,this.heap_max=0,this.depth=new Uint16Array(573),Na(this.depth),this.sym_buf=0,this.lit_bufsize=0,this.sym_next=0,this.sym_end=0,this.opt_len=0,this.static_len=0,this.matches=0,this.insert=0,this.bi_buf=0,this.bi_valid=0}const nn=e=>{if(!e)return 1;const t=e.state;return!t||t.strm!==e||t.status!==Ha&&57!==t.status&&69!==t.status&&73!==t.status&&91!==t.status&&103!==t.status&&t.status!==Qa&&t.status!==Ga?1:0},ln=e=>{if(nn(e))return La(e,Ba);e.total_in=e.total_out=0,e.data_type=Pa;const t=e.state;return t.pending=0,t.pending_out=0,t.wrap<0&&(t.wrap=-t.wrap),t.status=2===t.wrap?57:t.wrap?Ha:Qa,e.adler=2===t.wrap?0:1,t.last_flush=-2,ga(t),Ca},cn=e=>{const t=ln(e);return t===Ca&&(e=>{e.window_size=2*e.w_size,Na(e.head),e.max_lazy_match=on[e.level].max_lazy,e.good_match=on[e.level].good_length,e.nice_match=on[e.level].nice_length,e.max_chain_length=on[e.level].max_chain,e.strstart=0,e.block_start=0,e.lookahead=0,e.insert=0,e.match_length=e.prev_length=2,e.match_available=0,e.ins_h=0})(e.state),t},hn=(e,t,i,s,r,o)=>{if(!e)return Ba;let a=1;if(t===Da&&(t=6),s<0?(a=0,s=-s):s>15&&(a=2,s-=16),r<1||r>9||i!==za||s<8||s>15||t<0||t>9||o<0||o>Ta||8===s&&1!==a)return La(e,Ba);8===s&&(s=9);const n=new an;return e.state=n,n.strm=e,n.status=Ha,n.wrap=a,n.gzhead=null,n.w_bits=s,n.w_size=1<<n.w_bits,n.w_mask=n.w_size-1,n.hash_bits=r+7,n.hash_size=1<<n.hash_bits,n.hash_mask=n.hash_size-1,n.hash_shift=~~((n.hash_bits+3-1)/3),n.window=new Uint8Array(2*n.w_size),n.head=new Uint16Array(n.hash_size),n.prev=new Uint16Array(n.w_size),n.lit_bufsize=1<<r+6,n.pending_buf_size=4*n.lit_bufsize,n.pending_buf=new Uint8Array(n.pending_buf_size),n.sym_buf=n.lit_bufsize,n.sym_end=3*(n.lit_bufsize-1),n.level=t,n.strategy=o,n.method=i,cn(e)};var dn=(e,t)=>{if(nn(e)||t>ya||t<0)return e?La(e,Ba):Ba;const i=e.state;if(!e.output||0!==e.avail_in&&!e.input||i.status===Ga&&t!==Ea)return La(e,0===e.avail_out?Ia:Ba);const s=i.last_flush;if(i.last_flush=t,0!==i.pending){if(Wa(e),0===e.avail_out)return i.last_flush=-1,Ca}else if(0===e.avail_in&&$a(t)<=$a(s)&&t!==Ea)return La(e,Ia);if(i.status===Ga&&0!==e.avail_in)return La(e,Ia);if(i.status===Ha&&0===i.wrap&&(i.status=Qa),i.status===Ha){let t=za+(i.w_bits-8<<4)<<8,s=-1;if(s=i.strategy>=Ma||i.level<2?0:i.level<6?1:6===i.level?2:3,t|=s<<6,0!==i.strstart&&(t|=32),t+=31-t%31,Za(i,t),0!==i.strstart&&(Za(i,e.adler>>>16),Za(i,65535&e.adler)),e.adler=1,i.status=Qa,Wa(e),0!==i.pending)return i.last_flush=-1,Ca}if(57===i.status)if(e.adler=0,ja(i,31),ja(i,139),ja(i,8),i.gzhead)ja(i,(i.gzhead.text?1:0)+(i.gzhead.hcrc?2:0)+(i.gzhead.extra?4:0)+(i.gzhead.name?8:0)+(i.gzhead.comment?16:0)),ja(i,255&i.gzhead.time),ja(i,i.gzhead.time>>8&255),ja(i,i.gzhead.time>>16&255),ja(i,i.gzhead.time>>24&255),ja(i,9===i.level?2:i.strategy>=Ma||i.level<2?4:0),ja(i,255&i.gzhead.os),i.gzhead.extra&&i.gzhead.extra.length&&(ja(i,255&i.gzhead.extra.length),ja(i,i.gzhead.extra.length>>8&255)),i.gzhead.hcrc&&(e.adler=da(e.adler,i.pending_buf,i.pending,0)),i.gzindex=0,i.status=69;else if(ja(i,0),ja(i,0),ja(i,0),ja(i,0),ja(i,0),ja(i,9===i.level?2:i.strategy>=Ma||i.level<2?4:0),ja(i,3),i.status=Qa,Wa(e),0!==i.pending)return i.last_flush=-1,Ca;if(69===i.status){if(i.gzhead.extra){let t=i.pending,s=(65535&i.gzhead.extra.length)-i.gzindex;for(;i.pending+s>i.pending_buf_size;){let r=i.pending_buf_size-i.pending;if(i.pending_buf.set(i.gzhead.extra.subarray(i.gzindex,i.gzindex+r),i.pending),i.pending=i.pending_buf_size,i.gzhead.hcrc&&i.pending>t&&(e.adler=da(e.adler,i.pending_buf,i.pending-t,t)),i.gzindex+=r,Wa(e),0!==i.pending)return i.last_flush=-1,Ca;t=0,s-=r}let r=new Uint8Array(i.gzhead.extra);i.pending_buf.set(r.subarray(i.gzindex,i.gzindex+s),i.pending),i.pending+=s,i.gzhead.hcrc&&i.pending>t&&(e.adler=da(e.adler,i.pending_buf,i.pending-t,t)),i.gzindex=0}i.status=73}if(73===i.status){if(i.gzhead.name){let t,s=i.pending;do{if(i.pending===i.pending_buf_size){if(i.gzhead.hcrc&&i.pending>s&&(e.adler=da(e.adler,i.pending_buf,i.pending-s,s)),Wa(e),0!==i.pending)return i.last_flush=-1,Ca;s=0}t=i.gzindex<i.gzhead.name.length?255&i.gzhead.name.charCodeAt(i.gzindex++):0,ja(i,t)}while(0!==t);i.gzhead.hcrc&&i.pending>s&&(e.adler=da(e.adler,i.pending_buf,i.pending-s,s)),i.gzindex=0}i.status=91}if(91===i.status){if(i.gzhead.comment){let t,s=i.pending;do{if(i.pending===i.pending_buf_size){if(i.gzhead.hcrc&&i.pending>s&&(e.adler=da(e.adler,i.pending_buf,i.pending-s,s)),Wa(e),0!==i.pending)return i.last_flush=-1,Ca;s=0}t=i.gzindex<i.gzhead.comment.length?255&i.gzhead.comment.charCodeAt(i.gzindex++):0,ja(i,t)}while(0!==t);i.gzhead.hcrc&&i.pending>s&&(e.adler=da(e.adler,i.pending_buf,i.pending-s,s))}i.status=103}if(103===i.status){if(i.gzhead.hcrc){if(i.pending+2>i.pending_buf_size&&(Wa(e),0!==i.pending))return i.last_flush=-1,Ca;ja(i,255&e.adler),ja(i,e.adler>>8&255),e.adler=0}if(i.status=Qa,Wa(e),0!==i.pending)return i.last_flush=-1,Ca}if(0!==e.avail_in||0!==i.lookahead||t!==wa&&i.status!==Ga){let s=0===i.level?en(i,t):i.strategy===Ma?((e,t)=>{let i;for(;;){if(0===e.lookahead&&(qa(e),0===e.lookahead)){if(t===wa)return 1;break}if(e.match_length=0,i=fa(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++,i&&(Ja(e,!1),0===e.strm.avail_out))return 1}return e.insert=0,t===Ea?(Ja(e,!0),0===e.strm.avail_out?3:4):e.sym_next&&(Ja(e,!1),0===e.strm.avail_out)?1:2})(i,t):i.strategy===ka?((e,t)=>{let i,s,r,o;const a=e.window;for(;;){if(e.lookahead<=Ua){if(qa(e),e.lookahead<=Ua&&t===wa)return 1;if(0===e.lookahead)break}if(e.match_length=0,e.lookahead>=3&&e.strstart>0&&(r=e.strstart-1,s=a[r],s===a[++r]&&s===a[++r]&&s===a[++r])){o=e.strstart+Ua;do{}while(s===a[++r]&&s===a[++r]&&s===a[++r]&&s===a[++r]&&s===a[++r]&&s===a[++r]&&s===a[++r]&&s===a[++r]&&r<o);e.match_length=Ua-(o-r),e.match_length>e.lookahead&&(e.match_length=e.lookahead)}if(e.match_length>=3?(i=fa(e,1,e.match_length-3),e.lookahead-=e.match_length,e.strstart+=e.match_length,e.match_length=0):(i=fa(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++),i&&(Ja(e,!1),0===e.strm.avail_out))return 1}return e.insert=0,t===Ea?(Ja(e,!0),0===e.strm.avail_out?3:4):e.sym_next&&(Ja(e,!1),0===e.strm.avail_out)?1:2})(i,t):on[i.level].func(i,t);if(3!==s&&4!==s||(i.status=Ga),1===s||3===s)return 0===e.avail_out&&(i.last_flush=-1),Ca;if(2===s&&(t===va?ma(i):t!==ya&&(Aa(i,0,0,!1),t===ba&&(Na(i.head),0===i.lookahead&&(i.strstart=0,i.block_start=0,i.insert=0))),Wa(e),0===e.avail_out))return i.last_flush=-1,Ca}return t!==Ea?Ca:i.wrap<=0?xa:(2===i.wrap?(ja(i,255&e.adler),ja(i,e.adler>>8&255),ja(i,e.adler>>16&255),ja(i,e.adler>>24&255),ja(i,255&e.total_in),ja(i,e.total_in>>8&255),ja(i,e.total_in>>16&255),ja(i,e.total_in>>24&255)):(Za(i,e.adler>>>16),Za(i,65535&e.adler)),Wa(e),i.wrap>0&&(i.wrap=-i.wrap),0!==i.pending?Ca:xa)},pn=(e,t)=>{let i=t.length;if(nn(e))return Ba;const s=e.state,r=s.wrap;if(2===r||1===r&&s.status!==Ha||s.lookahead)return Ba;if(1===r&&(e.adler=ca(e.adler,t,i,0)),s.wrap=0,i>=s.w_size){0===r&&(Na(s.head),s.strstart=0,s.block_start=0,s.insert=0);let e=new Uint8Array(s.w_size);e.set(t.subarray(i-s.w_size,i),0),t=e,i=s.w_size}const o=e.avail_in,a=e.next_in,n=e.input;for(e.avail_in=i,e.next_in=0,e.input=t,qa(s);s.lookahead>=3;){let e=s.strstart,t=s.lookahead-2;do{s.ins_h=Ka(s,s.ins_h,s.window[e+3-1]),s.prev[e&s.w_mask]=s.head[s.ins_h],s.head[s.ins_h]=e,e++}while(--t);s.strstart=e,s.lookahead=2,qa(s)}return s.strstart+=s.lookahead,s.block_start=s.strstart,s.insert=s.lookahead,s.lookahead=0,s.match_length=s.prev_length=2,s.match_available=0,e.next_in=a,e.input=n,e.avail_in=o,s.wrap=r,Ca},un={deflateInit:(e,t)=>hn(e,t,za,15,8,Fa),deflateInit2:hn,deflateReset:cn,deflateResetKeep:ln,deflateSetHeader:(e,t)=>nn(e)||2!==e.state.wrap?Ba:(e.state.gzhead=t,Ca),deflate:dn,deflateEnd:e=>{if(nn(e))return Ba;const t=e.state.status;return e.state=null,t===Qa?La(e,Sa):Ca},deflateSetDictionary:pn,deflateInfo:"pako deflate (from Nodeca project)"};const gn=(e,t)=>Object.prototype.hasOwnProperty.call(e,t);var An=function(e){const t=Array.prototype.slice.call(arguments,1);for(;t.length;){const i=t.shift();if(i){if("object"!=typeof i)throw new TypeError(i+"must be non-object");for(const t in i)gn(i,t)&&(e[t]=i[t])}}return e},_n=e=>{let t=0;for(let i=0,s=e.length;i<s;i++)t+=e[i].length;const i=new Uint8Array(t);for(let t=0,s=0,r=e.length;t<r;t++){let r=e[t];i.set(r,s),s+=r.length}return i};let fn=!0;try{String.fromCharCode.apply(null,new Uint8Array(1))}catch(e){fn=!1}const mn=new Uint8Array(256);for(let e=0;e<256;e++)mn[e]=e>=252?6:e>=248?5:e>=240?4:e>=224?3:e>=192?2:1;mn[254]=mn[254]=1;var wn=e=>{if("function"==typeof TextEncoder&&TextEncoder.prototype.encode)return(new TextEncoder).encode(e);let t,i,s,r,o,a=e.length,n=0;for(r=0;r<a;r++)i=e.charCodeAt(r),55296==(64512&i)&&r+1<a&&(s=e.charCodeAt(r+1),56320==(64512&s)&&(i=65536+(i-55296<<10)+(s-56320),r++)),n+=i<128?1:i<2048?2:i<65536?3:4;for(t=new Uint8Array(n),o=0,r=0;o<n;r++)i=e.charCodeAt(r),55296==(64512&i)&&r+1<a&&(s=e.charCodeAt(r+1),56320==(64512&s)&&(i=65536+(i-55296<<10)+(s-56320),r++)),i<128?t[o++]=i:i<2048?(t[o++]=192|i>>>6,t[o++]=128|63&i):i<65536?(t[o++]=224|i>>>12,t[o++]=128|i>>>6&63,t[o++]=128|63&i):(t[o++]=240|i>>>18,t[o++]=128|i>>>12&63,t[o++]=128|i>>>6&63,t[o++]=128|63&i);return t},vn=(e,t)=>{const i=t||e.length;if("function"==typeof TextDecoder&&TextDecoder.prototype.decode)return(new TextDecoder).decode(e.subarray(0,t));let s,r;const o=new Array(2*i);for(r=0,s=0;s<i;){let t=e[s++];if(t<128){o[r++]=t;continue}let a=mn[t];if(a>4)o[r++]=65533,s+=a-1;else{for(t&=2===a?31:3===a?15:7;a>1&&s<i;)t=t<<6|63&e[s++],a--;a>1?o[r++]=65533:t<65536?o[r++]=t:(t-=65536,o[r++]=55296|t>>10&1023,o[r++]=56320|1023&t)}}return((e,t)=>{if(t<65534&&e.subarray&&fn)return String.fromCharCode.apply(null,e.length===t?e:e.subarray(0,t));let i="";for(let s=0;s<t;s++)i+=String.fromCharCode(e[s]);return i})(o,r)},bn=(e,t)=>{(t=t||e.length)>e.length&&(t=e.length);let i=t-1;for(;i>=0&&128==(192&e[i]);)i--;return i<0||0===i?t:i+mn[e[i]]>t?i:t};var En=function(){this.input=null,this.next_in=0,this.avail_in=0,this.total_in=0,this.output=null,this.next_out=0,this.avail_out=0,this.total_out=0,this.msg="",this.state=null,this.data_type=2,this.adler=0};const yn=Object.prototype.toString,{Z_NO_FLUSH:Cn,Z_SYNC_FLUSH:xn,Z_FULL_FLUSH:Bn,Z_FINISH:Sn,Z_OK:In,Z_STREAM_END:Dn,Z_DEFAULT_COMPRESSION:Rn,Z_DEFAULT_STRATEGY:Mn,Z_DEFLATED:kn}=ua;function Tn(e){this.options=An({level:Rn,method:kn,chunkSize:16384,windowBits:15,memLevel:8,strategy:Mn},e||{});let t=this.options;t.raw&&t.windowBits>0?t.windowBits=-t.windowBits:t.gzip&&t.windowBits>0&&t.windowBits<16&&(t.windowBits+=16),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new En,this.strm.avail_out=0;let i=un.deflateInit2(this.strm,t.level,t.method,t.windowBits,t.memLevel,t.strategy);if(i!==In)throw new Error(pa[i]);if(t.header&&un.deflateSetHeader(this.strm,t.header),t.dictionary){let e;if(e="string"==typeof t.dictionary?wn(t.dictionary):"[object ArrayBuffer]"===yn.call(t.dictionary)?new Uint8Array(t.dictionary):t.dictionary,i=un.deflateSetDictionary(this.strm,e),i!==In)throw new Error(pa[i]);this._dict_set=!0}}Tn.prototype.push=function(e,t){const i=this.strm,s=this.options.chunkSize;let r,o;if(this.ended)return!1;for(o=t===~~t?t:!0===t?Sn:Cn,"string"==typeof e?i.input=wn(e):"[object ArrayBuffer]"===yn.call(e)?i.input=new Uint8Array(e):i.input=e,i.next_in=0,i.avail_in=i.input.length;;)if(0===i.avail_out&&(i.output=new Uint8Array(s),i.next_out=0,i.avail_out=s),(o===xn||o===Bn)&&i.avail_out<=6)this.onData(i.output.subarray(0,i.next_out)),i.avail_out=0;else{if(r=un.deflate(i,o),r===Dn)return i.next_out>0&&this.onData(i.output.subarray(0,i.next_out)),r=un.deflateEnd(this.strm),this.onEnd(r),this.ended=!0,r===In;if(0!==i.avail_out){if(o>0&&i.next_out>0)this.onData(i.output.subarray(0,i.next_out)),i.avail_out=0;else if(0===i.avail_in)break}else this.onData(i.output)}return!0},Tn.prototype.onData=function(e){this.chunks.push(e)},Tn.prototype.onEnd=function(e){e===In&&(this.result=_n(this.chunks)),this.chunks=[],this.err=e,this.msg=this.strm.msg};var Fn={deflate:function(e,t){const i=new Tn(t);if(i.push(e,!0),i.err)throw i.msg||pa[i.err];return i.result}};const Pn=16209;var zn=function(e,t){let i,s,r,o,a,n,l,c,h,d,p,u,g,A,_,f,m,w,v,b,E,y,C,x;const B=e.state;i=e.next_in,C=e.input,s=i+(e.avail_in-5),r=e.next_out,x=e.output,o=r-(t-e.avail_out),a=r+(e.avail_out-257),n=B.dmax,l=B.wsize,c=B.whave,h=B.wnext,d=B.window,p=B.hold,u=B.bits,g=B.lencode,A=B.distcode,_=(1<<B.lenbits)-1,f=(1<<B.distbits)-1;e:do{u<15&&(p+=C[i++]<<u,u+=8,p+=C[i++]<<u,u+=8),m=g[p&_];t:for(;;){if(w=m>>>24,p>>>=w,u-=w,w=m>>>16&255,0===w)x[r++]=65535&m;else{if(!(16&w)){if(64&w){if(32&w){B.mode=16191;break e}e.msg="invalid literal/length code",B.mode=Pn;break e}m=g[(65535&m)+(p&(1<<w)-1)];continue t}for(v=65535&m,w&=15,w&&(u<w&&(p+=C[i++]<<u,u+=8),v+=p&(1<<w)-1,p>>>=w,u-=w),u<15&&(p+=C[i++]<<u,u+=8,p+=C[i++]<<u,u+=8),m=A[p&f];;){if(w=m>>>24,p>>>=w,u-=w,w=m>>>16&255,16&w){if(b=65535&m,w&=15,u<w&&(p+=C[i++]<<u,u+=8,u<w&&(p+=C[i++]<<u,u+=8)),b+=p&(1<<w)-1,b>n){e.msg="invalid distance too far back",B.mode=Pn;break e}if(p>>>=w,u-=w,w=r-o,b>w){if(w=b-w,w>c&&B.sane){e.msg="invalid distance too far back",B.mode=Pn;break e}if(E=0,y=d,0===h){if(E+=l-w,w<v){v-=w;do{x[r++]=d[E++]}while(--w);E=r-b,y=x}}else if(h<w){if(E+=l+h-w,w-=h,w<v){v-=w;do{x[r++]=d[E++]}while(--w);if(E=0,h<v){w=h,v-=w;do{x[r++]=d[E++]}while(--w);E=r-b,y=x}}}else if(E+=h-w,w<v){v-=w;do{x[r++]=d[E++]}while(--w);E=r-b,y=x}for(;v>2;)x[r++]=y[E++],x[r++]=y[E++],x[r++]=y[E++],v-=3;v&&(x[r++]=y[E++],v>1&&(x[r++]=y[E++]))}else{E=r-b;do{x[r++]=x[E++],x[r++]=x[E++],x[r++]=x[E++],v-=3}while(v>2);v&&(x[r++]=x[E++],v>1&&(x[r++]=x[E++]))}break}if(64&w){e.msg="invalid distance code",B.mode=Pn;break e}m=A[(65535&m)+(p&(1<<w)-1)]}}break}}while(i<s&&r<a);v=u>>3,i-=v,u-=v<<3,p&=(1<<u)-1,e.next_in=i,e.next_out=r,e.avail_in=i<s?s-i+5:5-(i-s),e.avail_out=r<a?a-r+257:257-(r-a),B.hold=p,B.bits=u};const Un=15,On=new Uint16Array([3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0]),Hn=new Uint8Array([16,16,16,16,16,16,16,16,17,17,17,17,18,18,18,18,19,19,19,19,20,20,20,20,21,21,21,21,16,72,78]),Qn=new Uint16Array([1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577,0,0]),Gn=new Uint8Array([16,16,16,16,17,17,18,18,19,19,20,20,21,21,22,22,23,23,24,24,25,25,26,26,27,27,28,28,29,29,64,64]);var Ln=(e,t,i,s,r,o,a,n)=>{const l=n.bits;let c,h,d,p,u,g,A=0,_=0,f=0,m=0,w=0,v=0,b=0,E=0,y=0,C=0,x=null;const B=new Uint16Array(16),S=new Uint16Array(16);let I,D,R,M=null;for(A=0;A<=Un;A++)B[A]=0;for(_=0;_<s;_++)B[t[i+_]]++;for(w=l,m=Un;m>=1&&0===B[m];m--);if(w>m&&(w=m),0===m)return r[o++]=20971520,r[o++]=20971520,n.bits=1,0;for(f=1;f<m&&0===B[f];f++);for(w<f&&(w=f),E=1,A=1;A<=Un;A++)if(E<<=1,E-=B[A],E<0)return-1;if(E>0&&(0===e||1!==m))return-1;for(S[1]=0,A=1;A<Un;A++)S[A+1]=S[A]+B[A];for(_=0;_<s;_++)0!==t[i+_]&&(a[S[t[i+_]]++]=_);if(0===e?(x=M=a,g=20):1===e?(x=On,M=Hn,g=257):(x=Qn,M=Gn,g=0),C=0,_=0,A=f,u=o,v=w,b=0,d=-1,y=1<<w,p=y-1,1===e&&y>852||2===e&&y>592)return 1;for(;;){I=A-b,a[_]+1<g?(D=0,R=a[_]):a[_]>=g?(D=M[a[_]-g],R=x[a[_]-g]):(D=96,R=0),c=1<<A-b,h=1<<v,f=h;do{h-=c,r[u+(C>>b)+h]=I<<24|D<<16|R}while(0!==h);for(c=1<<A-1;C&c;)c>>=1;if(0!==c?(C&=c-1,C+=c):C=0,_++,0===--B[A]){if(A===m)break;A=t[i+a[_]]}if(A>w&&(C&p)!==d){for(0===b&&(b=w),u+=f,v=A-b,E=1<<v;v+b<m&&(E-=B[v+b],!(E<=0));)v++,E<<=1;if(y+=1<<v,1===e&&y>852||2===e&&y>592)return 1;d=C&p,r[d]=w<<24|v<<16|u-o}}return 0!==C&&(r[u+C]=A-b<<24|64<<16),n.bits=w,0};const{Z_FINISH:$n,Z_BLOCK:Nn,Z_TREES:Yn,Z_OK:Kn,Z_STREAM_END:Wn,Z_NEED_DICT:Jn,Z_STREAM_ERROR:jn,Z_DATA_ERROR:Zn,Z_MEM_ERROR:Vn,Z_BUF_ERROR:Xn,Z_DEFLATED:qn}=ua,el=16180,tl=16190,il=16191,sl=16192,rl=16194,ol=16199,al=16200,nl=16206,ll=16209,cl=e=>(e>>>24&255)+(e>>>8&65280)+((65280&e)<<8)+((255&e)<<24);function hl(){this.strm=null,this.mode=0,this.last=!1,this.wrap=0,this.havedict=!1,this.flags=0,this.dmax=0,this.check=0,this.total=0,this.head=null,this.wbits=0,this.wsize=0,this.whave=0,this.wnext=0,this.window=null,this.hold=0,this.bits=0,this.length=0,this.offset=0,this.extra=0,this.lencode=null,this.distcode=null,this.lenbits=0,this.distbits=0,this.ncode=0,this.nlen=0,this.ndist=0,this.have=0,this.next=null,this.lens=new Uint16Array(320),this.work=new Uint16Array(288),this.lendyn=null,this.distdyn=null,this.sane=0,this.back=0,this.was=0}const dl=e=>{if(!e)return 1;const t=e.state;return!t||t.strm!==e||t.mode<el||t.mode>16211?1:0},pl=e=>{if(dl(e))return jn;const t=e.state;return e.total_in=e.total_out=t.total=0,e.msg="",t.wrap&&(e.adler=1&t.wrap),t.mode=el,t.last=0,t.havedict=0,t.flags=-1,t.dmax=32768,t.head=null,t.hold=0,t.bits=0,t.lencode=t.lendyn=new Int32Array(852),t.distcode=t.distdyn=new Int32Array(592),t.sane=1,t.back=-1,Kn},ul=e=>{if(dl(e))return jn;const t=e.state;return t.wsize=0,t.whave=0,t.wnext=0,pl(e)},gl=(e,t)=>{let i;if(dl(e))return jn;const s=e.state;return t<0?(i=0,t=-t):(i=5+(t>>4),t<48&&(t&=15)),t&&(t<8||t>15)?jn:(null!==s.window&&s.wbits!==t&&(s.window=null),s.wrap=i,s.wbits=t,ul(e))},Al=(e,t)=>{if(!e)return jn;const i=new hl;e.state=i,i.strm=e,i.window=null,i.mode=el;const s=gl(e,t);return s!==Kn&&(e.state=null),s};let _l,fl,ml=!0;const wl=e=>{if(ml){_l=new Int32Array(512),fl=new Int32Array(32);let t=0;for(;t<144;)e.lens[t++]=8;for(;t<256;)e.lens[t++]=9;for(;t<280;)e.lens[t++]=7;for(;t<288;)e.lens[t++]=8;for(Ln(1,e.lens,0,288,_l,0,e.work,{bits:9}),t=0;t<32;)e.lens[t++]=5;Ln(2,e.lens,0,32,fl,0,e.work,{bits:5}),ml=!1}e.lencode=_l,e.lenbits=9,e.distcode=fl,e.distbits=5},vl=(e,t,i,s)=>{let r;const o=e.state;return null===o.window&&(o.wsize=1<<o.wbits,o.wnext=0,o.whave=0,o.window=new Uint8Array(o.wsize)),s>=o.wsize?(o.window.set(t.subarray(i-o.wsize,i),0),o.wnext=0,o.whave=o.wsize):(r=o.wsize-o.wnext,r>s&&(r=s),o.window.set(t.subarray(i-s,i-s+r),o.wnext),(s-=r)?(o.window.set(t.subarray(i-s,i),0),o.wnext=s,o.whave=o.wsize):(o.wnext+=r,o.wnext===o.wsize&&(o.wnext=0),o.whave<o.wsize&&(o.whave+=r))),0};var bl=(e,t)=>{let i,s,r,o,a,n,l,c,h,d,p,u,g,A,_,f,m,w,v,b,E,y,C=0;const x=new Uint8Array(4);let B,S;const I=new Uint8Array([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]);if(dl(e)||!e.output||!e.input&&0!==e.avail_in)return jn;i=e.state,i.mode===il&&(i.mode=sl),a=e.next_out,r=e.output,l=e.avail_out,o=e.next_in,s=e.input,n=e.avail_in,c=i.hold,h=i.bits,d=n,p=l,y=Kn;e:for(;;)switch(i.mode){case el:if(0===i.wrap){i.mode=sl;break}for(;h<16;){if(0===n)break e;n--,c+=s[o++]<<h,h+=8}if(2&i.wrap&&35615===c){0===i.wbits&&(i.wbits=15),i.check=0,x[0]=255&c,x[1]=c>>>8&255,i.check=da(i.check,x,2,0),c=0,h=0,i.mode=16181;break}if(i.head&&(i.head.done=!1),!(1&i.wrap)||(((255&c)<<8)+(c>>8))%31){e.msg="incorrect header check",i.mode=ll;break}if((15&c)!==qn){e.msg="unknown compression method",i.mode=ll;break}if(c>>>=4,h-=4,E=8+(15&c),0===i.wbits&&(i.wbits=E),E>15||E>i.wbits){e.msg="invalid window size",i.mode=ll;break}i.dmax=1<<i.wbits,i.flags=0,e.adler=i.check=1,i.mode=512&c?16189:il,c=0,h=0;break;case 16181:for(;h<16;){if(0===n)break e;n--,c+=s[o++]<<h,h+=8}if(i.flags=c,(255&i.flags)!==qn){e.msg="unknown compression method",i.mode=ll;break}if(57344&i.flags){e.msg="unknown header flags set",i.mode=ll;break}i.head&&(i.head.text=c>>8&1),512&i.flags&&4&i.wrap&&(x[0]=255&c,x[1]=c>>>8&255,i.check=da(i.check,x,2,0)),c=0,h=0,i.mode=16182;case 16182:for(;h<32;){if(0===n)break e;n--,c+=s[o++]<<h,h+=8}i.head&&(i.head.time=c),512&i.flags&&4&i.wrap&&(x[0]=255&c,x[1]=c>>>8&255,x[2]=c>>>16&255,x[3]=c>>>24&255,i.check=da(i.check,x,4,0)),c=0,h=0,i.mode=16183;case 16183:for(;h<16;){if(0===n)break e;n--,c+=s[o++]<<h,h+=8}i.head&&(i.head.xflags=255&c,i.head.os=c>>8),512&i.flags&&4&i.wrap&&(x[0]=255&c,x[1]=c>>>8&255,i.check=da(i.check,x,2,0)),c=0,h=0,i.mode=16184;case 16184:if(1024&i.flags){for(;h<16;){if(0===n)break e;n--,c+=s[o++]<<h,h+=8}i.length=c,i.head&&(i.head.extra_len=c),512&i.flags&&4&i.wrap&&(x[0]=255&c,x[1]=c>>>8&255,i.check=da(i.check,x,2,0)),c=0,h=0}else i.head&&(i.head.extra=null);i.mode=16185;case 16185:if(1024&i.flags&&(u=i.length,u>n&&(u=n),u&&(i.head&&(E=i.head.extra_len-i.length,i.head.extra||(i.head.extra=new Uint8Array(i.head.extra_len)),i.head.extra.set(s.subarray(o,o+u),E)),512&i.flags&&4&i.wrap&&(i.check=da(i.check,s,u,o)),n-=u,o+=u,i.length-=u),i.length))break e;i.length=0,i.mode=16186;case 16186:if(2048&i.flags){if(0===n)break e;u=0;do{E=s[o+u++],i.head&&E&&i.length<65536&&(i.head.name+=String.fromCharCode(E))}while(E&&u<n);if(512&i.flags&&4&i.wrap&&(i.check=da(i.check,s,u,o)),n-=u,o+=u,E)break e}else i.head&&(i.head.name=null);i.length=0,i.mode=16187;case 16187:if(4096&i.flags){if(0===n)break e;u=0;do{E=s[o+u++],i.head&&E&&i.length<65536&&(i.head.comment+=String.fromCharCode(E))}while(E&&u<n);if(512&i.flags&&4&i.wrap&&(i.check=da(i.check,s,u,o)),n-=u,o+=u,E)break e}else i.head&&(i.head.comment=null);i.mode=16188;case 16188:if(512&i.flags){for(;h<16;){if(0===n)break e;n--,c+=s[o++]<<h,h+=8}if(4&i.wrap&&c!==(65535&i.check)){e.msg="header crc mismatch",i.mode=ll;break}c=0,h=0}i.head&&(i.head.hcrc=i.flags>>9&1,i.head.done=!0),e.adler=i.check=0,i.mode=il;break;case 16189:for(;h<32;){if(0===n)break e;n--,c+=s[o++]<<h,h+=8}e.adler=i.check=cl(c),c=0,h=0,i.mode=tl;case tl:if(0===i.havedict)return e.next_out=a,e.avail_out=l,e.next_in=o,e.avail_in=n,i.hold=c,i.bits=h,Jn;e.adler=i.check=1,i.mode=il;case il:if(t===Nn||t===Yn)break e;case sl:if(i.last){c>>>=7&h,h-=7&h,i.mode=nl;break}for(;h<3;){if(0===n)break e;n--,c+=s[o++]<<h,h+=8}switch(i.last=1&c,c>>>=1,h-=1,3&c){case 0:i.mode=16193;break;case 1:if(wl(i),i.mode=ol,t===Yn){c>>>=2,h-=2;break e}break;case 2:i.mode=16196;break;case 3:e.msg="invalid block type",i.mode=ll}c>>>=2,h-=2;break;case 16193:for(c>>>=7&h,h-=7&h;h<32;){if(0===n)break e;n--,c+=s[o++]<<h,h+=8}if((65535&c)!=(c>>>16^65535)){e.msg="invalid stored block lengths",i.mode=ll;break}if(i.length=65535&c,c=0,h=0,i.mode=rl,t===Yn)break e;case rl:i.mode=16195;case 16195:if(u=i.length,u){if(u>n&&(u=n),u>l&&(u=l),0===u)break e;r.set(s.subarray(o,o+u),a),n-=u,o+=u,l-=u,a+=u,i.length-=u;break}i.mode=il;break;case 16196:for(;h<14;){if(0===n)break e;n--,c+=s[o++]<<h,h+=8}if(i.nlen=257+(31&c),c>>>=5,h-=5,i.ndist=1+(31&c),c>>>=5,h-=5,i.ncode=4+(15&c),c>>>=4,h-=4,i.nlen>286||i.ndist>30){e.msg="too many length or distance symbols",i.mode=ll;break}i.have=0,i.mode=16197;case 16197:for(;i.have<i.ncode;){for(;h<3;){if(0===n)break e;n--,c+=s[o++]<<h,h+=8}i.lens[I[i.have++]]=7&c,c>>>=3,h-=3}for(;i.have<19;)i.lens[I[i.have++]]=0;if(i.lencode=i.lendyn,i.lenbits=7,B={bits:i.lenbits},y=Ln(0,i.lens,0,19,i.lencode,0,i.work,B),i.lenbits=B.bits,y){e.msg="invalid code lengths set",i.mode=ll;break}i.have=0,i.mode=16198;case 16198:for(;i.have<i.nlen+i.ndist;){for(;C=i.lencode[c&(1<<i.lenbits)-1],_=C>>>24,f=C>>>16&255,m=65535&C,!(_<=h);){if(0===n)break e;n--,c+=s[o++]<<h,h+=8}if(m<16)c>>>=_,h-=_,i.lens[i.have++]=m;else{if(16===m){for(S=_+2;h<S;){if(0===n)break e;n--,c+=s[o++]<<h,h+=8}if(c>>>=_,h-=_,0===i.have){e.msg="invalid bit length repeat",i.mode=ll;break}E=i.lens[i.have-1],u=3+(3&c),c>>>=2,h-=2}else if(17===m){for(S=_+3;h<S;){if(0===n)break e;n--,c+=s[o++]<<h,h+=8}c>>>=_,h-=_,E=0,u=3+(7&c),c>>>=3,h-=3}else{for(S=_+7;h<S;){if(0===n)break e;n--,c+=s[o++]<<h,h+=8}c>>>=_,h-=_,E=0,u=11+(127&c),c>>>=7,h-=7}if(i.have+u>i.nlen+i.ndist){e.msg="invalid bit length repeat",i.mode=ll;break}for(;u--;)i.lens[i.have++]=E}}if(i.mode===ll)break;if(0===i.lens[256]){e.msg="invalid code -- missing end-of-block",i.mode=ll;break}if(i.lenbits=9,B={bits:i.lenbits},y=Ln(1,i.lens,0,i.nlen,i.lencode,0,i.work,B),i.lenbits=B.bits,y){e.msg="invalid literal/lengths set",i.mode=ll;break}if(i.distbits=6,i.distcode=i.distdyn,B={bits:i.distbits},y=Ln(2,i.lens,i.nlen,i.ndist,i.distcode,0,i.work,B),i.distbits=B.bits,y){e.msg="invalid distances set",i.mode=ll;break}if(i.mode=ol,t===Yn)break e;case ol:i.mode=al;case al:if(n>=6&&l>=258){e.next_out=a,e.avail_out=l,e.next_in=o,e.avail_in=n,i.hold=c,i.bits=h,zn(e,p),a=e.next_out,r=e.output,l=e.avail_out,o=e.next_in,s=e.input,n=e.avail_in,c=i.hold,h=i.bits,i.mode===il&&(i.back=-1);break}for(i.back=0;C=i.lencode[c&(1<<i.lenbits)-1],_=C>>>24,f=C>>>16&255,m=65535&C,!(_<=h);){if(0===n)break e;n--,c+=s[o++]<<h,h+=8}if(f&&!(240&f)){for(w=_,v=f,b=m;C=i.lencode[b+((c&(1<<w+v)-1)>>w)],_=C>>>24,f=C>>>16&255,m=65535&C,!(w+_<=h);){if(0===n)break e;n--,c+=s[o++]<<h,h+=8}c>>>=w,h-=w,i.back+=w}if(c>>>=_,h-=_,i.back+=_,i.length=m,0===f){i.mode=16205;break}if(32&f){i.back=-1,i.mode=il;break}if(64&f){e.msg="invalid literal/length code",i.mode=ll;break}i.extra=15&f,i.mode=16201;case 16201:if(i.extra){for(S=i.extra;h<S;){if(0===n)break e;n--,c+=s[o++]<<h,h+=8}i.length+=c&(1<<i.extra)-1,c>>>=i.extra,h-=i.extra,i.back+=i.extra}i.was=i.length,i.mode=16202;case 16202:for(;C=i.distcode[c&(1<<i.distbits)-1],_=C>>>24,f=C>>>16&255,m=65535&C,!(_<=h);){if(0===n)break e;n--,c+=s[o++]<<h,h+=8}if(!(240&f)){for(w=_,v=f,b=m;C=i.distcode[b+((c&(1<<w+v)-1)>>w)],_=C>>>24,f=C>>>16&255,m=65535&C,!(w+_<=h);){if(0===n)break e;n--,c+=s[o++]<<h,h+=8}c>>>=w,h-=w,i.back+=w}if(c>>>=_,h-=_,i.back+=_,64&f){e.msg="invalid distance code",i.mode=ll;break}i.offset=m,i.extra=15&f,i.mode=16203;case 16203:if(i.extra){for(S=i.extra;h<S;){if(0===n)break e;n--,c+=s[o++]<<h,h+=8}i.offset+=c&(1<<i.extra)-1,c>>>=i.extra,h-=i.extra,i.back+=i.extra}if(i.offset>i.dmax){e.msg="invalid distance too far back",i.mode=ll;break}i.mode=16204;case 16204:if(0===l)break e;if(u=p-l,i.offset>u){if(u=i.offset-u,u>i.whave&&i.sane){e.msg="invalid distance too far back",i.mode=ll;break}u>i.wnext?(u-=i.wnext,g=i.wsize-u):g=i.wnext-u,u>i.length&&(u=i.length),A=i.window}else A=r,g=a-i.offset,u=i.length;u>l&&(u=l),l-=u,i.length-=u;do{r[a++]=A[g++]}while(--u);0===i.length&&(i.mode=al);break;case 16205:if(0===l)break e;r[a++]=i.length,l--,i.mode=al;break;case nl:if(i.wrap){for(;h<32;){if(0===n)break e;n--,c|=s[o++]<<h,h+=8}if(p-=l,e.total_out+=p,i.total+=p,4&i.wrap&&p&&(e.adler=i.check=i.flags?da(i.check,r,p,a-p):ca(i.check,r,p,a-p)),p=l,4&i.wrap&&(i.flags?c:cl(c))!==i.check){e.msg="incorrect data check",i.mode=ll;break}c=0,h=0}i.mode=16207;case 16207:if(i.wrap&&i.flags){for(;h<32;){if(0===n)break e;n--,c+=s[o++]<<h,h+=8}if(4&i.wrap&&c!==(4294967295&i.total)){e.msg="incorrect length check",i.mode=ll;break}c=0,h=0}i.mode=16208;case 16208:y=Wn;break e;case ll:y=Zn;break e;case 16210:return Vn;default:return jn}return e.next_out=a,e.avail_out=l,e.next_in=o,e.avail_in=n,i.hold=c,i.bits=h,(i.wsize||p!==e.avail_out&&i.mode<ll&&(i.mode<nl||t!==$n))&&vl(e,e.output,e.next_out,p-e.avail_out),d-=e.avail_in,p-=e.avail_out,e.total_in+=d,e.total_out+=p,i.total+=p,4&i.wrap&&p&&(e.adler=i.check=i.flags?da(i.check,r,p,e.next_out-p):ca(i.check,r,p,e.next_out-p)),e.data_type=i.bits+(i.last?64:0)+(i.mode===il?128:0)+(i.mode===ol||i.mode===rl?256:0),(0===d&&0===p||t===$n)&&y===Kn&&(y=Xn),y},El={inflateReset:ul,inflateReset2:gl,inflateResetKeep:pl,inflateInit:e=>Al(e,15),inflateInit2:Al,inflate:bl,inflateEnd:e=>{if(dl(e))return jn;let t=e.state;return t.window&&(t.window=null),e.state=null,Kn},inflateGetHeader:(e,t)=>{if(dl(e))return jn;const i=e.state;return 2&i.wrap?(i.head=t,t.done=!1,Kn):jn},inflateSetDictionary:(e,t)=>{const i=t.length;let s,r,o;return dl(e)?jn:(s=e.state,0!==s.wrap&&s.mode!==tl?jn:s.mode===tl&&(r=1,r=ca(r,t,i,0),r!==s.check)?Zn:(o=vl(e,t,i,i),o?(s.mode=16210,Vn):(s.havedict=1,Kn)))},inflateInfo:"pako inflate (from Nodeca project)"};var yl=function(){this.text=0,this.time=0,this.xflags=0,this.os=0,this.extra=null,this.extra_len=0,this.name="",this.comment="",this.hcrc=0,this.done=!1};const Cl=Object.prototype.toString,{Z_NO_FLUSH:xl,Z_FINISH:Bl,Z_OK:Sl,Z_STREAM_END:Il,Z_NEED_DICT:Dl,Z_STREAM_ERROR:Rl,Z_DATA_ERROR:Ml,Z_MEM_ERROR:kl}=ua;function Tl(e){this.options=An({chunkSize:65536,windowBits:15,to:""},e||{});const t=this.options;t.raw&&t.windowBits>=0&&t.windowBits<16&&(t.windowBits=-t.windowBits,0===t.windowBits&&(t.windowBits=-15)),!(t.windowBits>=0&&t.windowBits<16)||e&&e.windowBits||(t.windowBits+=32),t.windowBits>15&&t.windowBits<48&&(15&t.windowBits||(t.windowBits|=15)),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new En,this.strm.avail_out=0;let i=El.inflateInit2(this.strm,t.windowBits);if(i!==Sl)throw new Error(pa[i]);if(this.header=new yl,El.inflateGetHeader(this.strm,this.header),t.dictionary&&("string"==typeof t.dictionary?t.dictionary=wn(t.dictionary):"[object ArrayBuffer]"===Cl.call(t.dictionary)&&(t.dictionary=new Uint8Array(t.dictionary)),t.raw&&(i=El.inflateSetDictionary(this.strm,t.dictionary),i!==Sl)))throw new Error(pa[i])}Tl.prototype.push=function(e,t){const i=this.strm,s=this.options.chunkSize,r=this.options.dictionary;let o,a,n;if(this.ended)return!1;for(a=t===~~t?t:!0===t?Bl:xl,"[object ArrayBuffer]"===Cl.call(e)?i.input=new Uint8Array(e):i.input=e,i.next_in=0,i.avail_in=i.input.length;;){for(0===i.avail_out&&(i.output=new Uint8Array(s),i.next_out=0,i.avail_out=s),o=El.inflate(i,a),o===Dl&&r&&(o=El.inflateSetDictionary(i,r),o===Sl?o=El.inflate(i,a):o===Ml&&(o=Dl));i.avail_in>0&&o===Il&&i.state.wrap>0&&0!==e[i.next_in];)El.inflateReset(i),o=El.inflate(i,a);switch(o){case Rl:case Ml:case Dl:case kl:return this.onEnd(o),this.ended=!0,!1}if(n=i.avail_out,i.next_out&&(0===i.avail_out||o===Il))if("string"===this.options.to){let e=bn(i.output,i.next_out),t=i.next_out-e,r=vn(i.output,e);i.next_out=t,i.avail_out=s-t,t&&i.output.set(i.output.subarray(e,e+t),0),this.onData(r)}else this.onData(i.output.length===i.next_out?i.output:i.output.subarray(0,i.next_out));if(o!==Sl||0!==n){if(o===Il)return o=El.inflateEnd(this.strm),this.onEnd(o),this.ended=!0,!0;if(0===i.avail_in)break}}return!0},Tl.prototype.onData=function(e){this.chunks.push(e)},Tl.prototype.onEnd=function(e){e===Sl&&("string"===this.options.to?this.result=this.chunks.join(""):this.result=_n(this.chunks)),this.chunks=[],this.err=e,this.msg=this.strm.msg};var Fl={Inflate:Tl};const{deflate:Pl}=Fn,{Inflate:zl}=Fl;var Ul=Pl,Ol=zl;function Hl(e,t,i=255){const s=e.length%t;if(0!==s){const r=new Uint8Array(t-s).fill(i),o=new Uint8Array(e.length+r.length);return o.set(e),o.set(r,e.length),o}return e}function Ql(e,t=239){for(let i=0;i<e.length;i++)t^=e[i];return t}function Gl(e){const t=new Uint8Array(e.length);for(let i=0;i<e.length;i++)t[i]=e.charCodeAt(i);return t}function Ll(e){return new Promise(t=>setTimeout(t,e))}class $l{constructor(e,t=!1,i=!0){this.device=e,this.tracing=t,this.slipReaderEnabled=!1,this.baudrate=0,this.traceLog="",this.lastTraceTime=Date.now(),this.buffer=new Uint8Array(0),this.onDeviceLostCallback=null,this.SLIP_END=192,this.SLIP_ESC=219,this.SLIP_ESC_END=220,this.SLIP_ESC_ESC=221,this._DTR_state=!1,this.slipReaderEnabled=i}setDeviceLostCallback(e){this.onDeviceLostCallback=e}updateDevice(e){this.device=e,this.trace("Device reference updated")}getInfo(){const e=this.device.getInfo();return e.usbVendorId&&e.usbProductId?`WebSerial VendorID 0x${e.usbVendorId.toString(16)} ProductID 0x${e.usbProductId.toString(16)}`:""}getPid(){return this.device.getInfo().usbProductId}trace(e){const t=`${`TRACE ${(Date.now()-this.lastTraceTime).toFixed(3)}`} ${e}`;console.log(t),this.traceLog+=t+"\n"}async returnTrace(){try{await navigator.clipboard.writeText(this.traceLog),console.log("Text copied to clipboard!")}catch(e){console.error("Failed to copy text:",e)}}hexify(e){return Array.from(e).map(e=>e.toString(16).padStart(2,"0")).join("").padEnd(16," ")}hexConvert(e,t=!0){if(t&&e.length>16){let t="",i=e;for(;i.length>0;){const e=i.slice(0,16),s=String.fromCharCode(...e).split("").map(e=>" "===e||e>=" "&&e<="~"&&"  "!==e?e:".").join("");i=i.slice(16),t+=`\n    ${this.hexify(e.slice(0,8))} ${this.hexify(e.slice(8))} | ${s}`}return t}return this.hexify(e)}slipWriter(e){const t=[];t.push(192);for(let i=0;i<e.length;i++)219===e[i]?t.push(219,221):192===e[i]?t.push(219,220):t.push(e[i]);return t.push(192),new Uint8Array(t)}async write(e){const t=this.slipWriter(e);if(this.device.writable){const e=this.device.writable.getWriter();this.tracing&&this.trace(`Write ${t.length} bytes: ${this.hexConvert(t)}`),await e.write(t),e.releaseLock()}}appendArray(e,t){const i=new Uint8Array(e.length+t.length);return i.set(e),i.set(t,e.length),i}async readLoop(){for(var e;this.device.readable;){this.reader=null===(e=this.device.readable)||void 0===e?void 0:e.getReader();try{const{value:e,done:t}=await this.reader.read();if(t){this.trace("Serial port done");break}if(e&&e.length){const t=Uint8Array.from(e);this.buffer=this.appendArray(this.buffer,t)}}catch(e){if(e instanceof Error){if(["BufferOverrunError","FramingError","BreakError","ParityError"].includes(e.name)){this.trace(`Recoverable serial port error: ${e.message}`);continue}this.trace(`Unrecoverable serial port error: ${e.message}`);break}if(e instanceof DOMException){this.onDeviceLostCallback?this.onDeviceLostCallback():this.trace(`Unrecoverable serial port error: ${e.message}`);break}this.trace(`Unrecoverable serial port error: ${e}`);break}finally{this.reader.releaseLock()}}this.trace("readLoop exited")}flushInput(){this.buffer=new Uint8Array(0)}async flushOutput(){try{if(this.device.writable){const e=this.device.writable.getWriter();await e.close(),e.releaseLock()}}catch(e){this.trace(`Error while flushing output: ${e}`)}}inWaiting(){return this.buffer.length}peek(){return this.buffer}detectPanicHandler(e){const t=new TextDecoder("utf-8").decode(e),i=t.match(/G?uru Meditation Error: (?:Core \d panic'ed \(([a-zA-Z ]*)\))?/)||t.match(/F?atal exception \(\d+\): (?:([a-zA-Z ]*)?.*epc)?/);if(i){const e=i[1]||i[2];throw new Error("Guru Meditation Error detected"+(e?` (${e})`:""))}}async read(e){let t=null,i=!1,s=null;for(;;){const r=Date.now();for(s=new Uint8Array(0);Date.now()-r<e;){if(this.buffer.length>0){s=this.buffer,this.buffer=new Uint8Array(0);break}await Ll(1)}if(!s||0===s.length){const e=null===t?"Serial data stream stopped: Possible serial noise or corruption.":"No serial data received.";throw this.tracing&&this.trace(e),new Error(e)}this.tracing&&this.trace(`Read ${s.length} bytes: ${this.hexConvert(s)}`);for(let e=0;e<s.length;e++){const r=s[e];if(null===t){if(r!==this.SLIP_END){this.tracing&&this.trace(`Read invalid data: ${this.hexConvert(s)}`);const e=this.buffer;throw this.tracing&&this.trace(`Remaining data in serial buffer: ${this.hexConvert(e)}`),this.detectPanicHandler(new Uint8Array([...s,...e||[]])),new Error(`Invalid head of packet (0x${r.toString(16)}): Possible serial noise or corruption.`)}t=new Uint8Array(0)}else if(i)if(i=!1,r===this.SLIP_ESC_END)t=this.appendArray(t,new Uint8Array([this.SLIP_END]));else{if(r!==this.SLIP_ESC_ESC){this.tracing&&this.trace(`Read invalid data: ${this.hexConvert(s)}`);const e=this.buffer;throw this.tracing&&this.trace(`Remaining data in serial buffer: ${this.hexConvert(e)}`),this.detectPanicHandler(new Uint8Array([...s,...e||[]])),new Error(`Invalid SLIP escape (0xdb, 0x${r.toString(16)})`)}t=this.appendArray(t,new Uint8Array([this.SLIP_ESC]))}else if(r===this.SLIP_ESC)i=!0;else{if(r===this.SLIP_END){if(this.tracing&&this.trace(`Received full packet: ${this.hexConvert(t)}`),e+1<s.length){const t=s.slice(e+1);this.buffer=this.appendArray(t,this.buffer)}return t}t=this.appendArray(t,new Uint8Array([r]))}}}}async rawRead(e,t){let i;try{if(!this.device.readable)return;for(i=this.device.readable.getReader();!t();){const{value:t,done:s}=await i.read();if(s||!t)break;this.tracing&&this.trace(`Read ${t.length} bytes: ${this.hexConvert(t)}`),e(t)}}catch(e){this.trace(`Error reading from serial port: ${e}`),e instanceof Error&&"NetworkError"===e.name&&e.message.includes("device has been lost")&&(this.trace("Device lost detected (NetworkError)"),this.onDeviceLostCallback&&this.onDeviceLostCallback())}finally{null==i||i.releaseLock()}}async setRTS(e){await this.device.setSignals({requestToSend:e}),await this.setDTR(this._DTR_state)}async setDTR(e){this._DTR_state=e,await this.device.setSignals({dataTerminalReady:e})}async connect(e=115200,t={}){await this.device.open({baudRate:e,dataBits:null==t?void 0:t.dataBits,stopBits:null==t?void 0:t.stopBits,bufferSize:null==t?void 0:t.bufferSize,parity:null==t?void 0:t.parity,flowControl:null==t?void 0:t.flowControl}),this.baudrate=e}async waitForUnlock(e){for(;this.device.readable&&this.device.readable.locked||this.device.writable&&this.device.writable.locked;)await Ll(e)}async disconnect(){var e,t;(null===(e=this.device.readable)||void 0===e?void 0:e.locked)&&await(null===(t=this.reader)||void 0===t?void 0:t.cancel()),await this.waitForUnlock(400),await this.device.close(),this.reader=void 0}}function Nl(e){return new Promise(t=>setTimeout(t,e))}class Yl{constructor(e,t){this.resetDelay=t,this.transport=e}async reset(){await this.transport.setDTR(!1),await this.transport.setRTS(!0),await Nl(100),await this.transport.setDTR(!0),await this.transport.setRTS(!1),await Nl(this.resetDelay),await this.transport.setDTR(!1)}}class Kl{constructor(e){this.transport=e}async reset(){await this.transport.setRTS(!1),await this.transport.setDTR(!1),await Nl(100),await this.transport.setDTR(!0),await this.transport.setRTS(!1),await Nl(100),await this.transport.setRTS(!0),await this.transport.setDTR(!1),await this.transport.setRTS(!0),await Nl(100),await this.transport.setRTS(!1),await this.transport.setDTR(!1)}}class Wl{constructor(e,t=!1){this.transport=e,this.usingUsbOtg=t,this.transport=e}async reset(){this.usingUsbOtg?(await Nl(200),await this.transport.setRTS(!1),await Nl(200)):(await Nl(100),await this.transport.setRTS(!1))}}class Jl{constructor(e,t){this.transport=e,this.sequenceString=t,this.transport=e}async reset(){const e={D:async e=>await this.transport.setDTR(e),R:async e=>await this.transport.setRTS(e),W:async e=>await Nl(e)};try{if(!function(e){const t=["D","R","W"],i=e.split("|");for(const e of i){const i=e[0],s=e.slice(1);if(!t.includes(i))return!1;if("D"===i||"R"===i){if("0"!==s&&"1"!==s)return!1}else if("W"===i){const e=parseInt(s);if(isNaN(e)||e<=0)return!1}}return!0}(this.sequenceString))return;const t=this.sequenceString.split("|");for(const i of t){const t=i[0],s=i.slice(1);"W"===t?await e.W(Number(s)):"D"!==t&&"R"!==t||await e[t]("1"===s)}}catch(e){throw new Error("Invalid custom reset sequence")}}}function jl(e){return e&&e.__esModule&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e}var Zl,Vl;var Xl=jl(Vl?Zl:(Vl=1,Zl=function(e){return atob(e)}));async function ql(e,t){let i;switch(e){case"ESP32":i=await Promise.resolve().then(function(){return kh});break;case"ESP32-C2":i=await Promise.resolve().then(function(){return Qh});break;case"ESP32-C3":i=await Promise.resolve().then(function(){return Jh});break;case"ESP32-C5":i=await Promise.resolve().then(function(){return id});break;case"ESP32-C6":i=await Promise.resolve().then(function(){return hd});break;case"ESP32-C61":i=await Promise.resolve().then(function(){return md});break;case"ESP32-H2":i=await Promise.resolve().then(function(){return Bd});break;case"ESP32-P4":i=t&&t<300?await Promise.resolve().then(function(){return Fd}):await Promise.resolve().then(function(){return Ld});break;case"ESP32-S2":i=await Promise.resolve().then(function(){return Zd});break;case"ESP32-S3":i=await Promise.resolve().then(function(){return rp});break;case"ESP8266":i=await Promise.resolve().then(function(){return pp})}if(i)return{bss_start:i.bss_start,data:i.data,data_start:i.data_start,entry:i.entry,text:i.text,text_start:i.text_start,decodedData:ec(i.data),decodedText:ec(i.text)}}function ec(e){const t=Xl(e).split("").map(function(e){return e.charCodeAt(0)});return new Uint8Array(t)}class tc{constructor(){this.FLASH_SIZES={"1MB":0,"2MB":16,"4MB":32,"8MB":48,"16MB":64,"32MB":80,"64MB":96,"128MB":112},this.FLASH_FREQUENCY={"80m":15,"40m":0,"26m":1,"20m":2}}getEraseSize(e,t){return t}}class ic extends tc{constructor(){super(...arguments),this.CHIP_NAME="ESP8266",this.CHIP_DETECT_MAGIC_VALUE=[4293968129],this.EFUSE_RD_REG_BASE=1072693328,this.UART_CLKDIV_REG=1610612756,this.UART_CLKDIV_MASK=1048575,this.XTAL_CLK_DIVIDER=2,this.FLASH_WRITE_SIZE=16384,this.BOOTLOADER_FLASH_OFFSET=0,this.UART_DATE_REG_ADDR=0,this.FLASH_SIZES={"512KB":0,"256KB":16,"1MB":32,"2MB":48,"4MB":64,"2MB-c1":80,"4MB-c1":96,"8MB":128,"16MB":144},this.FLASH_FREQUENCY={"80m":15,"40m":0,"26m":1,"20m":2},this.MEMORY_MAP=[[1072693248,1072693264,"DPORT"],[1073643520,1073741824,"DRAM"],[1074790400,1074823168,"IRAM"],[1075843088,1076760592,"IROM"]],this.SPI_REG_BASE=1610613248,this.SPI_USR_OFFS=28,this.SPI_USR1_OFFS=32,this.SPI_USR2_OFFS=36,this.SPI_MOSI_DLEN_OFFS=0,this.SPI_MISO_DLEN_OFFS=0,this.SPI_W0_OFFS=64,this.getChipFeatures=async e=>{const t=["WiFi"];return"ESP8285"==await this.getChipDescription(e)&&t.push("Embedded Flash"),t}}async readEfuse(e,t){const i=this.EFUSE_RD_REG_BASE+4*t;return e.debug("Read efuse "+i),await e.readReg(i)}async getChipDescription(e){const t=await this.readEfuse(e,2);return!!(16&await this.readEfuse(e,0)|65536&t)?"ESP8285":"ESP8266EX"}async getCrystalFreq(e){const t=await e.readReg(this.UART_CLKDIV_REG)&this.UART_CLKDIV_MASK,i=e.transport.baudrate*t/1e6/this.XTAL_CLK_DIVIDER;let s;return s=i>33?40:26,Math.abs(s-i)>1&&e.info("WARNING: Detected crystal freq "+i+"MHz is quite different to normalized freq "+s+"MHz. Unsupported crystal in use?"),s}_d2h(e){const t=(+e).toString(16);return 1===t.length?"0"+t:t}async readMac(e){let t=await this.readEfuse(e,0);t>>>=0;let i=await this.readEfuse(e,1);i>>>=0;let s=await this.readEfuse(e,3);s>>>=0;const r=new Uint8Array(6);return 0!=s?(r[0]=s>>16&255,r[1]=s>>8&255,r[2]=255&s):i>>16&255?1==(i>>16&255)?(r[0]=172,r[1]=208,r[2]=116):e.error("Unknown OUI"):(r[0]=24,r[1]=254,r[2]=52),r[3]=i>>8&255,r[4]=255&i,r[5]=t>>24&255,this._d2h(r[0])+":"+this._d2h(r[1])+":"+this._d2h(r[2])+":"+this._d2h(r[3])+":"+this._d2h(r[4])+":"+this._d2h(r[5])}getEraseSize(e,t){return t}}ic.IROM_MAP_START=1075838976,ic.IROM_MAP_END=1076887552;var sc=Object.freeze({__proto__:null,ESP8266ROM:ic});const rc=233;function oc(e,t){return e+(t-1-e%t)}function ac(e,t){return e[t]|e[t+1]<<8|e[t+2]<<16|e[t+3]<<24}class nc{constructor(e,t,i=null,s=0){this.addr=e,this.data=t,this.fileOffs=i,this.flags=s,this.includeInChecksum=!0,0!==this.addr&&this.padToAlignment(4)}copyWithNewAddr(e){return new nc(e,this.data,0)}splitImage(e){const t=new nc(this.addr,this.data.slice(0,e),0);return this.data=this.data.slice(e),this.addr+=e,this.fileOffs=null,t}toString(){let e=`len 0x${this.data.length.toString(16).padStart(5,"0")} load 0x${this.addr.toString(16).padStart(8,"0")}`;return null!==this.fileOffs&&(e+=` file_offs 0x${this.fileOffs.toString(16).padStart(8,"0")}`),e}getMemoryType(e){return e.ROM_LOADER.MEMORY_MAP.filter(e=>e[0]<=this.addr&&this.addr<e[1]).map(e=>e[2])}padToAlignment(e){this.data=Hl(this.data,e,0)}}class lc extends nc{constructor(e,t,i,s){super(t,i,null,s),this.name=e}toString(){return`${this.name} ${super.toString()}`}}class cc{constructor(e){this.SEG_HEADER_LEN=8,this.SHA256_DIGEST_LEN=32,this.ELF_FLAG_WRITE=1,this.ELF_FLAG_READ=2,this.ELF_FLAG_EXEC=4,this.segments=[],this.entrypoint=0,this.elfSha256=null,this.elfSha256Offset=0,this.padToSize=0,this.flashMode=0,this.flashSizeFreq=0,this.checksum=0,this.datalength=0,this.IROM_ALIGN=0,this.MMU_PAGE_SIZE_CONF=[],this.ROM_LOADER=e}loadCommonHeader(e,t,i){const s=e[t],r=e[t+1];if(this.flashMode=e[t+2],this.flashSizeFreq=e[t+3],this.entrypoint=ac(e,t+4),s!==i)throw new bo(`Invalid firmware image magic=0x${s.toString(16)}`);return r}verify(){if(this.segments.length>16)throw new bo(`Invalid segment count ${this.segments.length} (max 16). Usually this indicates a linker script problem.`)}loadSegment(e,t,i=!1){const s=t,r=ac(e,t),o=ac(e,t+4);this.warnIfUnusualSegment(r,o,i);const a=e.slice(t+8,t+8+o);if(a.length<o)throw new bo(`End of file reading segment 0x${r.toString(16)}, length ${o} (actual length ${a.length})`);const n=new nc(r,a,s);return this.segments.push(n),n}warnIfUnusualSegment(e,t,i){i||(e>1075838976||e<1073610752||t>65536)&&console.warn(`WARNING: Suspicious segment 0x${e.toString(16)}, length ${t}`)}maybePatchSegmentData(e,t){const i=e.length;if(this.elfSha256Offset>=t&&this.elfSha256Offset<t+i){const s=this.elfSha256Offset-t;if(s<this.SEG_HEADER_LEN||s+this.SHA256_DIGEST_LEN>i)throw new bo(`Cannot place SHA256 digest on segment boundary(elf_sha256_offset=${this.elfSha256Offset}, file_pos=${t}, segment_size=${i})`);const r=s-this.SEG_HEADER_LEN;if(!e.slice(r,r+this.SHA256_DIGEST_LEN).every(e=>0===e))throw new bo(`Contents of segment at SHA256 digest offset 0x${this.elfSha256Offset.toString(16)} are not all zero. Refusing to overwrite.`);if(!this.elfSha256||this.elfSha256.length!==this.SHA256_DIGEST_LEN)throw new bo("ELF SHA256 digest is not properly initialized");const o=e.slice(0,r),a=e.slice(r+this.SHA256_DIGEST_LEN),n=o.length+this.elfSha256.length+a.length,l=new Uint8Array(n);return l.set(o,0),l.set(this.elfSha256,o.length),l.set(a,o.length+this.elfSha256.length),l}return e}saveSegment(e,t,i,s=null){const r=this.maybePatchSegmentData(i.data,t),o=new DataView(e.buffer,t);return o.setUint32(0,i.addr,!0),o.setUint32(4,r.length,!0),e.set(r,t+8),null!==s?Ql(r,s):0}saveFlashSegment(e,t,i,s=null){if("ESP32"===this.ROM_LOADER.CHIP_NAME){const e=(t+i.data.length+this.SEG_HEADER_LEN)%this.IROM_ALIGN;if(e<36){const t=new Uint8Array(i.data.length+(36-e));t.set(i.data),t.fill(0,i.data.length),i.data=t}}return this.saveSegment(e,t,i,s)}readChecksum(e,t){return e[oc(t,16)]}calculateChecksum(){let e=239;for(const t of this.segments)t.includeInChecksum&&(e=Ql(t.data,e));return e}appendChecksum(e,t,i){e[oc(t,16)]=i}writeCommonHeader(e,t,i){e[t]=rc,e[t+1]=i,e[t+2]=this.flashMode,e[t+3]=this.flashSizeFreq;new DataView(e.buffer,t+4).setUint32(0,this.entrypoint,!0)}isIromAddr(e){return ic.IROM_MAP_START<=e&&e<ic.IROM_MAP_END}getIromSegment(){const e=this.segments.filter(e=>this.isIromAddr(e.addr));if(e.length>0){if(1!==e.length)throw new bo(`Found ${e.length} segments that could be irom0. Bad ELF file?`);return e[0]}return null}getNonIromSegments(){const e=this.getIromSegment();return this.segments.filter(t=>t!==e)}sortSegments(){this.segments.length&&this.segments.sort((e,t)=>e.addr-t.addr)}mergeAdjacentSegments(){if(!this.segments.length)return;const e=[];for(let t=this.segments.length-1;t>0;t--){const i=this.segments[t-1],s=this.segments[t];if(i.getMemoryType(this).join(",")===s.getMemoryType(this).join(",")&&i.includeInChecksum===s.includeInChecksum&&s.addr===i.addr+i.data.length&&(s.flags&this.ELF_FLAG_EXEC)===(i.flags&this.ELF_FLAG_EXEC)){const e=new Uint8Array(i.data.length+s.data.length);e.set(i.data),e.set(s.data,i.data.length),i.data=e}else e.unshift(s)}e.unshift(this.segments[0]),this.segments=e}setMmuPageSize(e){if(this.MMU_PAGE_SIZE_CONF||e===this.IROM_ALIGN){if(this.MMU_PAGE_SIZE_CONF&&!this.MMU_PAGE_SIZE_CONF.includes(e)){const t=this.MMU_PAGE_SIZE_CONF.map(e=>e/1024+"KB").join(", ");throw new bo(`${e} bytes is not a valid ${this.ROM_LOADER.CHIP_NAME} page size, select from ${t}.`)}this.IROM_ALIGN=e}else console.warn(`WARNING: Changing MMU page size is not supported on ${this.ROM_LOADER.CHIP_NAME}! `+(0!==this.IROM_ALIGN?`Defaulting to ${this.IROM_ALIGN/1024}KB.`:""))}}class hc extends cc{constructor(e,t=null,i=!0,s=!1){super(e),this.securePad=null,this.flashMode=0,this.flashSizeFreq=0,this.version=1,this.WP_PIN_DISABLED=238,this.wpPin=this.WP_PIN_DISABLED,this.clkDrv=0,this.qDrv=0,this.dDrv=0,this.csDrv=0,this.hdDrv=0,this.wpDrv=0,this.chipId=0,this.minRev=0,this.minRevFull=0,this.maxRevFull=0,this.storedDigest=null,this.calcDigest=null,this.dataLength=0,this.IROM_ALIGN=65536,this.ROM_LOADER=e,this.appendDigest=i,this.ramOnlyHeader=s,null!==t&&this.loadFromFile(t)}async loadFromFile(e){const t=e instanceof Uint8Array?e:Gl(e);let i=0;const s=this.loadCommonHeader(t,i,rc);i+=8,this.loadExtendedHeader(t,i),i+=16;for(let e=0;e<s;e++){i+=8+this.loadSegment(t,i).data.length}if(this.checksum=this.readChecksum(t,i),i=oc(i,16),this.appendDigest){const e=i;this.storedDigest=t.slice(i,i+this.SHA256_DIGEST_LEN);const s=await crypto.subtle.digest("SHA-256",t.slice(0,e));this.calcDigest=new Uint8Array(s),this.dataLength=e-0}this.verify()}isFlashAddr(e){return this.ROM_LOADER.IROM_MAP_START<=e&&e<this.ROM_LOADER.IROM_MAP_END||this.ROM_LOADER.DROM_MAP_START<=e&&e<this.ROM_LOADER.DROM_MAP_END}async save(){let e=0;const t=new Uint8Array(1048576);let i=0;this.writeCommonHeader(t,i,this.segments.length),i+=8,this.saveExtendedHeader(t,i),i+=16;let s=239;const r=this.segments.filter(e=>this.isFlashAddr(e.addr)).sort((e,t)=>e.addr-t.addr),o=this.segments.filter(e=>!this.isFlashAddr(e.addr)).sort((e,t)=>e.addr-t.addr);for(let e=0;e<r.length;e++){const t=r[e];if(t instanceof lc&&".flash.appdesc"===t.name){r.splice(e,1),r.unshift(t);break}}for(let e=0;e<o.length;e++){const t=o[e];if(t instanceof lc&&".dram0.bootdesc"===t.name){o.splice(e,1),o.unshift(t);break}}if(r.length>0){let e=r[0].addr;for(const t of r.slice(1)){if(Math.floor(t.addr/this.IROM_ALIGN)===Math.floor(e/this.IROM_ALIGN))throw new bo(`Segment loaded at 0x${t.addr.toString(16)} lands in same 64KB flash mapping as segment loaded at 0x${e.toString(16)}. Can't generate binary. Suggest changing linker script or ELF to merge sections.`);e=t.addr}}if(this.ramOnlyHeader){for(const r of o)s=this.saveSegment(t,i,r,s),i+=8+r.data.length,e++;this.appendChecksum(t,i,s),i=oc(i,16);for(const o of r.reverse()){let r=this.getAlignmentDataNeeded(o,i);if(r>0){r<this.ROM_LOADER.BOOTLOADER_FLASH_OFFSET-this.SEG_HEADER_LEN&&(r+=this.IROM_ALIGN),r-=this.ROM_LOADER.BOOTLOADER_FLASH_OFFSET;const o=new nc(0,new Uint8Array(r).fill(0),i);s=this.saveSegment(t,i,o,s),i+=8+r,e++}this.saveFlashSegment(t,i,o),i+=8+o.data.length,e++}}else{for(;r.length>0;){const a=r[0],n=this.getAlignmentDataNeeded(a,i);if(n>0){if(o.length>0&&n>this.SEG_HEADER_LEN){const e=o[0].splitImage(n);0===o[0].data.length&&o.shift(),s=this.saveSegment(t,i,e,s)}else{const e=new nc(0,new Uint8Array(n).fill(0),i);s=this.saveSegment(t,i,e,s)}i+=8+n,e++}else{if((i+8)%this.IROM_ALIGN!==a.addr%this.IROM_ALIGN)throw new Error("Flash segment alignment mismatch");s=this.saveFlashSegment(t,i,a,s),r.shift(),i+=8+a.data.length,e++}}for(const r of o)s=this.saveSegment(t,i,r,s),i+=8+r.data.length,e++}if(this.securePad){if(!this.appendDigest)throw new Error("secure_pad only applies if a SHA-256 digest is also appended to the image");const r=(i+this.SEG_HEADER_LEN)%this.IROM_ALIGN,o=16;let a=0;"1"===this.securePad?a=112:"2"===this.securePad&&(a=32);const n=(this.IROM_ALIGN-r-o-a)%this.IROM_ALIGN,l=new nc(0,new Uint8Array(n).fill(0),i);s=this.saveSegment(t,i,l,s),i+=8+n,e++}this.ramOnlyHeader||(this.appendChecksum(t,i,s),i=oc(i,16));const a=i;if(this.ramOnlyHeader?t[1]=o.length:t[1]=e,this.appendDigest){const e=await crypto.subtle.digest("SHA-256",t.slice(0,a)),s=new Uint8Array(e);t.set(s,a),i+=32}if(this.padToSize&&i%this.padToSize!==0){const e=this.padToSize-i%this.padToSize,s=new Uint8Array(e);s.fill(255),t.set(s,i),i+=e}return t}loadExtendedHeader(e,t){const i=new DataView(e.buffer,t);this.wpPin=i.getUint8(0);const s=i.getUint8(1);[this.clkDrv,this.qDrv]=this.splitByte(s);const r=i.getUint8(2);[this.dDrv,this.csDrv]=this.splitByte(r);const o=i.getUint8(3);[this.hdDrv,this.wpDrv]=this.splitByte(o),this.chipId=i.getUint8(4),this.chipId!==this.ROM_LOADER.IMAGE_CHIP_ID&&console.warn(`Unexpected chip id in image. Expected ${this.ROM_LOADER.IMAGE_CHIP_ID} but value was ${this.chipId}. Is this image for a different chip model?`),this.minRev=i.getUint8(5),this.minRevFull=i.getUint16(6,!0),this.maxRevFull=i.getUint16(8,!0);const a=i.getUint8(15);if(0!==a&&1!==a)throw new Error(`Invalid value for append_digest field (0x${a.toString(16)}). Should be 0 or 1.`);this.appendDigest=1===a}saveExtendedHeader(e,t){const i=new ArrayBuffer(16),s=new DataView(i);s.setUint8(0,this.wpPin),s.setUint8(1,this.joinByte(this.clkDrv,this.qDrv)),s.setUint8(2,this.joinByte(this.dDrv,this.csDrv)),s.setUint8(3,this.joinByte(this.hdDrv,this.wpDrv)),s.setUint8(4,this.ROM_LOADER.IMAGE_CHIP_ID),s.setUint8(5,this.minRev),s.setUint16(6,this.minRevFull,!0),s.setUint16(8,this.maxRevFull,!0);for(let e=9;e<15;e++)s.setUint8(e,0);s.setUint8(15,this.appendDigest?1:0),e.set(new Uint8Array(i),t)}splitByte(e){return[15&e,e>>4&15]}joinByte(e,t){return 15&e|(15&t)<<4}getAlignmentDataNeeded(e,t){const i=e.addr%this.IROM_ALIGN-this.SEG_HEADER_LEN;let s=this.IROM_ALIGN-t%this.IROM_ALIGN+i;return 0===s||s===this.IROM_ALIGN?0:(s-=this.SEG_HEADER_LEN,s<0&&(s+=this.IROM_ALIGN),s)}}class dc extends cc{constructor(e,t=null){super(e),this.version=1,this.ROM_LOADER=e,this.flashMode=0,this.flashSizeFreq=0,null!==t&&this.loadFromFile(t)}loadFromFile(e){const t=e instanceof Uint8Array?e:Gl(e);let i=0;const s=this.loadCommonHeader(t,i,rc);i+=8;for(let e=0;e<s;e++){i+=8+this.loadSegment(t,i).data.length}this.checksum=this.readChecksum(t,i),this.verify()}defaultOutputName(e){return e+"-"}}class pc extends cc{constructor(e,t=null){super(e),this.version=2,this.ROM_LOADER=e,this.flashMode=0,this.flashSizeFreq=0,null!==t&&this.loadFromFile(t)}async loadFromFile(e){const t=e instanceof Uint8Array?e:Gl(e);let i=0;const s=this.loadCommonHeader(t,i,pc.IMAGE_V2_MAGIC);i+=8,s!==pc.IMAGE_V2_SEGMENT&&console.warn(`Warning: V2 header has unexpected "segment" count ${s} (usually 4)`);const r=this.flashMode,o=this.flashSizeFreq,a=this.entrypoint,n=this.loadSegment(t,i,!0);n.addr=0,n.includeInChecksum=!1,i+=8+n.data.length;const l=this.loadCommonHeader(t,i,rc);i+=8,r!==this.flashMode&&console.warn(`WARNING: Flash mode value in first header (0x${r.toString(16)}) disagrees with second (0x${this.flashMode.toString(16)}). Using second value.`),o!==this.flashSizeFreq&&console.warn(`WARNING: Flash size/freq value in first header (0x${o.toString(16)}) disagrees with second (0x${this.flashSizeFreq.toString(16)}). Using second value.`),a!==this.entrypoint&&console.warn(`WARNING: Entrypoint address in first header (0x${a.toString(16)}) disagrees with second header (0x${this.entrypoint.toString(16)}). Using second value.`);for(let e=0;e<l;e++){i+=8+this.loadSegment(t,i).data.length}this.checksum=this.readChecksum(t,i),this.verify()}defaultOutputName(e){const t=this.getIromSegment();let i=0;null!==t&&(i=t.addr-ic.IROM_MAP_START);return`${e.replace(/\.[^/.]+$/,"")}-0x${(-4096&i).toString(16).padStart(5,"0")}.bin`}}pc.IMAGE_V2_MAGIC=234,pc.IMAGE_V2_SEGMENT=4;class uc extends hc{constructor(e,t=null,i=!0,s=!1){super(e,t,i,s),this.ROM_LOADER=e}}class gc extends hc{constructor(e,t=null,i=!0,s=!1){super(e,t,i,s),this.ROM_LOADER=e}}class Ac extends hc{constructor(e,t=null,i=!0,s=!1){super(e,t,i,s),this.ROM_LOADER=e}}class _c extends hc{constructor(e,t=null,i=!0,s=!1){super(e,t,i,s),this.MMU_PAGE_SIZE_CONF=[16384,32768,65536],this.ROM_LOADER=e}}class fc extends hc{constructor(e,t=null,i=!0,s=!1){super(e,t,i,s),this.MMU_PAGE_SIZE_CONF=[8192,16384,32768,65536],this.ROM_LOADER=e}}class mc extends fc{constructor(e,t=null,i=!0,s=!1){super(e,t,i,s),this.ROM_LOADER=e}}class wc extends hc{constructor(e,t=null,i=!0,s=!1){super(e,t,i,s),this.ROM_LOADER=e}}class vc extends hc{constructor(e,t=null,i=!0,s=!1){super(e,t,i,s),this.ROM_LOADER=e}}class bc extends fc{constructor(e,t=null,i=!0,s=!1){super(e,t,i,s),this.ROM_LOADER=e}}async function Ec(e,t){const i=t instanceof Uint8Array?t:Gl(t),s=e.CHIP_NAME.toLowerCase().replace(/[-()]/g,"");let r;if("esp8266"!==s)switch(s){case"esp32":r=hc;break;case"esp32s2":r=uc;break;case"esp32s3":r=gc;break;case"esp32c3":r=Ac;break;case"esp32c2":r=_c;break;case"esp32c6":r=fc;break;case"esp32c61":r=mc;break;case"esp32c5":r=wc;break;case"esp32h2":r=bc;break;case"esp32p4":r=vc;break;default:throw new bo(`Unsupported chip name: ${s}`)}else{const e=i[0];if(e===rc)r=dc;else{if(e!==pc.IMAGE_V2_MAGIC)throw new bo(`Invalid image magic number: ${e}`);r=pc}}const o=new r(e),a=o;if("function"==typeof a.loadFromFile){const e=a.loadFromFile(i);e instanceof Promise&&await e}return o}class yc{constructor(e){var t,i,s,r,o,a,n,l;this.ESP_RAM_BLOCK=6144,this.ESP_FLASH_BEGIN=2,this.ESP_FLASH_DATA=3,this.ESP_FLASH_END=4,this.ESP_MEM_BEGIN=5,this.ESP_MEM_END=6,this.ESP_MEM_DATA=7,this.ESP_WRITE_REG=9,this.ESP_READ_REG=10,this.ESP_SPI_ATTACH=13,this.ESP_CHANGE_BAUDRATE=15,this.ESP_FLASH_DEFL_BEGIN=16,this.ESP_FLASH_DEFL_DATA=17,this.ESP_FLASH_DEFL_END=18,this.ESP_SPI_FLASH_MD5=19,this.ESP_ERASE_FLASH=208,this.ESP_ERASE_REGION=209,this.ESP_READ_FLASH=210,this.ESP_RUN_USER_CODE=211,this.ESP_IMAGE_MAGIC=233,this.ESP_CHECKSUM_MAGIC=239,this.ROM_INVALID_RECV_MSG=5,this.DEFAULT_TIMEOUT=3e3,this.ERASE_REGION_TIMEOUT_PER_MB=3e4,this.ERASE_WRITE_TIMEOUT_PER_MB=4e4,this.MD5_TIMEOUT_PER_MB=8e3,this.CHIP_ERASE_TIMEOUT=12e4,this.FLASH_READ_TIMEOUT=1e5,this.MAX_TIMEOUT=2*this.CHIP_ERASE_TIMEOUT,this.SPI_ADDR_REG_MSB=!0,this.CHIP_DETECT_MAGIC_REG_ADDR=1073745920,this.DETECTED_FLASH_SIZES={18:"256KB",19:"512KB",20:"1MB",21:"2MB",22:"4MB",23:"8MB",24:"16MB",25:"32MB",26:"64MB",27:"128MB",28:"256MB",32:"64MB",33:"128MB",34:"256MB",50:"256KB",51:"512KB",52:"1MB",53:"2MB",54:"4MB",55:"8MB",56:"16MB",57:"32MB",58:"64MB"},this.USB_JTAG_SERIAL_PID=4097,this.romBaudrate=115200,this.debugLogging=!1,this.syncStubDetected=!1,this.IS_STUB=!1,this.FLASH_WRITE_SIZE=16384,this.transport=e.transport,this.baudrate=e.baudrate,this.resetConstructors={classicReset:(e,t)=>new Yl(e,t),customReset:(e,t)=>new Jl(e,t),hardReset:(e,t)=>new Wl(e,t),usbJTAGSerialReset:e=>new Kl(e)},e.serialOptions&&(this.serialOptions=e.serialOptions),e.terminal&&(this.terminal=e.terminal,this.terminal.clean()),void 0!==e.debugLogging&&(this.debugLogging=e.debugLogging),e.port&&(this.transport=new $l(e.port)),void 0!==e.enableTracing&&(this.transport.tracing=e.enableTracing),(null===(t=e.resetConstructors)||void 0===t?void 0:t.classicReset)&&(this.resetConstructors.classicReset=null===(i=e.resetConstructors)||void 0===i?void 0:i.classicReset),(null===(s=e.resetConstructors)||void 0===s?void 0:s.customReset)&&(this.resetConstructors.customReset=null===(r=e.resetConstructors)||void 0===r?void 0:r.customReset),(null===(o=e.resetConstructors)||void 0===o?void 0:o.hardReset)&&(this.resetConstructors.hardReset=null===(a=e.resetConstructors)||void 0===a?void 0:a.hardReset),(null===(n=e.resetConstructors)||void 0===n?void 0:n.usbJTAGSerialReset)&&(this.resetConstructors.usbJTAGSerialReset=null===(l=e.resetConstructors)||void 0===l?void 0:l.usbJTAGSerialReset),this.info("esptool.js"),this.info("Serial port "+this.transport.getInfo())}write(e,t=!0){this.terminal?t?this.terminal.writeLine(e):this.terminal.write(e):console.log(e)}error(e,t=!0){this.write(`Error: ${e}`,t)}info(e,t=!0){this.write(e,t)}debug(e,t=!0){this.debugLogging&&this.write(`Debug: ${e}`,t)}_shortToBytearray(e){return new Uint8Array([255&e,e>>8&255])}_intToByteArray(e){return new Uint8Array([255&e,e>>8&255,e>>16&255,e>>24&255])}_byteArrayToShort(e,t){return e|t>>8}_byteArrayToInt(e,t,i,s){return e|t<<8|i<<16|s<<24}_appendBuffer(e,t){const i=new Uint8Array(e.byteLength+t.byteLength);return i.set(new Uint8Array(e),0),i.set(new Uint8Array(t),e.byteLength),i.buffer}_appendArray(e,t){const i=new Uint8Array(e.length+t.length);return i.set(e,0),i.set(t,e.length),i}ui8ToBstr(e){let t="";for(let i=0;i<e.length;i++)t+=String.fromCharCode(e[i]);return t}bstrToUi8(e){const t=new Uint8Array(e.length);for(let i=0;i<e.length;i++)t[i]=e.charCodeAt(i);return t}async readPacket(e=null,t=this.DEFAULT_TIMEOUT){for(let i=0;i<100;i++){const i=await this.transport.read(t);if(!i||i.length<8)continue;const s=i[0];if(1!==s)continue;const r=i[1],o=this._byteArrayToInt(i[4],i[5],i[6],i[7]),a=i.slice(8);if(1==s){if(null==e||r==e)return[o,a];if(0!=a[0]&&a[1]==this.ROM_INVALID_RECV_MSG)throw this.transport.flushInput(),new bo("unsupported command error")}}throw new bo("invalid response")}async command(e=null,t=new Uint8Array(0),i=0,s=!0,r=this.DEFAULT_TIMEOUT){if(null!=e){this.transport.tracing&&this.transport.trace(`command op:0x${e.toString(16).padStart(2,"0")} data len=${t.length} wait_response=${s?1:0} timeout=${(r/1e3).toFixed(3)} data=${this.transport.hexConvert(t)}`);const o=new Uint8Array(8+t.length);let a;for(o[0]=0,o[1]=e,o[2]=this._shortToBytearray(t.length)[0],o[3]=this._shortToBytearray(t.length)[1],o[4]=this._intToByteArray(i)[0],o[5]=this._intToByteArray(i)[1],o[6]=this._intToByteArray(i)[2],o[7]=this._intToByteArray(i)[3],a=0;a<t.length;a++)o[8+a]=t[a];await this.transport.write(o)}return s?this.readPacket(e,r):[0,new Uint8Array(0)]}async readReg(e,t=this.DEFAULT_TIMEOUT){this.debug(`Read Register:${this.toHex(e)}`);const i=this._intToByteArray(e),s=await this.command(this.ESP_READ_REG,i,void 0,void 0,t);return this.debug(`Read Register Value:${s[0]}`),s[0]}async writeReg(e,t,i=4294967295,s=0,r=0){let o=this._appendArray(this._intToByteArray(e),this._intToByteArray(t));o=this._appendArray(o,this._intToByteArray(i)),o=this._appendArray(o,this._intToByteArray(s)),r>0&&(o=this._appendArray(o,this._intToByteArray(this.chip.UART_DATE_REG_ADDR)),o=this._appendArray(o,this._intToByteArray(0)),o=this._appendArray(o,this._intToByteArray(0)),o=this._appendArray(o,this._intToByteArray(r))),await this.checkCommand("write target memory",this.ESP_WRITE_REG,o)}async sync(){this.debug("Sync");const e=new Uint8Array(36);let t;for(e[0]=7,e[1]=7,e[2]=18,e[3]=32,t=0;t<32;t++)e[4+t]=85;try{let t=await this.command(8,e,void 0,void 0,100);this.syncStubDetected=0===t[0];for(let e=0;e<7;e++)t=await this.readPacket(8,100),this.syncStubDetected=this.syncStubDetected&&0===t[0];return t}catch(e){throw this.debug("Sync err "+e),e}}async _connectAttempt(e="default_reset",t){this.debug("_connect_attempt "+e),t&&await t.reset();const i=this.transport.peek(),s=Array.from(i,e=>String.fromCharCode(e)).join("").match(/boot:(0x[0-9a-fA-F]+)([\s\S]*?waiting for download)?/);let r=!1,o="",a=!1;s&&(r=!0,o=s[1],a=!!s[2]),this.debug(`bootMode:${o} downloadMode:${a}`);let n="";for(let e=0;e<5;e++)try{this.debug(`Sync connect attempt ${e}`),this.transport.flushInput();const t=await this.sync();return this.debug(t[0].toString()),"success"}catch(e){this.debug(`Error at sync ${e}`),n=e instanceof Error?e.message:"string"==typeof e?e:JSON.stringify(e)}return r&&(n=`Wrong boot mode detected (${o}).\n        This chip needs to be in download mode.`,a&&(n="Download mode successfully detected, but getting no sync reply:\n           The serial TX path seems to be down.")),n}constructResetSequence(e){if("no_reset"!==e)if("usb_reset"===e||this.transport.getPid()===this.USB_JTAG_SERIAL_PID){if(this.resetConstructors.usbJTAGSerialReset)return this.debug("using USB JTAG Serial Reset"),[this.resetConstructors.usbJTAGSerialReset(this.transport)]}else{const e=50,t=e+500;if(this.resetConstructors.classicReset)return this.debug("using Classic Serial Reset"),[this.resetConstructors.classicReset(this.transport,e),this.resetConstructors.classicReset(this.transport,t)]}return[]}async connect(e="default_reset",t=7,i=!0){let s;this.info("Connecting...",!1),await this.transport.connect(this.romBaudrate,this.serialOptions),this.transport.readLoop();const r=this.constructResetSequence(e);for(let i=0;i<t;i++){const t=r.length>0?r[i%r.length]:null;if(s=await this._connectAttempt(e,t),"success"===s)break}if("success"!==s)throw new bo("Failed to connect with the device");if(this.debug("Connect attempt successful."),this.info("\n\r",!1),i){const e=await this.readReg(this.CHIP_DETECT_MAGIC_REG_ADDR)>>>0;this.debug("Chip Magic "+e.toString(16));const t=await async function(e){switch(e){case 15736195:{const{ESP32ROM:e}=await Promise.resolve().then(function(){return gp});return new e}case 203546735:case 1867591791:case 2084675695:{const{ESP32C2ROM:e}=await Promise.resolve().then(function(){return fp});return new e}case 1763790959:case 456216687:case 1216438383:case 1130455151:{const{ESP32C3ROM:e}=await Promise.resolve().then(function(){return _p});return new e}case 752910447:{const{ESP32C6ROM:e}=await Promise.resolve().then(function(){return wp});return new e}case 606167151:case 871374959:case 1333878895:{const{ESP32C61ROM:e}=await Promise.resolve().then(function(){return vp});return new e}case 285294703:case 1675706479:case 1607549039:{const{ESP32C5ROM:e}=await Promise.resolve().then(function(){return bp});return new e}case 3619110528:case 2548236392:{const{ESP32H2ROM:e}=await Promise.resolve().then(function(){return Ep});return new e}case 9:{const{ESP32S3ROM:e}=await Promise.resolve().then(function(){return yp});return new e}case 1990:{const{ESP32S2ROM:e}=await Promise.resolve().then(function(){return Cp});return new e}case 4293968129:{const{ESP8266ROM:e}=await Promise.resolve().then(function(){return sc});return new e}case 0:case 182303440:case 117676761:{const{ESP32P4ROM:e}=await Promise.resolve().then(function(){return xp});return new e}default:return null}}(e);if(null===typeof this.chip)throw new bo(`Unexpected CHIP magic value ${e}. Failed to autodetect chip type.`);this.chip=t}}async detectChip(e="default_reset"){await this.connect(e),this.info("Detecting chip type... ",!1),null!=this.chip?this.info(this.chip.CHIP_NAME):this.info("unknown!")}async checkCommand(e="",t=null,i=new Uint8Array(0),s=0,r=0,o=this.DEFAULT_TIMEOUT){this.debug("check_command "+e);const a=await this.command(t,i,s,void 0,o);if(a&&a[1]&&a[1].length<r+2){const t=a[1].slice(0,2);throw 0!==t[0]?new bo(`Failed to ${e} failed with status ${t}`):new bo(`Failed to ${e}.\n Only got ${a[1].length} bytes of data.`)}const n=a[1].slice(r,r+2);if(0!==n[0])throw new bo(`Failed to ${e} failed with status ${n}`);return r>0?a[1].slice(0,r):a[0]}async memBegin(e,t,i,s){if(this.IS_STUB){const t=s,i=s+e,r=this.chip.getChipRevision?await this.chip.getChipRevision(this):void 0,o=await ql(this.chip.CHIP_NAME,r);if(o){const e=[[o.bss_start||o.data_start,o.data_start+o.decodedData.length],[o.text_start,o.text_start+o.decodedText.length]];for(const[s,r]of e)if(t<r&&i>s)throw new bo(`Software loader is resident at 0x${s.toString(16).padStart(8,"0")}-0x${r.toString(16).padStart(8,"0")}.\n            Can't load binary at overlapping address range 0x${t.toString(16).padStart(8,"0")}-0x${i.toString(16).padStart(8,"0")}.\n            Either change binary loading address, or use the no-stub option to disable the software loader.`)}}this.debug("mem_begin "+e+" "+t+" "+i+" "+s.toString(16));let r=this._appendArray(this._intToByteArray(e),this._intToByteArray(t));r=this._appendArray(r,this._intToByteArray(i)),r=this._appendArray(r,this._intToByteArray(s)),await this.checkCommand("enter RAM download mode",this.ESP_MEM_BEGIN,r)}checksum(e,t=this.ESP_CHECKSUM_MAGIC){for(let i=0;i<e.length;i++)t^=e[i];return t}async memBlock(e,t){let i=this._appendArray(this._intToByteArray(e.length),this._intToByteArray(t));i=this._appendArray(i,this._intToByteArray(0)),i=this._appendArray(i,this._intToByteArray(0)),i=this._appendArray(i,e);const s=this.checksum(e);await this.checkCommand("write to target RAM",this.ESP_MEM_DATA,i,s)}async memFinish(e){const t=0===e?1:0,i=this._appendArray(this._intToByteArray(t),this._intToByteArray(e));await this.checkCommand("leave RAM download mode",this.ESP_MEM_END,i,void 0,void 0,200)}async flashSpiAttach(e){const t=this._intToByteArray(e);await this.checkCommand("configure SPI flash pins",this.ESP_SPI_ATTACH,t)}timeoutPerMb(e,t){const i=e*(t/1e6);return i<3e3?3e3:i}async flashBegin(e,t){const i=Math.floor((e+this.FLASH_WRITE_SIZE-1)/this.FLASH_WRITE_SIZE),s=this.chip.getEraseSize(t,e),r=new Date,o=r.getTime();let a=3e3;0==this.IS_STUB&&(a=this.timeoutPerMb(this.ERASE_REGION_TIMEOUT_PER_MB,e)),this.debug("flash begin "+s+" "+i+" "+this.FLASH_WRITE_SIZE+" "+t+" "+e);let n=this._appendArray(this._intToByteArray(s),this._intToByteArray(i));n=this._appendArray(n,this._intToByteArray(this.FLASH_WRITE_SIZE)),n=this._appendArray(n,this._intToByteArray(t)),0==this.IS_STUB&&(n=this._appendArray(n,this._intToByteArray(0))),await this.checkCommand("enter Flash download mode",this.ESP_FLASH_BEGIN,n,void 0,void 0,a);const l=r.getTime();return 0!=e&&0==this.IS_STUB&&this.info("Took "+(l-o)/1e3+"."+(l-o)%1e3+"s to erase flash block"),i}async flashDeflBegin(e,t,i){const s=Math.floor((t+this.FLASH_WRITE_SIZE-1)/this.FLASH_WRITE_SIZE),r=Math.floor((e+this.FLASH_WRITE_SIZE-1)/this.FLASH_WRITE_SIZE),o=new Date,a=o.getTime();let n,l;this.IS_STUB?(n=e,l=this.DEFAULT_TIMEOUT):(n=r*this.FLASH_WRITE_SIZE,l=this.timeoutPerMb(this.ERASE_REGION_TIMEOUT_PER_MB,n)),this.info("Compressed "+e+" bytes to "+t+"...");let c=this._appendArray(this._intToByteArray(n),this._intToByteArray(s));c=this._appendArray(c,this._intToByteArray(this.FLASH_WRITE_SIZE)),c=this._appendArray(c,this._intToByteArray(i)),"ESP32-S2"!==this.chip.CHIP_NAME&&"ESP32-S3"!==this.chip.CHIP_NAME&&"ESP32-C3"!==this.chip.CHIP_NAME&&"ESP32-C2"!==this.chip.CHIP_NAME||!1!==this.IS_STUB||(c=this._appendArray(c,this._intToByteArray(0))),await this.checkCommand("enter compressed flash mode",this.ESP_FLASH_DEFL_BEGIN,c,void 0,void 0,l);const h=o.getTime();return 0!=e&&!1===this.IS_STUB&&this.info("Took "+(h-a)/1e3+"."+(h-a)%1e3+"s to erase flash block"),s}async flashBlock(e,t,i){let s=this._appendArray(this._intToByteArray(e.length),this._intToByteArray(t));s=this._appendArray(s,this._intToByteArray(0)),s=this._appendArray(s,this._intToByteArray(0)),s=this._appendArray(s,e);const r=this.checksum(e);await this.checkCommand("write to target Flash after seq "+t,this.ESP_FLASH_DATA,s,r,void 0,i)}async flashDeflBlock(e,t,i){let s=this._appendArray(this._intToByteArray(e.length),this._intToByteArray(t));s=this._appendArray(s,this._intToByteArray(0)),s=this._appendArray(s,this._intToByteArray(0)),s=this._appendArray(s,e);const r=this.checksum(e);this.debug("flash_defl_block "+e[0].toString(16)+" "+e[1].toString(16)),await this.checkCommand("write compressed data to flash after seq "+t,this.ESP_FLASH_DEFL_DATA,s,r,void 0,i)}async flashFinish(e=!1,t=this.DEFAULT_TIMEOUT){const i=e?0:1,s=this._intToByteArray(i);await this.checkCommand("leave Flash mode",this.ESP_FLASH_END,s,void 0,void 0,t)}async flashDeflFinish(e=!1,t=this.DEFAULT_TIMEOUT){const i=e?0:1,s=this._intToByteArray(i);await this.checkCommand("leave compressed flash mode",this.ESP_FLASH_DEFL_END,s,void 0,void 0,t)}async runSpiflashCommand(e,t,i,s=null,r=0,o=0){const a=1<<30,n=this.chip.SPI_REG_BASE,l=n+0,c=n+4,h=n+this.chip.SPI_USR_OFFS,d=n+this.chip.SPI_USR1_OFFS,p=n+this.chip.SPI_USR2_OFFS,u=n+this.chip.SPI_W0_OFFS;let g;g=null!=this.chip.SPI_MOSI_DLEN_OFFS?async(e,t)=>{const i=n+this.chip.SPI_MOSI_DLEN_OFFS,s=n+this.chip.SPI_MISO_DLEN_OFFS;e>0&&await this.writeReg(i,e-1),t>0&&await this.writeReg(s,t-1);let a=0;o>0&&(a|=o-1),r>0&&(a|=r-1<<_),a&&await this.writeReg(d,a)}:async(e,t)=>{const i=d;let s=(0===t?0:t-1)<<8|(0===e?0:e-1)<<17;o>0&&(s|=o-1),r>0&&(s|=r-1<<_),await this.writeReg(i,s)};const A=1<<18,_=26;if(i>32)throw new bo("Reading more than 32 bits back from a SPI flash operation is unsupported");if(t.length>64)throw new bo("Writing more than 64 bytes of data with one SPI command is unsupported");const f=8*t.length,m=await this.readReg(h),w=await this.readReg(p);let v=1<<31;i>0&&(v|=268435456),f>0&&(v|=134217728),r>0&&(v|=a),o>0&&(v|=536870912),await g(f,i),await this.writeReg(h,v);let b,E=7<<28|e;if(await this.writeReg(p,E),s&&r>0&&(this.SPI_ADDR_REG_MSB&&(s<<=32-r),await this.writeReg(c,s)),0==f)await this.writeReg(u,0);else{t=Hl(t,4,0);const e=[];for(let i=0;i<t.length;i+=4)e.push((t[i]|t[i+1]<<8|t[i+2]<<16|t[i+3]<<24)>>>0);let i=u;for(const t of e)await this.writeReg(i,t),i+=4}for(await this.writeReg(l,A),b=0;b<10&&(E=await this.readReg(l)&A,0!=E);b++);if(10===b)throw new bo("SPI command did not complete in time");const y=await this.readReg(u);return await this.writeReg(h,m),await this.writeReg(p,w),y}async readFlashId(){const e=new Uint8Array(0);return await this.runSpiflashCommand(159,e,24)}async eraseFlash(){this.info("Erasing flash (this may take a while)...");let e=new Date;const t=e.getTime(),i=await this.checkCommand("erase flash",this.ESP_ERASE_FLASH,void 0,void 0,void 0,this.CHIP_ERASE_TIMEOUT);e=new Date;const s=e.getTime();return this.info("Chip erase completed successfully in "+(s-t)/1e3+"s"),i}toHex(e){return Array.prototype.map.call(e,e=>("00"+e.toString(16)).slice(-2)).join("")}async flashMd5sum(e,t){const i=this.timeoutPerMb(this.MD5_TIMEOUT_PER_MB,t);let s=this._appendArray(this._intToByteArray(e),this._intToByteArray(t));s=this._appendArray(s,this._intToByteArray(0)),s=this._appendArray(s,this._intToByteArray(0));const r=this.IS_STUB?16:32,o=await this.checkCommand("calculate md5sum",this.ESP_SPI_FLASH_MD5,s,void 0,r,i);return this.toHex(o)}async readFlash(e,t,i=null){let s=this._appendArray(this._intToByteArray(e),this._intToByteArray(t));s=this._appendArray(s,this._intToByteArray(4096)),s=this._appendArray(s,this._intToByteArray(1024));const r=await this.checkCommand("read flash",this.ESP_READ_FLASH,s);if(0!=r)throw new bo("Failed to read memory: "+r);let o=new Uint8Array(0);for(;o.length<t;){const e=await this.transport.read(this.FLASH_READ_TIMEOUT);if(!(e instanceof Uint8Array))throw new bo("Failed to read memory: "+e);e.length>0&&(o=this._appendArray(o,e),await this.transport.write(this._intToByteArray(o.length)),i&&i(e,o.length,t))}return o}async runStub(){if(this.syncStubDetected)return this.info("Stub is already running. No upload is necessary."),this.chip;this.info("Uploading stub...");const e=this.chip.getChipRevision?await this.chip.getChipRevision(this):void 0,t=await ql(this.chip.CHIP_NAME,e);if(void 0===t)throw this.debug("Error loading Stub json"),new Error("Error loading Stub json");const i=[t.decodedText,t.decodedData];for(let e=0;e<i.length;e++)if(i[e]){const s=0===e?t.text_start:t.data_start,r=i[e].length,o=Math.floor((r+this.ESP_RAM_BLOCK-1)/this.ESP_RAM_BLOCK);await this.memBegin(r,o,this.ESP_RAM_BLOCK,s);for(let t=0;t<o;t++){const s=t*this.ESP_RAM_BLOCK,r=s+this.ESP_RAM_BLOCK;await this.memBlock(i[e].slice(s,r),t)}}this.info("Running stub..."),await this.memFinish(t.entry);const s=await this.transport.read(this.DEFAULT_TIMEOUT),r=String.fromCharCode(...s);if("OHAI"!==r)throw new bo(`Failed to start stub. Unexpected response ${r}`);return this.info("Stub running..."),this.IS_STUB=!0,this.chip}async changeBaud(){this.info("Changing baudrate to "+this.baudrate);const e=this.IS_STUB?this.romBaudrate:0,t=this._appendArray(this._intToByteArray(this.baudrate),this._intToByteArray(e));await this.command(this.ESP_CHANGE_BAUDRATE,t),this.info("Changed"),this.info("If the chip does not respond to any further commands, consider using a lower baud rate."),await Ll(50),await this.transport.disconnect(),await Ll(50),await this.transport.connect(this.baudrate,this.serialOptions),await Ll(50),this.transport.readLoop()}async main(e="default_reset"){await this.detectChip(e);const t=await this.chip.getChipDescription(this);if(this.chip.getChipRevision){const e=await this.chip.getChipRevision(this);this.info("Chip Revision: "+e)}this.info("Chip is "+t),this.info("Features: "+await this.chip.getChipFeatures(this)),this.info("Crystal is "+await this.chip.getCrystalFreq(this)+"MHz"),this.info("MAC: "+await this.chip.readMac(this)),await this.chip.readMac(this),void 0!==this.chip.postConnect&&await this.chip.postConnect(this),await this.runStub(),this.romBaudrate!==this.baudrate&&await this.changeBaud();try{const e=await this.readFlashId();this.info("Flash ID: "+e.toString(16)),16777215!==e&&0!==e||this.info("WARNING: Failed to communicate with the flash chip,\nread/write operations will fail.\nTry checking the chip connections or removing\nany other hardware connected to IOs.")}catch(e){throw new bo("Unable to verify flash chip connection "+e)}return t}flashSizeBytes(e){let t=-1;return this.transport.trace(`Flash size string ${e}`),-1!==e.toString().indexOf("KB")?t=1024*parseInt(e.toString().slice(0,e.toString().indexOf("KB"))):-1!==e.toString().indexOf("MB")&&(t=1024*parseInt(e.toString().slice(0,e.toString().indexOf("MB")))*1024),this.transport.trace(`Flash size in bytes ${t}`),t}parseFlashSizeArg(e){if(void 0===this.chip.FLASH_SIZES[e])throw new bo("Flash size "+e+" is not supported by this chip type. Supported sizes: "+this.chip.FLASH_SIZES);return this.chip.FLASH_SIZES[e]}async _updateImageFlashParams(e,t,i="keep",s="keep",r="keep"){if(this.debug(`_update_image_flash_params ${r} ${i} ${s}`),e.length<8)return e;if(t!=this.chip.BOOTLOADER_FLASH_OFFSET)return e;if("keep"===r&&"keep"===i&&"keep"===s)return this.info("Not changing the image"),e;const o=e[0];let a=e[2];const n=e[3];if(o!==this.ESP_IMAGE_MAGIC)return this.info("Warning: Image file at 0x"+t.toString(16)+" doesn't look like an image file, so not changing any flash settings."),e;try{(await Ec(this.chip,e)).verify()}catch(i){return this.debug(`Warning: Image file at 0x${t.toString(16)} is not a valid ${this.chip.CHIP_NAME} image, so not changing any flash settings.`),e}const l="ESP8266"!==this.chip.CHIP_NAME&&49===e[23];if("keep"!==i){a={qio:0,qout:1,dio:2,dout:3}[i]}let c=15&n;if("keep"!==s){c={"40m":0,"26m":1,"20m":2,"80m":15}[s]}let h=240&n;if("keep"!==r)if("detect"===r){this.info("Configuring flash size...");const e=await this.detectFlashSize();this.info("Detected flash size set to "+e),h=this.parseFlashSizeArg(e)}else h=this.parseFlashSizeArg(r);const d=a<<8|c+h;this.info("Flash params set to "+d.toString(16));const p=new Uint8Array(e);if(e[2]!==a&&(p[2]=a),e[3]!==c+h&&(p[3]=c+h),l){const e=await Ec(this.chip,p),t=p.slice(0,e.datalength),i=p.slice(e.datalength+e.SHA256_DIGEST_LEN),s=await crypto.subtle.digest("SHA-256",i),r=new Uint8Array(s),o=new Uint8Array(t.length+r.length+i.length);o.set(t,0),o.set(r,t.length),o.set(i,t.length+r.length);const a=o.slice(e.datalength,e.datalength+e.SHA256_DIGEST_LEN);return this.transport.hexify(r)===this.transport.hexify(a)?this.info("SHA digest in image updated"):this.info(`WARNING: SHA recalculation for binary failed!\n\tExpected calculated SHA: ${this.transport.hexify(r)}\n\tSHA stored in binary:    ${this.transport.hexify(a)}`),o}return p}async writeFlash(e){if(this.debug("EspLoader program"),"keep"!==e.flashSize){const t=this.flashSizeBytes(e.flashSize);for(let i=0;i<e.fileArray.length;i++)if(e.fileArray[i].data.length+e.fileArray[i].address>t)throw new bo(`File ${i+1} doesn't fit in the available flash`)}let t,i;!0===this.IS_STUB&&!0===e.eraseAll&&await this.eraseFlash();for(let s=0;s<e.fileArray.length;s++){if(this.debug("Data Length "+e.fileArray[s].data.length),t=e.fileArray[s].data,this.debug("Image Length "+t.length),0===t.length){this.debug("Warning: File is empty");continue}t=Hl(t,4),i=e.fileArray[s].address,t=await this._updateImageFlashParams(t,i,e.flashMode,e.flashFreq,e.flashSize);let r=null;e.calculateMD5Hash&&(r=e.calculateMD5Hash(t),this.debug("Image MD5 "+r));const o=t.length;let a;if(e.compress){t=Ul(t,{level:9}),a=await this.flashDeflBegin(o,t.length,i)}else a=await this.flashBegin(o,i);let n=0,l=0;const c=t.length;e.reportProgress&&e.reportProgress(s,0,c);let h=new Date;const d=h.getTime();let p=5e3;const u=new Ol({chunkSize:1});let g=0;u.onData=function(e){g+=e.byteLength};let A=0;for(;A<t.length;){this.debug("Write loop "+i+" "+n+" "+a),this.info("Writing at 0x"+(i+g).toString(16)+"... ("+Math.floor(100*(n+1)/a)+"%)");const r=Math.min(this.FLASH_WRITE_SIZE,t.length-A),o=t.slice(A,A+r),h=A+r>=t.length;if(!e.compress)throw new bo("Yet to handle Non Compressed writes");{const e=g;u.push(o,h);const t=g-e;let i=3e3;this.timeoutPerMb(this.ERASE_WRITE_TIMEOUT_PER_MB,t)>3e3&&(i=this.timeoutPerMb(this.ERASE_WRITE_TIMEOUT_PER_MB,t)),!1===this.IS_STUB&&(p=i),await this.flashDeflBlock(o,n,p),this.IS_STUB&&(p=i)}l+=o.length,A+=r,n++,e.reportProgress&&e.reportProgress(s,l,c)}this.IS_STUB&&(e.compress?await this.flashDeflFinish(!1,p):await this.flashFinish(!1,p)),h=new Date;const _=h.getTime()-d;if(e.compress&&this.info("Wrote "+o+" bytes ("+l+" compressed) at 0x"+i.toString(16)+" in "+_/1e3+" seconds."),r){this.info("File  md5: "+r);const e=await this.flashMd5sum(i,o);if(this.info("Flash md5: "+e),new String(e).valueOf()!=new String(r).valueOf())throw new bo("MD5 of file does not match data in flash!");this.info("Hash of data verified.")}}this.info("Leaving...")}async flashId(){this.debug("flash_id");const e=await this.readFlashId();this.info("Manufacturer: "+(255&e).toString(16));const t=e>>16&255;this.info("Device: "+(e>>8&255).toString(16)+t.toString(16)),this.info("Detected flash size: "+this.DETECTED_FLASH_SIZES[t])}async detectFlashSize(){this.debug("detectFlashSize");const e=await this.readFlashId()>>16&255;let t=this.DETECTED_FLASH_SIZES[e];return t?this.info("Auto-detected Flash size: "+t):(t="4MB",this.info("Could not auto-detect Flash size. defaulting to 4MB")),t}async softReset(e){if(this.IS_STUB){if("ESP8266"!=this.chip.CHIP_NAME)throw new bo("Soft resetting is currently only supported on ESP8266");e?(await this.flashBegin(0,0),await this.flashFinish(!0)):await this.command(this.ESP_RUN_USER_CODE,void 0,void 0,!1)}else{if(e)return;await this.flashBegin(0,0),await this.flashFinish(!1)}}async after(e="hard_reset",t,i){switch(e){case"hard_reset":if(this.resetConstructors.hardReset){this.info("Hard resetting via RTS pin...");const e=this.resetConstructors.hardReset(this.transport,t);await e.reset()}break;case"soft_reset":this.info("Soft resetting..."),await this.softReset(!1);break;case"no_reset_stub":this.info("Staying in flasher stub.");break;case"custom_reset":if(i||this.info("Custom reset sequence not provided, doing nothing."),this.resetConstructors.customReset||this.info("Custom reset constructor not available, doing nothing."),this.resetConstructors.customReset&&i){this.info("Custom resetting using sequence "+i);const e=this.resetConstructors.customReset(this.transport,i);await e.reset()}break;default:this.info("Staying in bootloader."),this.IS_STUB&&this.softReset(!0)}}}const Cc=/MAC:\s*([0-9A-Fa-f:]{17})/;async function xc(e,t){if(!e.readable)try{await e.open({baudRate:115200})}catch{throw Object.assign(new Error("Could not open serial port. Unplug the device, plug it back in, and try again."),{errorKey:"usb.errors.port_open_failed"})}try{await e.setSignals({dataTerminalReady:!1,requestToSend:!0}),await new Promise(e=>setTimeout(e,200)),await e.setSignals({dataTerminalReady:!1,requestToSend:!1})}catch{}const i=t?.drainDelay??200,s=e.readable.getReader();await async function(e,t){const i=Date.now()+t;for(;Date.now()<i;){const t=i-Date.now();if(t<=0)break;await Promise.race([e.read(),new Promise(e=>setTimeout(e,t))])}}(s,i),ho(s);const r=e.writable.getWriter(),o=t?.handshakeRetryDelay??2e3,a=t?.handshakeDelay??3e3;let n=!1;for(let t=0;t<5;t++){t>0&&await new Promise(e=>setTimeout(e,o));try{await fo(r,go());const t=e.readable.getReader();try{await mo(t,a),n=!0}finally{ho(t)}}catch{}if(n)break}if(!n)throw r.releaseLock(),Object.assign(new Error("No response from device — it may be flashed with ethernet firmware which does not support WiFi configuration."),{errorKey:"usb.errors.no_device_response"});return r}async function Bc(e,t){const i=await xc(e,t);try{const s=po(3,[3,0]);await fo(i,s),await new Promise(e=>setTimeout(e,500));for(let s=0;s<3;s++){s>0&&await new Promise(e=>setTimeout(e,t?.retryDelay??3e3));const r=uo();await fo(i,r);const o=e.readable.getReader(),a=[],n=Date.now()+5e3,l=[];let c=!1;for(;Date.now()<n&&!c;)try{const e=await mo(o,n-Date.now(),l);for(const t of e.packets)if(4===t.type&&4===t.data[0]){const e=vo(t.data.slice(2,2+t.data[1]));if(null===e){if(c=!0,a.length>0)return{writer:i,reader:o,networks:a};break}a.push(e)}}catch{break}if(a.length>0)return{writer:i,reader:o,networks:a};ho(o)}return{writer:i,reader:e.readable.getReader(),networks:[]}}catch(e){try{i.releaseLock()}catch{}throw e}}async function Sc(e,t,i){await fo(e,function(e,t){const i=new TextEncoder,s=i.encode(e),r=i.encode(t);if(s.length>32)throw Object.assign(new Error(`SSID is too long: ${s.length} bytes (max 32)`),{errorKey:"wifi.errors.ssid_too_long"});if(r.length>64)throw Object.assign(new Error(`Password is too long: ${r.length} bytes (max 64)`),{errorKey:"wifi.errors.password_too_long"});return po(3,[1,1+s.length+1+r.length,s.length,...s,r.length,...r])}(t,i))}const Ic=1e3;async function Dc(e,t,i,s){const r=new TextDecoder,o=/(\d+\.\d+\.\d+\.\d+)/,a=Date.now()+i,n=s?.initialBuffer??[];let l=0,c=s?.startPolling??!1;const h=s?.signal;for(console.debug(`[detectIpAddress] enter timeout=${i}ms initialBuffer=${n.length}B startPolling=${c}`);Date.now()<a;){if(h?.aborted)throw console.debug("[detectIpAddress] aborted via signal"),Object.assign(new Error("aborted"),{errorKey:"flasher.errors.aborted"});c&&Date.now()-l>=Ic&&(console.debug("[detectIpAddress] polling GET_CURRENT_STATE"),await fo(t,go()),l=Date.now());try{const t=Math.min(Ic,a-Date.now()),i=await mo(e,t,n);for(const e of i.packets){if(2===e.type){const t=e.data[0],i={1:"Invalid command — device may need to be power-cycled",2:"Unknown command",3:"WiFi connection failed — check SSID/password and try again",4:"Not authorized"},s={1:"wifi.errors.invalid_command",2:"wifi.errors.unknown_command",3:"wifi.errors.connection_failed",4:"wifi.errors.not_authorized"}[t]??"wifi.errors.error_code";throw console.debug(`[detectIpAddress] ERROR_STATE code=${t} → ${s}`),Object.assign(new Error(i[t]??`WiFi error (code ${t})`),{errorKey:s,errorParams:"wifi.errors.error_code"===s?{code:t}:void 0})}if(4===e.type&&e.data.length>=3&&(1===e.data[0]||2===e.data[0])){const t=e.data[2];if(e.data.length<3+t){console.debug(`[detectIpAddress] truncated RPC_RESULT cmd=0x${e.data[0]?.toString(16)} urlLen=${t} dataLen=${e.data.length} — skipped`);continue}const i=r.decode(e.data.slice(3,3+t)),s=o.exec(i);if(s&&"0.0.0.0"!==s[1])return console.debug(`[detectIpAddress] exit: IP=${s[1]}`),s[1];s&&"0.0.0.0"===s[1]&&(c=!0)}}}catch(e){if(e instanceof Error&&"flasher.errors.timeout"!==e.errorKey)throw console.debug(`[detectIpAddress] exit: error "${e.message}"`),e}}throw console.debug("[detectIpAddress] exit: deadline exhausted, no IP received"),Object.assign(new Error("WiFi connection failed — check SSID/password and try again"),{errorKey:"wifi.errors.connection_failed"})}class Rc{constructor(e){this._serialPort=null,this._serialReader=null,this._serialWriter=null,this._wifiCheckAbort=null,this._wifiCheckPromise=null,this._host=e}get serialPort(){return this._serialPort}set serialPort(e){this._serialPort=e}tearDownSerialPort(){this._serialReader&&ho(this._serialReader);try{this._serialWriter?.releaseLock()}catch{}this._serialReader=null,this._serialWriter=null;const e=this._serialPort?.close().catch(()=>{})??Promise.resolve();return this._serialPort=null,e}async cancelAndTearDown(){const e=this._wifiCheckAbort,t=this._wifiCheckPromise;if(this._wifiCheckAbort=null,this._wifiCheckPromise=null,e?.abort(),t)try{await t}catch{}await this.tearDownSerialPort()}async handleUsbWifiConfig(){const e=this._host;if(e.opRunning)return void e.updateUsbState({step:"error",errorKey:"usb.errors.serial_port_busy",fatal:!0});const t=e.opId;e.opRunning=!0;try{if(this._serialPort||(e.updateUsbState({step:"connecting"}),this._serialPort=await navigator.serial.requestPort()),e.opId!==t)return void(e.opRunning=!1);e.updateUsbState({step:"wifi_scan"});const{writer:i,reader:s,networks:r}=await Bc(this._serialPort);if(e.opId!==t)return void(e.opRunning=!1);e.wifiNetworks=r,e.updateUsbState({step:"wifi_provision"}),this._serialWriter=i,this._serialReader=s,e.opRunning=!1}catch(i){if(e.opRunning=!1,e.opId!==t)return;if("NotFoundError"===i?.name)return void e.resetUsbState();const s=e.usbFlashState?.step,r=i;e.updateUsbState({step:"error",lastStep:s,errorKey:r.errorKey??"wifi.errors.scan_failed",errorParams:r.errorParams})}}async handleUsbFlash(e){const t=this._host;if(t.opRunning)return void t.updateUsbState({step:"error",errorKey:"usb.errors.serial_port_busy",fatal:!0});const i=t.opId;t.opRunning=!0;try{t.updateUsbState({step:"connecting"});const s=await navigator.serial.requestPort();if(t.opId!==i)return void(t.opRunning=!1);if(this._serialPort=s,this._flashedMac=void 0,t.updateUsbState({step:"flashing",progress:0}),await async function(e,t,i,s){const r=s?.accessToken?{headers:{Authorization:`Bearer ${s.accessToken}`}}:void 0,o=e.close.bind(e);e.close=async()=>{};const a=new $l(e);try{let e;const o={clean:()=>{},writeLine:t=>{const i=Cc.exec(t);i&&(e=i[1].toUpperCase(),s?.onMac?.(e))},write:e=>{}},n=new yc({transport:a,baudrate:115200,terminal:o});if(await n.main("default_reset"),s?.beforeFlash&&await s.beforeFlash(e),!s?.baseUrl)throw Object.assign(new Error("baseUrl is required for firmware download"),{errorKey:"usb.errors.base_url_required"});const l=`${s.baseUrl}/everything-presence-pro-${t}-manifest.json`,c=await fetch(l,r);if(!c.ok)throw Object.assign(new Error("Failed to download firmware manifest"),{errorKey:"usb.errors.manifest_download_failed"});const h=await c.json(),d=l.substring(0,l.lastIndexOf("/")+1),p=h.builds[0].parts,u=[];for(const e of p){const t=await fetch(`${d}${e.path}`,r);if(!t.ok)throw Object.assign(new Error(`Failed to download firmware file: ${e.path}`),{errorKey:"usb.errors.file_download_failed",errorParams:{file:e.path}});const i=new Uint8Array(await t.arrayBuffer());u.push({data:i,address:e.offset})}const g=new Uint8Array(8192);g.fill(255),u.push({data:g,address:36864});const A=u.reduce((e,t)=>e+t.data.length,0),_=[];{let e=0;for(const t of u)_.push(e),e+=t.data.length}await n.writeFlash({fileArray:u,flashSize:"keep",flashMode:"keep",flashFreq:"keep",eraseAll:!1,compress:!0,reportProgress:(e,t,s)=>{const r=s>0?t/s:1,o=(_[e]+r*u[e].data.length)/A;i(Math.round(100*o))}}),await n.after("hard_reset")}finally{try{await a.disconnect()}finally{e.close=o}}}(s,e,e=>{t.updateUsbState({step:"flashing",progress:e})},{baseUrl:t.firmwareBaseUrl,accessToken:t.hass?.auth?.accessToken,beforeFlash:async e=>{if(!e)return;const i=t.flashableDevices.find(t=>t.mac.toUpperCase()===e);if("original"===i?.firmware_type&&i?.esphome_config_entry_id){if(!(await(t.confirmDeleteOriginalFirmware?.())??!1))throw Object.assign(new Error("Flash cancelled"),{errorKey:"flasher.errors.flash_cancelled"});await t.deleteEsphomeDevice(i.esphome_config_entry_id)}this._flashedMac=e.toUpperCase(),t.updateUsbState({step:"flashing",mac:e.toUpperCase()})}}),t.opId!==i)return void(t.opRunning=!1);if(e.startsWith("ethernet"))return await s.close().catch(()=>{}),this._serialPort=null,t.opRunning=!1,void t.updateUsbState({step:"complete",variant:e,mac:this._flashedMac});t.updateUsbState({step:"wifi_check"});let r=null,o=null,a=null;try{const e=new AbortController;this._wifiCheckAbort=e;const t=async function(e,t,i){const s=await xc(e,t),r=e.readable.getReader(),o=i?.signal;try{console.debug("[queryImprovState] sending GET_CURRENT_STATE"),await fo(s,go());const e=t?.readDelay??3e3,i=Date.now(),a=[];let n;const l=i+Math.min(e,3e3);for(;Date.now()<l&&void 0===n&&!o?.aborted;){const e=l-Date.now();if(e<=0)break;try{const t=await mo(r,Math.min(e,500),a);for(const e of t.packets)1===e.type&&e.data.length>=1&&(n=e.data[0])}catch{}}if(o?.aborted)throw Object.assign(new Error("aborted"),{errorKey:"flasher.errors.aborted"});if(void 0===n)throw Object.assign(new Error("No Improv state received"),{errorKey:"usb.errors.no_device_response"});let c;if(4===n){const t=Math.max(0,i+e-Date.now());if(t>0){console.debug(`[queryImprovState] PROVISIONED — delegating to detectIpAddress (budget=${t}ms)`);try{c=await Dc(r,s,t,{initialBuffer:a,startPolling:!0,signal:o})}catch(e){console.debug(`[queryImprovState] detectIpAddress gave up: ${e.message}`)}}}return console.debug(`[queryImprovState] exit: elapsed=${Date.now()-i}ms, stateByte=${n}, ip=${c}`),{state:4===n?"PROVISIONED":"AUTHORIZED",ip:c,writer:s,reader:r}}catch(e){try{s.releaseLock()}catch{}throw ho(r),e}}(s,{readDelay:3e4},{signal:e.signal});this._wifiCheckPromise=t;const i=await t;if(this._wifiCheckAbort=null,this._wifiCheckPromise=null,"PROVISIONED"===i.state&&i.ip)r=i.ip,o=i.writer,a=i.reader;else{try{i.writer.releaseLock()}catch{}ho(i.reader)}}catch{}if(t.opId!==i)return void(t.opRunning=!1);if(r&&o&&a){ho(a);try{o.releaseLock()}catch{}return t.opRunning=!1,void await this._addToHa(r)}t.updateUsbState({step:"wifi_scan"});const{writer:n,reader:l,networks:c}=await Bc(s);if(t.opId!==i)return void(t.opRunning=!1);t.wifiNetworks=c,t.updateUsbState({step:"wifi_provision"}),this._serialWriter=n,this._serialReader=l,t.opRunning=!1}catch(s){if(t.opId!==i)return void(t.opRunning=!1);if("NotFoundError"===s?.name)return void t.resetUsbState();const r=s;if("flasher.errors.flash_cancelled"===r.errorKey){if(this._serialPort){try{await this._serialPort.close().catch(()=>{})}catch{}this._serialPort=null}return t.opRunning=!1,void t.resetUsbState()}const o=t.usbFlashState?.step;if(this._serialPort){try{await this._serialPort.close().catch(()=>{})}catch{}this._serialPort=null}const a=r.message??"Unknown error",n=/already open|already closed/i.test(a),l=/stream stopped|NetworkError|disconnected|break|lost|No response from device/i.test(a),c=n?"usb.errors.serial_port_busy":l?"usb.errors.device_disconnected":"usb.errors.flash_failed";t.opRunning=!1,t.updateUsbState({step:"error",lastStep:o,variant:e,errorKey:r.errorKey??c,errorParams:r.errorParams,fatal:n||"usb.errors.serial_port_busy"===r.errorKey})}}async handleWifiProvision(e,t){const i=this._host,s=i.opId,r=this._serialPort;if(!r?.writable||!r?.readable)return void i.updateUsbState({step:"error",errorKey:"usb.errors.serial_port_unavailable"});this._serialReader&&ho(this._serialReader);try{this._serialWriter?.releaseLock()}catch{}const o=r.writable.getWriter(),a=r.readable.getReader();this._serialWriter=o,this._serialReader=a;try{if(i.updateUsbState({step:"wifi_connecting"}),console.debug(`[wifi-provision] sending WIFI_SETTINGS ssid="${e}"`),await Sc(o,e,t),i.opId!==s)return;i.updateUsbState({step:"reading_ip"});const n=await Dc(a,o,6e4);if(i.opId!==s)return;ho(a),o.releaseLock(),this._serialReader=null,this._serialWriter=null,await r.close().catch(()=>{}),this._serialPort=null,await this._addToHa(n)}catch(e){this._serialReader&&ho(this._serialReader);try{this._serialWriter?.releaseLock()}catch{}if(this._serialReader=null,this._serialWriter=null,i.opId!==s)return;const t=i.usbFlashState?.step,r=e;i.updateUsbState({step:"error",lastStep:t,errorKey:r.errorKey??"wifi.errors.provisioning_failed",errorParams:r.errorParams})}}async _addToHaWithRetry(e){const t=this._host,i=t.opId;for(let s=1;s<=6;s++){if(s>1){t.updateUsbState({step:"wifi_configured",ip:e,haAddAttempt:s,haAddMaxAttempts:6});if(await this._sleepUntilOpChanges(1e4,i))return{type:"cannot_connect"}}let r;try{r=await t.addEsphomeDevice(e)}catch(e){const t=e?.message;return{type:"failed",reason:t??"unknown"}}if(t.opId!==i)return r;if("cannot_connect"!==r.type)return r}return{type:"cannot_connect"}}async _sleepUntilOpChanges(e,t){const i=this._host;let s=e;for(;s>0;){if(i.opId!==t)return!0;const e=Math.min(s,250);await new Promise(t=>setTimeout(t,e)),s-=e}return i.opId!==t}async _addToHa(e){const t=this._host,i=t.opId;t.updateUsbState({step:"adding",ip:e,mac:this._flashedMac});const s=await this._addToHaWithRetry(e);t.opId===i&&await this._routeAddResult(e,s)}async _routeAddResult(e,t){const i=this._host;"added"!==t.type&&"already_added"!==t.type||!i.onDeviceReadyForSetup?i.updateUsbState({step:"complete",ip:e,haAdd:t,mac:this._flashedMac}):await i.onDeviceReadyForSetup(e,this._flashedMac)}async handleRetryHaAdd(){const e=this._host,t=e.usbFlashState;if("complete"!==t?.step||!t.ip)return;const i=t.ip,s=e.opId;e.updateUsbState({step:"wifi_configured",ip:i});const r=await this._addToHaWithRetry(i);e.opId===s&&await this._routeAddResult(i,r)}handleUsbRetry(){const e=this._host.usbFlashState,t=e?.lastStep,i=e?.variant;this._serialReader&&ho(this._serialReader);try{this._serialWriter?.releaseLock()}catch{}this._serialReader=null,this._serialWriter=null;("connecting"===t||"flashing"===t||"wifi_check"===t)&&i?this.handleUsbFlash(i):this.handleUsbWifiConfig()}async handleFlasherCancel(){const e=this._host,t=e.usbFlashState;"adding"!==t?.step&&"wifi_configured"!==t?.step||!t.ip||e.setCancelledDeviceIpHint(t.ip),e.opRunning=!1,await e.resetUsbState()}async handleWifiScan(){const e=this._host;if(!this._serialPort)return;e.bumpOpId();const t=e.opId;try{e.updateUsbState({step:"wifi_scan"}),this._serialReader&&ho(this._serialReader);try{this._serialWriter?.releaseLock()}catch{}const i=await Bc(this._serialPort);if(e.opId!==t){ho(i.reader);try{i.writer.releaseLock()}catch{}return}this._serialWriter=i.writer,this._serialReader=i.reader,e.wifiNetworks=i.networks,e.updateUsbState({step:"wifi_provision"})}catch(i){if(e.opId!==t)return;console.error("WiFi scan failed:",i);const s=e.usbFlashState?.step,r=i;e.updateUsbState({step:"error",lastStep:s,errorKey:r.errorKey??"wifi.errors.scan_failed",errorParams:r.errorParams})}}}function Mc(e){if("string"!=typeof e||""===e)return"";if(e.startsWith("/")&&!e.startsWith("//"))return e;try{const t=new URL(e);return"https:"===t.protocol||"http:"===t.protocol?e:""}catch{return""}}class kc{constructor(e){this.flashableDevices=[],this.firmwareBaseUrl="",this.firmwareVersion="",this.integrationVersion="",this.loading=!0,this.usbConnected=!1,this.usbDeviceMac=null,this.usbExistingDevice=null,this.usbFlashState=null,this.wifiNetworks=[],this.otaStates={},this.cancelledDeviceIpHint=null,this._cancelledIpTimeout=null,this._hass=null,this._flow=new Rc(this),this._opId=0,this._opRunning=!1,this._otaUnsubs={},this._otaTimeouts={},this._otaGen=0,this._deviceListGen=0,this._wantDeviceListSub=!1,this._host=e,e.addController(this)}hostConnected(){}hostDisconnected(){this._wantDeviceListSub=!1,this.unsubscribeDeviceList(),this._flow.tearDownSerialPort(),this._otaGen++;for(const e of Object.keys(this._otaUnsubs))this._unsubOta(e);for(const e of Object.keys(this._otaTimeouts))this._resetOtaTimeout(e);this.otaStates={},this._cancelledIpTimeout&&(clearTimeout(this._cancelledIpTimeout),this._cancelledIpTimeout=null)}_setOtaState(e,t){this.otaStates={...this.otaStates,[e]:t}}_deleteOtaState(e){if(!(e in this.otaStates))return;const{[e]:t,...i}=this.otaStates;this.otaStates=i}async startOta(e){if("updating"===this.otaStates[e]?.state)return;const t=this._otaGen;this._setOtaState(e,{state:"updating",progress:0,errorKey:null}),this._host.requestUpdate();try{await this._hass.callWS({type:"eppgrid/update_firmware",mac:e})}catch(i){if(this._otaGen!==t)return;const s=i?.translation_key,r="firmware_not_published"===s?"flasher.errors.firmware_not_published":"flasher.errors.start_failed";return this._setOtaState(e,{state:"error",progress:null,errorKey:r}),void this._host.requestUpdate()}if(this._otaGen===t)try{const i=await this._hass.connection.subscribeMessage(t=>{this._handleOtaEvent(e,t)},{type:"eppgrid/subscribe_ota_progress",mac:e});if(this._otaGen!==t){try{i()}catch{}return}this._unsubOta(e),this._otaUnsubs[e]=i,this._startOtaTimeout(e,15e3)}catch{if(this._otaGen!==t)return;this._setOtaState(e,{state:"error",progress:null,errorKey:"flasher.errors.connect_failed"}),this._host.requestUpdate()}}_handleOtaEvent(e,t){switch(t.state){case"updating":{const i=t.progress??null;null!=i&&i>=100?this._otaSuccess(e):(this._setOtaState(e,{state:"updating",progress:i,errorKey:null}),this._startOtaTimeout(e,null!=i&&i>0?1e4:15e3));break}case"success":this._otaSuccess(e);break;case"error":{const i=t.error_key??"flasher.errors.update_failed_generic";this._setOtaState(e,{state:"error",progress:null,errorKey:i,...null!=t.message?{errorParams:{message:t.message}}:{}}),this._resetOtaTimeout(e),this._unsubOta(e);break}}this._host.requestUpdate()}_otaSuccess(e){this._setOtaState(e,{state:"success",progress:null,errorKey:null}),this._unsubOta(e),this._resetOtaTimeout(e),this._otaTimeouts[e]=setTimeout(()=>{delete this._otaTimeouts[e],"success"===this.otaStates[e]?.state&&(this._deleteOtaState(e),this._host.requestUpdate())},5e3)}_startOtaTimeout(e,t){this._resetOtaTimeout(e),this._otaTimeouts[e]=setTimeout(()=>{const t=this.otaStates[e];t&&"updating"===t.state&&(null!=t.progress&&t.progress>0?this._setOtaState(e,{state:"error",progress:null,errorKey:"flasher.errors.connection_lost"}):this._setOtaState(e,{state:"error",progress:null,errorKey:"flasher.errors.update_timeout"}),this._unsubOta(e),this._host.requestUpdate())},t)}_resetOtaTimeout(e){const t=this._otaTimeouts[e];t&&(clearTimeout(t),delete this._otaTimeouts[e])}dismissOtaError(e){this._unsubOta(e),this._resetOtaTimeout(e),this._deleteOtaState(e),this._host.requestUpdate()}_unsubOta(e){const t=this._otaUnsubs[e];if(t){try{t()}catch{}delete this._otaUnsubs[e]}}get hass(){return this._hass}set hass(e){const t=this._hass?.connection;if(this._hass=e,e?.connection&&e.connection!==t&&t){const e=this._wantDeviceListSub;this._unsubDeviceList=void 0,this._deviceListGen++,this._otaGen++;for(const e of Object.keys(this._otaUnsubs))delete this._otaUnsubs[e];for(const e of Object.keys(this._otaTimeouts))this._resetOtaTimeout(e);this.otaStates={},this._host.requestUpdate(),e&&this.subscribeDeviceList().catch(()=>{})}}async loadDevices(){if(!this._hass)return this.loading=!1,void this._host.requestUpdate();try{const e=await this._hass.callWS({type:"eppgrid/list_flashable_devices"});this.flashableDevices=e.devices,this.firmwareBaseUrl=Mc(e.firmware_base_url),this.firmwareVersion=e.latest_firmware_version??""}catch{this.flashableDevices=[]}this.loading=!1,this._host.requestUpdate()}async subscribeDeviceList(){if(this._wantDeviceListSub=!0,so(this._unsubDeviceList),this._unsubDeviceList=void 0,!this._hass)return;const e=++this._deviceListGen;try{const t=await this._hass.connection.subscribeMessage(e=>{this._applyDeviceList(e)},{type:"eppgrid/subscribe_flashable_devices"});if(this._deviceListGen!==e){try{t()}catch{}return}this._unsubDeviceList=t}catch{await this.loadDevices()}}unsubscribeDeviceList(){this._wantDeviceListSub=!1,this._deviceListGen++,so(this._unsubDeviceList),this._unsubDeviceList=void 0}_applyDeviceList(e){this.flashableDevices=e.devices??[],this.firmwareBaseUrl=Mc(e.firmware_base_url),this.firmwareVersion=e.latest_firmware_version??"",this.integrationVersion=e.integration_version??"",this.loading=!1,this.onDeviceListChanged?.(),this._host.requestUpdate(),this._checkOtaDevicesOffline()}_checkOtaDevicesOffline(){for(const[e,t]of Object.entries(this.otaStates)){if("updating"!==t.state)continue;if(null==t.progress||t.progress<=0)continue;const i=this.flashableDevices.find(t=>t.mac===e);i&&!i.available&&(this._setOtaState(e,{state:"error",progress:null,errorKey:"flasher.errors.device_offline"}),this._unsubOta(e),this._resetOtaTimeout(e),this._host.requestUpdate())}}async deleteEsphomeDevice(e){this._hass&&await this._hass.callWS({type:"eppgrid/delete_esphome_device",config_entry_id:e})}async addEsphomeDevice(e){return this._hass?await this._hass.callWS({type:"eppgrid/add_esphome_device",host:e}):{type:"failed",reason:"no_hass"}}updateUsbState(e){this.usbFlashState=e,this._host.requestUpdate()}get opId(){return this._opId}get opRunning(){return this._opRunning}set opRunning(e){this._opRunning=e}async resetUsbState(){this._opId++,await this._flow.cancelAndTearDown(),this.usbFlashState=null,this.wifiNetworks=[],this._host.requestUpdate()}setCancelledDeviceIpHint(e){this.cancelledDeviceIpHint=e,this._cancelledIpTimeout&&(clearTimeout(this._cancelledIpTimeout),this._cancelledIpTimeout=null),e&&(this._cancelledIpTimeout=setTimeout(()=>{this.cancelledDeviceIpHint=null,this._cancelledIpTimeout=null,this._host.requestUpdate()},8e3)),this._host.requestUpdate()}bumpOpId(){this._opId++}set serialPort(e){this._flow.serialPort=e}get serialPort(){return this._flow.serialPort}handleUsbFlash(e){return this._flow.handleUsbFlash(e)}handleUsbWifiConfig(){return this._flow.handleUsbWifiConfig()}handleWifiProvision(e,t){return this._flow.handleWifiProvision(e,t)}handleWifiScan(){return this._flow.handleWifiScan()}handleUsbRetry(){this._flow.handleUsbRetry()}handleFlasherCancel(){return this._flow.handleFlasherCancel()}handleRetryHaAdd(){return this._flow.handleRetryHaAdd()}}function Tc(e){return null===e?null:Ei[e]}function Fc(e,t){if(null===e)return null;if(0===t){const t=e,i={type:t.type};return"custom"===t.type&&(i.trigger=t.trigger,i.renew=t.renew,i.timeout=t.timeout,i.handoff_timeout=t.handoff_timeout),i}const i=e,s={name:i.name,color:i.color,type:i.type};return"custom"===i.type&&(s.trigger=i.trigger,s.renew=i.renew,s.timeout=i.timeout,s.handoff_timeout=i.handoff_timeout),s}function Pc(e){const t={type:e.type,icon:e.icon,label:e.label,x:e.x,y:e.y,width:e.width,height:e.height,rotation:e.rotation,lockAspect:e.lockAspect};if("text"===e.type){t.text=e.text??"",t.fontFamily=e.fontFamily??Cs,t.fontSize=e.fontSize??xs,t.align=e.align??Bs,t.bold=e.bold??!1,t.italic=e.italic??!1;const i=xr(e.color);i&&(t.color=i);const s=xr(e.background);s&&(t.background=s)}return t}class zc{constructor(e){this.configurations=[],this.host=e,e.addController(this)}hostConnected(){}hostDisconnected(){}onCellMouseDown(e){if("furniture"===this.host._sidebarTab)return void(this.host._selectedFurnitureId=null);const t=Tc(this.host._overlayMode);if(null!==t)this.host._paintAction=(i=this.host._grid[e],s=t,vi(i)===s?"clear":"set");else{if("zones"!==this.host._sidebarTab||null===this.host._activeZone)return;this.host._paintAction=function(e,t){if(0===t)return fi(e)&&0===mi(e)?"clear":"set";return mi(e)===t?"clear":"set"}(this.host._grid[e],this.host._activeZone)}var i,s;this.host._isPainting=!0,this.host._frozenBounds=this.host._getVisibleRoomBounds(),this.applyPaintToCell(e);const r=()=>{this.onCellMouseUp(),window.removeEventListener("pointerup",r),window.removeEventListener("pointercancel",r)};window.addEventListener("pointerup",r),window.addEventListener("pointercancel",r)}onCellMouseEnter(e){this.host._isPainting&&this.applyPaintToCell(e)}onCellMouseUp(){this.host._isPainting&&(this.host._justPainted=!0,requestAnimationFrame(()=>{this.host._justPainted=!1})),this.host._isPainting=!1,this.host._frozenBounds=null}applyPaintToCell(e){let t;const i=Tc(this.host._overlayMode);if(null!==i)s=this.host._grid[e],r=i,o=this.host._paintAction,t=fi(s)?bi(s,"set"===o?r:0):null;else{if(null===this.host._activeZone)return;t=function(e,t,i){return 0===t?"set"===i?1:0:fi(e)?"set"===i?wi(1|e,t):wi(e,0):null}(this.host._grid[e],this.host._activeZone,this.host._paintAction)}var s,r,o;null!==t&&t!==this.host._grid[e]&&(this.host._grid=new Uint8Array(this.host._grid),this.host._grid[e]=t,this.host._dirty=!0,this.host._zoneEngineGridChanged())}initGridFromRoom(){this.host._grid=Di(this.host._roomWidth,this.host._roomDepth),this.host._zoneEngineGridChanged()}addZone(){const e=[...this.host._zoneConfigs],t=e.findIndex((e,t)=>t>0&&null===e);if(-1===t)return;const i=new Set(e.filter((e,t)=>t>0&&null!==e).map(e=>e.color)),s=fr.find(e=>!i.has(e)),r=this.host._localize?.("live.debug.zone_n",{n:t})??`Zone ${t}`;e[t]={name:r,color:s,type:"default"},this.host._zoneConfigs=e,this.host._activeZone=t,this.host._zoneEngineZoneConfigChanged()}removeZone(e){if(e<1||e>7||null===this.host._zoneConfigs[e])return;const t=function(e,t){if(t<1||t>7)return null;let i=-1;for(let s=0;s<gi;s++)if(mi(e[s])===t){i=s;break}if(-1===i)return null;const s=new Uint8Array(e);for(let e=i;e<gi;e++)mi(s[e])===t&&(s[e]=wi(s[e],0));return s}(this.host._grid,e);t&&(this.host._grid=t);const i=[...this.host._zoneConfigs];i[e]=null,this.host._zoneConfigs=i,this.host._activeZone===e&&(this.host._activeZone=null),this.host._dirty=!0,this.host._zoneEngineZoneConfigChanged()}_newFurnitureId(){return`f_${Date.now()}_${Math.random().toString(36).slice(2,6)}`}_addAndSelectFurniture(e){this.host._furniture=[...this.host._furniture,e],this.host._selectedFurnitureId=e.id,this.host._dirty=!0}addFurniture(e){this._addAndSelectFurniture(function(e,t,i,s){return{id:s,type:e.type,icon:e.icon,label:e.label,x:Math.max(0,(t-e.defaultWidth)/2),y:Math.max(0,(i-e.defaultHeight)/2),width:e.defaultWidth,height:e.defaultHeight,rotation:0,lockAspect:e.lockAspect??"icon"===e.type}}(e,this.host._roomWidth,this.host._roomDepth,this._newFurnitureId()))}addCustomFurniture(e){this.addFurniture({type:"icon",icon:e,label:"furniture.custom",defaultWidth:600,defaultHeight:600,lockAspect:!1})}addTextFurniture(e){this._addAndSelectFurniture(function(e,t,i,s){const{width:r,height:o}=Rs(e,200,!1);return{id:s,type:"text",icon:Is,label:Ss,x:Math.max(0,(t-r)/2),y:Math.max(0,(i-o)/2),width:r,height:o,rotation:0,lockAspect:!1,text:e,fontFamily:Cs,fontSize:200,align:Bs,bold:!1,italic:!1}}(e,this.host._roomWidth,this.host._roomDepth,this._newFurnitureId()))}removeFurniture(e){this.host._furniture=function(e,t){return e.filter(e=>e.id!==t)}(this.host._furniture,e),this.host._selectedFurnitureId===e&&(this.host._selectedFurnitureId=null),this.host._dirty=!0}updateFurniture(e,t){const i=this.host._furniture.find(t=>t.id===e);let s=t;if("text"===i?.type&&("text"in t||"fontSize"in t||"bold"in t)){const e=Rs(t.text??i.text??"",t.fontSize??i.fontSize??xs,t.bold??i.bold??!1);s={...t,...e}}this.host._furniture=function(e,t,i){return e.map(e=>e.id===t?{...e,...i}:e)}(this.host._furniture,e,s),this.host._dirty=!0}onFurniturePointerDown(e,t,i,s,r){e.preventDefault(),e.stopPropagation(),this.host._selectedFurnitureId=t;const o=this.host._furniture.find(e=>e.id===t);if(!o)return;const a=r??o.rotation;let n=0,l=0,c=0;if("rotate"===i){const i=this.host.shadowRoot?.querySelector("epp-grid")?.shadowRoot?.querySelector("epp-furniture-overlay")?.shadowRoot;let s=null;if(i)for(const e of i.querySelectorAll(".furniture-item"))if(e.dataset.id===t){s=e;break}if(s){const t=s.getBoundingClientRect();n=t.left+t.width/2,l=t.top+t.height/2,c=Math.atan2(e.clientY-l,e.clientX-n)*(180/Math.PI)}}this.host._dragState={type:i,id:t,startX:e.clientX,startY:e.clientY,origX:o.x,origY:o.y,origW:o.width,origH:o.height,origRot:a,handle:s,centerX:n,centerY:l,startAngle:c};const h=e=>this.onFurnitureDrag(e),d=()=>{this.host._dragState=null,window.removeEventListener("pointermove",h),window.removeEventListener("pointerup",d),window.removeEventListener("pointercancel",d)};window.addEventListener("pointermove",h),window.addEventListener("pointerup",d),window.addEventListener("pointercancel",d)}onFurnitureDrag(e){if(!this.host._dragState)return;const t=this.host._dragState,i=this.host.shadowRoot?.querySelector("epp-grid")?.shadowRoot?.querySelector(".grid");if(!i)return;const s=i.firstElementChild?i.firstElementChild.offsetWidth:28,r=e.clientX-t.startX,o=e.clientY-t.startY;if("move"===t.type){const e=this.host._furniture.find(e=>e.id===t.id),i=Vi(this.host._getVisibleRoomBounds(),this.host._roomWidth),a=function(e,t,i,s,r,o,a,n,l,c,h,d){const p=As(i,r),u=As(s,r),{dxBox:g,dyBox:A}=_s(o,a,d);return{x:Math.max(n+g,Math.min(l-o-g,e+p)),y:Math.max(c+A,Math.min(h-a-A,t+u))}}(t.origX,t.origY,r,o,s,e?.width??0,e?.height??0,i.minX,i.maxX,i.minY,i.maxY,t.origRot);this.updateFurniture(t.id,a)}else if("resize"===t.type&&t.handle){const e=this.host._furniture.find(e=>e.id===t.id),i=vs(t.handle,r,o,s,t.origX,t.origY,t.origW,t.origH,e?.lockAspect??!1,t.origRot);this.updateFurniture(t.id,i)}else if("rotate"===t.type){const i=Math.atan2(e.clientY-(t.centerY??0),e.clientX-(t.centerX??0))*(180/Math.PI);this.updateFurniture(t.id,{rotation:Es(bs(t.origRot,t.startAngle??0,i))})}}async fetchConfigurations(){try{const e=(await this.host.hass.callWS({type:"eppgrid/list_configurations"})).configurations||{};this.configurations=Object.entries(e).map(([e,t])=>({...t,name:e}))}catch{this.configurations=[]}}async saveConfiguration(){const e=this.host._configurationName.trim();if(!e)return;const t=this.host._zoneConfigs.map((e,t)=>Fc(e,t)),i={grid:Array.from(this.host._grid),zones:t,roomWidth:this.host._roomWidth,roomDepth:this.host._roomDepth,furniture:this.host._furniture.map(e=>({...e})),settings:this.host._buildSparseSettings()};try{await this.host.hass.callWS({type:"eppgrid/save_configuration",name:e,configuration:i})}catch(e){throw this.onError?.("save_configuration",e),e}this.host._showConfigurationBackup=!1,this.host._configurationName="",await this.fetchConfigurations()}async loadConfiguration(e){try{await this._loadConfiguration(e)}catch(e){throw this.onError?.("load_configuration",e),e}}async _loadConfiguration(e){const t=this.configurations.find(t=>t.name===e);if(!t)return;const i=t.zones||[],s=e=>null===e||null!=e&&"object"==typeof e&&"string"==typeof e.name&&"string"==typeof e.color&&"string"==typeof e.type,r=new Error(`Configuration "${e}" is in an old format — please re-save it`);if(8!==i.length)throw r;if(!(e=>null!=e&&"object"==typeof e&&"string"==typeof e.type)(i[0]))throw r;for(let e=1;e<8;e++)if(!s(i[e]))throw r;if(!Array.isArray(t.grid)||t.grid.length!==gi||!t.grid.every(e=>"number"==typeof e&&Number.isFinite(e)))throw r;const o={grid:this.host._grid,zoneConfigs:this.host._zoneConfigs,roomWidth:this.host._roomWidth,roomDepth:this.host._roomDepth,furniture:this.host._furniture,showConfigurationRestore:this.host._showConfigurationRestore,dirty:this.host._dirty,settings:new Map},a=new Uint8Array(t.grid),n=xi(this.host._grid),l=xi(a);if(this.host._grid=function(e,t){const i=xi(e),s=xi(t);if(!s)return console.warn("[eppgrid] alignTemplateGrid: current grid has no inside-room cells; falling back to verbatim template copy"),new Uint8Array(e);const r=new Uint8Array(gi);for(let e=0;e<gi;e++)r[e]=1&t[e];i||console.warn("[eppgrid] alignTemplateGrid: template has no inside-room cells; falling back to offset (0,0)");const{dr:o,dc:a}=Bi(e,t,i,s);for(let t=0;t<ui;t++)for(let s=0;s<pi;s++){const n=e[t*pi+s];if(i&&!(1&n))continue;const l=62&n;if(0===l)continue;const c=t+o,h=s+a;if(c<0||c>=ui||h<0||h>=pi)continue;const d=c*pi+h;1&r[d]&&(r[d]|=l)}return r}(a,this.host._grid),this.host._zoneConfigs=Array.from({length:8},(e,t)=>i[t]??null),n){const{dr:e,dc:i}=Bi(a,this.host._grid,l,n),s=(i+Si(t.roomWidth)-Si(this.host._roomWidth))*Ai,r=e*Ai;this.host._furniture=(t.furniture||[]).map(e=>({...e,x:e.x+s,y:e.y+r}))}else this.host._roomWidth=t.roomWidth,this.host._roomDepth=t.roomDepth,this.host._furniture=(t.furniture||[]).map(e=>({...e}));const c=t.settings,h=null!=c&&"object"==typeof c;if(h)for(const[e,t]of ur)if(o.settings.set(t,this.host[t]),"entities"===e){const e="entities"in c?c.entities:void 0;this.host[t]={...cr,...e||{}}}else this.host[t]=e in c?c[e]:dr(e);if(this.host._showConfigurationRestore=!1,this.host._zoneEngineZoneConfigChanged(),this.host._dirty=!0,h)try{await this.host.hass.callWS({type:"eppgrid/set_settings",mac:this.host._selectedMac,...this.host._buildSettingsPayload()})}catch(e){this.host._grid=o.grid,this.host._zoneConfigs=o.zoneConfigs,this.host._roomWidth=o.roomWidth,this.host._roomDepth=o.roomDepth,this.host._furniture=o.furniture,this.host._showConfigurationRestore=o.showConfigurationRestore,this.host._dirty=o.dirty;for(const[e,t]of o.settings)this.host[e]=t;throw e}await this.applyLayout()}async deleteConfiguration(e){await this.host.hass.callWS({type:"eppgrid/delete_configuration",name:e}),await this.fetchConfigurations(),this.host.requestUpdate()}async applyLayout(){const e=new Map;for(let t=0;t<this.host._grid.length;t++)if(fi(this.host._grid[t])){const i=mi(this.host._grid[t]);i>0&&e.set(i,(e.get(i)??0)+1)}const t=this.host._zoneConfigs.map((t,i)=>0===i?t:null!==t&&0===(e.get(i)??0)?null:t),i=Ci(this.host._grid);let s=this.host._furniture;if(i.minCol<=i.maxCol&&i.minRow<=i.maxRow){const e=Vi(i,this.host._roomWidth);s=s.filter(t=>!function(e,t,i,s,r){const{dxBox:o,dyBox:a}=_s(e.width,e.height,e.rotation??0);return e.x+e.width+o<=t||e.x-o>=i||e.y+e.height+a<=s||e.y-a>=r}(t,e.minX,e.maxX,e.minY,e.maxY))}const r=this.host._grid,o=this.host._zoneConfigs,a=this.host._furniture;this.host._saving=!0;try{if(await this.host.hass.callWS({type:"eppgrid/set_room_layout",mac:this.host._selectedMac,grid_bytes:Array.from(r),zone_slots:t.map((e,t)=>Fc(e,t)),furniture:s.map(Pc)}),this.host._targetAutoDistance||this.host._staticAutoDistance){const e=Xi(this.host._roomWidth,this.host._roomDepth,this.host._perspective,this.host._grid),t=hr.target_max_distance,i=hr.static_max_distance,s=this.host._targetAutoDistance?e>0?Math.min(e,t):t:this.host._targetMaxDistance,r=this.host._staticAutoDistance?hr.static_min_distance:this.host._staticMinDistance,o=this.host._staticAutoDistance?e>0?Math.min(e,i):i:this.host._staticMaxDistance;await this.host.hass.callWS({type:"eppgrid/set_settings",mac:this.host._selectedMac,...this.host._buildSettingsPayload(),target_max_distance:s,static_min_distance:r,static_max_distance:o})}this.host._grid!==r||this.host._zoneConfigs!==o||this.host._furniture!==a||(this.host._zoneConfigs=t,this.host._furniture=s,this.host._dirty=!1,this.host._selectedFurnitureId=null,this.host._overlayMode=null,this.host._view="live"),this.host._zoneEngineZoneConfigChanged()}catch(e){throw this.onError?.("apply_layout",e),e}finally{this.host._saving=!1}}async saveSettings(e){this.host._saving=!0;try{const t={};for(const[i]of ur)i in e&&(t[i]=e[i]);await this.host.hass.callWS({type:"eppgrid/set_settings",mac:this.host._selectedMac,...t});for(const[e,i]of ur)e in t&&null!=t[e]&&(this.host[i]=t[e]);this.host._dirty=!1,this.host._view="live"}catch(e){console.error("Failed to save settings:",e),this.onError?.("save_settings",e)}finally{this.host._saving=!1}}}const Uc="zones",Oc={"":{view:"live",sidebarTab:Uc},settings:{view:"settings",sidebarTab:Uc},tutorial:{view:"tutorial",sidebarTab:Uc},calibrate:{view:"calibrate",sidebarTab:Uc},zones:{view:"editor",sidebarTab:"zones"},overlays:{view:"editor",sidebarTab:"overlays"},furniture:{view:"editor",sidebarTab:"furniture"}};function Hc(e){const t=e.startsWith("#")?e.slice(1):e;return Oc[t]??Oc[""]}function Qc(e){return"live"===e.view?"":"editor"===e.view?`#${e.sidebarTab}`:`#${e.view}`}const Gc=new Set;let Lc=null,$c=null,Nc=null,Yc=null;function Kc(e){return(t,i,s)=>{for(const r of Gc)try{if(r.intercept(e,[t,i,s]))return}catch(e){console.error("eppgrid: history interceptor failed",e)}const r=location.hash;if(e(t,i,s),location.hash!==r)for(const e of Gc)try{e.hashMoved()}catch(e){console.error("eppgrid: history interceptor failed",e)}}}class Wc{constructor(e){this._originalReplaceState=null,this._historyInterceptor=null,this._pendingNavigation=null,this._beforeUnloadHandler=e=>{this._host._dirty&&(e.preventDefault(),e.returnValue="")},this._interceptNavigation=()=>!!this._host._dirty&&(this._host._showUnsavedDialog=!0,this._pendingNavigation=null,!0),this._onHashChange=()=>{const e=this._host,t=Hc(location.hash);t.view===e._view&&t.sidebarTab===e._sidebarTab||(e._dirty&&this._replaceHash(Qc({view:e._view,sidebarTab:e._sidebarTab})),this.guardNavigation(()=>e._applyView(t)))},this._host=e,e.addController(this)}hostConnected(){window.addEventListener("beforeunload",this._beforeUnloadHandler),window.addEventListener("hashchange",this._onHashChange),this._historyInterceptor??={intercept:(e,t)=>!!this._interceptNavigation()&&(this._pendingNavigation=()=>{e(...t),window.dispatchEvent(new PopStateEvent("popstate")),this._onHashChange()},!0),hashMoved:()=>this._onHashChange()},function(e){if(Gc.add(e),Lc&&history.pushState===Lc&&$c&&history.replaceState===$c)return;const t=window;t.__eppOriginalPushState||(t.__eppOriginalPushState=history.pushState.bind(history)),t.__eppOriginalReplaceState||(t.__eppOriginalReplaceState=history.replaceState.bind(history)),Nc=t.__eppOriginalPushState,Yc=t.__eppOriginalReplaceState,Lc=Kc(Nc),$c=Kc(Yc),history.pushState=Lc,history.replaceState=$c}(this._historyInterceptor);const e=window;this._originalReplaceState=e.__eppOriginalReplaceState}hostDisconnected(){var e;window.removeEventListener("beforeunload",this._beforeUnloadHandler),window.removeEventListener("hashchange",this._onHashChange),this._historyInterceptor&&(e=this._historyInterceptor,Gc.delete(e),Gc.size>0||(Nc&&history.pushState===Lc&&(history.pushState=Nc),Yc&&history.replaceState===$c&&(history.replaceState=Yc),Lc=null,$c=null,Nc=null,Yc=null))}_replaceHash(e){if("undefined"==typeof location)return;if(e===location.hash)return;const t=`${location.pathname}${location.search}${e}`;(this._originalReplaceState??history.replaceState.bind(history))(history.state,"",t)}syncHashFromState(){this._replaceHash(Qc({view:this._host._view,sidebarTab:this._host._sidebarTab}))}guardNavigation(e){this._host._dirty?(this._pendingNavigation=e,this._host._showUnsavedDialog=!0):e()}discardAndNavigate(){this._host._dirty=!1,this._host._showUnsavedDialog=!1,this._pendingNavigation&&(this._pendingNavigation(),this._pendingNavigation=null)}cancelPendingNavigation(){this._host._showUnsavedDialog=!1,this._pendingNavigation=null}}function Jc(e,t,i,s){const r=e.split(":"),o=e=>t(Number(r[e]??"")||0),a=e=>i(Number(r[e]??"")||0);switch(r[0]){case"sa":return s("live.events.static_active");case"sp":return s("live.events.static_fading");case"sc":return s("live.events.static_cleared");case"ma":return s("live.events.motion_active");case"mp":return s("live.events.motion_fading");case"mc":return s("live.events.motion_cleared");case"oo":return s("live.events.room_occupied");case"of":return s("live.events.room_empty");case"wo":return s("live.events.mmwave_on");case"wf":return s("live.events.mmwave_off");case"zo":return s("live.events.zone_occupied",{zone:o(1)});case"zp":return s("live.events.zone_clearing",{zone:o(1)});case"zc":{const e=r[2];return s("h"===e?"live.events.zone_cleared_handoff":"o"===e?"live.events.zone_cleared_overlay":"f"===e?"live.events.zone_cleared_force":"live.events.zone_cleared",{zone:o(1)})}case"fc":return s("live.events.force_clear",{zone:o(1)});case"td":return s("live.events.stuck_dismiss",{target:a(1),secs:Number(r[2]??"")||0});case"te":return s("live.events.target_entered",{target:a(1),zone:o(2)});case"tl":return s("live.events.target_left",{target:a(1)});case"tm":return s("live.events.target_moved",{target:a(1),from:o(2),to:o(3)});case"xd":return s("live.events.dropped",{n:Number(r[1]??"")||0});default:return e}}class jc{constructor(){this.onOverlayFlags=[!1,!1,!1],this.prevActive=[!1,!1,!1]}get onOverlay(){return this.onOverlayFlags}update(e,t,i,s){for(let r=0;r<3;r++){const o=r<e.length?e[r]:null,a=!0===o?.active&&null!==o.x&&null!==o.y;if(a&&!this.prevActive[r]&&(this.onOverlayFlags[r]=!1),a&&null!==o&&null!==o.x&&null!==o.y){const e=Us(o.x,o.y,i,s),a=null!==e?Os(e):null;null!==a&&fi(t[a])&&(this.onOverlayFlags[r]=1===vi(t[a]))}this.prevActive[r]=a}}reset(){for(let e=0;e<3;e++)this.onOverlayFlags[e]=!1,this.prevActive[e]=!1}}function Zc(){return{localZoneState:new Map,targetPrev:[null,null,null],targetGateCount:[0,0,0],targetPrevXY:[null,null,null],lastZone:[null,null,null],lastOnOverlay:[!1,!1,!1],dismissedCells:[-1,-1,-1],stuckRef:[null,null,null],staticState:"inactive",motionState:"inactive",staticPendingSince:null,motionPendingSince:null,sensorsEverActive:!1,assistedClearSince:null,targetLogZone:[-1,-1,-1],targetLogInRoom:[!1,!1,!1],prevOccupancy:!1,prevMmwave:!1}}function Vc(e,t,i,s){if(!(t<0||t>=3)){if(e.dismissedCells[t]=i,i>=0&&i<gi&&fi(s[i])){const r=mi(s[i]),o=e.localZoneState.get(r);o&&(o.confirmedTargets.delete(t),0===o.confirmedTargets.size&&(o.occupied=!1,o.pendingSince=null))}e.targetPrev[t]=null,e.targetGateCount[t]=0,e.lastOnOverlay[t]=!1,e.lastZone[t]=null,e.stuckRef[t]=null}}function Xc(e){for(let t=0;t<3;t++)e.targetPrev[t]=null,e.targetPrevXY[t]=null,e.targetGateCount[t]=0,e.lastOnOverlay[t]=!1,e.lastZone[t]=null,e.dismissedCells[t]=-1,e.stuckRef[t]=null,e.targetLogZone[t]=-1,e.targetLogInRoom[t]=!1}function qc(e,t){return 0===e||e>=1&&e<=t.length&&null!=t[e-1]}function eh(e,t){let i=e.localZoneState.get(t);return i||(i={occupied:!1,pendingSince:null,confirmedTargets:new Set,clearReason:0},e.localZoneState.set(t,i)),i}function th(e,t){const i={state:e,params:t,now:t.now??Date.now()/1e3,zoneConfirmed:new Map,targetSignal:new Map,targetZonePrev:[null,null,null],targetZoneCurr:[null,null,null],targetActive:[!1,!1,!1],targetConfirmedZone:[-1,-1,-1],targetInRoom:[!1,!1,!1],occupancy:{},events:[]},s=new Map;for(const[t,i]of e.localZoneState)s.set(t,ih(i));!function(e){const{state:t,params:i}=e,s=function(e){for(let t=0;t<e.length;t++)if(1===vi(e[t]))return!0;return!1}(i.grid);for(let e=0;e<3;e++){const r=e<i.targets.length?i.targets[e]:null;if(!r||null==r.x||null==r.y||r.signal<=0)continue;const o=t.targetPrevXY[e];if(!o)continue;let a=!1;for(const i of t.localZoneState.values())if(i.occupied&&null!==i.pendingSince&&i.confirmedTargets.has(e)){a=!0;break}if(!a)continue;const n=Us(r.x,r.y,i.roomWidth,i.roomDepth),l=Us(o.x,o.y,i.roomWidth,i.roomDepth);if(!n||!l||null===Os(n)||null===Os(l))continue;if(Math.max(Math.abs(Math.floor(n.col)-Math.floor(l.col)),Math.abs(Math.floor(n.row)-Math.floor(l.row)))<=5)continue;if(s&&!r.onOverlay)continue;let c=-1;for(let s=2;s>=0;s--){if(s===e)continue;const r=s<i.targets.length?i.targets[s]:null;if(r&&null!=r.x&&null!=r.y&&r.signal>0)continue;let o=!1;for(const e of t.localZoneState.values())if(e.confirmedTargets.has(s)){o=!0;break}if(!o){c=s;break}}if(c<0)for(const i of t.localZoneState.values())i.confirmedTargets.delete(e);else{t.targetPrev[c]=t.targetPrev[e],t.targetGateCount[c]=t.targetGateCount[e],t.targetPrevXY[c]=t.targetPrevXY[e],t.lastZone[c]=t.lastZone[e],t.lastOnOverlay[c]=t.lastOnOverlay[e],t.dismissedCells[c]=t.dismissedCells[e],t.stuckRef[c]=t.stuckRef[e],t.targetLogZone[c]=t.targetLogZone[e],t.targetLogInRoom[c]=t.targetLogInRoom[e];for(const i of t.localZoneState.values())i.confirmedTargets.has(e)&&(i.confirmedTargets.delete(e),i.confirmedTargets.add(c));t.targetPrev[e]=null,t.targetGateCount[e]=0,t.targetPrevXY[e]=null,t.lastZone[e]=null,t.lastOnOverlay[e]=!1,t.dismissedCells[e]=-1,t.stuckRef[e]=null,t.targetLogZone[e]=-1,t.targetLogInRoom[e]=!1}}}(i),function(e){const{state:t,params:i,now:s}=e,{zoneConfirmed:r,targetSignal:o,targetZonePrev:a,targetZoneCurr:n}=e,l=e.targetActive;for(let c=0;c<3;c++){const h=c<i.targets.length?i.targets[c]:null;if(!h||null==h.x||null==h.y||h.signal<=0){t.targetPrev[c]=null,t.targetGateCount[c]=0,t.stuckRef[c]=null;continue}l[c]=!0;const d=h.signal;o.set(c,d);const p=Us(h.x,h.y,i.roomWidth,i.roomDepth);if(!p){t.targetPrev[c]=null,t.targetGateCount[c]=0,t.stuckRef[c]=null;continue}const u=Math.floor(p.col),g=Math.floor(p.row);if(u<0||u>=pi||g<0||g>=ui){t.targetPrev[c]=null,t.targetGateCount[c]=0,t.stuckRef[c]=null;continue}const A=g*pi+u,_=i.grid[A];if(!fi(_)){t.targetPrev[c]=null,t.targetGateCount[c]=0,t.stuckRef[c]=null;continue}if(e.targetInRoom[c]=!0,t.dismissedCells[c]===A){t.targetPrev[c]=null,t.targetGateCount[c]=0;continue}t.dismissedCells[c]>=0&&(t.dismissedCells[c]=-1);const f=i.stuckTargetTimeout??0;if(f>0){const r=t.stuckRef[c];if(null!==r&&h.x===r.x&&h.y===r.y){if(s-r.since>=f){e.events.push(`td:${c}:${Math.trunc(f)}`),Vc(t,c,A,i.grid);continue}}else t.stuckRef[c]={x:h.x,y:h.y,since:s}}const m=vi(_);if(3===m){t.targetPrev[c]=null,t.targetGateCount[c]=0;continue}const w=2===m,v=mi(_);n[c]=v,t.lastZone[c]=v,t.lastOnOverlay[c]=(h.onOverlay??!1)||1===m;const b=t.targetPrev[c];if(null!==b){const e=b.row*pi+b.col;e>=0&&e<gi&&fi(i.grid[e])&&(a[c]=mi(i.grid[e]))}t.targetPrevXY[c]={x:h.x,y:h.y};let E=!1;if(null!==b){E=Math.max(Math.abs(u-b.col),Math.abs(g-b.row))<=5}if(!qc(v,i.zoneConfigs)){t.targetPrev[c]={col:u,row:g};continue}const y=br(v,i.zoneConfigs,i.roomType,i.roomTrigger,i.roomRenew,i.roomTimeout,i.roomHandoffTimeout),{trigger:C,renew:x}=y,B=eh(t,v),S=!B.occupied;if(w&&!E&&S){t.targetPrev[c]=null,t.targetGateCount[c]=0;continue}let I=S?C:w?9:x;const D=t.lastOnOverlay[c];if(D&&S&&!w&&(I=1),!D&&!E&&S){d>=Math.min(I+2,8)?(t.targetGateCount[c]++,t.targetGateCount[c]>=2?(e.targetConfirmedZone[c]=v,r.set(v,!0),B.confirmedTargets.add(c),t.targetPrev[c]={col:u,row:g},t.targetGateCount[c]=0):t.targetPrev[c]={col:u,row:g}):(t.targetPrev[c]=null,t.targetGateCount[c]=0)}else d>=I?(e.targetConfirmedZone[c]=v,r.set(v,!0),B.confirmedTargets.add(c),t.targetPrev[c]={col:u,row:g},t.targetGateCount[c]=0):t.targetPrev[c]={col:u,row:g}}}(i),function(e){const{state:t,targetActive:i,targetConfirmedZone:s,targetInRoom:r}=e;for(let o=0;o<3;o++){const a=t.targetLogZone[o],n=s[o],l=t.targetLogInRoom[o],c=r[o];n>=0&&n!==a&&e.events.push(`te:${o}:${n}`),a>=0&&n!==a&&(n>=0||c||i[o]&&e.events.push(`tl:${o}`)),l&&!c&&i[o]&&a<0&&e.events.push(`tl:${o}`),t.targetLogZone[o]=n,t.targetLogInRoom[o]=c}}(i),function(e){const{state:t,params:i,now:s,targetZonePrev:r,targetZoneCurr:o}=e;for(let a=0;a<3;a++){const n=r[a],l=o[a];if(null===n||null===l||n===l)continue;if(e.events.push(`tm:${a}:${n}:${l}`),!qc(n,i.zoneConfigs))continue;const c=t.localZoneState.get(n);if(c&&(c.confirmedTargets.delete(a),0===c.confirmedTargets.size&&c.occupied&&null===c.pendingSince)){const e=br(n,i.zoneConfigs,i.roomType,i.roomTrigger,i.roomRenew,i.roomTimeout,i.roomHandoffTimeout),{timeout:t,handoffTimeout:r}=e;c.pendingSince=s-(t-r),c.clearReason=1}}}(i),function(e){const{state:t,params:i,now:s,targetZoneCurr:r}=e;for(let e=0;e<3;e++){const o=e<i.targets.length?i.targets[e]:null,a=!o||null==o.x||null==o.y,n=!a&&null===r[e],l=t.lastZone[e];if((a||n)&&t.lastOnOverlay[e]&&null!==l&&qc(l,i.zoneConfigs)){const r=t.localZoneState.get(l);if(r?.occupied){let t=0;for(const i of r.confirmedTargets)i!==e&&t++;if(0===t){const e=br(l,i.zoneConfigs,i.roomType,i.roomTrigger,i.roomRenew,i.roomTimeout,i.roomHandoffTimeout),t=s-(e.timeout-e.handoffTimeout);(null===r.pendingSince||r.pendingSince>t)&&(r.pendingSince=t,r.clearReason=2)}}t.lastZone[e]=null,t.lastOnOverlay[e]=!1}}}(i),function(e){const{state:t,params:i,now:s,zoneConfirmed:r}=e,o=e.occupancy,a=new Set;for(let e=0;e<i.grid.length;e++)fi(i.grid[e])&&a.add(mi(i.grid[e]));for(const e of a){if(!qc(e,i.zoneConfigs)){o[e]=!1;continue}const a=eh(t,e),n=br(e,i.zoneConfigs,i.roomType,i.roomTrigger,i.roomRenew,i.roomTimeout,i.roomHandoffTimeout),{timeout:l}=n,c=r.get(e)??!1;a.occupied?null===a.pendingSince?c||(a.pendingSince=s,a.clearReason=0):c?a.pendingSince=null:s-a.pendingSince>=l&&(a.occupied=!1,a.pendingSince=null,a.confirmedTargets.clear()):c&&(a.occupied=!0,a.pendingSince=null),o[e]=a.occupied}for(const e of t.localZoneState.keys())a.has(e)&&qc(e,i.zoneConfigs)||t.localZoneState.delete(e)}(i);const r=function(e){const{state:t,params:i,targetSignal:s,targetZoneCurr:r,targetActive:o}=e,a=[];for(let e=0;e<3&&e<i.targets.length;e++){const i=s.get(e)??0,n=null!==r[e];if(o[e]&&i>0&&n)a.push({status:"active"});else{let i=!1;if(!o[e]||!n)for(const[,s]of t.localZoneState)if(s.occupied&&null!==s.pendingSince&&s.confirmedTargets.has(e)){i=!0;break}a.push({status:i?"pending":"inactive"})}}return a}(i);!function(e){const{state:t,targetActive:i}=e;for(let e=0;e<3;e++)if(!i[e])for(const i of t.localZoneState.values())null===i.pendingSince&&i.confirmedTargets.delete(e)}(i),function(e){const{state:t,params:i,now:s}=e,r=i.staticPresence??!1,o=i.motionPresence??!1,a=i.staticTimeout??10,n=i.motionTimeout??10,l=t.staticState,c=t.motionState;r?(t.staticState="active",t.staticPendingSince=null,t.sensorsEverActive=!0):"active"===t.staticState?(t.staticState="pending",t.staticPendingSince=s):"pending"===t.staticState&&null!==t.staticPendingSince&&s-t.staticPendingSince>=a&&(t.staticState="inactive",t.staticPendingSince=null);o?(t.motionState="active",t.motionPendingSince=null,t.sensorsEverActive=!0):"active"===t.motionState?(t.motionState="pending",t.motionPendingSince=s):"pending"===t.motionState&&null!==t.motionPendingSince&&s-t.motionPendingSince>=n&&(t.motionState="inactive",t.motionPendingSince=null);t.staticState!==l&&e.events.push(`s${sh(t.staticState)}`);t.motionState!==c&&e.events.push(`m${sh(t.motionState)}`)}(i),function(e){const{state:t,params:i,now:s}=e,r=e.occupancy,o=i.assistedClearEnabled??!0,a=i.assistedClearTimeout??0;let n=t.sensorsEverActive&&"inactive"===t.staticState&&"inactive"===t.motionState;if(n)for(const[,e]of t.localZoneState)if(e.occupied&&null===e.pendingSince){n=!1;break}if(!o||!n)return void(t.assistedClearSince=null);null===t.assistedClearSince&&(t.assistedClearSince=s);if(s-t.assistedClearSince>=a)for(const[i,s]of t.localZoneState)s.occupied&&null!==s.pendingSince&&(e.events.push(`fc:${i}`),s.clearReason=3,s.occupied=!1,s.pendingSince=null,s.confirmedTargets.clear(),r[i]=!1)}(i),function(e,t){const{state:i}=e,s=[...i.localZoneState.keys()].sort((e,t)=>e-t);for(const r of s){const s=i.localZoneState.get(r);if(!s)continue;const o=ih(s);o!==(t.get(r)??"clear")&&("occupied"===o?e.events.push(`zo:${r}`):"pending"===o?e.events.push(`zp:${r}`):e.events.push(`zc:${r}:${rh[s.clearReason]}`))}}(i,s);const{sensorOccupancy:o,mmwave:a}=function(e){const{state:t}=e,i=e.occupancy,s="inactive"!==t.staticState||"inactive"!==t.motionState||Object.values(i).some(e=>e);let r="inactive"!==t.staticState;if(!r)for(const[,e]of t.localZoneState)if(e.occupied&&null===e.pendingSince){r=!0;break}s!==t.prevOccupancy&&(e.events.push(s?"oo":"of"),t.prevOccupancy=s);r!==t.prevMmwave&&(e.events.push(r?"wo":"wf"),t.prevMmwave=r);return{sensorOccupancy:s,mmwave:r}}(i);return{occupancy:i.occupancy,targets:r,staticState:e.staticState,motionState:e.motionState,sensorOccupancy:o,mmwave:a,events:i.events}}function ih(e){return e.occupied?null!==e.pendingSince?"pending":"occupied":"clear"}function sh(e){return"active"===e?"a":"pending"===e?"p":"c"}const rh=["t","h","o","f"];class oh{constructor(e){this._zoneEngineState=Zc(),this._overlayTracker=new jc,this._rawFedThisCycle=!1,this._editorEngineResult=null,this.host=e,e.addController(this)}hostConnected(){}hostDisconnected(){}get zoneEngineState(){return this._zoneEngineState}set zoneEngineState(e){this._zoneEngineState=e}get editorEngineResult(){return this._editorEngineResult}resetZoneEngineState(){this._zoneEngineState=Zc(),this._editorEngineResult=null,this._overlayTracker.reset(),this._rawFedThisCycle=!1}resetEngineForGridChange(){Xc(this._zoneEngineState),this._overlayTracker.reset(),this._rawFedThisCycle=!1}resetEngineForZoneConfigChange(){var e;Xc(e=this._zoneEngineState),e.localZoneState.clear(),e.staticState="inactive",e.motionState="inactive",e.staticPendingSince=null,e.motionPendingSince=null,e.sensorsEverActive=!1,e.prevOccupancy=!1,e.prevMmwave=!1,this._overlayTracker.reset(),this._rawFedThisCycle=!1}dismissTarget(e,t){Vc(this._zoneEngineState,e,t,this.host._grid)}handleTargetData(e){if("settings"===this.host._view){const t=this.host._sensorState,i=e.sensors,s={};return null==t.temperature&&null!=i.temperature&&(s.temperature=i.temperature),null==t.humidity&&null!=i.humidity&&(s.humidity=i.humidity),null==t.illuminance&&null!=i.illuminance&&(s.illuminance=i.illuminance),null==t.co2&&null!=i.co2&&(s.co2=i.co2),void(Object.keys(s).length>0&&(this.host._sensorState={...t,...s}))}if(this.host._targets=e.targets,"live"!==this.host._view&&"editor"!==this.host._view||function(e,t,i=60){for(let s=0;s<t.length&&s<e.length;s++){const r=t[s];if(null!=r.x&&null!=r.y&&"active"===r.status){const t=e[s];t.push({x:r.x,y:r.y}),t.length>i&&t.splice(0,t.length-i)}else e[s].length=0}}(this.host._targetTrails,e.targets),this.host._sensorState=e.sensors,e.zones&&(this.host._zoneState={occupancy:e.zones.occupancy,target_counts:e.zones.target_counts,frame_count:e.zones.frame_count},this.host._showBackendDebugLog&&(e.zones.events&&e.zones.events.length>0?this.appendBackendEvents(e.zones.events):e.zones.debug_log&&this.appendBackendDebugLog(e.zones.debug_log))),"live"===this.host._view){const t=this._zoneEngineState.targetPrevXY;for(let i=0;i<e.targets.length&&i<t.length;i++){const s=e.targets[i];null!=s.x&&null!=s.y&&"active"===s.status&&(t[i]={x:s.x,y:s.y})}}else"editor"===this.host._view&&(this._rawFedThisCycle||this._overlayTracker.update(this.host._targets.map(e=>({active:"active"===e.status,x:e.x,y:e.y})),this.host._grid,this.host._roomWidth,this.host._roomDepth),this.runLocalZoneEngine(),this._rawFedThisCycle=!1)}handleRawTargetData(e){if("settings"===this.host._view)return;this.host._rawTargets=e;const t=this.host._perspective,i=e.map(e=>{if(null==e.raw_x||null==e.raw_y)return{active:!1,x:null,y:null};if(t){const i=Yi(t,e.raw_x,e.raw_y);return{active:!0,x:i.x,y:i.y}}return{active:!1,x:null,y:null}});this._overlayTracker.update(i,this.host._grid,this.host._roomWidth,this.host._roomDepth),this._rawFedThisCycle=!0}runLocalZoneEngine(){const e=this.host._sensorState,t=this.host._zoneConfigs,i=wr(t[0]),s=this._overlayTracker.onOverlay,r=th(this._zoneEngineState,{targets:this.host._targets.map((e,t)=>({...e,onOverlay:s[t]??!1})),grid:this.host._grid,roomWidth:this.host._roomWidth,roomDepth:this.host._roomDepth,zoneConfigs:t.slice(1),roomType:i.type,roomTrigger:i.trigger,roomRenew:i.renew,roomTimeout:i.timeout,roomHandoffTimeout:i.handoff_timeout,staticPresence:e?.static_presence??!1,motionPresence:e?.motion_presence??!1,staticTimeout:this.host._staticTimeout,motionTimeout:this.host._motionTimeout,stuckTargetTimeout:this.host._stuckTargetTimeout,assistedClearEnabled:this.host._assistedClearEnabled,assistedClearTimeout:this.host._assistedClearTimeout});return this._zoneEngineState={...this._zoneEngineState,localZoneState:new Map(this._zoneEngineState.localZoneState)},this.host._showDebugLog&&this._buildFrontendDebugLog(r),this._editorEngineResult=r,r}_zoneNameResolver(){const e=this.host._localize;return t=>{if(0===t)return e("live.debug.room");const i=this.host._zoneConfigs[t];return i&&"name"in i?i.name:e("live.debug.zone_n",{n:t})}}enrichDebugLog(e){const t=this.host._localize,i=this._zoneNameResolver(),s={A:t("live.debug.active"),P:t("live.debug.pending"),I:t("live.debug.inactive"),O:t("live.debug.occupied")},r=t("live.debug.static"),o=t("live.debug.motion"),a=t("live.debug.occ"),n=t("live.debug.on"),l=t("live.debug.off"),c=e.split("|");let h,d,p;c.length>=3?(h=c[0],d=c[1],p=c[2]):(h="",d=c[0]||"",p=c[1]||"");let u="";if(h.trim()){const e=h.trim().split(/\s+/),t=[];for(const i of e){const[e,c]=i.split(":");"S"===e?t.push(`${r}: ${s[c]??c}`):"M"===e?t.push(`${o}: ${s[c]??c}`):"Occ"===e&&t.push(`${a}: ${"1"===c?n:l}`)}u=t.join(", ")}const g=(d||"").trim().split(/\s+/).filter(Boolean).map(e=>{const[t,r,o,a]=e.split(":"),n=parseInt(r?.replace("Z","")??"0",10),l=Number.isFinite(n)?n:0;return`${t}→${i(l)}(${s[o]??o},${a})`}),A=(p||"").trim().split(/\s+/).filter(Boolean).map(e=>{const[t,r,o]=e.split(":"),a=parseInt(t?.replace("Z","")??"0",10),n=Number.isFinite(a)?a:0;return`${i(n)}: ${s[r]??r}(${o})`}),_=g.length?g.join(" "):t("live.debug.no_targets"),f=A.length?A.join(", "):t("live.debug.all_clear");return u?`${u} | ${_} | ${f}`:`${_} | ${f}`}_appendLog(e,t,i,s){e!==this.host[t]&&(this.host[t]=e,this._appendLogLine(e,i,s))}_appendLogLine(e,t,i){const s=this.host.shadowRoot?.getElementById(i);s&&!s.querySelector(".debug-log-line")&&this.host[t].length>0&&(this.host[t]=[]);const r=`${(new Date).toLocaleTimeString(this.host._localize?.lang??"en-GB",{hour12:!1,hour:"2-digit",minute:"2-digit",second:"2-digit",fractionalSecondDigits:1})} ${e}`;this.host[t].push(r),this.host[t].length>100&&(this.host[t]=this.host[t].slice(-100)),this._appendToLogContainer(i,r)}appendBackendDebugLog(e){let t=e;if(e.split("|").length<3){const i=this.host._sensorState;t=`S:${i?.static_presence?"A":"I"} M:${i?.motion_presence?"A":"I"} Occ:${i?.occupancy?"1":"0"}|${e}`}const i=this.enrichDebugLog(t);this._appendLog(i,"_backendDebugLogPrev","_backendDebugLogLines","backend-debug-log-scroll")}appendBackendEvents(e){const t=this.host._localize,i=this._zoneNameResolver(),s=e=>t("live.debug.target_n",{n:e+1});for(const r of e){const e=Jc(r,i,s,t);this._appendLogLine(e,"_backendDebugLogLines","backend-debug-log-scroll")}}_appendToLogContainer(e,t){const i=this.host.shadowRoot?.getElementById(e);if(!i)return;1!==i.children.length||i.children[0].classList.contains("debug-log-line")||(i.innerHTML="");const s=document.createElement("div");for(s.className="debug-log-line",s.textContent=t,i.appendChild(s);i.children.length>100;)i.firstChild?.remove();i.scrollTop=i.scrollHeight}_buildFrontendDebugLog(e){const t=this.host._localize,i=this._zoneNameResolver(),s=e=>t("live.debug.target_n",{n:e+1});for(const r of e.events){const e=Jc(r,i,s,t);this._appendLogLine(e,"_debugLogLines","debug-log-scroll")}}}const ah=/\/eppgrid_static\/([^/]+)\/eppgrid-(?:panel|card)\.js(?:[?#]|$)/;function nh(){try{return"undefined"!=typeof sessionStorage?sessionStorage:null}catch{return null}}function lh(e,t,i){try{null===i?e?.removeItem(t):e?.setItem(t,i)}catch{}}function ch(){return document.querySelector("home-assistant")?.shadowRoot?.querySelector("home-assistant-main")?.shadowRoot?.querySelector("partial-panel-resolver")??null}function hh(){const e=ch()?.querySelector("ha-panel-custom")??null;e&&"eppgrid-panel"===e.panel?.config?._panel_custom?.name&&(function(e){const t=e.panel?.config?._panel_custom?.name;return"eppgrid-panel"===t&&0===e.children.length}(e)?function(e){const t=document.querySelector("home-assistant"),i=t?.hass;if(!i)return;const s=document.createElement("eppgrid-panel");s.hass=i,s.panel=e.panel,e.appendChild(s)}(e):function(e){const t=Array.from(e.children).filter(e=>"eppgrid-panel"===e.tagName.toLowerCase());for(let e=1;e<t.length;e++)t[e].remove()}(e))}const dh=()=>{"visible"===document.visibilityState&&hh()};let ph=null,uh=null;function gh(e,t,i){if(e?.node===t)return e;e?.observer.disconnect();const s=new MutationObserver(i);return s.observe(t,{childList:!0}),{node:t,observer:s}}function Ah(e){ph=gh(ph,e,()=>hh())}function _h(){const e=ch();if(!e)return;var t;uh=gh(uh,t=e,()=>{const e=t.querySelector("ha-panel-custom");e&&Ah(e),hh()});const i=e.querySelector("ha-panel-custom");i&&Ah(i)}const fh=function(e){if(!e)return null;const t=ah.exec(e),i=t?.[1];return i&&"0"!==i?i:null}(import.meta.url),mh=Y`
	<svg
		class="epp-logo"
		viewBox="0 0 256 256"
		role="img"
		aria-label="Everything Presence Pro Grid"
	>
		<rect width="256" height="256" rx="48" fill="#0f172a" />
		<g stroke="#4d6d9f" stroke-width="3">
			<path
				d="M32 32v192M64 32v192M96 32v192M128 32v192M160 32v192M192 32v192M224 32v192"
			/>
			<path
				d="M32 32h192M32 64h192M32 96h192M32 128h192M32 160h192M32 192h192M32 224h192"
			/>
		</g>
		<path
			d="M 128 48 L 32 195.5 A 176 176 0 0 0 224 195.5 Z"
			fill="#0ea5e9"
			fill-opacity="0.32"
			stroke="#7dd3fc"
			stroke-width="3.5"
			stroke-linejoin="round"
		/>
		<g
			fill="none"
			stroke="#7dd3fc"
			stroke-width="2.5"
			stroke-linecap="round"
			stroke-dasharray="0 6"
			opacity="0.85"
		>
			<path d="M 96 97.17 A 58.67 58.67 0 0 0 160 97.17" />
			<path d="M 64 146.34 A 117.33 117.33 0 0 0 192 146.34" />
		</g>
		<circle cx="128" cy="160" r="12" fill="#fb923c" />
		<circle
			cx="128"
			cy="160"
			r="22"
			fill="none"
			stroke="#fb923c"
			stroke-width="3"
			opacity="0.6"
		/>
		<circle cx="128" cy="48" r="12" fill="#f8fafc" />
		<circle
			cx="128"
			cy="48"
			r="20"
			fill="none"
			stroke="#f8fafc"
			stroke-width="2.5"
			opacity="0.55"
		/>
	</svg>
`,wh=n`
  :host {
    display: flex;
    height: 100%;
    background: var(--primary-background-color, #fafafa);
    color: var(--primary-text-color, #212121);
    font-family: var(--ha-font-family-body, "Roboto", sans-serif);
    /* Own the desktop scroll on the panel host and ALWAYS reserve the
       scrollbar gutter (scrollbar-gutter only applies on a scroll container,
       hence overflow-y:auto). Selecting a detection zone grows the sidebar
       content past the viewport, toggling a vertical scrollbar; without a
       reserved gutter that toggle shrinks the content width by the scrollbar,
       and the margin:auto-centred .panel (and the grid inside it) shifts
       horizontally. Reserving the gutter keeps the layout width constant so
       the grid stays put. (Mobile re-owns its own scroll via .panel
       overflow:hidden in the @media block below.) */
    overflow-y: auto;
    scrollbar-gutter: stable;
  }
`,vh=n`
  .panel {
    padding: 24px;
    max-width: 1100px;
    margin: 0 auto;
    font-size: 14px;
  }

  /* Grid-hero views (editor + live overview) fill the available width instead
     of the 1100px centered reading column. CRITICAL: drop the auto side margins
     — auto margins on a flex item (the panel is a child of the flex-column
     .tab-layout) disable align-items:stretch, so the panel shrink-wraps to its
     content and the grid never gets the width to flex into. */
  .panel.panel--grid {
    max-width: none;
    margin: 0;
    align-self: stretch;
    /* Bound the grid-hero panel to the viewport (it's flex:1 of the full-height
       .tab-layout) and make it a flex column so the sidebar sheet scrolls
       internally — its body scrolls and Save/Cancel pin to the bottom — instead
       of the whole panel growing and the page scrolling when the zone list /
       furniture browser is tall. The header stays fixed; the editor-shell fills
       the rest. Mirrors what the mobile .panel column already does. */
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  /* Own the scroll inside the sheet, not the panel: beat the lower-down
     .tab-layout > :not(.tab-bar) { overflow: auto } at the same (0,2,0)
     specificity by adding a class (0,3,0) so order no longer matters. */
  .tab-layout > .panel.panel--grid {
    overflow: hidden;
  }
  .panel--grid > .panel-header {
    flex-shrink: 0;
  }

  /* Non-grid panels (settings, wizard, loading, empty-state) fill the host width
     so they don't shrink-wrap to content. As a flex item of the column .tab-layout
     the auto side margins above disable align-items:stretch, so without this the
     panel sizes to its widest content — settings visibly jumped narrow→wide as an
     accordion's controls appeared/disappeared. width:100% pins it to the host width
     (box-sizing:border-box folds the 24px padding in rather than overflowing); the
     inner reading column (e.g. .settings-container max-width) then stays a stable
     fixed width. Grid-hero (.panel--grid) is excluded — it fills via align-self. */
  .panel:not(.panel--grid) {
    width: 100%;
    box-sizing: border-box;
  }

  /* The settings panel is height-bounded (like the grid-hero panel) so the
     settings view fills it: the accordion list scrolls inside .settings-scroll
     while the Save/Cancel bar pins to the bottom, rather than the whole panel
     growing and the page scrolling. Scoped to the settings panel (not every plain
     panel) so the wizard/loading panels keep their natural flow. */
  .panel--settings {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }
  .tab-layout > .panel--settings {
    overflow: hidden;
  }
  /* The settings area below the header: the settings view fills it, and a
     connection/protocol status banner (.protocol-fullpage) overlays it — covering
     and disabling it — while the view stays mounted (preserving edit state). */
  .panel--settings .settings-stage {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .settings-stage > epp-settings-view {
    flex: 1;
    min-height: 0;
  }
  .settings-stage > .protocol-fullpage {
    position: absolute;
    inset: 0;
    margin: 0;
    border-radius: 0;
    z-index: 5;
  }

  /* The calibrate/tutorial wizard is bounded the same way: the connection banner
     overlays <epp-wizard> instead of stacking as its sibling. On desktop .panel is
     a plain block, so this is inert there (as it always was) — but on mobile .panel
     becomes a flex column (below), where a bare sibling's flex:1 would otherwise
     absorb the free space and squeeze epp-wizard (which carries no flex of its
     own), clipping it. Room calibration is typically done on a phone, walking the
     room, so the wizard must stay fully visible (#336). */
  .wizard-stage {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .wizard-stage > epp-wizard {
    flex: 1;
    min-height: 0;
  }
  .wizard-stage > .protocol-fullpage {
    position: absolute;
    inset: 0;
    margin: 0;
    border-radius: 0;
    z-index: 5;
  }

  @media (max-width: 819px) {
    :host {
      --epp-control-height: 44px;
      /* Mobile re-owns its scroll inside .panel (overflow:hidden below), so
         the host neither scrolls nor needs a reserved gutter — drop both so a
         phone doesn't show a wasted gutter strip down the edge. */
      overflow: hidden;
      scrollbar-gutter: auto;
    }
    .panel {
      /* Constrain .panel to the panel-host width (which HA sizes to the
         viewport). Without a cap, .panel grows to the grid's content width
         (~maxGridPx) and the page scrolls horizontally on a narrow phone.
         Use max-width:100% (of the host) + box-sizing:border-box rather than
         100vw: 100vw is scrollbar-inflated (≈16px wider than the real content
         area when a vertical scrollbar is present), and border-box folds the
         12px×2 padding INTO the cap instead of adding it on top — so the grid's
         measured host width is the true content width and it fits exactly.
         min-width:0 also drops the flex min-content floor (:host is
         display:flex; .panel is its flex item). (Mobile @media only — desktop
         layout is byte-identical.) */
      max-width: 100%;
      /* Always fill the host width (not just cap it): as a flex item of :host,
         .panel would otherwise size to its content's width (flex-basis:auto),
         so the live view's width visibly jumped when the wide debug log opened
         /closed. width:100% pins it to the host width regardless of content. */
      width: 100%;
      box-sizing: border-box;
      /* Drop the BOTTOM padding on mobile so the inline controls sheet reaches
         the viewport bottom (no gap below it). The 12px bottom padding
         otherwise leaves a strip between the sheet's pinned Save/Cancel
         actions and the screen edge. Square bottom corners flush at the edge
         are expected. */
      padding: var(--epp-space-3, 12px) var(--epp-space-3, 12px) 0;
      min-width: 0;
      /* Full-height flex column so the editor's controls panel fills the space
         below the grid down to the viewport bottom (nothing extends past it).
         height:100% resolves against :host (which is height:100%). Clipping our
         own overflow makes the inner regions (sheet body / sidebar) scroll
         instead of the page. (Mobile @media only — desktop is byte-identical.) */
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      overflow: hidden;
    }
    .panel-header ha-select {
      width: 100%;
    }
    /* The device-groups view lives directly under .tab-layout (not .panel), so
       it already gets flex:1 + overflow:auto from the .tab-layout > :not(.tab-bar)
       rule. Add min-height:0 so its internal flex column can establish a
       bottom-pinned Save/Cancel bar with the editor body scrolling instead of
       the whole view. (Mobile @media only — desktop is byte-identical.) */
    .tab-layout > epp-device-groups-view {
      min-height: 0;
    }
  }

  .controller-error-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 12px 16px 0;
    padding: 10px 12px;
    border-radius: 8px;
    background: var(--error-color, #db4437);
    color: var(--text-primary-color, #fff);
    font-size: 14px;
  }

  .controller-error-banner span {
    flex: 1;
  }

  .controller-error-dismiss {
    display: flex;
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    padding: 2px;
  }
`,bh=n`
  .protocol-fullpage {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 48px 24px;
    margin: 16px;
    border-radius: 12px;
    text-align: center;
    flex: 1;
  }
  .protocol-fullpage-warning {
    background: var(--warning-color, #ff9800);
    color: white;
  }
  .protocol-fullpage-info {
    background: var(--info-color, #2196f3);
    color: white;
  }
  .protocol-fullpage ha-icon {
    --mdc-icon-size: 48px;
  }
  .protocol-fullpage p {
    margin: 0;
    font-size: 16px;
    max-width: 480px;
    line-height: 1.5;
  }
  .protocol-fullpage .wizard-btn {
    box-shadow: inset 0 0 0 2px white;
  }
  .protocol-link {
    color: white;
    font-weight: 500;
    text-decoration: underline;
    font-size: 16px;
  }
`,Eh=n`
  .grid-column {
    min-width: 0;
    max-width: min-content;
  }

  .grid-container {
    position: relative;
    max-width: 100%;
    overflow: visible;
  }

  /* Desktop editor/live: frame the grid in a full-width "expansion area" card.
     The grid centres within it, the white surface shows the space the grid can
     use, and the detection log below lines up with the card's left edge. Reset
     on mobile (the grid fills the screen there — no card). */
  .editor-shell .grid-container {
    background: var(--epp-surface, var(--card-background-color, #fff));
    border: 1px solid var(--epp-border, var(--divider-color, #e0e0e0));
    border-radius: var(--epp-radius-lg, 16px);
    padding: var(--epp-space-4, 16px);
  }

  .sidebar-title {
    font-size: 15px;
    font-weight: 600;
    padding: 10px 12px 8px;
    color: var(--primary-text-color, #212121);
  }

  /* Unified editor shell: CSS grid on desktop — grid column takes the remaining
     space, the controls panel a fixed 360px track. A grid TRACK (vs a flex
     item) is reserved by the container regardless of whether the controls
     element is momentarily present, so the grid column's width stays stable
     across the editor↔live swap (no "jump bigger then back" on save). The 1fr
     uses minmax(0,…) so the column can shrink below its content. */
  .editor-shell {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    /* Fill the panel height below the header (flex:1) and let the single row fill
       the shell (grid-template-rows) so the tracks are bounded; min-height:0 lets
       them shrink and scroll internally rather than the shell growing the page. */
    grid-template-rows: minmax(0, 1fr);
    gap: 24px;
    align-items: stretch;
    width: 100%;
    flex: 1;
    min-height: 0;
  }

  .editor-shell > .grid-column {
    min-width: 0;
    max-width: none;
    min-height: 0;
    display: flex;
    flex-direction: column;
    /* .tab-layout > .panel.panel--grid is deliberately overflow:hidden to bound
       the grid-hero panel to the viewport, so the sidebar sheet can scroll
       internally instead of the whole page growing. But the detection-events
       log lives here, in .grid-column below the grid card — not in the sheet.
       With no scroll container between the log and the clipped panel,
       expanding the log grows this column past the viewport and it becomes
       permanently unreachable (#338). Own the scroll here, the same way the
       sheet already owns its own. Paired with min-height:0 above — without
       that this column can't shrink below its content height, so it never
       needs its own scrollbar. Inert on mobile (below), where the media query
       fixes this column to its natural height instead. */
    overflow-y: auto;
  }

  /* Space the heatmap toggle off the bottom of the grid card. The grid column is
     a flex column with no gap, so without this the toggle row touches the card's
     bounding box. Token-driven so it follows the spacing scale. */
  .heatmap-toggle {
    margin-top: var(--epp-space-3, 12px);
  }

  .editor-shell > .editor-controls,
  .editor-shell > .live-controls {
    /* Pin the controls panel to a fixed width so the grid column reliably gets
       all the remaining width. min-width:0 is essential: without it a flex
       item's automatic minimum size is its content's MIN-CONTENT width, which
       overrides flex-basis/max-width — the editor's zone form has a wide
       min-content, so the sidebar refused to shrink and squashed the grid. With
       min-width:0 the form wraps/scrolls within the fixed width instead. */
    flex: 0 0 360px;
    max-width: 360px;
    min-width: 0;
    /* Allow the sheet to shrink below its content height so its own body scrolls
       (Save/Cancel stay pinned) instead of stretching the row. */
    min-height: 0;
  }

  /* Sidebar-tab switcher — rendered in the epp-sheet peek at every breakpoint. */
  .sidebar-tabs {
    display: flex;
    gap: 4px;
  }

  .sidebar-tabs .sidebar-tab {
    flex: 1;
    appearance: none;
    border: none;
    background: transparent;
    padding: 8px 4px;
    border-radius: var(--epp-radius-md, 8px);
    font: inherit;
    font-size: 13px;
    font-weight: 500;
    color: var(--secondary-text-color, #727272);
    cursor: pointer;
  }

  .sidebar-tabs .sidebar-tab.active {
    background: var(--secondary-background-color, #f5f5f5);
    color: var(--primary-color, #03a9f4);
  }
  /* Manual activation lets focus diverge from selection while arrowing, so the
     focused-but-not-selected tab needs a visible ring distinct from .active. */
  .sidebar-tabs .sidebar-tab:focus-visible {
    outline: 2px solid var(--primary-color, #03a9f4);
    outline-offset: -2px;
  }

  @media (max-width: 819px) {
    /* Unified editor shell: stacks to a column on mobile (grid top, sheet below
       filling height). The grid column is fixed-height (flex:0 0 auto) and the
       inline <epp-sheet> fills the rest and owns its own scroll. */
    .editor-shell {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }
    .editor-shell > .grid-column {
      flex: 0 0 auto;
      max-width: 100%;
    }
    .editor-shell > .editor-controls,
    .editor-shell > .live-controls {
      flex: 1 1 auto;
      min-height: 0;
      max-width: none;
    }
    /* No expansion-area card on mobile — the grid fills the screen. */
    .editor-shell .grid-container {
      background: none;
      border: none;
      padding: 0;
    }
    /* The hand-rolled sub-tabs aren't epp-* primitives, so they don't pick up
       the panel's mobile control height on their own. Size them to it (44px
       here) so they match every other mobile control and meet the touch-target
       goal, and centre the label at that height. */
    .sidebar-tabs .sidebar-tab {
      min-height: var(--epp-control-height);
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
`,yh=n`
  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 4px 4px 12px;
  }

  .sidebar-header .sidebar-title {
    padding: 0;
  }
`;class Ch extends he{constructor(){super(...arguments),this._deviceCtrl=new oo(this),this._gridCtrl=(()=>{const e=new zc(this);return e.onError=e=>{this._controllerError=e},e})(),this._targetCtrl=new oh(this),this._flasherCtrl=(()=>{const e=new kc(this);return e.confirmDeleteOriginalFirmware=()=>this._requestFlasherDeleteConfirm(),e.onDeviceReadyForSetup=(e,t)=>this._onDeviceReadyForSetup(e,t),e})(),this._navGuard=new Wc(this),this._localize=Object.assign(e=>e,{formatNumber:(e,t=1)=>e.toFixed(t),lang:"en"}),this._currentLang="",this._grid=new Uint8Array(gi),this._zoneConfigs=gr,this._activeZone=null,this._targetAutoDistance=!0,this._targetMaxDistance=6,this._stuckTargetTimeout=300,this._assistedClearEnabled=!0,this._assistedClearTimeout=5,this._staticAutoDistance=!0,this._staticMinDistance=.3,this._staticMaxDistance=16,this._temperatureOffset=0,this._humidityOffset=0,this._illuminanceOffset=0,this._motionTimeout=5,this._staticTimeout=30,this._staticTriggerThreshold=3,this._staticRenewThreshold=3,this._staticOnDelay=0,this._logLevels={},this._co2Enabled=!1,this._ledMode="Manual Control",this._ledBrightness=1,this._ledPresenceColor="#CC33FF",this._relayTriggerMode="disabled",this._relayContactMode="no",this._targetUpdateRateMs=1e3,this._zoneUpdateRateMs=1e3,this._entitiesConfig={},this._sidebarTab=Hc("undefined"!=typeof location?location.hash:"").sidebarTab,this._panelTab="config",this._showDeleteCalibrationDialog=!1,this._showFlasherDeleteConfirm=!1,this._flasherDeleteConfirmResolve=null,this._showCustomIconPicker=!1,this._customIconValue="",this._furniture=[],this._selectedFurnitureId=null,this._furnitureClipboard=null,this._dragState=null,this._targets=[],this._rawTargets=[],this._targetTrails=[[],[],[]],this._heatmapEnabled=!1,this._heatmapCells=[],this._sensorState={occupancy:!1,static_presence:!1,motion_presence:!1,target_presence:!1,mmwave:!1,illuminance:null,temperature:null,humidity:null,co2:null},this._zoneState={occupancy:{},target_counts:{},frame_count:0},this._showDebugLog=!1,this._debugLogLines=[],this._debugLogPrev=null,this._showBackendDebugLog=!1,this._backendDebugLogLines=[],this._backendDebugLogPrev=null,this._overlayMode=null,this._targetMenu=null,this._dismissedTargets=new Map,this._isPainting=!1,this._justPainted=!1,this._paintAction="set",this._frozenBounds=null,this._saving=!1,this._dirty=!1,this._isMobile=!1,this._editorTextFocused=!1,this._onEditorFocusIn=e=>{const t=e.composedPath?.()[0]??e.target;if(!t)return;const i=t.tagName;("TEXTAREA"===i||"INPUT"===i&&!["button","checkbox","radio","range","submit","reset","color","file"].includes(t.type))&&(this._editorTextFocused=!0)},this._onEditorFocusOut=()=>{this._editorTextFocused=!1},this._onMql=e=>{this._isMobile=e.matches},this._controllerError=null,this._showUnsavedDialog=!1,this._showConfigurationBackup=!1,this._showConfigurationRestore=!1,this._configurationName="",this._devices=[],this._selectedMac="",this._setupOpen=!1,this._setupDevice=null,this._loading=!0,this._loadedConfigMac=null,this._initRetryCount=0,this._haConnected=!0,this._streamOffline=!1,this._listeningConnection=null,this._onHaReady=()=>{const e=!this._haConnected;this._haConnected=!0,e&&(this._bundleCheckPending=!0,this._maybeCheckForNewBundle(),this._initialize().catch(()=>{}))},this._onHaDisconnected=()=>{this._haConnected=!1},this._currentBundleHash=fh,this._reloadPage=()=>location.reload(),this._bundleCheckPending=!1,this._bundleCheckInFlight=!1,this._view=Hc("undefined"!=typeof location?location.hash:"").view,this._openAccordions=new Set,this._perspective=null,this._roomWidth=0,this._roomDepth=0,this._onKeyDown=e=>{if("editor"!==this._view||"furniture"!==this._sidebarTab)return;if(!this._selectedFurnitureId)return;if(!e.composedPath().some(e=>{if(!(e instanceof HTMLElement))return!1;const t=e.tagName;return"INPUT"===t||"TEXTAREA"===t||"SELECT"===t||e.isContentEditable}))if("Backspace"===e.key||"Delete"===e.key)e.preventDefault(),this._removeFurniture(this._selectedFurnitureId);else if("Escape"===e.key)e.preventDefault(),this._selectedFurnitureId=null;else if("c"===e.key&&(e.ctrlKey||e.metaKey)){const e=this._furniture.find(e=>e.id===this._selectedFurnitureId);e&&(this._furnitureClipboard={...e})}else if("x"===e.key&&(e.ctrlKey||e.metaKey)){const e=this._furniture.find(e=>e.id===this._selectedFurnitureId);e&&(this._furnitureClipboard={...e},this._removeFurniture(e.id))}else if("v"===e.key&&(e.ctrlKey||e.metaKey)){if(!this._furnitureClipboard)return;e.preventDefault();const t=`f_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,i=this._furnitureClipboard,s=Vi(this._getRoomBounds(),this._roomWidth),r=300,o={...i,id:t,x:Math.max(s.minX,Math.min(s.maxX-i.width,i.x+r)),y:Math.max(s.minY,Math.min(s.maxY-i.height,i.y+r))};this._furniture=[...this._furniture,o],this._selectedFurnitureId=o.id,this._dirty=!0}},this._initializeInFlight=null,this._namedZonesCache=null,this._namedZonesCacheConfigs=null,this._wizardSensorStateCache=null,this._onLiveMenuSelect=async e=>{switch(e.detail.id){case"zones":case"overlays":case"furniture":this._enterEditor(e.detail.id);break;case"settings":this._navGuard.guardNavigation(()=>this._applyView({view:"settings",sidebarTab:this._sidebarTab}));break;case"calibration":this._changePlacement();break;case"delete_calibration":this._showDeleteCalibrationDialog=!0;break;case"backup":this._showConfigurationBackup=!0;break;case"restore":await this._gridCtrl.fetchConfigurations(),this._showConfigurationRestore=!0}},this._fovCache=null,this._fovPerspective=Ch._FOV_UNCACHED,this._maxRangeCache=null,this._maxRangeCacheGrid=null,this._maxRangeCacheAuto=null,this._maxRangeCacheMax=null,this._onSidebarTabsKeydown=e=>{const t=[...e.currentTarget.querySelectorAll(".sidebar-tab")],i=t.indexOf(e.target);if(-1===i)return;const s=function(e,t,i){if(i<=0)return null;switch(e.key){case"ArrowRight":return(t+1)%i;case"ArrowLeft":return(t-1+i)%i;case"Home":return 0;case"End":return i-1;default:return null}}(e,i,t.length);null!==s&&(e.preventDefault(),t[s]?.focus())}}get _zoneEngineState(){return this._targetCtrl.zoneEngineState}set _zoneEngineState(e){this._targetCtrl.zoneEngineState=e}async _maybeCheckForNewBundle(){if(this._bundleCheckPending&&!this._bundleCheckInFlight){this._bundleCheckInFlight=!0;try{await async function(e){const{currentHash:t,fetchServerHash:i,reload:s,storage:r}=e,o=e.guardKey??"eppgrid_reload_for_hash";if(!t)return!0;let a;try{a=await i()}catch{return!1}return!(null==a||"0"!==a&&(t===a?(lh(r,o,null),0):(function(e,t){try{return e?.getItem(t)??null}catch{return null}}(r,o)===a||(lh(r,o,a),s()),0)))}({currentHash:this._currentBundleHash,fetchServerHash:async()=>{const e=await(this.hass?.callWS({type:"eppgrid/frontend_version"}));return e?.hash??null},reload:this._reloadPage,storage:nh()})&&(this._bundleCheckPending=!1)}finally{this._bundleCheckInFlight=!1}}}connectedCallback(){super.connectedCallback(),_h(),this._initialize().catch(()=>{}),window.addEventListener("keydown",this._onKeyDown),this._mql=window.matchMedia("(max-width: 819px)"),this._isMobile=this._mql.matches,this._mql.addEventListener("change",this._onMql)}disconnectedCallback(){super.disconnectedCallback(),this._initRetryTimer&&(clearTimeout(this._initRetryTimer),this._initRetryTimer=void 0),this._closeDeviceSession(),this._detachConnectionListeners(),window.removeEventListener("keydown",this._onKeyDown),this._mql?.removeEventListener("change",this._onMql)}_attachConnectionListeners(e){e&&this._listeningConnection!==e&&(this._detachConnectionListeners(),"function"==typeof e.addEventListener&&(e.addEventListener("ready",this._onHaReady),e.addEventListener("disconnected",this._onHaDisconnected),this._listeningConnection=e))}_detachConnectionListeners(){const e=this._listeningConnection;e&&"function"==typeof e.removeEventListener&&(e.removeEventListener("ready",this._onHaReady),e.removeEventListener("disconnected",this._onHaDisconnected)),this._listeningConnection=null}willUpdate(e){if(e.has("hass")){const e=this.hass?.locale?.language??this.hass?.language;e!==this._currentLang&&(this._currentLang=e,this._localize=function(e){const t=e?.locale?.language??e?.language??"en",i=t.split("-")[0],s=Wt[t]?t:Wt[i]?i:"en",r=Wt[s],o=Wt.en,a=new Map,n=new Map,l=(e,t)=>{if(a.size>=256&&!a.has(e)){const e=a.keys().next().value;void 0!==e&&a.delete(e)}a.set(e,t)},c=(e,t)=>{const i=jt(r,e)??jt(o,e)??e;if(!t)return i;let n;if(a.has(i)){if(n=a.get(i),null===n)return i}else{try{n=new Kt(i,s)}catch{return l(i,null),i}l(i,n)}try{return n.format(t)}catch{return i}};return c.formatNumber=(e,t=1)=>{let i=n.get(t);return i||(i=new Intl.NumberFormat(s,{minimumFractionDigits:t,maximumFractionDigits:t}),n.set(t,i)),i.format(e)},c.lang=s,c}(this.hass))}e.has("_view")&&"editor"!==this._view&&(this._sidebarTab=Uc),!e.has("_view")&&!e.has("_isMobile")||"editor"===this._view&&this._isMobile||(this._editorTextFocused=!1),(e.has("_view")||e.has("_sidebarTab"))&&this._navGuard.syncHashFromState()}_applyView(e){this._view=e.view,this._sidebarTab=e.sidebarTab,"editor"===e.view&&"overlays"!==e.sidebarTab&&(this._overlayMode=null),"editor"!==e.view&&"tutorial"!==e.view&&"calibrate"!==e.view||this._pushWidenedDistanceOverride()}updated(e){if(e.has("hass")&&this.hass){this._deviceCtrl.hass=this.hass,this._flasherCtrl.hass=this.hass,this.hass.connection&&!this._deviceGroupsCtrl&&(this._deviceGroupsCtrl=new ao(this.hass.connection));const e=this.hass.connection;if(e&&(this.isConnected&&this._attachConnectionListeners(e),"boolean"==typeof e.connected&&(this._haConnected=e.connected)),!this._haConnected)return;this._loading&&!this._devices.length?this._initialize().catch(()=>{}):this._selectedMac&&this._isSelectedDeviceAvailable()&&!this._deviceCtrl.hasDeviceSession&&!this._deviceCtrl.reconnecting&&this._ensureSession(this._selectedMac)}}_ensureSession(e){this.isConnected&&(this._loadedConfigMac===e?this._deviceCtrl.reopenSession(e).catch(()=>{}):this._loadDeviceConfig(e).catch(()=>{}))}async _initialize(){if(this._initializeInFlight)return this._initializeInFlight;const e=this._runInitialize();this._initializeInFlight=e;try{await e}finally{this._initializeInFlight===e&&(this._initializeInFlight=null)}}async _runInitialize(){if(!this.hass)return;if(!this.isConnected)return;const e=void 0!==this._initRetryTimer;if(this._initRetryTimer&&(clearTimeout(this._initRetryTimer),this._initRetryTimer=void 0),e||0!==this._devices.length||(this._loading=!0),this._deviceCtrl.hass=this.hass,await this._subscribeDevices(),this.isConnected){if(this._maybeCheckForNewBundle(),0===this._devices.length)return this._initRetryCount+=1,this._loading=!1,void(this._initRetryTimer=setTimeout(()=>{this.isConnected&&this._initialize().catch(()=>{})},2e3));this._initRetryCount=0,this._selectedMac&&this._isSelectedDeviceAvailable()&&this._ensureSession(this._selectedMac),this._loading=!1}}async _subscribeDevices(){this._deviceCtrl.hass=this.hass,this._deviceCtrl.isHostDirty=()=>this._dirty,this._deviceCtrl.onDeviceListChanged=()=>{const e=this._selectedMac;this._devices=this._deviceCtrl.devices,this._selectedMac=this._deviceCtrl.selectedMac,this._devices.length>0&&(this._initRetryCount=0),""!==e&&""!==this._selectedMac&&e!==this._selectedMac&&(ir(this._selectedMac),this._furnitureClipboard=null,this._isSelectedDeviceAvailable()&&this._loadDeviceConfig(this._selectedMac).catch(()=>{})),this._selectedMac&&this._isSelectedDeviceAvailable()&&!this._deviceCtrl.hasDeviceSession&&!this._deviceCtrl.reconnecting&&this._ensureSession(this._selectedMac)},this._deviceCtrl.onAvailability=(e,t)=>{if(e!==this._selectedMac)return;if(t)return void(this._streamOffline=!1);if(this._streamOffline)return;this._streamOffline=!0;const i=this._sensorState;this._targets=[],this._rawTargets=[],this._targetTrails=[[],[],[]],this._sensorState={occupancy:!1,static_presence:!1,motion_presence:!1,target_presence:!1,mmwave:!1,illuminance:null,temperature:null,humidity:null,co2:null,temperature:i.temperature,humidity:i.humidity,illuminance:i.illuminance,co2:i.co2},this._zoneState={occupancy:{},target_counts:{},frame_count:0},this._targetCtrl.resetZoneEngineState(),this._dismissedTargets=new Map},await this._deviceCtrl.subscribeDeviceList(),this._devices=this._deviceCtrl.devices,this._selectedMac=this._deviceCtrl.selectedMac}_isSelectedDeviceAvailable(){const e=this._devices.find(e=>e.mac===this._selectedMac);return!!e?.available}get _isSelectedOffline(){const e=this._devices.find(e=>e.mac===this._selectedMac);return!!this._selectedMac&&(!e||"unavailable"===e.firmware_status||this._streamOffline)}async _loadDevices(){this._deviceCtrl.hass=this.hass,await this._deviceCtrl.loadDevices(),this._devices=this._deviceCtrl.devices,this._selectedMac=this._deviceCtrl.selectedMac}_openDeviceSetup(e){this._setupDevice=e,this._setupOpen=!0}async _onDeviceSetupComplete(e){const{mac:t,name:i,areaId:s,recreateEntityIds:r}=e.detail;this._setupOpen=!1,this._setupDevice=null;const o=this._devices.find(e=>e.mac===t);if((i||null)!==(o?.name||null)||(s||null)!==(o?.area||null)){try{await this.hass.callWS({type:"eppgrid/configure_device",mac:t,name:i||null,area_id:s,recreate_entity_ids:r})}catch(e){console.error("[eppgrid] configure_device failed",e)}await this._loadDevices()}}_onDeviceSetupDialogSkip(e){e.stopPropagation?.(),this._setupOpen=!1,this._setupDevice=null}async _onDeviceReadyForSetup(e,t){const i=this._flasherCtrl.opId,s=await this._waitForDevice(e,t,i);this._flasherCtrl.opId===i&&(s?(await this._flasherCtrl.resetUsbState(),this._selectAndShowConfig(s.mac),this._openDeviceSetup(s)):this._flasherCtrl.updateUsbState({step:"complete",ip:e,mac:t,haAdd:{type:"added"}}))}async _waitForDevice(e,t,i){const s=t?.toUpperCase();for(let t=0;t<30;t++){if(void 0!==i&&this._flasherCtrl.opId!==i)return null;try{await this._loadDevices();const t=this._devices.find(t=>t.host===e)??(s?this._devices.find(e=>e.mac===s):void 0);if(t)return t}catch{}await new Promise(e=>setTimeout(e,1e3))}return null}_selectAndShowConfig(e){this._navGuard.guardNavigation(()=>{e&&e!==this._selectedMac&&(this._closeDeviceSession(),this._selectedMac=e,ir(e),this._furnitureClipboard=null,this._loadDeviceConfig(e).catch(()=>{})),this._panelTab="config",this._applyView({view:"live",sidebarTab:this._sidebarTab})})}async _loadDeviceConfig(e){this._deviceCtrl.hass=this.hass,this._deviceCtrl.onTargetData=e=>{this._targetCtrl.handleTargetData(e)},this._deviceCtrl.onRawTargetData=e=>{this._targetCtrl.handleRawTargetData(e)},this._deviceCtrl.onHeatmapData=e=>{this._heatmapCells=e};const t=await this._deviceCtrl.loadDeviceConfig(e);if(!this.isConnected)return void this._deviceCtrl.closeDeviceSession();if(this._selectedMac!==e)return void this._deviceCtrl.closeDeviceSession();t&&this._applyConfig(t);const i=this._devices.find(t=>t.mac===e);i&&(this._co2Enabled=i.co2_enabled??!1);const s=function(e){try{return"1"===localStorage.getItem(or+e)}catch{return!1}}(e);this._heatmapEnabled=s&&"available"===this._heatmapAvailability(),this._deviceCtrl.setHeatmapEnabled(this._heatmapEnabled)}_applyConfig(e){const t=Rr(e);this._perspective=t.calibration.perspective,this._roomWidth=t.calibration.roomWidth,this._roomDepth=t.calibration.roomDepth,this._furniture=t.furniture,this._grid=t.grid,this._zoneConfigs=[t.zone0,...t.zoneConfigs];const i=t.settings;this._temperatureOffset=i.temperatureOffset,this._humidityOffset=i.humidityOffset,this._illuminanceOffset=i.illuminanceOffset,this._motionTimeout=i.motionTimeout,this._targetAutoDistance=i.targetAutoDistance,this._targetMaxDistance=i.targetMaxDistance,this._stuckTargetTimeout=i.stuckTargetTimeout,this._assistedClearEnabled=i.assistedClearEnabled,this._assistedClearTimeout=i.assistedClearTimeout,this._staticAutoDistance=i.staticAutoDistance,this._staticMinDistance=i.staticMinDistance,this._staticMaxDistance=i.staticMaxDistance,this._staticTriggerThreshold=i.staticTriggerThreshold,this._staticRenewThreshold=i.staticRenewThreshold,this._staticTimeout=i.staticTimeout,this._staticOnDelay=i.staticOnDelay,this._relayTriggerMode=i.relayTriggerMode,this._relayContactMode=i.relayContactMode,this._targetUpdateRateMs=i.targetUpdateRateMs,this._zoneUpdateRateMs=i.zoneUpdateRateMs,this._entitiesConfig=i.entities,this._logLevels=t.settings.logLevels,this._ledMode=t.settings.ledMode,this._ledBrightness=t.settings.ledBrightness,this._ledPresenceColor=t.settings.ledPresenceColor,this._loadedConfigMac=this._selectedMac}_closeDeviceSession(){this._deviceCtrl.closeDeviceSession(),this._targets=[],this._rawTargets=[],this._targetTrails=[[],[],[]],this._sensorState={occupancy:!1,static_presence:!1,motion_presence:!1,target_presence:!1,mmwave:!1,illuminance:null,temperature:null,humidity:null,co2:null},this._zoneState={occupancy:{},target_counts:{},frame_count:0},this._targetCtrl.resetZoneEngineState(),this._streamOffline=!1}_onCellMouseDown(e){this._gridCtrl.onCellMouseDown(e)}_onCellMouseEnter(e){this._gridCtrl.onCellMouseEnter(e)}_onCellMouseUp(){this._gridCtrl.onCellMouseUp()}_addZone(){this._gridCtrl.addZone()}_removeZone(e){this._gridCtrl.removeZone(e)}_addFurniture(e){this._gridCtrl.addFurniture(e)}_addCustomFurniture(e){this._gridCtrl.addCustomFurniture(e)}_addTextFurniture(){this._gridCtrl.addTextFurniture(this._localize("text_label.default_text"))}_removeFurniture(e){this._gridCtrl.removeFurniture(e)}_updateFurniture(e,t){this._gridCtrl.updateFurniture(e,t)}_onFurniturePointerDown(e,t,i,s,r){this._gridCtrl.onFurniturePointerDown(e,t,i,s,r)}_onFurnitureDrag(e){this._gridCtrl.onFurnitureDrag(e)}_namedZones(){return null!==this._namedZonesCache&&this._namedZonesCacheConfigs===this._zoneConfigs||(this._namedZonesCache=this._zoneConfigs.slice(1),this._namedZonesCacheConfigs=this._zoneConfigs),this._namedZonesCache}_getWizardSensorState(){const e=this._sensorState.occupancy;return null!==this._wizardSensorStateCache&&this._wizardSensorStateCache.occupancy===e||(this._wizardSensorStateCache={occupancy:e}),this._wizardSensorStateCache}_getRoomBounds(){return Ci(this._grid)}_getVisibleRoomBounds(){return Zi(this._grid,this._getSensorFov(),this._roomWidth,this._editorMaxRangeMm())}async _applyLayout(){return this._controllerError=null,this._gridCtrl.applyLayout()}_buildSettingsPayload(){const e={};for(const[t,i]of ur){const s=this[i];e[t]=s??hr[t]}return e}_buildSparseSettings(){const e=this._buildSettingsPayload(),t={};for(const[i,s]of Object.entries(e)){if("entities"===i)continue;pr(s,hr[i])||(t[i]=s)}"target_auto_distance"in t||delete t.target_max_distance,"static_auto_distance"in t||(delete t.static_min_distance,delete t.static_max_distance),"relay_trigger_mode"in t||delete t.relay_contact_mode;const i=function(e){if(!e)return{};const t={};for(const[i,s]of Object.entries(e))s!==(cr[i]??!1)&&(t[i]=s);return t}(e.entities);return Object.keys(i).length>0&&(t.entities=i),t}async _saveSettings(e){return this._controllerError=null,this._gridCtrl.saveSettings(e||{})}async _cancelSettings(){this._dirty=!1,this._view="live",await this._loadDeviceConfig(this._selectedMac)}async _cancelEditor(){const e=this._targetAutoDistance||this._staticAutoDistance;this._dirty=!1,this._selectedFurnitureId=null,this._overlayMode=null,await this._loadDeviceConfig(this._selectedMac),this._view="live",e&&await(this.hass?.callWS({type:"eppgrid/set_distance_override",mac:this._selectedMac,target_max_distance:this._targetMaxDistance,static_min_distance:this._staticMinDistance,static_max_distance:this._staticMaxDistance})?.catch(()=>{}))}_pushWidenedDistanceOverride(){(this._targetAutoDistance||this._staticAutoDistance)&&this.hass?.callWS({type:"eppgrid/set_distance_override",mac:this._selectedMac,target_max_distance:this._targetAutoDistance?hr.target_max_distance:this._targetMaxDistance,static_min_distance:this._staticAutoDistance?hr.static_min_distance:this._staticMinDistance,static_max_distance:this._staticAutoDistance?hr.static_max_distance:this._staticMaxDistance})?.catch(()=>{})}_enterEditor(e){this._navGuard.guardNavigation(()=>this._applyView({view:"editor",sidebarTab:e}))}_liveMenuItems(){const e=[];return this._perspective&&e.push({id:"zones",label:this._localize("menu.detection_zones"),icon:"mdi:vector-square"},{id:"overlays",label:this._localize("menu.overlays"),icon:"mdi:blur"},{id:"furniture",label:this._localize("menu.furniture"),icon:"mdi:sofa"}),e.push({id:"settings",label:this._localize("menu.settings"),icon:"mdi:cog"}),e.push({divider:!0}),e.push({id:"calibration",label:this._localize("menu.room_calibration"),icon:"mdi:target"}),this._perspective&&e.push({id:"delete_calibration",label:this._localize("menu.delete_calibration"),icon:"mdi:delete",danger:!0}),e.push({divider:!0}),e.push({id:"backup",label:this._localize("dialogs.backup_configuration"),icon:"mdi:content-save"},{id:"restore",label:this._localize("dialogs.restore_configuration"),icon:"mdi:folder-open"}),e}_getConfigurations(){return this._gridCtrl.configurations}async _saveConfiguration(){this._controllerError=null;try{await this._gridCtrl.saveConfiguration()}catch(e){console.error("Failed to save configuration",e)}}async _loadConfiguration(e){this._controllerError=null;try{await this._gridCtrl.loadConfiguration(e)}catch(t){console.error(`Failed to load configuration "${e}"`,t)}}async _deleteConfiguration(e){try{await this._gridCtrl.deleteConfiguration(e)}catch(t){console.error(`Failed to delete configuration "${e}"`,t)}}_initGridFromRoom(){this._grid=Di(this._roomWidth,this._roomDepth)}_getSensorFov(){return this._perspective?(this._fovPerspective===this._perspective||(this._fovCache=Ki(this._perspective),this._fovPerspective=this._perspective),this._fovCache):null}_computeMaxRangeMm(){if(null!==this._maxRangeCache&&this._maxRangeCacheGrid===this._grid&&this._maxRangeCacheAuto===this._targetAutoDistance&&this._maxRangeCacheMax===this._targetMaxDistance)return this._maxRangeCache;const e=(t=this._targetAutoDistance,i=this._targetAutoDistance?this._autoDetectionRange():0,s=this._targetMaxDistance,1e3*(t?i>0?Math.min(i,6):6:s));var t,i,s;return this._maxRangeCacheGrid=this._grid,this._maxRangeCacheAuto=this._targetAutoDistance,this._maxRangeCacheMax=this._targetMaxDistance,this._maxRangeCache=e,e}_editorMaxRangeMm(){return this._targetAutoDistance?_i:1e3*this._targetMaxDistance}_renderGlobalDialogs(){return Y`
      ${this._showConfigurationBackup||this._showConfigurationRestore?Y`<epp-configuration-dialogs
            .localize=${this._localize}
            .showBackup=${this._showConfigurationBackup}
            .showRestore=${this._showConfigurationRestore}
            .configurations=${this._getConfigurations()}
            .configurationName=${this._configurationName}
            .perspective=${this._perspective}
            .maxRangeMm=${this._computeMaxRangeMm()}
            .sensorFov=${this._getSensorFov()}
            @configuration-name-change=${e=>{this._configurationName=e.detail}}
            @configuration-save=${()=>this._saveConfiguration()}
            @configuration-load=${e=>this._loadConfiguration(e.detail)}
            @configuration-delete=${e=>this._deleteConfiguration(e.detail)}
            @backup-cancel=${()=>{this._showConfigurationBackup=!1}}
            @restore-close=${()=>{this._showConfigurationRestore=!1}}
          ></epp-configuration-dialogs>`:J}
      <epp-dialog
				?open=${this._showUnsavedDialog}
				heading=${this._localize("dialogs.unsaved_changes")}
				@dialog-dismiss=${()=>this._navGuard.cancelPendingNavigation()}
			>
				<p class="overlay-help">${this._localize("dialogs.unsaved_changes_body")}</p>
				<epp-button slot="actions" variant="text"
					@click=${()=>this._navGuard.cancelPendingNavigation()}
				>${this._localize("common.cancel")}</epp-button>
				<epp-button slot="actions" variant="danger"
					@click=${()=>this._navGuard.discardAndNavigate()}
				>${this._localize("common.discard")}</epp-button>
			</epp-dialog>
      <epp-dialog
				?open=${this._showDeleteCalibrationDialog}
				heading=${this._localize("dialogs.delete_calibration_title")}
				@dialog-dismiss=${()=>{this._showDeleteCalibrationDialog=!1}}
			>
				<p class="overlay-help">${this._localize("dialogs.delete_calibration_body")}</p>
				<epp-button slot="actions" variant="text"
					@click=${()=>{this._showDeleteCalibrationDialog=!1}}
				>${this._localize("common.cancel")}</epp-button>
				<epp-button slot="actions" variant="danger"
					@click=${this._deleteCalibration}
				>${this._localize("common.delete")}</epp-button>
			</epp-dialog>
      <epp-device-setup
				.open=${this._setupOpen}
				.device=${this._setupDevice}
				.hass=${this.hass}
				.localize=${this._localize}
				@setup-complete=${e=>this._onDeviceSetupComplete(e)}
				@setup-skip=${e=>this._onDeviceSetupDialogSkip(e)}
			></epp-device-setup>
    `}_requestFlasherDeleteConfirm(){return this._flasherDeleteConfirmResolve?.(!1),this._showFlasherDeleteConfirm=!0,new Promise(e=>{this._flasherDeleteConfirmResolve=e})}_resolveFlasherDeleteConfirm(e){this._showFlasherDeleteConfirm=!1,this._flasherDeleteConfirmResolve?.(e),this._flasherDeleteConfirmResolve=null}_renderFlasherDeleteConfirmDialog(){return Y`
			<epp-dialog
				?open=${this._showFlasherDeleteConfirm}
				heading=${this._localize("flasher.confirm_delete_title")}
				@dialog-dismiss=${()=>this._resolveFlasherDeleteConfirm(!1)}
			>
				<p class="overlay-help">${this._localize("flasher.confirm_delete_message")}</p>
				<epp-button slot="actions" variant="text"
					@click=${()=>this._resolveFlasherDeleteConfirm(!1)}
				>${this._localize("common.cancel")}</epp-button>
				<epp-button slot="actions" variant="danger"
					@click=${()=>this._resolveFlasherDeleteConfirm(!0)}
				>${this._localize("common.delete")}</epp-button>
			</epp-dialog>
		`}_renderTabBar(){return Y`
			<div class="tab-bar">
				${mh}
				<button class="tab ${"config"===this._panelTab?"active":""}"
					aria-current=${"config"===this._panelTab?"page":J}
					@click=${()=>this._navGuard.guardNavigation(()=>{this._flasherCtrl.resetUsbState(),this._panelTab="config",this._loadDevices()})}>
					<ha-icon class="tab-icon" icon="mdi:cog-outline"></ha-icon>
					<span class="tab-label-full">${this._localize("tabs.device_configuration")}</span>
					<span class="tab-label-short">${this._localize("tabs.device_configuration_short")}</span>
				</button>
				<button class="tab ${"flasher"===this._panelTab?"active":""}"
					aria-current=${"flasher"===this._panelTab?"page":J}
					@click=${()=>this._navGuard.guardNavigation(()=>{this._flasherCtrl.resetUsbState(),this._panelTab="flasher",this._flasherCtrl.loading&&(this._flasherCtrl.hass=this.hass,this._flasherCtrl.subscribeDeviceList())})}>
					<ha-icon class="tab-icon" icon="mdi:flash"></ha-icon>
					<span class="tab-label-full">${this._localize("tabs.flash_firmware")}</span>
					<span class="tab-label-short">${this._localize("tabs.flash_firmware_short")}</span>
				</button>
				<button class="tab ${"device-groups"===this._panelTab?"active":""}"
					aria-current=${"device-groups"===this._panelTab?"page":J}
					@click=${()=>this._navGuard.guardNavigation(()=>{this._flasherCtrl.resetUsbState(),this._panelTab="device-groups"})}>
					<ha-icon class="tab-icon" icon="mdi:devices"></ha-icon>
					<span class="tab-label-full">${this._localize("tabs.device_groups")}</span>
					<span class="tab-label-short">${this._localize("tabs.device_groups_short")}</span>
				</button>
				<a class="tab-help"
					href=${function(e){if("flasher"===e.panelTab)return`${as}user-guide/flashing-firmware/`;if("device-groups"===e.panelTab)return`${as}user-guide/device-groups/`;const t="editor"===e.view?cs[e.sidebarTab]:ls[e.view];return`${as}${t}`}({panelTab:this._panelTab,view:this._view,sidebarTab:this._sidebarTab})}
					target="_blank"
					rel="noopener noreferrer"
					aria-label=${this._localize("tabs.help")}
				>
					<ha-icon icon="mdi:help-circle-outline"></ha-icon>
				</a>
			</div>
		`}render(){return Y`${this._renderTabContent()}${this._renderGlobalDialogs()}`}_renderTabContent(){if("flasher"===this._panelTab)return Y`<div class="tab-layout">
				${this._renderTabBar()}
				<epp-flasher-view
					.flashableDevices=${this._flasherCtrl.flashableDevices}
					.loading=${this._flasherCtrl.loading}
					.localize=${this._localize}
					.usbFlashState=${this._flasherCtrl.usbFlashState}
					.wifiNetworks=${this._flasherCtrl.wifiNetworks}
					.firmwareVersion=${this._flasherCtrl.firmwareVersion}
					.integrationVersion=${this._flasherCtrl.integrationVersion}
					.otaStates=${this._flasherCtrl.otaStates}
					.cancelledDeviceIpHint=${this._flasherCtrl.cancelledDeviceIpHint}
					@flash-complete=${()=>{this._flasherCtrl.resetUsbState(),this._loadDevices(),this._panelTab="config"}}
					@usb-flash=${e=>{this._flasherCtrl.handleUsbFlash(e.detail.variant)}}
					@usb-wifi-config=${()=>{this._flasherCtrl.handleUsbWifiConfig()}}
					@usb-retry=${()=>{this._flasherCtrl.handleUsbRetry()}}
					@retry-ha-add=${()=>{this._flasherCtrl.handleRetryHaAdd()}}
					@flasher-cancel=${()=>{this._flasherCtrl.handleFlasherCancel()}}
					@wifi-scan=${()=>{this._flasherCtrl.handleWifiScan()}}
					@wifi-provision=${e=>{this._flasherCtrl.handleWifiProvision(e.detail.ssid,e.detail.password)}}
					@update-firmware=${e=>{this._flasherCtrl.startOta(e.detail.mac)}}
					@retry-ota=${e=>{this._flasherCtrl.dismissOtaError(e.detail.mac),this._flasherCtrl.startOta(e.detail.mac)}}
				></epp-flasher-view>
				${this._renderFlasherDeleteConfirmDialog()}
			</div>`;if("device-groups"===this._panelTab)return Y`<div class="tab-layout">
				${this._renderTabBar()}
				${this._deviceGroupsCtrl?Y`<epp-device-groups-view
								.hass=${this.hass}
								.controller=${this._deviceGroupsCtrl}
								.availableDevices=${this._devices}
								@form-dirty-changed=${e=>{this._dirty=e.detail.dirty}}
							></epp-device-groups-view>`:Y`<div class="panel">${this._localize("common.loading")}</div>`}
			</div>`;const e="settings"===this._view&&this._selectedMac,t=!1===this.hass?.connection?.connected||!this._haConnected;if(t&&!e)return Y`<div class="tab-layout">
				${this._renderTabBar()}
				<div class="panel">
					<div class="protocol-fullpage protocol-fullpage-info">
						<ha-icon icon="mdi:connection"></ha-icon>
						<p>${this._localize("connection.ha_reconnecting")}</p>
					</div>
				</div>
			</div>`;if(this._loading&&!e)return Y`<div class="tab-layout">
				${this._renderTabBar()}
				<div class="loading-container">${this._localize("common.loading")}</div>
			</div>`;const i=this._initRetryCount>=3;if(!this._devices.length&&(!this._selectedMac||i))return Y`<div class="tab-layout">
				${this._renderTabBar()}
				<div class="empty-state">
					<p>${this._localize("flasher.no_eppgrid_devices")}</p>
					<epp-button variant="primary" @click=${()=>this._navGuard.guardNavigation(()=>{this._panelTab="flasher",this._flasherCtrl.hass=this.hass,this._flasherCtrl.subscribeDeviceList()})}>
							${this._localize("flasher.flash_from_tab")}
					</epp-button>
				</div>
			</div>`;const s=this._devices.find(e=>e.mac===this._selectedMac),r=this._isSelectedOffline,o=!s||"compatible"===s.firmware_status;if("tutorial"===this._view||"calibrate"===this._view)return Y`<div class="tab-layout">
        ${this._renderTabBar()}
        <div class="panel">
          ${this._renderHeader()}
          <div class="wizard-stage">
            ${this._deviceCtrl.connectionFailed||r?this._renderConnectionBanner():J}
            <epp-wizard
              .rawTargets=${this._rawTargets}
              .sensorState=${this._getWizardSensorState()}
              .localize=${this._localize}
              .initialRoomWidth=${this._roomWidth}
              .initialRoomDepth=${this._roomDepth}
              .initialStep=${"tutorial"===this._view?"guide":"corners"}
              @dismiss-tutorial=${()=>this._onDismissTutorial()}
              @begin-corners=${()=>{this._view="calibrate"}}
              @wizard-save=${e=>this._onWizardSave(e)}
            @wizard-cancel=${()=>{this._view="live"}}
            ></epp-wizard>
          </div>
        </div>
      </div>`;let a=J;if(e&&(t?a=Y`
					<div class="protocol-fullpage protocol-fullpage-info">
						<ha-icon icon="mdi:connection"></ha-icon>
						<p>${this._localize("connection.ha_reconnecting")}</p>
					</div>
				`:this._deviceCtrl.reconnecting?a=Y`
					<div class="protocol-fullpage protocol-fullpage-info">
						<ha-icon icon="mdi:connection"></ha-icon>
						<p>${this._localize("connection.connecting")}</p>
					</div>
				`:this._deviceCtrl.connectionFailed||r?a=this._renderConnectionBanner():o||(a=this._renderProtocolBanner())),this._deviceCtrl.reconnecting&&!e)return Y`<div class="tab-layout">
				${this._renderTabBar()}
				<div class="panel">
					${this._renderHeader()}
					<div class="protocol-fullpage protocol-fullpage-info">
						<ha-icon icon="mdi:connection"></ha-icon>
						<p>${this._localize("connection.connecting")}</p>
					</div>
				</div>
			</div>`;if((this._deviceCtrl.connectionFailed||r)&&!e)return Y`<div class="tab-layout">
				${this._renderTabBar()}
				<div class="panel">
					${this._renderHeader()}
					${this._renderConnectionBanner()}
				</div>
			</div>`;if(!o&&!e)return Y`<div class="tab-layout">
				${this._renderTabBar()}
				<div class="panel">
					${this._renderHeader()}
					${this._renderProtocolBanner()}
				</div>
			</div>`;const n="settings"===this._view?this._renderSettings(a):"editor"===this._view&&this._perspective?this._renderEditor():this._renderLiveOverview();return Y`<div class="tab-layout">${this._renderTabBar()}<epp-language-banner
				class="lang-banner"
				.hass=${this.hass}
				.localize=${this._localize}
			></epp-language-banner>${this._renderControllerErrorBanner()}${n}</div>`}async _onWizardSave(e){const t=e.currentTarget,{perspective:i,roomWidth:s,roomDepth:r}=e.detail;try{await this.hass.callWS({type:"eppgrid/set_setup",mac:this._selectedMac,perspective:i,room_width:s,room_depth:r})}catch(e){return console.error("Failed to save calibration",e),void t.saveFailed()}this._perspective=i,this._roomWidth=s,this._roomDepth=r,this._initGridFromRoom(),this._furniture=[],this._view="live",this._entitiesConfig={...this._entitiesConfig,zone_presence:!0},await this._gridCtrl.applyLayout().catch(e=>{console.error("Failed to apply layout after calibration",e)})}async _deleteCalibration(){this._showDeleteCalibrationDialog=!1,this._perspective=null,this._roomWidth=0,this._roomDepth=0,this._grid=new Uint8Array(gi),this._zoneConfigs=gr,this._furniture=[],this._entitiesConfig={...this._entitiesConfig,zone_presence:!1,target_xy:!1},this._targetAutoDistance&&(this._targetMaxDistance=hr.target_max_distance),this._staticAutoDistance&&(this._staticMinDistance=hr.static_min_distance,this._staticMaxDistance=hr.static_max_distance);try{(this._targetAutoDistance||this._staticAutoDistance)&&await this.hass.callWS({type:"eppgrid/set_settings",mac:this._selectedMac,...this._buildSettingsPayload()}),await this.hass.callWS({type:"eppgrid/set_setup",mac:this._selectedMac,perspective:[0,0,0,0,0,0,0,0],room_width:0,room_depth:0}),await this.hass.callWS({type:"eppgrid/set_room_layout",mac:this._selectedMac,grid_bytes:Array.from(this._grid),zone_slots:this._zoneConfigs.map((e,t)=>0===t?Fc(e,0):null),furniture:[]})}catch(e){console.error("Failed to delete calibration",e)}this._dirty=!1,this._view="live"}_changePlacement(){this._navGuard.guardNavigation(()=>this._applyView({view:this._deviceCtrl.showRoomCalibrationTutorial?"tutorial":"calibrate",sidebarTab:this._sidebarTab}))}async _onDismissTutorial(){const e=this._deviceCtrl.showRoomCalibrationTutorial;this._deviceCtrl.setShowRoomCalibrationTutorial(!1);try{await this.hass.callWS({type:"eppgrid/set_show_room_calibration_tutorial",value:!1})}catch(t){console.error("Failed to persist show_room_calibration_tutorial",t),this._deviceCtrl.setShowRoomCalibrationTutorial(e)}}_renderHeader(){return this._devices.length?Y`
      <div class="panel-header">
        <ha-select
          .value=${this._selectedMac}
          .options=${this._devices.map(e=>({value:e.mac,label:e.area?`${e.name} (${e.area})`:e.name}))}
          @selected=${e=>{const t=e.detail.value;t&&t!==this._selectedMac&&this._navGuard.guardNavigation(async()=>{this._closeDeviceSession(),this._selectedMac=t,ir(t),this._furnitureClipboard=null,await this._loadDeviceConfig(t)})}}
          @closed=${e=>e.stopPropagation()}
        ></ha-select>
      </div>
    `:Y`<div class="panel-header"></div>`}_renderControllerErrorBanner(){return this._controllerError?Y`
			<div class="controller-error-banner" role="alert">
				<ha-icon icon="mdi:alert-circle-outline"></ha-icon>
				<span>${this._localize(`errors.${this._controllerError}`)}</span>
				<button
					class="controller-error-dismiss"
					aria-label=${this._localize("common.close")}
					@click=${()=>{this._controllerError=null}}
				>
					<ha-icon icon="mdi:close"></ha-icon>
				</button>
			</div>
		`:J}_updateFirmware(){this._navGuard.guardNavigation(()=>{this._panelTab="flasher",this._flasherCtrl.loading&&(this._flasherCtrl.hass=this.hass,this._flasherCtrl.subscribeDeviceList())})}_renderProtocolBanner(){const e=this._devices.find(e=>e.mac===this._selectedMac);if(!e||"compatible"===e.firmware_status)return J;const t=e.firmware_status,i="firmware_behind"===t,s="unavailable"===t?this._localize("protocol.unavailable"):i?this._localize("protocol.firmware_behind"):this._localize("protocol.firmware_ahead"),r="firmware_ahead"===t;return Y`
			<div class="protocol-fullpage protocol-fullpage-${i?"warning":"info"}">
				<ha-icon icon=${i?"mdi:alert-circle-outline":"mdi:information-outline"}></ha-icon>
				<p>${s}</p>
				${i?Y`<epp-button variant="primary"
						@click=${()=>this._updateFirmware()}
					>${this._localize("protocol.update_firmware")}</epp-button>`:J}
				${r?Y`<a href="/hacs/repository/1172848595" class="protocol-link"
					>${this._localize("protocol.open_hacs")}</a>`:J}
			</div>
		`}_renderConnectionBanner(){const e=this._devices.find(e=>e.mac===this._selectedMac),t=this._isSelectedOffline;if(!this._deviceCtrl.connectionFailed&&!t)return J;if(t)return Y`
				<div class="protocol-fullpage protocol-fullpage-info">
					<ha-icon icon="mdi:access-point-off"></ha-icon>
					<p>${this._localize("connection.offline")}</p>
					<epp-button variant="primary"
						@click=${()=>this._retryConnection()}
					>${this._localize("connection.retry")}</epp-button>
				</div>
			`;const i=e?.current_connection_count;return Y`
			<div class="protocol-fullpage protocol-fullpage-warning">
				<ha-icon icon="mdi:connection"></ha-icon>
				<p>${this._localize("connection.failed")}</p>
				${null!=i?Y`<p>${this._localize("connection.client_count",{count:i})}</p>`:J}
				<p style="opacity: 0.7; font-size: 0.9em">${this._localize("connection.check_connections")}</p>
				<epp-button variant="primary"
					@click=${()=>this._retryConnection()}
				>${this._localize("connection.retry")}</epp-button>
			</div>
		`}_retryConnection(){this._selectedMac&&this._ensureSession(this._selectedMac)}_heatmapAvailability(){const e=this._devices.find(e=>e.mac===this._selectedMac);return e&&"firmware_behind"!==e.firmware_status&&"unavailable"!==e.firmware_status?!1===e.heatmap?"no_memory":"available":"needs_firmware"}_renderHeatmapToggle(){const e=this._heatmapAvailability(),t="available"!==e,i="needs_firmware"===e?this._localize("grid.heatmap_needs_firmware"):"no_memory"===e?this._localize("grid.heatmap_no_memory"):"",s=Y`<epp-toggle
			class="heatmap-toggle"
			label=${this._localize("grid.heatmap_toggle")}
			.checked=${this._heatmapEnabled&&!t}
			?disabled=${t}
			@value-changed=${e=>{this._heatmapEnabled=e.detail.value,function(e,t){try{localStorage.setItem(or+e,t?"1":"0")}catch{}}(this._selectedMac,e.detail.value),this._deviceCtrl.setHeatmapEnabled(e.detail.value)}}
		></epp-toggle>`;return t?Y`<epp-tooltip content=${i}>${s}</epp-tooltip>`:s}_gridHeightReserve(e){return e?247:130}_renderLiveGrid(){const e=this._gridHeightReserve(this._showBackendDebugLog);return Y`
			<epp-grid
				.grid=${this._grid}
				.zoneConfigs=${this._namedZones()}
				.targets=${this._targets}
				.roomWidth=${this._roomWidth}
				.roomDepth=${this._roomDepth}
				.heightReservePx=${e}
				.perspective=${this._perspective}
				.furniture=${this._furniture}
				.selectedFurnitureId=${this._selectedFurnitureId}
				.sidebarTab=${this._sidebarTab}
				.occupancy=${this._zoneState.occupancy}
				.targetPrevXY=${this._zoneEngineState.targetPrevXY}
				.localize=${this._localize}
				.maxGridPx=${480}
				?capHeightToHalfViewport=${this._isMobile}
				.maxRangeMm=${this._computeMaxRangeMm()}
				.heatmapCells=${this._heatmapCells}
				?showHeatmap=${this._heatmapEnabled&&"available"===this._heatmapAvailability()}
				.trails=${this._targetTrails}
				@furniture-select=${e=>{this._selectedFurnitureId=e.detail}}
				@furniture-pointer-down=${e=>{const{e:t,id:i,type:s,handle:r,rotation:o}=e.detail;this._onFurniturePointerDown(t,i,s,r,o)}}
				@furniture-delete=${e=>{this._removeFurniture(e.detail)}}
				.dismissedTargets=${this._dismissedTargets}
				@target-click=${e=>{this._showTargetMenu(e.detail)}}
				@target-undismissed=${e=>{this._handleTargetUndismissed(e.detail.targetIndex)}}
			></epp-grid>
		`}_showTargetMenu(e){this._targetMenu=e}_closeTargetMenu(){this._targetMenu=null}_targetCellIndex(e,t){const i=Us(e,t,this._roomWidth,this._roomDepth);return i?Os(i)??-1:-1}_handleTargetUndismissed(e){this._dismissedTargets.has(e)&&(this._dismissedTargets=new Map(this._dismissedTargets),this._dismissedTargets.delete(e))}async _dismissTarget(){if(!this._targetMenu)return;const{targetIndex:e,x:t,y:i}=this._targetMenu,s=this._targetCellIndex(t,i);if(s>=0){this._dismissedTargets=new Map(this._dismissedTargets),this._dismissedTargets.set(e,s),this._targetCtrl.dismissTarget(e,s);try{await this.hass.callWS({type:"eppgrid/dismiss_target",mac:this._selectedMac,target_index:e,cell_index:s})}catch(e){console.error("Failed to dismiss target:",e)}}this._closeTargetMenu()}async _setOverlay(e){if(!this._targetMenu)return;const t=this._targetCellIndex(this._targetMenu.x,this._targetMenu.y);if(t<0||!fi(this._grid[t]))return void this._closeTargetMenu();const i=this._grid[t],s=bi(this._grid[t],e),r=new Uint8Array(this._grid);r[t]=s,this._grid=r,this._zoneEngineGridChanged(),this._closeTargetMenu();try{await this.hass.callWS({type:"eppgrid/set_room_layout",mac:this._selectedMac,grid_bytes:Array.from(this._grid),zone_slots:this._zoneConfigs.map((e,t)=>Fc(e,t)),furniture:this._furniture.map(Pc)})}catch(e){if(this._grid[t]===s){const e=new Uint8Array(this._grid);e[t]=i,this._grid=e}console.warn("[eppgrid] set overlay cell failed",e)}}_renderTargetMenu(){if(!this._targetMenu)return J;const{pctX:e,pctY:t}=this._targetMenu;return Y`
			<div class="target-menu-backdrop" @click=${()=>this._closeTargetMenu()}></div>
			<div class="target-menu" style="left: ${e}%; top: ${t}%;">
				<button class="target-menu-item" @click=${()=>this._dismissTarget()}>
					${this._localize("live.delete_target")}
				</button>
				<button class="target-menu-item" @click=${()=>this._setOverlay(2)}>
					${this._localize("live.mark_interference")}
				</button>
				<button class="target-menu-item" @click=${()=>this._setOverlay(3)}>
					${this._localize("live.suppress_detection")}
				</button>
			</div>
		`}_renderSaveCancelButtons(){return Mr({saving:this._saving,dirty:this._dirty,localize:this._localize,onSave:()=>{this._applyLayout().catch(()=>{})},onCancel:()=>{this._cancelEditor()}})}_renderLiveOverview(){const e=this._perspective?this._renderLiveGrid():Y`<epp-wizard
            mode="uncalibrated-fov"
            .rawTargets=${this._rawTargets}
            .sensorState=${this._getWizardSensorState()}
            .localize=${this._localize}
            @start-calibration=${()=>this._changePlacement()}
          ></epp-wizard>`;return Y`
      <div class="panel panel--grid" @click=${e=>{e.target instanceof Element&&this._targetMenu&&!e.target.closest(".target-menu")&&this._closeTargetMenu()}}>
        ${this._renderHeader()}
        <div class="editor-shell">
          <div class="grid-column">
            <div class="grid-container" style="position: relative;">
              ${e}
              ${this._targetMenu?this._renderTargetMenu():J}
            </div>
            ${this._perspective?this._renderHeatmapToggle():J}
            ${this._perspective?this._renderBackendDebugLog():J}
          </div>
          <epp-sheet inline open class="live-controls">
            <div slot="peek" class="sidebar-header">
              <span class="sidebar-title" style="margin-right: auto;">${this._localize("sidebar.live_overview")}</span>
              <epp-kebab-menu
                .items=${this._liveMenuItems()}
                @item-select=${this._onLiveMenuSelect}
              ></epp-kebab-menu>
            </div>
            <epp-live-sidebar
              .sensorState=${this._sensorState}
              .zoneState=${this._zoneState}
              .zoneConfigs=${this._namedZones()}
              .hasPerspective=${null!=this._perspective}
              .localize=${this._localize}
              @view-change=${e=>{this._navGuard.guardNavigation(()=>this._applyView({view:e.detail.view,sidebarTab:e.detail.sidebarTab??this._sidebarTab}))}}
            ></epp-live-sidebar>
          </epp-sheet>
        </div>
      </div>
    `}_autoDetectionRange(){return Xi(this._roomWidth,this._roomDepth,this._perspective,this._grid)}_renderSettings(e=J){return Y`
      <div class="panel panel--settings">
        ${this._renderHeader()}
        <div class="settings-stage">
        <epp-settings-view
          ?inert=${e!==J}
          .sensorState=${this._sensorState}
          .targetAutoDistance=${this._targetAutoDistance}
          .targetMaxDistance=${this._targetMaxDistance}
          .stuckTargetTimeout=${this._stuckTargetTimeout}
          .assistedClearEnabled=${this._assistedClearEnabled}
          .assistedClearTimeout=${this._assistedClearTimeout}
          .staticAutoDistance=${this._staticAutoDistance}
          .staticMinDistance=${this._staticMinDistance}
          .staticMaxDistance=${this._staticMaxDistance}
          .openAccordions=${this._openAccordions}
          .perspective=${this._perspective}
          .roomWidth=${this._roomWidth}
          .roomDepth=${this._roomDepth}
          .grid=${this._grid}
          .saving=${this._saving}
          .dirty=${this._dirty}
          .entitiesConfig=${this._entitiesConfig||{}}
          .temperatureOffset=${this._temperatureOffset}
          .humidityOffset=${this._humidityOffset}
          .illuminanceOffset=${this._illuminanceOffset}
          .motionTimeout=${this._motionTimeout}
          .staticTimeout=${this._staticTimeout}
          .staticTriggerThreshold=${this._staticTriggerThreshold}
          .staticRenewThreshold=${this._staticRenewThreshold}
          .staticOnDelay=${this._staticOnDelay}
          .logLevels=${this._logLevels}
          .co2Enabled=${this._co2Enabled}
          .ledMode=${this._ledMode}
          .ledBrightness=${this._ledBrightness}
          .ledPresenceColor=${this._ledPresenceColor}
          .relayTriggerMode=${this._relayTriggerMode}
          .relayContactMode=${this._relayContactMode}
          .targetUpdateRateMs=${this._targetUpdateRateMs}
          .zoneUpdateRateMs=${this._zoneUpdateRateMs}
          .localize=${this._localize}
          @accordion-toggle=${e=>{this._openAccordions=e.detail}}
          @setting-change=${e=>{const{key:t,value:i}=e.detail;this[`_${t}`]=i}}
          @dirty=${()=>{this._dirty=!0}}
          @save=${e=>this._saveSettings(e.detail)}
          @cancel=${()=>this._cancelSettings()}
        ></epp-settings-view>
        ${e}
        </div>
      </div>
    `}_renderEditor(){const e=this._targetCtrl.editorEngineResult??this._runLocalZoneEngine(),t=e.occupancy,i=this._targets.map((t,i)=>({...t,status:e.targets[i]?.status??t.status})),s=!this._isMobile&&("zones"===this._sidebarTab||"overlays"===this._sidebarTab),r=this._gridHeightReserve(s&&this._showDebugLog),o=Y`
              <epp-grid
                .grid=${this._grid}
                .zoneConfigs=${this._namedZones()}
                .targets=${i}
                .roomWidth=${this._roomWidth}
                .roomDepth=${this._roomDepth}
                .heightReservePx=${r}
                .perspective=${this._perspective}
                .furniture=${this._furniture}
                .selectedFurnitureId=${this._selectedFurnitureId}
                .sidebarTab=${this._sidebarTab}
                .editable=${!0}
                .activeZone=${this._activeZone}
                .occupancy=${t}
                .targetPrevXY=${this._zoneEngineState.targetPrevXY}
                .localize=${this._localize}
                .maxGridPx=${480}
                ?capHeightToHalfViewport=${this._isMobile}
                .maxRangeMm=${this._editorMaxRangeMm()}
                .frozenBounds=${this._frozenBounds}
                .dismissedTargets=${this._dismissedTargets}
                .heatmapCells=${this._heatmapCells}
                ?showHeatmap=${this._heatmapEnabled&&"available"===this._heatmapAvailability()}
                .trails=${this._targetTrails}
                @cell-paint=${e=>{const{index:t,action:i}=e.detail;"down"===i?this._onCellMouseDown(t):"enter"===i?this._onCellMouseEnter(t):"up"===i&&this._onCellMouseUp()}}
                @furniture-select=${e=>{this._selectedFurnitureId=e.detail}}
                @furniture-pointer-down=${e=>{const{e:t,id:i,type:s,handle:r,rotation:o}=e.detail;this._onFurniturePointerDown(t,i,s,r,o)}}
                @furniture-delete=${e=>{this._removeFurniture(e.detail)}}
                @target-undismissed=${e=>{this._handleTargetUndismissed(e.detail.targetIndex)}}
              ></epp-grid>`,a=Y`<div slot="actions">${this._renderSaveCancelButtons()}</div>`,n=!this._isMobile||this._dirty&&!this._editorTextFocused?a:J;return Y`
      <div class="panel panel--grid" @click=${e=>{const t=e.target;t.closest(".grid-container")||t.closest("epp-sheet")||this._justPainted||(this._activeZone=null)}}>
        ${this._renderHeader()}
        <div class="editor-shell" @focusin=${this._onEditorFocusIn} @focusout=${this._onEditorFocusOut}>
          <div class="grid-column">
            <div class="grid-container" @click=${e=>{e.composedPath().some(e=>e instanceof HTMLElement&&e.classList.contains("furniture-item"))||(this._selectedFurnitureId=null)}}>
              ${o}
            </div>
            ${this._renderHeatmapToggle()}
            ${s?this._renderDebugLog():J}
          </div>
          <epp-sheet inline open class="editor-controls">
            <div slot="peek">${this._renderSidebarTabs()}</div>
            ${this._renderSidebarContent()}
            ${n}
          </epp-sheet>
        </div>
      </div>
    `}_renderSidebarContent(){return"zones"===this._sidebarTab?Y`<epp-zone-sidebar
                    .zoneConfigs=${this._namedZones()}
                    .activeZone=${this._activeZone}
                    .zone0=${this._zoneConfigs[0]}
                    .localZoneState=${this._zoneEngineState.localZoneState}
                    .localize=${this._localize}
                    @zone-select=${e=>{this._activeZone=e.detail.zone,this._overlayMode=null}}
                    @zone-add=${()=>{this._addZone()}}
                    @zone-remove=${e=>{this._removeZone(e.detail.slot)}}
                    @zone-config-change=${e=>{const{index:t,updates:i}=e.detail,s=t+1;if(s<1||s>=this._zoneConfigs.length)return;const r=this._zoneConfigs[s];if(null===r)return;const o=[...this._zoneConfigs];o[s]={...r,...i},this._zoneConfigs=o,this._dirty=!0,this._zoneEngineZoneConfigChanged()}}
                    @zone0-change=${e=>{const t=this._zoneConfigs[0],i=[...this._zoneConfigs];i[0]={...t,...e.detail},this._zoneConfigs=i,this._dirty=!0,this._zoneEngineZoneConfigChanged()}}
                  ></epp-zone-sidebar>`:"overlays"===this._sidebarTab?Y`<epp-overlay-sidebar
                    .overlayMode=${this._overlayMode}
                    .localize=${this._localize}
                    @overlay-select=${e=>{this._overlayMode=e.detail.mode}}
                  ></epp-overlay-sidebar>`:Y`<epp-furniture-sidebar
                    .furniture=${this._furniture}
                    .selectedFurnitureId=${this._selectedFurnitureId}
                    .hass=${this.hass}
                    .localize=${this._localize}
                    .showCustomIconPicker=${this._showCustomIconPicker}
                    .customIconValue=${this._customIconValue}
                    @furniture-add=${e=>{this._addFurniture(e.detail)}}
                    @furniture-add-custom=${e=>{this._addCustomFurniture(e.detail)}}
                    @furniture-add-text=${()=>{this._addTextFurniture()}}
                    @furniture-remove=${e=>{this._removeFurniture(e.detail)}}
                    @furniture-update=${e=>{this._updateFurniture(e.detail.id,e.detail.updates)}}
                    @furniture-select=${e=>{this._selectedFurnitureId=e.detail}}
                    @custom-icon-toggle=${()=>{this._showCustomIconPicker=!this._showCustomIconPicker}}
                    @custom-icon-change=${e=>{this._customIconValue=e.detail}}
                    @dirty=${()=>{this._dirty=!0}}
                  ></epp-furniture-sidebar>`}_renderSidebarTabs(){const e=[{id:"zones",label:this._localize("menu.detection_zones")},{id:"overlays",label:this._localize("menu.overlays")},{id:"furniture",label:this._localize("menu.furniture")}];return Y`
      <div
        class="sidebar-tabs"
        role="tablist"
        @keydown=${this._onSidebarTabsKeydown}
      >
        ${e.map(e=>Y`<button
            class="sidebar-tab ${this._sidebarTab===e.id?"active":""}"
            role="tab"
            aria-selected=${this._sidebarTab===e.id?"true":"false"}
            tabindex=${this._sidebarTab===e.id?"0":"-1"}
            @click=${t=>{t.stopPropagation(),this._applyView({view:"editor",sidebarTab:e.id})}}
          >${e.label}</button>`)}
      </div>
    `}_runLocalZoneEngine(){return this._targetCtrl.runLocalZoneEngine()}_zoneEngineGridChanged(){this._targetCtrl.resetEngineForGridChange(),this._dismissedTargets=new Map}_zoneEngineZoneConfigChanged(){this._targetCtrl.resetEngineForZoneConfigChange(),this._dismissedTargets=new Map}_renderDebugLogSection(e,t,i,s){const r=this[e];return Y`
      <div style="margin-top: 8px; min-width: 0;">
        <div style="display: flex; align-items: center; gap: 4px;">
          <button
            class="live-section-header live-section-link"
            style="font-size: 12px; gap: 4px; min-width: 0; overflow: hidden;"
            @click=${()=>{this[e]=!this[e],this[e]||(this[t]=[],this[i]=null)}}
          >
            <ha-icon icon=${r?"mdi:chevron-down":"mdi:chevron-right"} style="--mdc-icon-size: 14px;"></ha-icon>
            ${this._localize("live.debug.detection_events")}
          </button>
          ${r?Y`
            <div style="margin-left: auto; display: flex; gap: 4px;">
              <button
                class="debug-log-btn"
                @click=${()=>{navigator.clipboard.writeText(this[t].join("\n")).catch(e=>console.warn("Clipboard write failed",e))}}
              >${this._localize("live.debug.copy_all")}</button>
              <button
                class="debug-log-btn"
                @click=${()=>{this[t]=[],this[i]=null;const e=this.shadowRoot?.getElementById(s);if(e){e.innerHTML="";const t=document.createElement("div");t.style.cssText="color: var(--secondary-text-color, #999); font-style: italic;",t.textContent=this._localize("live.debug.waiting_for_events"),e.appendChild(t)}}}
              >${this._localize("live.debug.clear")}</button>
            </div>
          `:J}
        </div>
        ${r?Y`
          <div class="debug-log-container" id=${s}>
            <div style="color: var(--secondary-text-color, #999); font-style: italic;">${this._localize("live.debug.waiting_for_events")}</div>
          </div>
        `:J}
      </div>
    `}_renderBackendDebugLog(){return this._renderDebugLogSection("_showBackendDebugLog","_backendDebugLogLines","_backendDebugLogPrev","backend-debug-log-scroll")}_renderDebugLog(){return this._renderDebugLogSection("_showDebugLog","_debugLogLines","_debugLogPrev","debug-log-scroll")}}Ch._FOV_UNCACHED={},Ch.styles=[ti,wh,vh,xe,Be,ke,Me,bh,Eh,yh,n`
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

    .loading-container {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      width: 100%;
      font-size: 16px;
      color: var(--secondary-text-color, #757575);
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 48px 16px;
      font-size: 16px;
      color: var(--secondary-text-color, #757575);
    }

    .save-cancel-bar {
      /* Shared chrome (display/justify/align/border-top) is in saveCancelBarStyles. */
      padding: var(--epp-space-3, 12px);
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

    .debug-log-container {
      margin-top: 4px;
      /* A fixed height (previously capped, not fixed) so the extra viewport
         space this claims when expanded is exact rather than approximate
         (#338) — see DETECTION_LOG_BLOCK_HEIGHT_PX, which epp-grid's
         heightReservePx is grown by while the log is open. Still scrolls
         internally via overflow-y below, exactly as it did before. */
      height: ${a(99)}px;
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

    .target-menu-backdrop {
      position: absolute;
      inset: 0;
      z-index: 30;
    }

    .target-menu {
      position: absolute;
      transform: translate(-50%, 8px);
      z-index: 31;
      background: var(--card-background-color, #1e1e1e);
      border: 1px solid var(--divider-color, #444);
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      padding: 4px 0;
      min-width: 180px;
    }

    .target-menu-item {
      display: block;
      width: 100%;
      padding: 8px 16px;
      background: none;
      border: none;
      color: var(--primary-text-color, #e0e0e0);
      font-size: 13px;
      text-align: left;
      cursor: pointer;
    }

    .target-menu-item:hover {
      background: var(--secondary-background-color, #333);
    }

    .tab-layout {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
    }

    .tab-layout > :not(.tab-bar) {
      flex: 1;
      overflow: auto;
    }

    .tab-layout > .lang-banner {
      flex: 0 0 auto;
      overflow: visible;
    }

    .tab-bar {
      display: flex;
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
      background: var(--app-header-background-color, var(--primary-color));
      padding: 0 var(--epp-space-4, 16px);
      flex-shrink: 0;
    }

    .epp-logo {
      align-self: center;
      width: 40px;
      height: 40px;
      margin-right: var(--epp-space-3, 12px);
      flex-shrink: 0;
    }

    .tab {
      padding: var(--epp-space-3, 12px) 20px;
      border: none;
      background: none;
      color: var(--app-header-text-color, white);
      cursor: pointer;
      font-size: var(--epp-font-base, 14px);
      font-weight: 500;
      opacity: 0.7;
      border-bottom: 3px solid transparent;
    }

    .tab.active {
      opacity: 1;
      border-bottom-color: var(--app-header-text-color, white);
    }

    .tab-icon,
    .tab-label-short {
      display: none;
    }

    @media (max-width: 819px) {
      .tab-bar {
        flex-wrap: nowrap;
        padding: 0 var(--epp-space-2, 8px);
      }
      .epp-logo {
        display: none;
      }
      .tab {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        padding: var(--epp-space-2, 8px) var(--epp-space-1, 4px);
        font-size: var(--epp-font-xs, 12px);
      }
      .tab-icon {
        display: block;
        --mdc-icon-size: 22px;
      }
      .tab-label-full {
        display: none;
      }
      .tab-label-short {
        display: inline;
      }
      .tab-help {
        padding: var(--epp-space-2, 8px);
        align-self: center;
      }
      .debug-log-container {
        /* ~2 log entries (≈4 wrapped lines) before it scrolls — keeps the log
           from shoving the rest of the panel down on a phone. A fixed height
           (not max-height): this re-fixes the desktop rule's own fixed
           height (99px) to a smaller mobile value, it doesn't cap a
           growable box. */
        height: 76px;
      }
    }

    .tab-help {
      margin-left: auto;
      display: inline-flex;
      align-items: center;
      padding: var(--epp-space-3, 12px) var(--epp-space-4, 16px);
      color: var(--app-header-text-color, white);
      opacity: 0.7;
      text-decoration: none;
      cursor: pointer;
      --mdc-icon-size: var(--epp-space-5, 24px);
    }

    .tab-help:hover,
    .tab-help:focus-visible {
      opacity: 1;
    }

    .primary-btn {
      padding: 10px 24px;
      border-radius: 10px;
      border: none;
      cursor: pointer;
      font-size: 15px;
      font-weight: 500;
      background: var(--primary-color, #03a9f4);
      color: #fff;
    }

  `],e([ge({attribute:!1})],Ch.prototype,"hass",void 0),e([Ae()],Ch.prototype,"_deviceGroupsCtrl",void 0),e([Ae()],Ch.prototype,"_grid",void 0),e([Ae()],Ch.prototype,"_zoneConfigs",void 0),e([Ae()],Ch.prototype,"_activeZone",void 0),e([Ae()],Ch.prototype,"_targetAutoDistance",void 0),e([Ae()],Ch.prototype,"_targetMaxDistance",void 0),e([Ae()],Ch.prototype,"_stuckTargetTimeout",void 0),e([Ae()],Ch.prototype,"_assistedClearEnabled",void 0),e([Ae()],Ch.prototype,"_assistedClearTimeout",void 0),e([Ae()],Ch.prototype,"_staticAutoDistance",void 0),e([Ae()],Ch.prototype,"_staticMinDistance",void 0),e([Ae()],Ch.prototype,"_staticMaxDistance",void 0),e([Ae()],Ch.prototype,"_temperatureOffset",void 0),e([Ae()],Ch.prototype,"_humidityOffset",void 0),e([Ae()],Ch.prototype,"_illuminanceOffset",void 0),e([Ae()],Ch.prototype,"_motionTimeout",void 0),e([Ae()],Ch.prototype,"_staticTimeout",void 0),e([Ae()],Ch.prototype,"_staticTriggerThreshold",void 0),e([Ae()],Ch.prototype,"_staticRenewThreshold",void 0),e([Ae()],Ch.prototype,"_staticOnDelay",void 0),e([Ae()],Ch.prototype,"_logLevels",void 0),e([Ae()],Ch.prototype,"_co2Enabled",void 0),e([Ae()],Ch.prototype,"_ledMode",void 0),e([Ae()],Ch.prototype,"_ledBrightness",void 0),e([Ae()],Ch.prototype,"_ledPresenceColor",void 0),e([Ae()],Ch.prototype,"_relayTriggerMode",void 0),e([Ae()],Ch.prototype,"_relayContactMode",void 0),e([Ae()],Ch.prototype,"_targetUpdateRateMs",void 0),e([Ae()],Ch.prototype,"_zoneUpdateRateMs",void 0),e([Ae()],Ch.prototype,"_entitiesConfig",void 0),e([Ae()],Ch.prototype,"_sidebarTab",void 0),e([Ae()],Ch.prototype,"_panelTab",void 0),e([Ae()],Ch.prototype,"_showDeleteCalibrationDialog",void 0),e([Ae()],Ch.prototype,"_showFlasherDeleteConfirm",void 0),e([Ae()],Ch.prototype,"_showCustomIconPicker",void 0),e([Ae()],Ch.prototype,"_customIconValue",void 0),e([Ae()],Ch.prototype,"_furniture",void 0),e([Ae()],Ch.prototype,"_selectedFurnitureId",void 0),e([Ae()],Ch.prototype,"_targets",void 0),e([Ae()],Ch.prototype,"_rawTargets",void 0),e([Ae()],Ch.prototype,"_heatmapEnabled",void 0),e([Ae()],Ch.prototype,"_heatmapCells",void 0),e([Ae()],Ch.prototype,"_sensorState",void 0),e([Ae()],Ch.prototype,"_zoneState",void 0),e([Ae()],Ch.prototype,"_showDebugLog",void 0),e([Ae()],Ch.prototype,"_showBackendDebugLog",void 0),e([Ae()],Ch.prototype,"_overlayMode",void 0),e([Ae()],Ch.prototype,"_targetMenu",void 0),e([Ae()],Ch.prototype,"_dismissedTargets",void 0),e([Ae()],Ch.prototype,"_isPainting",void 0),e([Ae()],Ch.prototype,"_paintAction",void 0),e([Ae()],Ch.prototype,"_saving",void 0),e([Ae()],Ch.prototype,"_dirty",void 0),e([Ae()],Ch.prototype,"_isMobile",void 0),e([Ae()],Ch.prototype,"_editorTextFocused",void 0),e([Ae()],Ch.prototype,"_controllerError",void 0),e([Ae()],Ch.prototype,"_showUnsavedDialog",void 0),e([Ae()],Ch.prototype,"_showConfigurationBackup",void 0),e([Ae()],Ch.prototype,"_showConfigurationRestore",void 0),e([Ae()],Ch.prototype,"_configurationName",void 0),e([Ae()],Ch.prototype,"_devices",void 0),e([Ae()],Ch.prototype,"_selectedMac",void 0),e([Ae()],Ch.prototype,"_setupOpen",void 0),e([Ae()],Ch.prototype,"_setupDevice",void 0),e([Ae()],Ch.prototype,"_loading",void 0),e([Ae()],Ch.prototype,"_initRetryCount",void 0),e([Ae()],Ch.prototype,"_haConnected",void 0),e([Ae()],Ch.prototype,"_streamOffline",void 0),e([Ae()],Ch.prototype,"_view",void 0),e([Ae()],Ch.prototype,"_openAccordions",void 0),e([Ae()],Ch.prototype,"_perspective",void 0),e([Ae()],Ch.prototype,"_roomWidth",void 0),e([Ae()],Ch.prototype,"_roomDepth",void 0),customElements.get("eppgrid-panel")||customElements.define("eppgrid-panel",Ch),function(){const e=window;if(e.__eppGridMountGuardTeardown)try{e.__eppGridMountGuardTeardown()}catch{}e.__eppGridMountGuardInstalled=!0,document.addEventListener("visibilitychange",dh),_h(),e.__eppGridMountGuardTeardown=()=>{document.removeEventListener("visibilitychange",dh),ph?.observer.disconnect(),uh?.observer.disconnect(),ph=null,uh=null}}();var xh=1074521580,Bh="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",Sh=1074520064,Ih="DMD8P+znC0B/6AtAZ+0LQAbpC0Cf6AtABukLQGXpC0CC6gtA9OoLQJ3qC0CV5wtAGuoLQHTqC0CI6QtAGOsLQLDpC0AY6wtAbegLQMroC0AG6QtAZekLQIXoC0DI6wtAKe0LQLjmC0BL7QtAuOYLQLjmC0C45gtAuOYLQLjmC0C45gtAuOYLQLjmC0Bv6wtAuOYLQEnsC0Ap7QtA",Dh=1073605544,Rh=1073528832,Mh={entry:xh,text:Bh,text_start:Sh,data:Ih,data_start:Dh,bss_start:Rh},kh=Object.freeze({__proto__:null,bss_start:Rh,data:Ih,data_start:Dh,default:Mh,entry:xh,text:Bh,text_start:Sh}),Th=1077413304,Fh="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",Ph=1077411840,zh="DEDKP+AIOEAsCThAhAk4QFIKOEC+CjhAbAo4QKgHOEAOCjhATgo4QJgJOEBYBzhAzAk4QFgHOEC6CDhA/gg4QCwJOECECThAzAg4QBIIOEBCCDhAyAg4QBYNOEAsCThA1gs4QMoMOECkBjhA9Aw4QKQGOECkBjhApAY4QKQGOECkBjhApAY4QKQGOECkBjhAcgs4QKQGOEDyCzhAygw4QA==",Uh=1070295976,Oh=1070219264,Hh={entry:Th,text:Fh,text_start:Ph,data:zh,data_start:Uh,bss_start:Oh},Qh=Object.freeze({__proto__:null,bss_start:Oh,data:zh,data_start:Uh,default:Hh,entry:Th,text:Fh,text_start:Ph}),Gh=1077413584,Lh="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",$h=1077411840,Nh="GEDIP8AKOEAQCzhAaAs4QDYMOECiDDhAUAw4QHIJOEDyCzhAMgw4QHwLOEAiCThAsAs4QCIJOECaCjhA4Ao4QBALOEBoCzhArAo4QNYJOEAgCjhAqAo4QPoOOEAQCzhAug04QLIOOEBiCDhA2g44QGIIOEBiCDhAYgg4QGIIOEBiCDhAYgg4QGIIOEBiCDhAVg04QGIIOEDYDThAsg44QA==",Yh=1070164916,Kh=1070088192,Wh={entry:Gh,text:Lh,text_start:$h,data:Nh,data_start:Yh,bss_start:Kh},Jh=Object.freeze({__proto__:null,bss_start:Kh,data:Nh,data_start:Yh,default:Wh,entry:Gh,text:Lh,text_start:$h}),jh=1082133128,Zh="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",Vh=1082130432,Xh="GACEQOYOgEBQD4BA5A+AQLgQgEAgEYBAzhCAQEINgEB0EIBAtBCAQAAQgEDyDIBAKBCAQPIMgEDEDoBADg+AQFAPgEDkD4BA1g6AQGoNgECYDYBA0g6AQBoTgEBQD4BA3BGAQNYSgEAwDIBA/BKAQDAMgEAwDIBAMAyAQDAMgEAwDIBAMAyAQDAMgEAwDIBAghGAQDAMgED0EYBA1hKAQA==",qh=1082469304,ed=1082392576,td={entry:jh,text:Zh,text_start:Vh,data:Xh,data_start:qh,bss_start:ed},id=Object.freeze({__proto__:null,bss_start:ed,data:Xh,data_start:qh,default:td,entry:jh,text:Zh,text_start:Vh}),sd=1082132164,rd="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",od=1082130432,ad="FACEQHIKgEDCCoBAGguAQOgLgEBUDIBAAgyAQD4JgECkC4BA5AuAQC4LgEDuCIBAYguAQO4IgEBMCoBAkgqAQMIKgEAaC4BAXgqAQKIJgEDSCYBAWgqAQKwOgEDCCoBAbA2AQGQOgEAuCIBAjA6AQC4IgEAuCIBALgiAQC4IgEAuCIBALgiAQC4IgEAuCIBACA2AQC4IgECKDYBAZA6AQA==",nd=1082469296,ld=1082392576,cd={entry:sd,text:rd,text_start:od,data:ad,data_start:nd,bss_start:ld},hd=Object.freeze({__proto__:null,bss_start:ld,data:ad,data_start:nd,default:cd,entry:sd,text:rd,text_start:od}),dd=1082132164,pd="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",ud=1082130432,gd="FECAQHQKgEDECoBAHAuAQOoLgEBWDIBABAyAQEAJgECmC4BA5guAQDALgEDwCIBAZAuAQPAIgEBOCoBAlAqAQMQKgEAcC4BAYAqAQKQJgEDUCYBAXAqAQK4OgEDECoBAbg2AQGYOgEAwCIBAjg6AQDAIgEAwCIBAMAiAQDAIgEAwCIBAMAiAQDAIgEAwCIBACg2AQDAIgECMDYBAZg6AQA==",Ad=1082223536,_d=1082146816,fd={entry:dd,text:pd,text_start:ud,data:gd,data_start:Ad,bss_start:_d},md=Object.freeze({__proto__:null,bss_start:_d,data:gd,data_start:Ad,default:fd,entry:dd,text:pd,text_start:ud}),wd=1082132164,vd="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",bd=1082130432,Ed="FACDQHIKgEDCCoBAGguAQOgLgEBUDIBAAgyAQD4JgECkC4BA5AuAQC4LgEDuCIBAYguAQO4IgEBMCoBAkgqAQMIKgEAaC4BAXgqAQKIJgEDSCYBAWgqAQKwOgEDCCoBAbA2AQGQOgEAuCIBAjA6AQC4IgEAuCIBALgiAQC4IgEAuCIBALgiAQC4IgEAuCIBACA2AQC4IgECKDYBAZA6AQA==",yd=1082403760,Cd=1082327040,xd={entry:wd,text:vd,text_start:bd,data:Ed,data_start:yd,bss_start:Cd},Bd=Object.freeze({__proto__:null,bss_start:Cd,data:Ed,data_start:yd,default:xd,entry:wd,text:vd,text_start:bd}),Sd=1341196642,Id="QRG3Jw1QIsQmwkrAEUcGxrcE9U/Yyz6JM4TnAJOEBAAcQJGLmeeyQCJEkkQCSUEBgoADJQkAnEATdfUPgpfNtwERt6cMUE7Gg6mHAErINwn1TybKUsQGziLMk4THAT6KEwkJAIBAE3T0PxnIAyUKAIMnCQB9FBN19Q+Cl2X43bfyQGJEt6cMUCOoNwHSREJJskkiSgVhgoCTBwAMkEEqh2MY9QCFRwXGI6AFAHlVgoCFRmMH1gAJRWMNpgB9VYKAQgWTB7ANQYVjE/cCiUecwfW3EwbADWMVxwCUwT6FgoCTB9AN4xz3/JTBEwWwDYKAtzX2T0ERk4VFvwbGcT9jTQUEtzf2T5OHx7YDpwcIg9ZHCBOGFgAjkscINpcjAKcAA9dHCJFnk4cHBGMa9wI3t/VPEwfHtqFnupcDpgcIt/b1T5OGxrpjH+YAI6bHCCOg1wgjkgcIIaD5V+MK9fyyQEEBgoAjptcII6DnCN23N9cIUBMHRwUcQ52L9f83xwhQEwdHBRxDnYv1/4KAQREGxvk/N9cIULcGAAgjJgcCkwfHAhTDFEP9/ohDskATRfX/BYlBAYKAQREGxsk/fd231whQNwcAQJjDmEN9/7JAQQGCgHlxKoNCXjcFwE+DTkEDgy9FAQVFRsJCwAbWCU92yCrGcsS+iDqItocyh6FGLoaahWOZ7wGXAND/54CgEbJQRWGCgJcA0P/ngCDGzb95cSLUJtJK0FLMBtZOzqqELokyhEFKlwDP/+eAQO5jSoAAslAiVJJUAlnySWJKRWGCgKKJY1OKAMFJk5c5AD7AyogmhgLCAUiBRyFHkwYAArFFEUWFNzMENEFOmc6Uwbd5cSLUJtJK0FLMVsoG1k7OqoQuiTKEEwoAApcAz//ngADohUpjS4AAslAiVJJUAlnySWJK0kpFYYKA/T2iiWNUigCTCQACyocmhoFIE5g5AAFHkwYAAslFEUVWwgLA3T2XAM//54Cg406ZzpQzBDRBVb8BESLMN4T1TxMEBAZKyAMpBAEGzibKYwoJCEk1WcW9R4FEY9YnAQRE/YyTtBQAYT25NbcH9U+Dx0cAwceXAM//54DA3kk1EESFRz7CAsAyBjcHAAGBSAFIgUeNxGNe5gABR+FGkwWADRVFpT2XAM//54DA20FHJaABR5MGAAKTBcAN3bdjWeYCAUfhRpMFAAIVRYE9lwDP/+eAQNkFRxxImY8cyBxEupccxPJAYkTSREJJBWGCgAFHkwYAApMFEALBvxxENwcAAbqGsgeZwLcGgAB9F/mPN9cIUFzDFMMcQ/3/zdxBvwERBs4izCbK8VdjkvUENwT1T7cE9E8TBAQAA6VE/ZcAz//ngMBOY0egAPJAYkTSRAVhgoADpUT9BUZsAJcAz//ngCBNHEADRcEAgpf5t/1X4531/HAAiUUCxpcAz//ngEBOMke3B/VPk4cHABnnlEcFRmOUxgAjhtcAmMd9twERBs4ZOzcF9E9sADEVlwDP/+eAoNKqhwVFneeyR5P3ByA+xj07t9cIUJhHtwZAADcF9E9Vj5jHskUxFZcAz//ngADQMzWgAPJABWGCgEERt4f1TwbGk4cHBgVHI4DnABPXxQCYxwVnfRfMw8jH+Y06laqVsYGMyyOqBwBRNxnBEwVQDLJAQQGCgAERIsw3hPVPEwQEBibKREQGzkrITsZSxFbCWsBj85UAroSlwAMpRAAqiiaZE1nJABxIY1XwABxEY1/5BI05fd23B/VPg8dHAIMqRADZw5P5+g8TCQAQMwk5QZcAz//ngAC+Y/wkAyaG0oVWhRU7lwDP/+eAwLxcQKaXXMBcRIWPXMTyQGJE0kRCSbJJIkqSSgJLBWGCgLU7Yb+TiQnwSobShVaFppntOZPZiQABSzMFWQGzBSoBY2U7ATOGJEF9txMGABAFC+k5EwkJEBN7+w/5vyaG0oVWhZcAz//ngOC5E3X1D0nZkwdADFzIabdBEQbGlwDP/+eAQK4DRYUBskBpFRM1FQBBAYKAQREGxpcAz//ngICsA0WFAbJAbRUTNRUAQQGCgEERIsQ3BPVPEwQEALcH9E8QSAOlR/2TBUQBBsaXAM//54DAK7JAIygEACJEQQGCgEERBsZFPwHJtwf1T5OHBwCcS5HDdT9JNxHBGUWyQEEBFwPP/2cAA6JBESLEBsYmwiqESTcdxbcH9U+ThwcAmEuTBhcAlMu6lyOKhwATBAT0AcQTBxf8KeMiRLJAkkRBAYW/IoWXAM//54AAnDU3DcW3BPVPk4QEAIPXRAWFB8IHwYMjmvQEk7f3A4HHEwQE9AHkvTcjmgQEskAiRJJEQQGCgEERBsYTBwAMYxrlABMFsA2dPxMFwA2yQEEBtbcTB7AN4xvl/o03EwXQDfW3QREixCbCBsYqhLMEtQBjF5QAskAiRJJEQQGCgANFBAAFBE0/7bd1cSLFJsPO3tLc1toGx0rBEwEBgBMBAYCqhDcK9U8oCC6EhWqXAM//54AA6hMKCgCTCQEHFeQoACwIlwDP/+eAIOkoAMFFUT8BRYViFpG6QCpEmkQKSfZZZlrWWklhgoAiiWPzigAFaYNHSgBKhs6FJoWJz0k0SobOhSgIlwDP/+eAwOTKlDMEJEFtt5cAz//ngECaE3X1D3ndEwUwBnW3EwUADEG9NXEizU7HUsVaweLcBs8my0rJVsPe3hMBAYATAQGAgBiqiS6KMos2jCMqBPj9MznBNwUCAJcAz//ngODdtwf0TwOlR/2XAM//54DgDoVnY+1nESgItwr1T5cAz//ngGDcAUmTigoAgytE+WNkeQ1j6UsFwaBpM5MHAAIZwbcHAgA+hZcAz//ngADZybezBCpBY3ObANqEg8dKACaGooVOhZ3HfTKZP6aFIoVpNbk3JoaihSgIlwDP/+eA4NammSaZY35JAbMHeUHj4of9AaiXAM//54DAixN19Q9p1SMsBPiBRPlbowkE+BMFMQCX8M7/54BgenX5A0U0+SwA7/Dv/JMXBQFjwgcCk7dEAJHPhWeThwcHppeKl5OHB4CThweAI4qn+IUEfb/jHnX7kUfjjPTyKAAsCJcAz//ngADPdT3BRSgAxTtVPck5Dc23B/RPA6VH/ZcAz//ngKD9NwUCAJcAz//ngGDLhWIWkfpAakTaREpJukkqSppKCkv2W2ZcDWGCgK05kwcAAhnBtwcCAD6F+be3V0FJNXGTh/eEAUUGzyLNJstKyU7HUsVWw1rB3t7i3Oba6tju1j7el/DO/+eAoHMtOQXFN0fYULdnEVATBxeqmM8joAcAI6wHAJjT1E83BgQA0Y7UzyOgBwK3B/VPNzf2T5OHBwATB8e/IaAjoAcAkQfj7ef+xTuRRWgYFTPlM7e39U+Th8e2oWq+miOg+gi3BPVPtwfxT5OEBACThwcPnMDVNmMNBRg3BPRPAyVE/ROGhACJRZcAz//ngMDvt1cOUJOHxxWYQ7cGIACFRVWPmMO3Zw1QEwcQAiOq5xZFRZcAz//ngGC3txXATwFGk4UFmEVFlwDP/+eAYLg3BQIAlwDP/+eAILgDJUT9twXxT5OFZT2XAM//54Bg6QMlRP2XAM//54Cg5wMlRP2XAM//54Ag5rcHAFCYRxNnFwCYx7cHDlCIX4FFN4n1T3GJYRUTNRUAl/DO/+eAIHPhRz7AkwjBBAFIgUcBR4FGAUaTBfAJEUUCwu/wr++DR+EEQWaFZhOHd/6Tt5cDEzd3AZO3FwDZjyOC9AATBwAQkwf2/7cFAAQBRTcMEVATCQkGDWuX8M7/54BgZSEMSpuDp8oIY4QHDgOkygiFRyOmCggjAvEEg0cUAAlHIxPhBKMC8QSCxE1HY47nEFFHY4znEClHY57nAINHNAADRyQAogfZjxFHY5XnABxEnEO+xKk5oUXIAHk2g0c0AANHJACiB9mPEWdBB2Ny9w4TBbAN+TQTBcAN4TQTBeAOyTQ1MUG3NTQpwbdnDVATBxACuM+FRUVFlwDP/+eAYKC3BfFPAUaThQUARUWXAM//54BgobcnDVARR5jLNwUCAJcAz//ngKCgwbW3BfFPAUaThQUEFUWXAM//54DAnrenDFDYRxMFAAITZxcQ2MfJv4PHxADjiAfwNwUCACOGBACXAM//54BgnAllEwUFcZfwzv/ngEBBlwDP/+eAgNqDJwwANwUAgO2bIyD8AJcAz//ngKDOlwDP/+eA4NIBRZfwzv/ngABEfb3JRyMT8QQZtwNHFADRRmPn5gKFRmPm5gABSpMJ8A9JrHkXE3f3D8lG4+jm/rc29k8KB5OGBsA2lxhDAoeTBgcDk/b2DxFG42nW/BMH9wITd/cPjUZj4OYGtzb2TwoHk4bGxDaXGEMChxMHQAJjlucYgsSdSQFFUTIBRe067TTlNKFFyAD9GSk845YJ/gFKgUkFpInr8ACBRQFFl/DO/+eAADwBxYVJAUohpNFF6ADNOoFJ1b+FSeX7l/DO/+eAIEGzOaAAzbchR+Oe5/wDKoQAgynEALNnOgHSB+n37/Bv8XHxTpqFS2OICQAzBjpBkxcGAcGDoevBa4VMQX1j7TsJhUtjhwkIg8dEADMGOkHxyzLO7/AvxJfwzv/ngAA6ckZewgLAgUgBSIFHAUeTBgACkwUQAhVF7/Cvw5OJCYCTiQmAwbeDx0QAncsyzu/wj8CX8M7/54BgNnJGXsICwIFIAUiBRwFHkwYAApMFEAIVRe/wD8CTiQmAk4kJgK23E1XGAJfwzv/ngIA2bdWTCVADszkwAQm/g8dEADMGOkGFyzLO7/Avu5fwzv/ngAAxckZmwgLAgUgBSIFHAUeTBgACkwXADRVF7/CvuuqZBb8TVQYBl/DO/+eAwDFl2ZMJYANFvxNVxgCX8M7/54BAMDHVcb8hR+OM5+gBSpMJAAxNqEFHzb9BR4VJ45/n6ExECETv8H+LdbVBR4VJ45bn6BhIkWdj7+ciTEgIRO/wb+FJvUFHhUnjmefmHEgRZ2Ni9yJYRExICESziecC7/Bv37eH9U+ThwcGDWcjrAcAupcjpDexub03h/VPEwcHBoNGBwBjigYYFETBF5MJAAxjlPYAgylHAQFHkwbwDmNF9waDR1QAA0dEAAFKogfZjwNHZABCB12Pg0d0AOIH2Y9jnvYaE/X5D+/wD/wTdfoP7/CP++/wf4rjnAm+g0cUAElHY2j3GglH43T3vvUXk/f3Dz1H4273vDc39k+KBxMHx8W6l5xDgoczBuQAA0aGAQUHsY5pt7eH9U+ThwcGA8cHAH3L2EdjHgcUg6lHASOABwBhs2FHY5DnAlxMGExUSBBITEQIRJfwzv/ngEAdKoqzOaAAhb8BSoVJrbcRR4VJ453n1LcWDlD4XuV3/RcFZn2PUY8IRPjetxYOUJOGBgiYQoFFfY9Rj5jCtxYOUJOGRgiYQn2PUY+YwrcWDlC4XvmP0Y+83pfwzv/ngEAfGbsT9/cA4xwH5JPbRwCTCYQAAUr9XON+es0DpckAl/DO/+eAIAIDp4kAg6ZJAAOmCQD5jmMHlwEcQhNH9/99j9mOFMIFCsEJ+bcRRzm1QUeFSeOd58ocRFhI/My4zGW5uEwThgf/EecZygFKkwlgDF219Exj5MYGjYvjkgfe9EyBRYFHCaizBfQAiE2zBfcAkQeIwYVF4+jH/uOMBcSdjj6X9My4zLGxIUeFSeOQ58aDqcQFY4QJAJMJgAwjrgQEI6wEBA27AUqTCSAMqbWTCRAMkbUBSpMJgAw1vQFKkwmQDBW9EwcgDWOD5xITB0AN45nnogNKNACDRyQAIgozavoAl/DO/+eAYAKDKckAQRpjczoB0onjhgmgAypJAGEETpoTWsoAgycJAWNW8ACDJ4kAY1H6EO/wr4V13YPHRAADKkkAY4EHILNnOgG9i2OQBxSX8M7/54Bg/bfHCFAjogc0l/DO/+eA4P/Oi2MdBRC3xwhQk4cHND7Ot8cIUJOHBzA+0LfHCFCTh4c0PtK3xwhQk4fHNJMN8AM+1IVME3X6A0HtEw0ABGPtfQn9RzOzdwETHUMAQQ1poIMpxAAARO/wz8LjHwWUCWUTBQVxl/DO/+eAIOe3pwxQ3Es3BwABQReT1UcBkgf5j72J3Y2zhTUDAUWz1YUCl/DO/+eAgOgTBYA+l/DO/+eAwOMZulRIEEhMRAhE7/DP2yGyg0U0AINHJAATBYQBogXdjcEV7/BPq8W47/APjP21k3f6AUFNtddyR5NXXUBqhhzDgleihT6Vl/DO/+eA4AGSVyOgRwGiVyOglwHv4F/1N8cIUOFngUYTB4c1CUaThwdqDENjj8UAY5v2AJfwzv/ngGDqkwdADCMq+QB5oIUGzbfjhfb+NtaX8M7/54Cg57fHCFCyViOolzUTh4c14WcNRpOHB2oMQ2OGxQDjgPb8hQbVv+OM9vqX8M7/54Cg5BXtExg9AIFHUoZmwgLAgUh9GAFHkwYAAslFEUXv4B/ut8cIUCOqlzWzi6tBapRqmuOaC+iX8M7/54Dg4CrOl/DO/+eAQOFyRTX1gydJAM6XIyL5AIMnyQCzhzdBIyb5AJfwzv/ngCDfb/AP/k6GooVShZfwzv/ngEDd+beDSTQAg0ckAKIJs+n5AIMnyQDBGYHnk7dZAJ3Ltz32T7eL9U83DfVPYQQFSpONzb+TiwsGkwwNBmOHCQCDJ8kAmcNjTUABY1YKCJMHcAwZoJMHkAwjKvkAb/BP9wMoi7CDpw0AzsAzuAkBBgizh/tABQi+xkLO7+Cf8gOnDQBySDeF9U+ihfwA5oaQABMFhQeX8M7/54Bg0YZHAyeLsIOlDQCziflAHY8+lLZHIyTrsCqKvpUjoL0As4WVQQHF4Xeul737EwUNBu/wT4wjoJ0BpbdjHQrugyfJAGOJB+6TB4AMjb8cRGOTB+7v8I+fCWUTBQVxl/DO/+eAYL+X8M7/54BgxG/wj+xARGMBBOzv8E+dEwWAPpfwzv/ngEC9ApRv8M/q+kBqRNpESkm6SSpKmkoKS/ZbZlzWXEZdtl0NYYKA",Dd=1341194240,Rd="YAD1T3gO8U/GDvFPZA/xT0oQ8U+kEPFPXBDxT8oM8U/+D/FPRhDxT4IP8U96DPFPqg/xT3oM8U9UDvFPkg7xT8YO8U9kD/FPZg7xT/QM8U8oDfFPYg7xT3YU8U/GDvFPGBLxTzYU8U8eC/FPWhTxTx4L8U8eC/FPHgvxTx4L8U8eC/FPHgvxTx4L8U8eC/FPthHxTx4L8U9SE/FPNhTxTw==",Md=1341533180,kd=1341456384,Td={entry:Sd,text:Id,text_start:Dd,data:Rd,data_start:Md,bss_start:kd},Fd=Object.freeze({__proto__:null,bss_start:kd,data:Rd,data_start:Md,default:Td,entry:Sd,text:Id,text_start:Dd}),Pd=1341459344,zd="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",Ud=1341456384,Od="YAD2T8oQ9U80EfVP0BH1T6wS9U8UE/VPwhL1TwQP9U9oEvVPqBL1T+wR9U+0DvVPFBL1T7QO9U+mEPVP8hD1TzQR9U/QEfVPuBD1TywP9U9gD/VPtBD1TxIV9U80EfVP2BP1T9IU9U9YDfVP9hT1T1gN9U9YDfVPWA31T1gN9U9YDfVPWA31T1gN9U9YDfVPdhP1T1gN9U/wE/VP0hT1Tw==",Hd=1341598720,Qd=1341521920,Gd={entry:Pd,text:zd,text_start:Ud,data:Od,data_start:Hd,bss_start:Qd},Ld=Object.freeze({__proto__:null,bss_start:Qd,data:Od,data_start:Hd,default:Gd,entry:Pd,text:zd,text_start:Ud}),$d=1073907716,Nd="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",Yd=1073905664,Kd="WAD9P0uLAkDdiwJA8pACQGaMAkD+iwJAZowCQMWMAkDejQJAUY4CQPmNAkDVigJAd40CQNCNAkDojAJAdI4CQBCNAkB0jgJAy4sCQCqMAkBmjAJAxYwCQOOLAkAXiwJAN48CQKqQAkDqiQJA0ZACQOqJAkDqiQJA6okCQOqJAkDqiQJA6okCQOqJAkDqiQJA1I4CQOqJAkDJjwJAqpACQA==",Wd=1073622012,Jd=1073545216,jd={entry:$d,text:Nd,text_start:Yd,data:Kd,data_start:Wd,bss_start:Jd},Zd=Object.freeze({__proto__:null,bss_start:Jd,data:Kd,data_start:Wd,default:jd,entry:$d,text:Nd,text_start:Yd}),Vd=1077381760,Xd="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",qd=1077379072,ep="XADKP16ON0AzjzdAR5Q3QL2PN0BTjzdAvY83QB2QN0A6kTdArJE3QFWRN0DpjTdA0JA3QCyRN0BAkDdA0JE3QGiQN0DQkTdAIY83QH6PN0C9jzdAHZA3QDmPN0AqjjdAkJI3QA2UN0AAjTdALZQ3QACNN0AAjTdAAI03QACNN0AAjTdAAI03QACNN0AAjTdAKpI3QACNN0AlkzdADZQ3QAQInwAAAAAAAAAYAQQIBQAAAAAAAAAIAQQIBgAAAAAAAAAAAQQIIQAAAAAAIAAAEQQI3AAAAAAAIAAAEQQIDAAAAAAAIAAAAQQIEgAAAAAAIAAAESAoDAAQAQAA",tp=1070279676,ip=1070202880,sp={entry:Vd,text:Xd,text_start:qd,data:ep,data_start:tp,bss_start:ip},rp=Object.freeze({__proto__:null,bss_start:ip,data:ep,data_start:tp,default:sp,entry:Vd,text:Xd,text_start:qd}),op=1074843652,ap="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",np=1074843648,lp="CIH+PwUFBAACAwcAAwMLANTXEEAL2BBAOdgQQNbYEECF5xBAOtkQQJDZEEDc2RBAhecQQKLaEEAf2xBA4NsQQIXnEECF5xBAeNwQQIXnEEBV3xBAHOAQQFfgEECF5xBAhecQQPPgEECF5xBA2+EQQIHiEEDA4xBAf+QQQFDlEECF5xBAhecQQIXnEECF5xBAfuYQQIXnEEB05xBAsN0QQKnYEEDC5RBAydoQQBvaEECF5xBACOcQQE/nEECF5xBAhecQQIXnEECF5xBAhecQQIXnEECF5xBAhecQQELaEEB/2hBA2uUQQAEAAAACAAAAAwAAAAQAAAAFAAAABwAAAAkAAAANAAAAEQAAABkAAAAhAAAAMQAAAEEAAABhAAAAgQAAAMEAAAABAQAAgQEAAAECAAABAwAAAQQAAAEGAAABCAAAAQwAAAEQAAABGAAAASAAAAEwAAABQAAAAWAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAABAAAAAgAAAAIAAAADAAAAAwAAAAQAAAAEAAAABQAAAAUAAAAGAAAABgAAAAcAAAAHAAAACAAAAAgAAAAJAAAACQAAAAoAAAAKAAAACwAAAAsAAAAMAAAADAAAAA0AAAANAAAAAAAAAAAAAAADAAAABAAAAAUAAAAGAAAABwAAAAgAAAAJAAAACgAAAAsAAAANAAAADwAAABEAAAATAAAAFwAAABsAAAAfAAAAIwAAACsAAAAzAAAAOwAAAEMAAABTAAAAYwAAAHMAAACDAAAAowAAAMMAAADjAAAAAgEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAQAAAAEAAAABAAAAAgAAAAIAAAACAAAAAgAAAAMAAAADAAAAAwAAAAMAAAAEAAAABAAAAAQAAAAEAAAABQAAAAUAAAAFAAAABQAAAAAAAAAAAAAAAAAAABAREgAIBwkGCgULBAwDDQIOAQ8AAQEAAAEAAAAEAAAA",cp=1073720488,hp=1073643776,dp={entry:op,text:ap,text_start:np,data:lp,data_start:cp,bss_start:hp},pp=Object.freeze({__proto__:null,bss_start:hp,data:lp,data_start:cp,default:dp,entry:op,text:ap,text_start:np});class up extends tc{constructor(){super(...arguments),this.CHIP_NAME="ESP32",this.IMAGE_CHIP_ID=0,this.EFUSE_RD_REG_BASE=1073061888,this.DR_REG_SYSCON_BASE=1073111040,this.UART_CLKDIV_REG=1072955412,this.UART_CLKDIV_MASK=1048575,this.UART_DATE_REG_ADDR=1610612856,this.XTAL_CLK_DIVIDER=1,this.IROM_MAP_START=1074593792,this.IROM_MAP_END=1077936128,this.DROM_MAP_START=1061158912,this.DROM_MAP_END=1065353216,this.MEMORY_MAP=[[0,65536,"PADDING"],[1061158912,1065353216,"DROM"],[1065353216,1069547520,"EXTRAM_DATA"],[1073217536,1073225728,"RTC_DRAM"],[1073283072,1073741824,"BYTE_ACCESSIBLE"],[1073405952,1073741824,"DRAM"],[1073610752,1073741820,"DIRAM_DRAM"],[1073741824,1074200576,"IROM"],[1074200576,1074233344,"CACHE_PRO"],[1074233344,1074266112,"CACHE_APP"],[1074266112,1074397184,"IRAM"],[1074397184,1074528252,"DIRAM_IRAM"],[1074528256,1074536448,"RTC_IRAM"],[1074593792,1077936128,"IROM"],[1342177280,1342185472,"RTC_DATA"]],this.FLASH_SIZES={"1MB":0,"2MB":16,"4MB":32,"8MB":48,"16MB":64,"32MB":80,"64MB":96,"128MB":112},this.FLASH_FREQUENCY={"80m":15,"40m":0,"26m":1,"20m":2},this.FLASH_WRITE_SIZE=1024,this.BOOTLOADER_FLASH_OFFSET=4096,this.SPI_REG_BASE=1072963584,this.SPI_USR_OFFS=28,this.SPI_USR1_OFFS=32,this.SPI_USR2_OFFS=36,this.SPI_W0_OFFS=128,this.SPI_MOSI_DLEN_OFFS=40,this.SPI_MISO_DLEN_OFFS=44}async readEfuse(e,t){const i=this.EFUSE_RD_REG_BASE+4*t;return e.debug("Read efuse "+i),await e.readReg(i)}async getPkgVersion(e){const t=await this.readEfuse(e,3);let i=t>>9&7;return i+=(t>>2&1)<<3,i}async getChipRevision(e){const t=await this.readEfuse(e,3),i=await this.readEfuse(e,5),s=await e.readReg(this.DR_REG_SYSCON_BASE+124);return 0!=(t>>15&1)?0!=(i>>20&1)?0!=(s>>31&1)?3:2:1:0}async getChipDescription(e){const t=["ESP32-D0WDQ6","ESP32-D0WD","ESP32-D2WD","","ESP32-U4WDH","ESP32-PICO-D4","ESP32-PICO-V3-02"];let i="";const s=await this.getPkgVersion(e),r=await this.getChipRevision(e),o=3==r;return 0!=(1&await this.readEfuse(e,3))&&(t[0]="ESP32-S0WDQ6",t[1]="ESP32-S0WD"),o&&(t[5]="ESP32-PICO-V3"),i=s>=0&&s<=6?t[s]:"Unknown ESP32",!o||0!==s&&1!==s||(i+="-V3"),i+" (revision "+r+")"}async getChipFeatures(e){const t=["Wi-Fi"],i=await this.readEfuse(e,3);0===(2&i)&&t.push(" BT");0!==(1&i)?t.push(" Single Core"):t.push(" Dual Core");if(0!==(8192&i)){0!==(4096&i)?t.push(" 160MHz"):t.push(" 240MHz")}const s=await this.getPkgVersion(e);-1!==[2,4,5,6].indexOf(s)&&t.push(" Embedded Flash"),6===s&&t.push(" Embedded PSRAM");0!==(await this.readEfuse(e,4)>>8&31)&&t.push(" VRef calibration in efuse");0!==(i>>14&1)&&t.push(" BLK3 partially reserved");const r=3&await this.readEfuse(e,6);return t.push(" Coding Scheme "+["None","3/4","Repeat (UNSUPPORTED)","Invalid"][r]),t}async getCrystalFreq(e){const t=await e.readReg(this.UART_CLKDIV_REG)&this.UART_CLKDIV_MASK,i=e.transport.baudrate*t/1e6/this.XTAL_CLK_DIVIDER;let s;return s=i>33?40:26,Math.abs(s-i)>1&&e.info("WARNING: Unsupported crystal in use"),s}_d2h(e){const t=(+e).toString(16);return 1===t.length?"0"+t:t}async readMac(e){let t=await this.readEfuse(e,1);t>>>=0;let i=await this.readEfuse(e,2);i>>>=0;const s=new Uint8Array(6);return s[0]=i>>8&255,s[1]=255&i,s[2]=t>>24&255,s[3]=t>>16&255,s[4]=t>>8&255,s[5]=255&t,this._d2h(s[0])+":"+this._d2h(s[1])+":"+this._d2h(s[2])+":"+this._d2h(s[3])+":"+this._d2h(s[4])+":"+this._d2h(s[5])}}var gp=Object.freeze({__proto__:null,ESP32ROM:up});class Ap extends up{constructor(){super(...arguments),this.CHIP_NAME="ESP32-C3",this.IMAGE_CHIP_ID=5,this.EFUSE_BASE=1610647552,this.MAC_EFUSE_REG=this.EFUSE_BASE+68,this.UART_CLKDIV_REG=1072955412,this.UART_CLKDIV_MASK=1048575,this.UART_DATE_REG_ADDR=1610612860,this.FLASH_WRITE_SIZE=1024,this.BOOTLOADER_FLASH_OFFSET=0,this.SPI_REG_BASE=1610620928,this.SPI_USR_OFFS=24,this.SPI_USR1_OFFS=28,this.SPI_USR2_OFFS=32,this.SPI_MOSI_DLEN_OFFS=36,this.SPI_MISO_DLEN_OFFS=40,this.SPI_W0_OFFS=88,this.IROM_MAP_START=1107296256,this.IROM_MAP_END=1115684864,this.MEMORY_MAP=[[0,65536,"PADDING"],[1006632960,1015021568,"DROM"],[1070071808,1070465024,"DRAM"],[1070104576,1070596096,"BYTE_ACCESSIBLE"],[1072693248,1072824320,"DROM_MASK"],[1073741824,1074135040,"IROM_MASK"],[1107296256,1115684864,"IROM"],[1077395456,1077805056,"IRAM"],[1342177280,1342185472,"RTC_IRAM"],[1342177280,1342185472,"RTC_DRAM"],[1611653120,1611661312,"MEM_INTERNAL2"]]}async getPkgVersion(e){const t=this.EFUSE_BASE+68+12;return await e.readReg(t)>>21&7}async getChipRevision(e){const t=this.EFUSE_BASE+68+12;return(await e.readReg(t)&7<<18)>>18}async getMinorChipVersion(e){const t=this.EFUSE_BASE+68+20,i=await e.readReg(t)>>23&1,s=this.EFUSE_BASE+68+12;return(i<<3)+(await e.readReg(s)>>18&7)}async getMajorChipVersion(e){const t=this.EFUSE_BASE+68+20;return await e.readReg(t)>>24&3}async getChipDescription(e){const t=await this.getPkgVersion(e),i=await this.getMajorChipVersion(e),s=await this.getMinorChipVersion(e);return`${{0:"ESP32-C3 (QFN32)",1:"ESP8685 (QFN28)",2:"ESP32-C3 AZ (QFN32)",3:"ESP8686 (QFN24)"}[t]||"Unknown ESP32-C3"} (revision v${i}.${s})`}async getFlashCap(e){const t=this.EFUSE_BASE+68+12;return await e.readReg(t)>>27&7}async getFlashVendor(e){const t=this.EFUSE_BASE+68+16;return{1:"XMC",2:"GD",3:"FM",4:"TT",5:"ZBIT"}[7&await e.readReg(t)]||""}async getChipFeatures(e){const t=["Wi-Fi","BLE"],i=await this.getFlashCap(e),s=await this.getFlashVendor(e),r={0:null,1:"Embedded Flash 4MB",2:"Embedded Flash 2MB",3:"Embedded Flash 1MB",4:"Embedded Flash 8MB"}[i],o=void 0!==r?r:"Unknown Embedded Flash";return null!==r&&t.push(`${o} (${s})`),t}async getCrystalFreq(e){return 40}_d2h(e){const t=(+e).toString(16);return 1===t.length?"0"+t:t}async readMac(e){let t=await e.readReg(this.MAC_EFUSE_REG);t>>>=0;let i=await e.readReg(this.MAC_EFUSE_REG+4);i=i>>>0&65535;const s=new Uint8Array(6);return s[0]=i>>8&255,s[1]=255&i,s[2]=t>>24&255,s[3]=t>>16&255,s[4]=t>>8&255,s[5]=255&t,this._d2h(s[0])+":"+this._d2h(s[1])+":"+this._d2h(s[2])+":"+this._d2h(s[3])+":"+this._d2h(s[4])+":"+this._d2h(s[5])}getEraseSize(e,t){return t}}var _p=Object.freeze({__proto__:null,ESP32C3ROM:Ap});var fp=Object.freeze({__proto__:null,ESP32C2ROM:class extends Ap{constructor(){super(...arguments),this.CHIP_NAME="ESP32-C2",this.IMAGE_CHIP_ID=12,this.EFUSE_BASE=1610647552,this.MAC_EFUSE_REG=this.EFUSE_BASE+64,this.UART_CLKDIV_REG=1610612756,this.UART_CLKDIV_MASK=1048575,this.UART_DATE_REG_ADDR=1610612860,this.XTAL_CLK_DIVIDER=1,this.FLASH_WRITE_SIZE=1024,this.BOOTLOADER_FLASH_OFFSET=0,this.SPI_REG_BASE=1610620928,this.SPI_USR_OFFS=24,this.SPI_USR1_OFFS=28,this.SPI_USR2_OFFS=32,this.SPI_MOSI_DLEN_OFFS=36,this.SPI_MISO_DLEN_OFFS=40,this.SPI_W0_OFFS=88,this.IROM_MAP_START=1107296256,this.IROM_MAP_END=1111490560,this.MEMORY_MAP=[[0,65536,"PADDING"],[1006632960,1010827264,"DROM"],[1070202880,1070465024,"DRAM"],[1070104576,1070596096,"BYTE_ACCESSIBLE"],[1072693248,1073020928,"DROM_MASK"],[1073741824,1074331648,"IROM_MASK"],[1107296256,1111490560,"IROM"],[1077395456,1077673984,"IRAM"]]}async getPkgVersion(e){const t=this.EFUSE_BASE+64+4;return await e.readReg(t)>>22&7}async getChipRevision(e){const t=this.EFUSE_BASE+64+4;return(await e.readReg(t)&3<<20)>>20}async getChipDescription(e){let t;const i=await this.getPkgVersion(e);t=0===i||1===i?"ESP32-C2":"unknown ESP32-C2";return t+=" (revision "+await this.getChipRevision(e)+")",t}async getChipFeatures(e){return["Wi-Fi","BLE"]}async getCrystalFreq(e){const t=await e.readReg(this.UART_CLKDIV_REG)&this.UART_CLKDIV_MASK,i=e.transport.baudrate*t/1e6/this.XTAL_CLK_DIVIDER;let s;return s=i>33?40:26,Math.abs(s-i)>1&&e.info("WARNING: Unsupported crystal in use"),s}async changeBaudRate(e){26===await this.getCrystalFreq(e)&&e.changeBaud()}_d2h(e){const t=(+e).toString(16);return 1===t.length?"0"+t:t}async readMac(e){let t=await e.readReg(this.MAC_EFUSE_REG);t>>>=0;let i=await e.readReg(this.MAC_EFUSE_REG+4);i=i>>>0&65535;const s=new Uint8Array(6);return s[0]=i>>8&255,s[1]=255&i,s[2]=t>>24&255,s[3]=t>>16&255,s[4]=t>>8&255,s[5]=255&t,this._d2h(s[0])+":"+this._d2h(s[1])+":"+this._d2h(s[2])+":"+this._d2h(s[3])+":"+this._d2h(s[4])+":"+this._d2h(s[5])}getEraseSize(e,t){return t}}});class mp extends Ap{constructor(){super(...arguments),this.CHIP_NAME="ESP32-C6",this.IMAGE_CHIP_ID=13,this.EFUSE_BASE=1611335680,this.EFUSE_BLOCK1_ADDR=this.EFUSE_BASE+68,this.MAC_EFUSE_REG=this.EFUSE_BASE+68,this.UART_CLKDIV_REG=1072955412,this.UART_CLKDIV_MASK=1048575,this.UART_DATE_REG_ADDR=1610612860,this.FLASH_WRITE_SIZE=1024,this.BOOTLOADER_FLASH_OFFSET=0,this.SPI_REG_BASE=1610620928,this.SPI_USR_OFFS=24,this.SPI_USR1_OFFS=28,this.SPI_USR2_OFFS=32,this.SPI_MOSI_DLEN_OFFS=36,this.SPI_MISO_DLEN_OFFS=40,this.SPI_W0_OFFS=88,this.IROM_MAP_START=1107296256,this.IROM_MAP_END=1115684864,this.MEMORY_MAP=[[0,65536,"PADDING"],[1107296256,1124073472,"DROM"],[1082130432,1082654720,"DRAM"],[1082130432,1082654720,"BYTE_ACCESSIBLE"],[1074048e3,1074069504,"DROM_MASK"],[1073741824,1074048e3,"IROM_MASK"],[1107296256,1124073472,"IROM"],[1082130432,1082654720,"IRAM"],[1342177280,1342193664,"RTC_IRAM"],[1342177280,1342193664,"RTC_DRAM"],[1611653120,1611661312,"MEM_INTERNAL2"]]}async getPkgVersion(e){const t=this.EFUSE_BASE+68+12;return await e.readReg(t)>>21&7}async getChipRevision(e){const t=this.EFUSE_BASE+68+12;return(await e.readReg(t)&7<<18)>>18}async getChipDescription(e){let t;t=0===await this.getPkgVersion(e)?"ESP32-C6":"unknown ESP32-C6";return t+=" (revision "+await this.getChipRevision(e)+")",t}async getChipFeatures(e){return["Wi-Fi 6","BT 5","IEEE802.15.4"]}async getCrystalFreq(e){return 40}_d2h(e){const t=(+e).toString(16);return 1===t.length?"0"+t:t}async readMac(e){let t=await e.readReg(this.MAC_EFUSE_REG);t>>>=0;let i=await e.readReg(this.MAC_EFUSE_REG+4);i=i>>>0&65535;const s=new Uint8Array(6);return s[0]=i>>8&255,s[1]=255&i,s[2]=t>>24&255,s[3]=t>>16&255,s[4]=t>>8&255,s[5]=255&t,this._d2h(s[0])+":"+this._d2h(s[1])+":"+this._d2h(s[2])+":"+this._d2h(s[3])+":"+this._d2h(s[4])+":"+this._d2h(s[5])}getEraseSize(e,t){return t}}var wp=Object.freeze({__proto__:null,ESP32C6ROM:mp});var vp=Object.freeze({__proto__:null,ESP32C61ROM:class extends mp{constructor(){super(...arguments),this.CHIP_NAME="ESP32-C61",this.IMAGE_CHIP_ID=20,this.CHIP_DETECT_MAGIC_VALUE=[871374959,606167151],this.UART_DATE_REG_ADDR=1610612860,this.EFUSE_BASE=1611352064,this.EFUSE_BLOCK1_ADDR=this.EFUSE_BASE+68,this.MAC_EFUSE_REG=this.EFUSE_BASE+68,this.EFUSE_RD_REG_BASE=this.EFUSE_BASE+48,this.EFUSE_PURPOSE_KEY0_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY0_SHIFT=0,this.EFUSE_PURPOSE_KEY1_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY1_SHIFT=4,this.EFUSE_PURPOSE_KEY2_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY2_SHIFT=8,this.EFUSE_PURPOSE_KEY3_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY3_SHIFT=12,this.EFUSE_PURPOSE_KEY4_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY4_SHIFT=16,this.EFUSE_PURPOSE_KEY5_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY5_SHIFT=20,this.EFUSE_DIS_DOWNLOAD_MANUAL_ENCRYPT_REG=this.EFUSE_RD_REG_BASE,this.EFUSE_DIS_DOWNLOAD_MANUAL_ENCRYPT=1<<20,this.EFUSE_SPI_BOOT_CRYPT_CNT_REG=this.EFUSE_BASE+48,this.EFUSE_SPI_BOOT_CRYPT_CNT_MASK=7<<23,this.EFUSE_SECURE_BOOT_EN_REG=this.EFUSE_BASE+52,this.EFUSE_SECURE_BOOT_EN_MASK=1<<26,this.FLASH_FREQUENCY={"80m":15,"40m":0,"20m":2},this.IROM_MAP_START=1107296256,this.IROM_MAP_END=1115684864,this.MEMORY_MAP=[[0,65536,"PADDING"],[1098907648,1107296256,"DROM"],[1082130432,1082523648,"DRAM"],[1082130432,1082523648,"BYTE_ACCESSIBLE"],[1074048e3,1074069504,"DROM_MASK"],[1073741824,1074048e3,"IROM_MASK"],[1090519040,1098907648,"IROM"],[1082130432,1082523648,"IRAM"],[1342177280,1342193664,"RTC_IRAM"],[1342177280,1342193664,"RTC_DRAM"],[1611653120,1611661312,"MEM_INTERNAL2"]],this.UF2_FAMILY_ID=2010665156,this.EFUSE_MAX_KEY=5,this.KEY_PURPOSES={0:"USER/EMPTY",1:"ECDSA_KEY",2:"XTS_AES_256_KEY_1",3:"XTS_AES_256_KEY_2",4:"XTS_AES_128_KEY",5:"HMAC_DOWN_ALL",6:"HMAC_DOWN_JTAG",7:"HMAC_DOWN_DIGITAL_SIGNATURE",8:"HMAC_UP",9:"SECURE_BOOT_DIGEST0",10:"SECURE_BOOT_DIGEST1",11:"SECURE_BOOT_DIGEST2",12:"KM_INIT_KEY",13:"XTS_AES_256_KEY_1_PSRAM",14:"XTS_AES_256_KEY_2_PSRAM",15:"XTS_AES_128_KEY_PSRAM"}}async getPkgVersion(e){return await e.readReg(this.EFUSE_BLOCK1_ADDR+8)>>26&7}async getMinorChipVersion(e){return 15&await e.readReg(this.EFUSE_BLOCK1_ADDR+8)}async getMajorChipVersion(e){return await e.readReg(this.EFUSE_BLOCK1_ADDR+8)>>4&3}async getChipDescription(e){let t;t=0===await this.getPkgVersion(e)?"ESP32-C61":"unknown ESP32-C61";return`${t} (revision v${await this.getMajorChipVersion(e)}.${await this.getMinorChipVersion(e)})`}async getChipFeatures(e){return["WiFi 6","BT 5"]}async readMac(e){let t=await e.readReg(this.MAC_EFUSE_REG);t>>>=0;let i=await e.readReg(this.MAC_EFUSE_REG+4);i=i>>>0&65535;const s=new Uint8Array(6);return s[0]=i>>8&255,s[1]=255&i,s[2]=t>>24&255,s[3]=t>>16&255,s[4]=t>>8&255,s[5]=255&t,this._d2h(s[0])+":"+this._d2h(s[1])+":"+this._d2h(s[2])+":"+this._d2h(s[3])+":"+this._d2h(s[4])+":"+this._d2h(s[5])}}});var bp=Object.freeze({__proto__:null,ESP32C5ROM:class extends mp{constructor(){super(...arguments),this.CHIP_NAME="ESP32-C5",this.IMAGE_CHIP_ID=23,this.BOOTLOADER_FLASH_OFFSET=8192,this.EFUSE_BASE=1611352064,this.EFUSE_BLOCK1_ADDR=this.EFUSE_BASE+68,this.MAC_EFUSE_REG=this.EFUSE_BASE+68,this.UART_CLKDIV_REG=1610612756,this.EFUSE_RD_REG_BASE=this.EFUSE_BASE+48,this.EFUSE_FORCE_USE_KEY_MANAGER_KEY_REG=this.EFUSE_BASE+52,this.EFUSE_FORCE_USE_KEY_MANAGER_KEY_SHIFT=10,this.FORCE_USE_KEY_MANAGER_VAL_XTS_AES_KEY=2,this.EFUSE_PURPOSE_KEY0_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY0_SHIFT=22,this.EFUSE_PURPOSE_KEY1_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY1_SHIFT=27,this.EFUSE_PURPOSE_KEY2_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY2_SHIFT=0,this.EFUSE_PURPOSE_KEY3_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY3_SHIFT=5,this.EFUSE_PURPOSE_KEY4_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY4_SHIFT=10,this.EFUSE_PURPOSE_KEY5_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY5_SHIFT=15,this.EFUSE_DIS_DOWNLOAD_MANUAL_ENCRYPT_REG=this.EFUSE_RD_REG_BASE,this.EFUSE_DIS_DOWNLOAD_MANUAL_ENCRYPT=1<<20,this.EFUSE_SPI_BOOT_CRYPT_CNT_REG=this.EFUSE_BASE+52,this.EFUSE_SPI_BOOT_CRYPT_CNT_MASK=7<<18,this.EFUSE_SECURE_BOOT_EN_REG=this.EFUSE_BASE+56,this.EFUSE_SECURE_BOOT_EN_MASK=1<<20,this.IROM_MAP_START=1107296256,this.IROM_MAP_END=1140850688,this.DROM_MAP_START=1107296256,this.DROM_MAP_END=1140850688,this.PCR_SYSCLK_CONF_REG=1611227408,this.PCR_SYSCLK_XTAL_FREQ_V=127<<24,this.PCR_SYSCLK_XTAL_FREQ_S=24,this.XTAL_CLK_DIVIDER=1,this.UARTDEV_BUF_NO=1082520852,this.CHIP_DETECT_MAGIC_VALUE=[285294703,1675706479,1607549039],this.FLASH_FREQUENCY={"80m":15,"40m":0,"20m":2},this.MEMORY_MAP=[[0,65536,"PADDING"],[1107296256,1140850688,"DROM"],[1082130432,1082523648,"DRAM"],[1082130432,1082523648,"BYTE_ACCESSIBLE"],[1073979392,1074003968,"DROM_MASK"],[1073741824,1073979392,"IROM_MASK"],[1107296256,1140850688,"IROM"],[1082130432,1082523648,"IRAM"],[1342177280,1342193664,"RTC_IRAM"],[1342177280,1342193664,"RTC_DRAM"],[1611653120,1611661312,"MEM_INTERNAL2"]],this.UF2_FAMILY_ID=4145808195,this.EFUSE_MAX_KEY=5,this.PURPOSE_VAL_XTS_AES128_KEY=4,this.KEY_PURPOSES={0:"USER/EMPTY",1:"ECDSA_KEY",4:"XTS_AES_128_KEY",5:"HMAC_DOWN_ALL",6:"HMAC_DOWN_JTAG",7:"HMAC_DOWN_DIGITAL_SIGNATURE",8:"HMAC_UP",9:"SECURE_BOOT_DIGEST0",10:"SECURE_BOOT_DIGEST1",11:"SECURE_BOOT_DIGEST2",12:"KM_INIT_KEY",15:"XTS_AES_128_PSRAM_KEY",16:"ECDSA_KEY_P192",17:"ECDSA_KEY_P384_L",18:"ECDSA_KEY_P384_H"}}async getPkgVersion(e){return await e.readReg(this.EFUSE_BLOCK1_ADDR+8)>>26&7}async getMinorChipVersion(e){return 15&await e.readReg(this.EFUSE_BLOCK1_ADDR+8)}async getMajorChipVersion(e){return await e.readReg(this.EFUSE_BLOCK1_ADDR+8)>>4&3}async getChipDescription(e){let t;t=0===await this.getPkgVersion(e)?"ESP32-C5":"unknown ESP32-C5";return`${t} (revision v${await this.getMajorChipVersion(e)}.${await this.getMinorChipVersion(e)})`}async getChipFeatures(e){return["Wi-Fi 6 (dual-band)","BT 5 (LE)","IEEE802.15.4","Single Core + LP Core","240MHz"]}async getCrystalFreq(e){const t=await e.readReg(this.UART_CLKDIV_REG)&this.UART_CLKDIV_MASK,i=e.transport.baudrate*t/1e6/this.XTAL_CLK_DIVIDER;let s;return s=i>45?48:i>33?40:26,Math.abs(s-i)>1&&e.info("WARNING: Unsupported crystal in use"),s}async getCrystalFreqRomExpect(e){return(await e.readReg(this.PCR_SYSCLK_CONF_REG)&this.PCR_SYSCLK_XTAL_FREQ_V)>>this.PCR_SYSCLK_XTAL_FREQ_S}async getKeyBlockPurpose(e,t){if(t<0||t>this.EFUSE_MAX_KEY)throw new Error(`Valid key block numbers must be in range 0-${this.EFUSE_MAX_KEY}`);const i=[[this.EFUSE_PURPOSE_KEY0_REG,this.EFUSE_PURPOSE_KEY0_SHIFT],[this.EFUSE_PURPOSE_KEY1_REG,this.EFUSE_PURPOSE_KEY1_SHIFT],[this.EFUSE_PURPOSE_KEY2_REG,this.EFUSE_PURPOSE_KEY2_SHIFT],[this.EFUSE_PURPOSE_KEY3_REG,this.EFUSE_PURPOSE_KEY3_SHIFT],[this.EFUSE_PURPOSE_KEY4_REG,this.EFUSE_PURPOSE_KEY4_SHIFT],[this.EFUSE_PURPOSE_KEY5_REG,this.EFUSE_PURPOSE_KEY5_SHIFT]],[s,r]=i[t];return await e.readReg(s)>>r&31}async isFlashEncryptionKeyValid(e){const t=[];for(let i=0;i<=this.EFUSE_MAX_KEY;i++){const s=await this.getKeyBlockPurpose(e,i);t.push(s)}if(t.some(e=>e===this.PURPOSE_VAL_XTS_AES128_KEY))return!0;return 0!==(await e.readReg(this.EFUSE_FORCE_USE_KEY_MANAGER_KEY_REG)>>this.EFUSE_FORCE_USE_KEY_MANAGER_KEY_SHIFT&this.FORCE_USE_KEY_MANAGER_VAL_XTS_AES_KEY)}checkSpiConnection(e,t){if(!t.every(e=>e>=0&&e<=28))throw new Error("SPI Pin numbers must be in the range 0-28.");t.some(e=>13===e||14===e)&&e.info("GPIO pins 13 and 14 are used by USB-Serial/JTAG, consider using other pins for SPI flash connection.")}async usesUsbJtagSerial(e){const t=this.UARTDEV_BUF_NO;return 3===(255&await e.readReg(t))}async watchdogReset(e){throw e.info("Hard resetting with a watchdog..."),new Error("watchdogReset not yet implemented for ESP32-C5")}async changeBaud(e){if(!e.IS_STUB){const t=await this.getCrystalFreqRomExpect(e),i=await this.getCrystalFreq(e);e.info(`ROM expects crystal freq: ${t} MHz, detected ${i} MHz.`),(48===i&&40===t||40===i&&48===t)&&e.info("Crystal frequency mismatch detected. Baud rate adjustment may be needed but is not fully implemented in this version.")}await e.changeBaud()}}});var Ep=Object.freeze({__proto__:null,ESP32H2ROM:class extends mp{constructor(){super(...arguments),this.CHIP_NAME="ESP32-H2",this.IMAGE_CHIP_ID=16,this.EFUSE_BASE=1611335680,this.EFUSE_BLOCK1_ADDR=this.EFUSE_BASE+68,this.MAC_EFUSE_REG=this.EFUSE_BASE+68,this.UART_CLKDIV_REG=1072955412,this.UART_CLKDIV_MASK=1048575,this.UART_DATE_REG_ADDR=1610612860,this.FLASH_WRITE_SIZE=1024,this.BOOTLOADER_FLASH_OFFSET=0,this.SPI_REG_BASE=1610620928,this.SPI_USR_OFFS=24,this.SPI_USR1_OFFS=28,this.SPI_USR2_OFFS=32,this.SPI_MOSI_DLEN_OFFS=36,this.SPI_MISO_DLEN_OFFS=40,this.SPI_W0_OFFS=88,this.USB_RAM_BLOCK=2048,this.UARTDEV_BUF_NO_USB=3,this.UARTDEV_BUF_NO=1070526796,this.IROM_MAP_START=1107296256,this.IROM_MAP_END=1115684864,this.MEMORY_MAP=[[0,65536,"PADDING"],[1107296256,1124073472,"DROM"],[1082130432,1082654720,"DRAM"],[1082130432,1082654720,"BYTE_ACCESSIBLE"],[1074048e3,1074069504,"DROM_MASK"],[1073741824,1074048e3,"IROM_MASK"],[1107296256,1124073472,"IROM"],[1082130432,1082654720,"IRAM"],[1342177280,1342193664,"RTC_IRAM"],[1342177280,1342193664,"RTC_DRAM"],[1611653120,1611661312,"MEM_INTERNAL2"]]}async getPkgVersion(e){return 7&await e.readReg(this.EFUSE_BLOCK1_ADDR+16)}async getMinorChipVersion(e){return await e.readReg(this.EFUSE_BLOCK1_ADDR+12)>>18&7}async getMajorChipVersion(e){return await e.readReg(this.EFUSE_BLOCK1_ADDR+12)>>21&3}async getChipDescription(e){let t;t=0===await this.getPkgVersion(e)?"ESP32-H2":"unknown ESP32-H2";return`${t} (revision v${await this.getMajorChipVersion(e)}.${await this.getMinorChipVersion(e)})`}async getChipFeatures(e){return["BT 5 (LE)","IEEE802.15.4","Single Core","96MHz"]}async getCrystalFreq(e){return 32}_d2h(e){const t=(+e).toString(16);return 1===t.length?"0"+t:t}async postConnect(e){const t=255&await e.readReg(this.UARTDEV_BUF_NO);e.debug("In _post_connect "+t),t==this.UARTDEV_BUF_NO_USB&&(e.ESP_RAM_BLOCK=this.USB_RAM_BLOCK)}async readMac(e){let t=await e.readReg(this.MAC_EFUSE_REG);t>>>=0;let i=await e.readReg(this.MAC_EFUSE_REG+4);i=i>>>0&65535;const s=new Uint8Array(6);return s[0]=i>>8&255,s[1]=255&i,s[2]=t>>24&255,s[3]=t>>16&255,s[4]=t>>8&255,s[5]=255&t,this._d2h(s[0])+":"+this._d2h(s[1])+":"+this._d2h(s[2])+":"+this._d2h(s[3])+":"+this._d2h(s[4])+":"+this._d2h(s[5])}getEraseSize(e,t){return t}}});var yp=Object.freeze({__proto__:null,ESP32S3ROM:class extends up{constructor(){super(...arguments),this.CHIP_NAME="ESP32-S3",this.IMAGE_CHIP_ID=9,this.EFUSE_BASE=1610641408,this.MAC_EFUSE_REG=this.EFUSE_BASE+68,this.EFUSE_BLOCK1_ADDR=this.EFUSE_BASE+68,this.EFUSE_BLOCK2_ADDR=this.EFUSE_BASE+92,this.UART_CLKDIV_REG=1610612756,this.UART_CLKDIV_MASK=1048575,this.UART_DATE_REG_ADDR=1610612864,this.FLASH_WRITE_SIZE=1024,this.BOOTLOADER_FLASH_OFFSET=0,this.SPI_REG_BASE=1610620928,this.SPI_USR_OFFS=24,this.SPI_USR1_OFFS=28,this.SPI_USR2_OFFS=32,this.SPI_MOSI_DLEN_OFFS=36,this.SPI_MISO_DLEN_OFFS=40,this.SPI_W0_OFFS=88,this.USB_RAM_BLOCK=2048,this.UARTDEV_BUF_NO_USB=3,this.UARTDEV_BUF_NO=1070526796,this.IROM_MAP_START=1107296256,this.IROM_MAP_END=1140850688,this.MEMORY_MAP=[[0,65536,"PADDING"],[1006632960,1023410176,"DROM"],[1023410176,1040187392,"EXTRAM_DATA"],[1611653120,1611661312,"RTC_DRAM"],[1070104576,1070596096,"BYTE_ACCESSIBLE"],[1070104576,1077813248,"MEM_INTERNAL"],[1070104576,1070596096,"DRAM"],[1073741824,1073848576,"IROM_MASK"],[1077346304,1077805056,"IRAM"],[1611653120,1611661312,"RTC_IRAM"],[1107296256,1115684864,"IROM"],[1342177280,1342185472,"RTC_DATA"]]}async getChipDescription(e){const t=await this.getMajorChipVersion(e),i=await this.getMinorChipVersion(e);return`${{0:"ESP32-S3 (QFN56)",1:"ESP32-S3-PICO-1 (LGA56)"}[await this.getPkgVersion(e)]||"unknown ESP32-S3"} (revision v${t}.${i})`}async getPkgVersion(e){return await e.readReg(this.EFUSE_BLOCK1_ADDR+12)>>21&7}async getRawMinorChipVersion(e){return((await e.readReg(this.EFUSE_BLOCK1_ADDR+20)>>23&1)<<3)+(await e.readReg(this.EFUSE_BLOCK1_ADDR+12)>>18&7)}async getMinorChipVersion(e){const t=await this.getRawMinorChipVersion(e);return await this.isEco0(e,t)?0:this.getRawMinorChipVersion(e)}async getRawMajorChipVersion(e){return await e.readReg(this.EFUSE_BLOCK1_ADDR+20)>>24&3}async getMajorChipVersion(e){const t=await this.getRawMinorChipVersion(e);return await this.isEco0(e,t)?0:this.getRawMajorChipVersion(e)}async getBlkVersionMajor(e){return 3&await e.readReg(this.EFUSE_BLOCK2_ADDR+16)}async getBlkVersionMinor(e){return await e.readReg(this.EFUSE_BLOCK1_ADDR+12)>>24&7}async isEco0(e,t){return!(7&t)&&1===await this.getBlkVersionMajor(e)&&1===await this.getBlkVersionMinor(e)}async getFlashCap(e){const t=this.EFUSE_BASE+68+12;return await e.readReg(t)>>27&7}async getFlashVendor(e){const t=this.EFUSE_BASE+68+16;return{1:"XMC",2:"GD",3:"FM",4:"TT",5:"BY"}[7&await e.readReg(t)]||""}async getPsramCap(e){const t=this.EFUSE_BASE+68+16;return await e.readReg(t)>>3&3}async getPsramVendor(e){const t=this.EFUSE_BASE+68+16;return{1:"AP_3v3",2:"AP_1v8"}[await e.readReg(t)>>7&3]||""}async getChipFeatures(e){const t=["Wi-Fi","BLE"],i=await this.getFlashCap(e),s=await this.getFlashVendor(e),r={0:null,1:"Embedded Flash 8MB",2:"Embedded Flash 4MB"}[i],o=void 0!==r?r:"Unknown Embedded Flash";null!==r&&t.push(`${o} (${s})`);const a=await this.getPsramCap(e),n=await this.getPsramVendor(e),l={0:null,1:"Embedded PSRAM 8MB",2:"Embedded PSRAM 2MB"}[a],c=void 0!==l?l:"Unknown Embedded PSRAM";return null!==l&&t.push(`${c} (${n})`),t}async getCrystalFreq(e){return 40}_d2h(e){const t=(+e).toString(16);return 1===t.length?"0"+t:t}async postConnect(e){const t=255&await e.readReg(this.UARTDEV_BUF_NO);e.debug("In _post_connect "+t),t==this.UARTDEV_BUF_NO_USB&&(e.ESP_RAM_BLOCK=this.USB_RAM_BLOCK)}async readMac(e){let t=await e.readReg(this.MAC_EFUSE_REG);t>>>=0;let i=await e.readReg(this.MAC_EFUSE_REG+4);i=i>>>0&65535;const s=new Uint8Array(6);return s[0]=i>>8&255,s[1]=255&i,s[2]=t>>24&255,s[3]=t>>16&255,s[4]=t>>8&255,s[5]=255&t,this._d2h(s[0])+":"+this._d2h(s[1])+":"+this._d2h(s[2])+":"+this._d2h(s[3])+":"+this._d2h(s[4])+":"+this._d2h(s[5])}getEraseSize(e,t){return t}}});var Cp=Object.freeze({__proto__:null,ESP32S2ROM:class extends up{constructor(){super(...arguments),this.CHIP_NAME="ESP32-S2",this.IMAGE_CHIP_ID=2,this.IROM_MAP_START=1074266112,this.IROM_MAP_END=1085800448,this.DROM_MAP_START=1056964608,this.DROM_MAP_END=1061093376,this.CHIP_DETECT_MAGIC_VALUE=[1990],this.SPI_REG_BASE=1061167104,this.SPI_USR_OFFS=24,this.SPI_USR1_OFFS=28,this.SPI_USR2_OFFS=32,this.SPI_MOSI_DLEN_OFFS=36,this.SPI_MISO_DLEN_OFFS=40,this.SPI_W0_OFFS=88,this.SPI_ADDR_REG_MSB=!1,this.MAC_EFUSE_REG=1061265476,this.UART_CLKDIV_REG=1061158932,this.SUPPORTS_ENCRYPTED_FLASH=!0,this.FLASH_ENCRYPTED_WRITE_ALIGN=16,this.EFUSE_BASE=1061265408,this.EFUSE_RD_REG_BASE=this.EFUSE_BASE+48,this.EFUSE_BLOCK1_ADDR=this.EFUSE_BASE+68,this.EFUSE_BLOCK2_ADDR=this.EFUSE_BASE+92,this.EFUSE_PURPOSE_KEY0_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY0_SHIFT=24,this.EFUSE_PURPOSE_KEY1_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY1_SHIFT=28,this.EFUSE_PURPOSE_KEY2_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY2_SHIFT=0,this.EFUSE_PURPOSE_KEY3_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY3_SHIFT=4,this.EFUSE_PURPOSE_KEY4_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY4_SHIFT=8,this.EFUSE_PURPOSE_KEY5_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY5_SHIFT=12,this.EFUSE_DIS_DOWNLOAD_MANUAL_ENCRYPT_REG=this.EFUSE_RD_REG_BASE,this.EFUSE_DIS_DOWNLOAD_MANUAL_ENCRYPT=1<<19,this.EFUSE_SPI_BOOT_CRYPT_CNT_REG=this.EFUSE_BASE+52,this.EFUSE_SPI_BOOT_CRYPT_CNT_MASK=7<<18,this.EFUSE_SECURE_BOOT_EN_REG=this.EFUSE_BASE+56,this.EFUSE_SECURE_BOOT_EN_MASK=1<<20,this.EFUSE_RD_REPEAT_DATA3_REG=this.EFUSE_BASE+60,this.EFUSE_RD_REPEAT_DATA3_REG_FLASH_TYPE_MASK=512,this.PURPOSE_VAL_XTS_AES256_KEY_1=2,this.PURPOSE_VAL_XTS_AES256_KEY_2=3,this.PURPOSE_VAL_XTS_AES128_KEY=4,this.UARTDEV_BUF_NO=1073741076,this.UARTDEV_BUF_NO_USB_OTG=2,this.USB_RAM_BLOCK=2048,this.GPIO_STRAP_REG=1061175352,this.GPIO_STRAP_SPI_BOOT_MASK=8,this.GPIO_STRAP_VDDSPI_MASK=16,this.RTC_CNTL_OPTION1_REG=1061191976,this.RTC_CNTL_FORCE_DOWNLOAD_BOOT_MASK=1,this.RTCCNTL_BASE_REG=1061191680,this.RTC_CNTL_WDTCONFIG0_REG=this.RTCCNTL_BASE_REG+148,this.RTC_CNTL_WDTCONFIG1_REG=this.RTCCNTL_BASE_REG+152,this.RTC_CNTL_WDTWPROTECT_REG=this.RTCCNTL_BASE_REG+172,this.RTC_CNTL_WDT_WKEY=1356348065,this.MEMORY_MAP=[[0,65536,"PADDING"],[1056964608,1073217536,"DROM"],[1062207488,1073217536,"EXTRAM_DATA"],[1073340416,1073348608,"RTC_DRAM"],[1073340416,1073741824,"BYTE_ACCESSIBLE"],[1073340416,1074208768,"MEM_INTERNAL"],[1073414144,1073741824,"DRAM"],[1073741824,1073848576,"IROM_MASK"],[1073872896,1074200576,"IRAM"],[1074200576,1074208768,"RTC_IRAM"],[1074266112,1082130432,"IROM"],[1342177280,1342185472,"RTC_DATA"]],this.EFUSE_VDD_SPI_REG=this.EFUSE_BASE+52,this.VDD_SPI_XPD=16,this.VDD_SPI_TIEH=32,this.VDD_SPI_FORCE=64,this.UF2_FAMILY_ID=3218951918,this.EFUSE_MAX_KEY=5,this.KEY_PURPOSES={0:"USER/EMPTY",1:"RESERVED",2:"XTS_AES_256_KEY_1",3:"XTS_AES_256_KEY_2",4:"XTS_AES_128_KEY",5:"HMAC_DOWN_ALL",6:"HMAC_DOWN_JTAG",7:"HMAC_DOWN_DIGITAL_SIGNATURE",8:"HMAC_UP",9:"SECURE_BOOT_DIGEST0",10:"SECURE_BOOT_DIGEST1",11:"SECURE_BOOT_DIGEST2"},this.UART_CLKDIV_MASK=1048575,this.UART_DATE_REG_ADDR=1610612856,this.FLASH_WRITE_SIZE=1024,this.BOOTLOADER_FLASH_OFFSET=4096}async getPkgVersion(e){const t=this.EFUSE_BLOCK1_ADDR+16;return 15&await e.readReg(t)}async getMinorChipVersion(e){return((await e.readReg(this.EFUSE_BLOCK1_ADDR+12)>>20&1)<<3)+(await e.readReg(this.EFUSE_BLOCK1_ADDR+16)>>4&7)}async getMajorChipVersion(e){return await e.readReg(this.EFUSE_BLOCK1_ADDR+12)>>18&3}async getFlashVersion(e){return await e.readReg(this.EFUSE_BLOCK1_ADDR+12)>>21&15}async getChipDescription(e){const t=await this.getFlashCap(e)+100*await this.getPsramCap(e),i=await this.getMajorChipVersion(e),s=await this.getMinorChipVersion(e);return`${{0:"ESP32-S2",1:"ESP32-S2FH2",2:"ESP32-S2FH4",102:"ESP32-S2FNR2",100:"ESP32-S2R2"}[t]||"unknown ESP32-S2"} (revision v${i}.${s})`}async getFlashCap(e){return await this.getFlashVersion(e)}async getPsramVersion(e){const t=this.EFUSE_BLOCK1_ADDR+12;return await e.readReg(t)>>28&15}async getPsramCap(e){return await this.getPsramVersion(e)}async getBlock2Version(e){const t=this.EFUSE_BLOCK2_ADDR+16;return await e.readReg(t)>>4&7}async getChipFeatures(e){const t=["Wi-Fi"],i={0:"No Embedded Flash",1:"Embedded Flash 2MB",2:"Embedded Flash 4MB"}[await this.getFlashCap(e)]||"Unknown Embedded Flash";t.push(i);const s={0:"No Embedded Flash",1:"Embedded PSRAM 2MB",2:"Embedded PSRAM 4MB"}[await this.getPsramCap(e)]||"Unknown Embedded PSRAM";t.push(s);const r={0:"No calibration in BLK2 of efuse",1:"ADC and temperature sensor calibration in BLK2 of efuse V1",2:"ADC and temperature sensor calibration in BLK2 of efuse V2"}[await this.getBlock2Version(e)]||"Unknown Calibration in BLK2";return t.push(r),t}async getCrystalFreq(e){return 40}_d2h(e){const t=(+e).toString(16);return 1===t.length?"0"+t:t}async readMac(e){let t=await e.readReg(this.MAC_EFUSE_REG);t>>>=0;let i=await e.readReg(this.MAC_EFUSE_REG+4);i=i>>>0&65535;const s=new Uint8Array(6);return s[0]=i>>8&255,s[1]=255&i,s[2]=t>>24&255,s[3]=t>>16&255,s[4]=t>>8&255,s[5]=255&t,this._d2h(s[0])+":"+this._d2h(s[1])+":"+this._d2h(s[2])+":"+this._d2h(s[3])+":"+this._d2h(s[4])+":"+this._d2h(s[5])}getEraseSize(e,t){return t}async usingUsbOtg(e){return(255&await e.readReg(this.UARTDEV_BUF_NO))===this.UARTDEV_BUF_NO_USB_OTG}async postConnect(e){const t=await this.usingUsbOtg(e);e.debug("In _post_connect using USB OTG ?"+t),t&&(e.ESP_RAM_BLOCK=this.USB_RAM_BLOCK)}}});var xp=Object.freeze({__proto__:null,ESP32P4ROM:class extends up{constructor(){super(...arguments),this.CHIP_NAME="ESP32-P4",this.IMAGE_CHIP_ID=18,this.IROM_MAP_START=1073741824,this.IROM_MAP_END=1275068416,this.DROM_MAP_START=1073741824,this.DROM_MAP_END=1275068416,this.BOOTLOADER_FLASH_OFFSET=8192,this.CHIP_DETECT_MAGIC_VALUE=[0,182303440],this.UART_DATE_REG_ADDR=1343004812,this.EFUSE_BASE=1343410176,this.EFUSE_BLOCK1_ADDR=this.EFUSE_BASE+68,this.MAC_EFUSE_REG=this.EFUSE_BASE+68,this.SPI_REG_BASE=1342754816,this.SPI_USR_OFFS=24,this.SPI_USR1_OFFS=28,this.SPI_USR2_OFFS=32,this.SPI_MOSI_DLEN_OFFS=36,this.SPI_MISO_DLEN_OFFS=40,this.SPI_W0_OFFS=88,this.SPI_ADDR_REG_MSB=!1,this.USES_MAGIC_VALUE=!1,this.EFUSE_RD_REG_BASE=this.EFUSE_BASE+48,this.EFUSE_FORCE_USE_KEY_MANAGER_KEY_REG=this.EFUSE_BASE+52,this.EFUSE_FORCE_USE_KEY_MANAGER_KEY_SHIFT=9,this.FORCE_USE_KEY_MANAGER_VAL_XTS_AES_KEY=2,this.EFUSE_PURPOSE_KEY0_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY0_SHIFT=24,this.EFUSE_PURPOSE_KEY1_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY1_SHIFT=28,this.EFUSE_PURPOSE_KEY2_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY2_SHIFT=0,this.EFUSE_PURPOSE_KEY3_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY3_SHIFT=4,this.EFUSE_PURPOSE_KEY4_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY4_SHIFT=8,this.EFUSE_PURPOSE_KEY5_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY5_SHIFT=12,this.EFUSE_DIS_DOWNLOAD_MANUAL_ENCRYPT_REG=this.EFUSE_RD_REG_BASE,this.EFUSE_DIS_DOWNLOAD_MANUAL_ENCRYPT=1<<20,this.EFUSE_SPI_BOOT_CRYPT_CNT_REG=this.EFUSE_BASE+52,this.EFUSE_SPI_BOOT_CRYPT_CNT_MASK=7<<18,this.EFUSE_SECURE_BOOT_EN_REG=this.EFUSE_BASE+56,this.EFUSE_SECURE_BOOT_EN_MASK=1<<20,this.PURPOSE_VAL_XTS_AES256_KEY_1=2,this.PURPOSE_VAL_XTS_AES256_KEY_2=3,this.PURPOSE_VAL_XTS_AES128_KEY=4,this.SUPPORTS_ENCRYPTED_FLASH=!0,this.FLASH_ENCRYPTED_WRITE_ALIGN=16,this.USB_RAM_BLOCK=2048,this.GPIO_STRAP_REG=1343094840,this.GPIO_STRAP_SPI_BOOT_MASK=8,this.RTC_CNTL_OPTION1_REG=1343291400,this.RTC_CNTL_FORCE_DOWNLOAD_BOOT_MASK=4,this.DR_REG_LPAON_BASE=1343291392,this.DR_REG_PMU_BASE=this.DR_REG_LPAON_BASE+20480,this.DR_REG_LP_SYS_BASE=this.DR_REG_LPAON_BASE+0,this.LP_SYSTEM_REG_ANA_XPD_PAD_GROUP_REG=this.DR_REG_LP_SYS_BASE+268,this.PMU_EXT_LDO_P0_0P1A_ANA_REG=this.DR_REG_PMU_BASE+444,this.PMU_ANA_0P1A_EN_CUR_LIM_0=1<<27,this.PMU_EXT_LDO_P0_0P1A_REG=this.DR_REG_PMU_BASE+440,this.PMU_0P1A_TARGET0_0=255<<23,this.PMU_0P1A_FORCE_TIEH_SEL_0=128,this.PMU_DATE_REG=this.DR_REG_PMU_BASE+1020,this.UARTDEV_BUF_NO_USB_OTG=5,this.UARTDEV_BUF_NO_USB_JTAG_SERIAL=6,this.DR_REG_LP_WDT_BASE=1343315968,this.RTC_CNTL_WDTCONFIG0_REG=this.DR_REG_LP_WDT_BASE+0,this.RTC_CNTL_WDTCONFIG1_REG=this.DR_REG_LP_WDT_BASE+4,this.RTC_CNTL_WDTWPROTECT_REG=this.DR_REG_LP_WDT_BASE+24,this.RTC_CNTL_WDT_WKEY=1356348065,this.RTC_CNTL_SWD_CONF_REG=this.DR_REG_LP_WDT_BASE+28,this.RTC_CNTL_SWD_AUTO_FEED_EN=1<<18,this.RTC_CNTL_SWD_WPROTECT_REG=this.DR_REG_LP_WDT_BASE+32,this.RTC_CNTL_SWD_WKEY=1356348065,this.MEMORY_MAP=[[0,65536,"PADDING"],[1073741824,1275068416,"DROM"],[1341128704,1341784064,"DRAM"],[1341128704,1341784064,"BYTE_ACCESSIBLE"],[1337982976,1338114048,"DROM_MASK"],[1337982976,1338114048,"IROM_MASK"],[1073741824,1275068416,"IROM"],[1341128704,1341784064,"IRAM"],[1343258624,1343291392,"RTC_IRAM"],[1343258624,1343291392,"RTC_DRAM"],[1611653120,1611661312,"MEM_INTERNAL2"]],this.UF2_FAMILY_ID=1026592404,this.EFUSE_MAX_KEY=5,this.KEY_PURPOSES={0:"USER/EMPTY",1:"ECDSA_KEY",2:"XTS_AES_256_KEY_1",3:"XTS_AES_256_KEY_2",4:"XTS_AES_128_KEY",5:"HMAC_DOWN_ALL",6:"HMAC_DOWN_JTAG",7:"HMAC_DOWN_DIGITAL_SIGNATURE",8:"HMAC_UP",9:"SECURE_BOOT_DIGEST0",10:"SECURE_BOOT_DIGEST1",11:"SECURE_BOOT_DIGEST2",12:"KM_INIT_KEY"}}async getPkgVersion(e){const t=this.EFUSE_BLOCK1_ADDR+8;return await e.readReg(t)>>20&7}async getMinorChipVersion(e){const t=this.EFUSE_BLOCK1_ADDR+8;return 15&await e.readReg(t)}async getMajorChipVersion(e){const t=this.EFUSE_BLOCK1_ADDR+8,i=await e.readReg(t);return(i>>23&1)<<2|i>>4&3}async getChipRevision(e){return 100*await this.getMajorChipVersion(e)+await this.getMinorChipVersion(e)}async getStubJsonPath(e){return await this.getChipRevision(e)<300?"./targets/stub_flasher/stub_flasher_32p4rc1.json":"./targets/stub_flasher/stub_flasher_32p4.json"}async getChipDescription(e){return`${{0:"ESP32-P4"}[await this.getPkgVersion(e)]||"Unknown ESP32-P4"} (revision v${await this.getMajorChipVersion(e)}.${await this.getMinorChipVersion(e)})`}async getChipFeatures(e){return["High-Performance MCU"]}async getCrystalFreq(e){return 40}async getFlashVoltage(e){}async overrideVddsdio(e){e.debug("VDD_SDIO overrides are not supported for ESP32-P4")}async readMac(e){let t=await e.readReg(this.MAC_EFUSE_REG);t>>>=0;let i=await e.readReg(this.MAC_EFUSE_REG+4);i=i>>>0&65535;const s=new Uint8Array(6);return s[0]=i>>8&255,s[1]=255&i,s[2]=t>>24&255,s[3]=t>>16&255,s[4]=t>>8&255,s[5]=255&t,this._d2h(s[0])+":"+this._d2h(s[1])+":"+this._d2h(s[2])+":"+this._d2h(s[3])+":"+this._d2h(s[4])+":"+this._d2h(s[5])}async getFlashCryptConfig(e){}async getSecureBootEnabled(e){return 0!==(await e.readReg(this.EFUSE_SECURE_BOOT_EN_REG)&this.EFUSE_SECURE_BOOT_EN_MASK)}async getUartdevBufNo(e){return(await this.getChipRevision(e)<300?1341390512:1341914800)+24}async usesUsbOtg(e){const t=await this.getUartdevBufNo(e);return(255&await e.readReg(t))===this.UARTDEV_BUF_NO_USB_OTG}async usesUsbJtagSerial(e){const t=await this.getUartdevBufNo(e);return(255&await e.readReg(t))===this.UARTDEV_BUF_NO_USB_JTAG_SERIAL}async getKeyBlockPurpose(e,t){if(t<0||t>this.EFUSE_MAX_KEY)return void e.debug(`Valid key block numbers must be in range 0-${this.EFUSE_MAX_KEY}`);const i=[[this.EFUSE_PURPOSE_KEY0_REG,this.EFUSE_PURPOSE_KEY0_SHIFT],[this.EFUSE_PURPOSE_KEY1_REG,this.EFUSE_PURPOSE_KEY1_SHIFT],[this.EFUSE_PURPOSE_KEY2_REG,this.EFUSE_PURPOSE_KEY2_SHIFT],[this.EFUSE_PURPOSE_KEY3_REG,this.EFUSE_PURPOSE_KEY3_SHIFT],[this.EFUSE_PURPOSE_KEY4_REG,this.EFUSE_PURPOSE_KEY4_SHIFT],[this.EFUSE_PURPOSE_KEY5_REG,this.EFUSE_PURPOSE_KEY5_SHIFT]],[s,r]=i[t];return await e.readReg(s)>>r&15}async isFlashEncryptionKeyValid(e){const t=[];for(let i=0;i<=this.EFUSE_MAX_KEY;i++){const s=await this.getKeyBlockPurpose(e,i);t.push(s)}if(t.some(e=>e===this.PURPOSE_VAL_XTS_AES128_KEY))return!0;if(t.some(e=>e===this.PURPOSE_VAL_XTS_AES256_KEY_1)&&t.some(e=>e===this.PURPOSE_VAL_XTS_AES256_KEY_2))return!0;return 0!==(await e.readReg(this.EFUSE_FORCE_USE_KEY_MANAGER_KEY_REG)>>this.EFUSE_FORCE_USE_KEY_MANAGER_KEY_SHIFT&this.FORCE_USE_KEY_MANAGER_VAL_XTS_AES_KEY)}async postConnect(e){await this.usesUsbOtg(e)&&(e.ESP_RAM_BLOCK=this.USB_RAM_BLOCK),e.IS_STUB||await this.disableWatchdogs(e)}async disableWatchdogs(e){if(await this.usesUsbJtagSerial(e)){await e.writeReg(this.RTC_CNTL_WDTWPROTECT_REG,this.RTC_CNTL_WDT_WKEY),await e.writeReg(this.RTC_CNTL_WDTCONFIG0_REG,0),await e.writeReg(this.RTC_CNTL_WDTWPROTECT_REG,0),await e.writeReg(this.RTC_CNTL_SWD_WPROTECT_REG,this.RTC_CNTL_SWD_WKEY);const t=await e.readReg(this.RTC_CNTL_SWD_CONF_REG);await e.writeReg(this.RTC_CNTL_SWD_CONF_REG,t|this.RTC_CNTL_SWD_AUTO_FEED_EN),await e.writeReg(this.RTC_CNTL_SWD_WPROTECT_REG,0)}}checkSpiConnection(e,t){if(!t.every(e=>e>=0&&e<=54))throw new Error("SPI Pin numbers must be in the range 0-54.");t.some(e=>24===e||25===e)&&e.debug("GPIO pins 24 and 25 are used by USB-Serial/JTAG, consider using other pins for SPI flash connection.")}async watchdogReset(e){e.info("Hard resetting with a watchdog..."),await e.writeReg(this.RTC_CNTL_WDTWPROTECT_REG,this.RTC_CNTL_WDT_WKEY),await e.writeReg(this.RTC_CNTL_WDTCONFIG1_REG,2e3),await e.writeReg(this.RTC_CNTL_WDTCONFIG0_REG,-805306110),await e.writeReg(this.RTC_CNTL_WDTWPROTECT_REG,0),await new Promise(e=>setTimeout(e,500))}async powerOnFlash(e){if(await this.getChipRevision(e)<=300)return;await e.writeReg(this.LP_SYSTEM_REG_ANA_XPD_PAD_GROUP_REG,1),await new Promise(e=>setTimeout(e,10));let t=await e.readReg(this.PMU_EXT_LDO_P0_0P1A_ANA_REG);await e.writeReg(this.PMU_EXT_LDO_P0_0P1A_ANA_REG,t|this.PMU_ANA_0P1A_EN_CUR_LIM_0),t=await e.readReg(this.PMU_EXT_LDO_P0_0P1A_REG),await e.writeReg(this.PMU_EXT_LDO_P0_0P1A_REG,t|this.PMU_0P1A_FORCE_TIEH_SEL_0),t=await e.readReg(this.PMU_DATE_REG),await e.writeReg(this.PMU_DATE_REG,3|t),await new Promise(e=>setTimeout(e,50)),t=await e.readReg(this.PMU_EXT_LDO_P0_0P1A_ANA_REG),await e.writeReg(this.PMU_EXT_LDO_P0_0P1A_ANA_REG,t&~this.PMU_ANA_0P1A_EN_CUR_LIM_0),t=await e.readReg(this.PMU_EXT_LDO_P0_0P1A_REG),await e.writeReg(this.PMU_EXT_LDO_P0_0P1A_REG,t&~this.PMU_0P1A_TARGET0_0),t=await e.readReg(this.PMU_EXT_LDO_P0_0P1A_REG),await e.writeReg(this.PMU_EXT_LDO_P0_0P1A_REG,128|t),t=await e.readReg(this.PMU_EXT_LDO_P0_0P1A_REG),await e.writeReg(this.PMU_EXT_LDO_P0_0P1A_REG,t&~this.PMU_0P1A_FORCE_TIEH_SEL_0),await new Promise(e=>setTimeout(e,1800))}}});export{Ch as EPPGridPanel};
