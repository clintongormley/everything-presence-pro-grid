function e(e,t,i,s){var r,o=arguments.length,n=o<3?t:null===s?s=Object.getOwnPropertyDescriptor(t,i):s;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,i,s);else for(var a=e.length-1;a>=0;a--)(r=e[a])&&(n=(o<3?r(n):o>3?r(t,i,n):r(t,i))||n);return o>3&&n&&Object.defineProperty(t,i,n),n}"function"==typeof SuppressedError&&SuppressedError;
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const t=globalThis,i=t.ShadowRoot&&(void 0===t.ShadyCSS||t.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,s=Symbol(),r=new WeakMap;let o=class{constructor(e,t,i){if(this._$cssResult$=!0,i!==s)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o;const t=this.t;if(i&&void 0===e){const i=void 0!==t&&1===t.length;i&&(e=r.get(t)),void 0===e&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),i&&r.set(t,e))}return e}toString(){return this.cssText}};const n=(e,...t)=>{const i=1===e.length?e[0]:t.reduce((t,i,s)=>t+(e=>{if(!0===e._$cssResult$)return e.cssText;if("number"==typeof e)return e;throw Error("Value passed to 'css' function must be a 'css' function result: "+e+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+e[s+1],e[0]);return new o(i,e,s)},a=i?e=>e:e=>e instanceof CSSStyleSheet?(e=>{let t="";for(const i of e.cssRules)t+=i.cssText;return(e=>new o("string"==typeof e?e:e+"",void 0,s))(t)})(e):e,{is:l,defineProperty:c,getOwnPropertyDescriptor:h,getOwnPropertyNames:d,getOwnPropertySymbols:A,getPrototypeOf:g}=Object,u=globalThis,_=u.trustedTypes,p=_?_.emptyScript:"",f=u.reactiveElementPolyfillSupport,w=(e,t)=>e,E={toAttribute(e,t){switch(t){case Boolean:e=e?p:null;break;case Object:case Array:e=null==e?e:JSON.stringify(e)}return e},fromAttribute(e,t){let i=e;switch(t){case Boolean:i=null!==e;break;case Number:i=null===e?null:Number(e);break;case Object:case Array:try{i=JSON.parse(e)}catch(e){i=null}}return i}},m=(e,t)=>!l(e,t),b={attribute:!0,type:String,converter:E,reflect:!1,useDefault:!1,hasChanged:m};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */Symbol.metadata??=Symbol("metadata"),u.litPropertyMetadata??=new WeakMap;let y=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=b){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){const i=Symbol(),s=this.getPropertyDescriptor(e,i,t);void 0!==s&&c(this.prototype,e,s)}}static getPropertyDescriptor(e,t,i){const{get:s,set:r}=h(this.prototype,e)??{get(){return this[t]},set(e){this[t]=e}};return{get:s,set(t){const o=s?.call(this);r?.call(this,t),this.requestUpdate(e,o,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??b}static _$Ei(){if(this.hasOwnProperty(w("elementProperties")))return;const e=g(this);e.finalize(),void 0!==e.l&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(w("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(w("properties"))){const e=this.properties,t=[...d(e),...A(e)];for(const i of t)this.createProperty(i,e[i])}const e=this[Symbol.metadata];if(null!==e){const t=litPropertyMetadata.get(e);if(void 0!==t)for(const[e,i]of t)this.elementProperties.set(e,i)}this._$Eh=new Map;for(const[e,t]of this.elementProperties){const i=this._$Eu(e,t);void 0!==i&&this._$Eh.set(i,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){const t=[];if(Array.isArray(e)){const i=new Set(e.flat(1/0).reverse());for(const e of i)t.unshift(a(e))}else void 0!==e&&t.push(a(e));return t}static _$Eu(e,t){const i=t.attribute;return!1===i?void 0:"string"==typeof i?i:"string"==typeof e?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),void 0!==this.renderRoot&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){const e=new Map,t=this.constructor.elementProperties;for(const i of t.keys())this.hasOwnProperty(i)&&(e.set(i,this[i]),delete this[i]);e.size>0&&(this._$Ep=e)}createRenderRoot(){const e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((e,s)=>{if(i)e.adoptedStyleSheets=s.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(const i of s){const s=document.createElement("style"),r=t.litNonce;void 0!==r&&s.setAttribute("nonce",r),s.textContent=i.cssText,e.appendChild(s)}})(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,i){this._$AK(e,i)}_$ET(e,t){const i=this.constructor.elementProperties.get(e),s=this.constructor._$Eu(e,i);if(void 0!==s&&!0===i.reflect){const r=(void 0!==i.converter?.toAttribute?i.converter:E).toAttribute(t,i.type);this._$Em=e,null==r?this.removeAttribute(s):this.setAttribute(s,r),this._$Em=null}}_$AK(e,t){const i=this.constructor,s=i._$Eh.get(e);if(void 0!==s&&this._$Em!==s){const e=i.getPropertyOptions(s),r="function"==typeof e.converter?{fromAttribute:e.converter}:void 0!==e.converter?.fromAttribute?e.converter:E;this._$Em=s;const o=r.fromAttribute(t,e.type);this[s]=o??this._$Ej?.get(s)??o,this._$Em=null}}requestUpdate(e,t,i,s=!1,r){if(void 0!==e){const o=this.constructor;if(!1===s&&(r=this[e]),i??=o.getPropertyOptions(e),!((i.hasChanged??m)(r,t)||i.useDefault&&i.reflect&&r===this._$Ej?.get(e)&&!this.hasAttribute(o._$Eu(e,i))))return;this.C(e,t,i)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(e,t,{useDefault:i,reflect:s,wrapped:r},o){i&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,o??t??this[e]),!0!==r||void 0!==o)||(this._$AL.has(e)||(this.hasUpdated||i||(t=void 0),this._$AL.set(e,t)),!0===s&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}const e=this.scheduleUpdate();return null!=e&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[e,t]of this._$Ep)this[e]=t;this._$Ep=void 0}const e=this.constructor.elementProperties;if(e.size>0)for(const[t,i]of e){const{wrapped:e}=i,s=this[t];!0!==e||this._$AL.has(t)||void 0===s||this.C(t,void 0,i,s)}}let e=!1;const t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(e=>e.hostUpdate?.()),this.update(t)):this._$EM()}catch(t){throw e=!1,this._$EM(),t}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(e){}firstUpdated(e){}};y.elementStyles=[],y.shadowRootOptions={mode:"open"},y[w("elementProperties")]=new Map,y[w("finalized")]=new Map,f?.({ReactiveElement:y}),(u.reactiveElementVersions??=[]).push("2.1.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const C=globalThis,v=e=>e,B=C.trustedTypes,S=B?B.createPolicy("lit-html",{createHTML:e=>e}):void 0,I="$lit$",D=`lit$${Math.random().toFixed(9).slice(2)}$`,x="?"+D,R=`<${x}>`,M=document,k=()=>M.createComment(""),T=e=>null===e||"object"!=typeof e&&"function"!=typeof e,F=Array.isArray,P="[ \t\n\f\r]",U=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,O=/-->/g,Q=/>/g,z=RegExp(`>|${P}(?:([^\\s"'>=/]+)(${P}*=${P}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),H=/'/g,G=/"/g,L=/^(?:script|style|textarea|title)$/i,N=e=>(t,...i)=>({_$litType$:e,strings:t,values:i}),Y=N(1),$=N(2),K=Symbol.for("lit-noChange"),J=Symbol.for("lit-nothing"),W=new WeakMap,j=M.createTreeWalker(M,129);function V(e,t){if(!F(e)||!e.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==S?S.createHTML(t):t}const Z=(e,t)=>{const i=e.length-1,s=[];let r,o=2===t?"<svg>":3===t?"<math>":"",n=U;for(let t=0;t<i;t++){const i=e[t];let a,l,c=-1,h=0;for(;h<i.length&&(n.lastIndex=h,l=n.exec(i),null!==l);)h=n.lastIndex,n===U?"!--"===l[1]?n=O:void 0!==l[1]?n=Q:void 0!==l[2]?(L.test(l[2])&&(r=RegExp("</"+l[2],"g")),n=z):void 0!==l[3]&&(n=z):n===z?">"===l[0]?(n=r??U,c=-1):void 0===l[1]?c=-2:(c=n.lastIndex-l[2].length,a=l[1],n=void 0===l[3]?z:'"'===l[3]?G:H):n===G||n===H?n=z:n===O||n===Q?n=U:(n=z,r=void 0);const d=n===z&&e[t+1].startsWith("/>")?" ":"";o+=n===U?i+R:c>=0?(s.push(a),i.slice(0,c)+I+i.slice(c)+D+d):i+D+(-2===c?t:d)}return[V(e,o+(e[i]||"<?>")+(2===t?"</svg>":3===t?"</math>":"")),s]};class X{constructor({strings:e,_$litType$:t},i){let s;this.parts=[];let r=0,o=0;const n=e.length-1,a=this.parts,[l,c]=Z(e,t);if(this.el=X.createElement(l,i),j.currentNode=this.el.content,2===t||3===t){const e=this.el.content.firstChild;e.replaceWith(...e.childNodes)}for(;null!==(s=j.nextNode())&&a.length<n;){if(1===s.nodeType){if(s.hasAttributes())for(const e of s.getAttributeNames())if(e.endsWith(I)){const t=c[o++],i=s.getAttribute(e).split(D),n=/([.?@])?(.*)/.exec(t);a.push({type:1,index:r,name:n[2],strings:i,ctor:"."===n[1]?se:"?"===n[1]?re:"@"===n[1]?oe:ie}),s.removeAttribute(e)}else e.startsWith(D)&&(a.push({type:6,index:r}),s.removeAttribute(e));if(L.test(s.tagName)){const e=s.textContent.split(D),t=e.length-1;if(t>0){s.textContent=B?B.emptyScript:"";for(let i=0;i<t;i++)s.append(e[i],k()),j.nextNode(),a.push({type:2,index:++r});s.append(e[t],k())}}}else if(8===s.nodeType)if(s.data===x)a.push({type:2,index:r});else{let e=-1;for(;-1!==(e=s.data.indexOf(D,e+1));)a.push({type:7,index:r}),e+=D.length-1}r++}}static createElement(e,t){const i=M.createElement("template");return i.innerHTML=e,i}}function q(e,t,i=e,s){if(t===K)return t;let r=void 0!==s?i._$Co?.[s]:i._$Cl;const o=T(t)?void 0:t._$litDirective$;return r?.constructor!==o&&(r?._$AO?.(!1),void 0===o?r=void 0:(r=new o(e),r._$AT(e,i,s)),void 0!==s?(i._$Co??=[])[s]=r:i._$Cl=r),void 0!==r&&(t=q(e,r._$AS(e,t.values),r,s)),t}class ee{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){const{el:{content:t},parts:i}=this._$AD,s=(e?.creationScope??M).importNode(t,!0);j.currentNode=s;let r=j.nextNode(),o=0,n=0,a=i[0];for(;void 0!==a;){if(o===a.index){let t;2===a.type?t=new te(r,r.nextSibling,this,e):1===a.type?t=new a.ctor(r,a.name,a.strings,this,e):6===a.type&&(t=new ne(r,this,e)),this._$AV.push(t),a=i[++n]}o!==a?.index&&(r=j.nextNode(),o++)}return j.currentNode=M,s}p(e){let t=0;for(const i of this._$AV)void 0!==i&&(void 0!==i.strings?(i._$AI(e,i,t),t+=i.strings.length-2):i._$AI(e[t])),t++}}class te{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,i,s){this.type=2,this._$AH=J,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=i,this.options=s,this._$Cv=s?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode;const t=this._$AM;return void 0!==t&&11===e?.nodeType&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=q(this,e,t),T(e)?e===J||null==e||""===e?(this._$AH!==J&&this._$AR(),this._$AH=J):e!==this._$AH&&e!==K&&this._(e):void 0!==e._$litType$?this.$(e):void 0!==e.nodeType?this.T(e):(e=>F(e)||"function"==typeof e?.[Symbol.iterator])(e)?this.k(e):this._(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==J&&T(this._$AH)?this._$AA.nextSibling.data=e:this.T(M.createTextNode(e)),this._$AH=e}$(e){const{values:t,_$litType$:i}=e,s="number"==typeof i?this._$AC(e):(void 0===i.el&&(i.el=X.createElement(V(i.h,i.h[0]),this.options)),i);if(this._$AH?._$AD===s)this._$AH.p(t);else{const e=new ee(s,this),i=e.u(this.options);e.p(t),this.T(i),this._$AH=e}}_$AC(e){let t=W.get(e.strings);return void 0===t&&W.set(e.strings,t=new X(e)),t}k(e){F(this._$AH)||(this._$AH=[],this._$AR());const t=this._$AH;let i,s=0;for(const r of e)s===t.length?t.push(i=new te(this.O(k()),this.O(k()),this,this.options)):i=t[s],i._$AI(r),s++;s<t.length&&(this._$AR(i&&i._$AB.nextSibling,s),t.length=s)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){const t=v(e).nextSibling;v(e).remove(),e=t}}setConnected(e){void 0===this._$AM&&(this._$Cv=e,this._$AP?.(e))}}class ie{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,i,s,r){this.type=1,this._$AH=J,this._$AN=void 0,this.element=e,this.name=t,this._$AM=s,this.options=r,i.length>2||""!==i[0]||""!==i[1]?(this._$AH=Array(i.length-1).fill(new String),this.strings=i):this._$AH=J}_$AI(e,t=this,i,s){const r=this.strings;let o=!1;if(void 0===r)e=q(this,e,t,0),o=!T(e)||e!==this._$AH&&e!==K,o&&(this._$AH=e);else{const s=e;let n,a;for(e=r[0],n=0;n<r.length-1;n++)a=q(this,s[i+n],t,n),a===K&&(a=this._$AH[n]),o||=!T(a)||a!==this._$AH[n],a===J?e=J:e!==J&&(e+=(a??"")+r[n+1]),this._$AH[n]=a}o&&!s&&this.j(e)}j(e){e===J?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??"")}}class se extends ie{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===J?void 0:e}}class re extends ie{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==J)}}class oe extends ie{constructor(e,t,i,s,r){super(e,t,i,s,r),this.type=5}_$AI(e,t=this){if((e=q(this,e,t,0)??J)===K)return;const i=this._$AH,s=e===J&&i!==J||e.capture!==i.capture||e.once!==i.once||e.passive!==i.passive,r=e!==J&&(i===J||s);s&&this.element.removeEventListener(this.name,this,i),r&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}}class ne{constructor(e,t,i){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=i}get _$AU(){return this._$AM._$AU}_$AI(e){q(this,e)}}const ae=C.litHtmlPolyfillSupport;ae?.(X,te),(C.litHtmlVersions??=[]).push("3.3.2");const le=globalThis;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let ce=class extends y{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){const t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=((e,t,i)=>{const s=i?.renderBefore??t;let r=s._$litPart$;if(void 0===r){const e=i?.renderBefore??null;s._$litPart$=r=new te(t.insertBefore(k(),e),e,void 0,i??{})}return r._$AI(e),r})(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return K}};ce._$litElement$=!0,ce.finalized=!0,le.litElementHydrateSupport?.({LitElement:ce});const he=le.litElementPolyfillSupport;he?.({LitElement:ce}),(le.litElementVersions??=[]).push("4.2.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const de={attribute:!0,type:String,converter:E,reflect:!1,hasChanged:m},Ae=(e=de,t,i)=>{const{kind:s,metadata:r}=i;let o=globalThis.litPropertyMetadata.get(r);if(void 0===o&&globalThis.litPropertyMetadata.set(r,o=new Map),"setter"===s&&((e=Object.create(e)).wrapped=!0),o.set(i.name,e),"accessor"===s){const{name:s}=i;return{set(i){const r=t.get.call(this);t.set.call(this,i),this.requestUpdate(s,r,e,!0,i)},init(t){return void 0!==t&&this.C(s,void 0,e,t),t}}}if("setter"===s){const{name:s}=i;return function(i){const r=this[s];t.call(this,i),this.requestUpdate(s,r,e,!0,i)}}throw Error("Unsupported decorator location: "+s)};function ge(e){return(t,i)=>"object"==typeof i?Ae(e,t,i):((e,t,i)=>{const s=t.hasOwnProperty(i);return t.constructor.createProperty(i,e),s?Object.getOwnPropertyDescriptor(t,i):void 0})(e,t,i)}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function ue(e){return ge({...e,state:!0,attribute:!1})}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const _e=2,pe=e=>(...t)=>({_$litDirective$:e,values:t});let fe=class{constructor(e){}get _$AU(){return this._$AM._$AU}_$AT(e,t,i){this._$Ct=e,this._$AM=t,this._$Ci=i}_$AS(e,t){return this.update(e,t)}update(e,t){return this.render(...t)}};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class we extends fe{constructor(e){if(super(e),this.it=J,e.type!==_e)throw Error(this.constructor.directiveName+"() can only be used in child bindings")}render(e){if(e===J||null==e)return this._t=void 0,this.it=e;if(e===K)return e;if("string"!=typeof e)throw Error(this.constructor.directiveName+"() called with a non-string value");if(e===this.it)return this._t;this.it=e;const t=[e];return t.raw=t,this._t={_$litType$:this.constructor.resultType,strings:t,values:[]}}}we.directiveName="unsafeHTML",we.resultType=1;const Ee=pe(we);
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class me extends we{}me.directiveName="unsafeSVG",me.resultType=2;const be=pe(me),ye=1,Ce=2,ve=3,Be=20,Se=20,Ie=400,De=300,xe=6e3,Re=e=>!!(1&e),Me=e=>e>>1&7,ke=(e,t)=>-15&e|(7&t)<<1,Te=e=>e>>4&3,Fe=(e,t)=>-49&e|(3&t)<<4,Pe={entry:1,interference:2,suppress:3};function Ue(e){let t=Be,i=0,s=Se,r=0;for(let o=0;o<Ie;o++)if(Re(e[o])){const e=o%Be,n=Math.floor(o/Be);e<t&&(t=e),e>i&&(i=e),n<s&&(s=n),n>r&&(r=n)}return{minCol:t,maxCol:i,minRow:s,maxRow:r}}function Oe(e){const{minCol:t,maxCol:i,minRow:s,maxRow:r}=Ue(e);return{minCol:Math.max(0,t-1),maxCol:Math.min(19,i+1),minRow:Math.max(0,s-1),maxRow:Math.min(19,r+1)}}function Qe(e){for(let t=0;t<Ie;t++)if(Re(e[t]))return!0;return!1}function ze(e,t,i,s){const r=i??Qe(e),o=s??Qe(t);if(!r||!o)return{dr:0,dc:0};const n=Ue(e),a=Ue(t);return{dr:a.minRow-n.minRow,dc:a.minCol-n.minCol}}function He(e){const t=Math.ceil(e/De);return Math.floor((Be-t)/2)}function Ge(e,t,i){return{x:(e-He(i)+.5)*De,y:(t+.5)*De}}function Le(e,t){const i=new Uint8Array(Ie),s=Math.ceil(e/De),r=Math.ceil(t/De),o=He(e);for(let e=0;e<Se;e++)for(let t=0;t<Be;t++){t>=o&&t<o+s&&e>=0&&e<0+r&&(i[e*Be+t]=1)}return i}const Ne={armchair:{viewBox:"4 4 92 82",content:'<path d="M 15,10 Q 15,5 20,5 L 80,5 Q 85,5 85,10 L 85,25 L 15,25 Z" stroke="black" stroke-width="2" fill="none"/><path d="M 10,15 Q 5,15 5,20 L 5,80 Q 5,85 10,85 L 20,85 L 20,15 Z" stroke="black" stroke-width="2" fill="none"/><path d="M 80,15 L 80,85 L 90,85 Q 95,85 95,80 L 95,20 Q 95,15 90,15 Z" stroke="black" stroke-width="2" fill="none"/><rect x="20" y="25" width="60" height="60" rx="3" ry="3" stroke="black" stroke-width="2" fill="none"/>'},car:{viewBox:"-1 4 82 152",content:'<rect x="8" y="5" width="64" height="150" rx="20" ry="20" stroke="black" stroke-width="2" fill="none"/><path d="M 14,35 L 14,50 Q 14,55 20,55 L 60,55 Q 66,55 66,50 L 66,35" stroke="black" stroke-width="1.5" fill="none"/><path d="M 14,125 L 14,115 Q 14,110 20,110 L 60,110 Q 66,110 66,115 L 66,125" stroke="black" stroke-width="1.5" fill="none"/><rect x="14" y="55" width="52" height="55" rx="3" ry="3" stroke="black" stroke-width="1.5" fill="none"/><ellipse cx="4" cy="48" rx="4" ry="3" stroke="black" stroke-width="2" fill="none"/><ellipse cx="76" cy="48" rx="4" ry="3" stroke="black" stroke-width="2" fill="none"/><rect x="2" y="25" width="6" height="16" rx="2" ry="2" fill="black"/><rect x="72" y="25" width="6" height="16" rx="2" ry="2" fill="black"/><rect x="2" y="118" width="6" height="16" rx="2" ry="2" fill="black"/><rect x="72" y="118" width="6" height="16" rx="2" ry="2" fill="black"/><circle cx="22" cy="12" r="4" stroke="black" stroke-width="2" fill="none"/><circle cx="58" cy="12" r="4" stroke="black" stroke-width="2" fill="none"/>'},carpet:{viewBox:"4 0.25 132 89.5",content:'<rect x="5" y="5" width="130" height="80" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/><rect x="15" y="15" width="110" height="60" rx="1" ry="1" stroke="black" stroke-width="1" fill="none"/><line x1="15" y1="5" x2="15" y2="1" stroke="black" stroke-width="1.5"/><line x1="25" y1="5" x2="25" y2="1" stroke="black" stroke-width="1.5"/><line x1="35" y1="5" x2="35" y2="1" stroke="black" stroke-width="1.5"/><line x1="45" y1="5" x2="45" y2="1" stroke="black" stroke-width="1.5"/><line x1="55" y1="5" x2="55" y2="1" stroke="black" stroke-width="1.5"/><line x1="65" y1="5" x2="65" y2="1" stroke="black" stroke-width="1.5"/><line x1="75" y1="5" x2="75" y2="1" stroke="black" stroke-width="1.5"/><line x1="85" y1="5" x2="85" y2="1" stroke="black" stroke-width="1.5"/><line x1="95" y1="5" x2="95" y2="1" stroke="black" stroke-width="1.5"/><line x1="105" y1="5" x2="105" y2="1" stroke="black" stroke-width="1.5"/><line x1="115" y1="5" x2="115" y2="1" stroke="black" stroke-width="1.5"/><line x1="125" y1="5" x2="125" y2="1" stroke="black" stroke-width="1.5"/><line x1="15" y1="85" x2="15" y2="89" stroke="black" stroke-width="1.5"/><line x1="25" y1="85" x2="25" y2="89" stroke="black" stroke-width="1.5"/><line x1="35" y1="85" x2="35" y2="89" stroke="black" stroke-width="1.5"/><line x1="45" y1="85" x2="45" y2="89" stroke="black" stroke-width="1.5"/><line x1="55" y1="85" x2="55" y2="89" stroke="black" stroke-width="1.5"/><line x1="65" y1="85" x2="65" y2="89" stroke="black" stroke-width="1.5"/><line x1="75" y1="85" x2="75" y2="89" stroke="black" stroke-width="1.5"/><line x1="85" y1="85" x2="85" y2="89" stroke="black" stroke-width="1.5"/><line x1="95" y1="85" x2="95" y2="89" stroke="black" stroke-width="1.5"/><line x1="105" y1="85" x2="105" y2="89" stroke="black" stroke-width="1.5"/><line x1="115" y1="85" x2="115" y2="89" stroke="black" stroke-width="1.5"/><line x1="125" y1="85" x2="125" y2="89" stroke="black" stroke-width="1.5"/>'},"cat-bed":{viewBox:"4 4 62 62",content:'<circle cx="35" cy="35" r="30" stroke="black" stroke-width="2" fill="none"/><circle cx="35" cy="35" r="20" stroke="black" stroke-width="2" fill="none"/><path d="M 38,30 Q 45,28 44,35 Q 43,42 35,41 Q 28,40 30,34" stroke="black" stroke-width="1.5" fill="none"/><path d="M 36,28 L 38,23 L 41,27" stroke="black" stroke-width="1.5" fill="none"/>'},"ceiling-fan":{viewBox:"6.8107 5.5095 86.3786 83.5837",content:'<g transform="translate(50,50)"><path d="M -4,-10 L 4,-10 L 7,-42 Q 0,-45 -7,-42 Z" stroke="black" stroke-width="2" fill="none"/><path d="M -4,-10 L 4,-10 L 7,-42 Q 0,-45 -7,-42 Z" transform="rotate(72)" stroke="black" stroke-width="2" fill="none"/><path d="M -4,-10 L 4,-10 L 7,-42 Q 0,-45 -7,-42 Z" transform="rotate(144)" stroke="black" stroke-width="2" fill="none"/><path d="M -4,-10 L 4,-10 L 7,-42 Q 0,-45 -7,-42 Z" transform="rotate(216)" stroke="black" stroke-width="2" fill="none"/><path d="M -4,-10 L 4,-10 L 7,-42 Q 0,-45 -7,-42 Z" transform="rotate(288)" stroke="black" stroke-width="2" fill="none"/></g><circle cx="50" cy="50" r="10" stroke="black" stroke-width="2" fill="none"/><circle cx="50" cy="50" r="4" stroke="black" stroke-width="2" fill="none"/><circle cx="50" cy="50" r="1.5" fill="black" stroke="none"/>'},"dog-bed":{viewBox:"4 4 92 72",content:'<ellipse cx="50" cy="40" rx="45" ry="35" stroke="black" stroke-width="2" fill="none"/><ellipse cx="50" cy="40" rx="32" ry="22" stroke="black" stroke-width="2" fill="none"/><circle cx="46" cy="36" r="4" stroke="black" stroke-width="1.5" fill="none"/><circle cx="40" cy="29" r="2" stroke="black" stroke-width="1" fill="none"/><circle cx="47" cy="27" r="2" stroke="black" stroke-width="1" fill="none"/><circle cx="53" cy="29" r="2" stroke="black" stroke-width="1" fill="none"/>'},bath:{viewBox:"4 4 192 82",content:'<rect x="5" y="5" width="190" height="80" rx="20" ry="20" stroke="black" stroke-width="2" fill="none"/><rect x="15" y="15" width="170" height="60" rx="14" ry="14" stroke="black" stroke-width="2" fill="none"/><circle cx="32" cy="38" r="5" stroke="black" stroke-width="2" fill="none"/><circle cx="32" cy="52" r="5" stroke="black" stroke-width="2" fill="none"/><rect x="28" y="40" width="8" height="10" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/><circle cx="170" cy="45" r="4" stroke="black" stroke-width="2" fill="none"/><circle cx="170" cy="45" r="1.5" fill="black" stroke="none"/>'},"bed-double":{viewBox:"4 4 142 192",content:'<rect x="5" y="5" width="140" height="190" rx="3" ry="3" stroke="black" stroke-width="2" fill="none"/><rect x="5" y="5" width="140" height="20" rx="3" ry="3" stroke="black" stroke-width="2" fill="none"/><rect x="12" y="30" width="58" height="28" rx="6" ry="6" stroke="black" stroke-width="2" fill="none"/><rect x="80" y="30" width="58" height="28" rx="6" ry="6" stroke="black" stroke-width="2" fill="none"/><line x1="15" y1="70" x2="135" y2="70" stroke="black" stroke-width="2"/>'},"bed-single":{viewBox:"4 4 82 192",content:'<rect x="5" y="5" width="80" height="190" rx="3" ry="3" stroke="black" stroke-width="2" fill="none"/><rect x="5" y="5" width="80" height="20" rx="3" ry="3" stroke="black" stroke-width="2" fill="none"/><rect x="12" y="30" width="66" height="28" rx="6" ry="6" stroke="black" stroke-width="2" fill="none"/><line x1="15" y1="70" x2="75" y2="70" stroke="black" stroke-width="2"/>'},"door-left":{viewBox:"-2.5 9.75 105 89.75",content:'<line x1="0" y1="97" x2="7" y2="97" stroke="black" stroke-width="5"/><line x1="93" y1="97" x2="100" y2="97" stroke="black" stroke-width="5"/><line x1="7" y1="97" x2="7" y2="11" stroke="black" stroke-width="2.5"/><path d="M 7,11 A 86,86 0 0,1 93,97" stroke="black" stroke-width="1.5" fill="none" stroke-dasharray="4 3"/>'},"door-right":{viewBox:"-2.5 9.75 105 89.75",content:'<line x1="0" y1="97" x2="7" y2="97" stroke="black" stroke-width="5"/><line x1="93" y1="97" x2="100" y2="97" stroke="black" stroke-width="5"/><line x1="93" y1="97" x2="93" y2="11" stroke="black" stroke-width="2.5"/><path d="M 93,11 A 86,86 0 0,0 7,97" stroke="black" stroke-width="1.5" fill="none" stroke-dasharray="4 3"/>'},"hot-tub":{viewBox:"7 7 86 86",content:'<circle cx="50" cy="50" r="42" stroke="black" stroke-width="2" fill="none"/><circle cx="50" cy="50" r="35" stroke="black" stroke-width="2" fill="none"/><path d="M 30,40 Q 33,36 36,40 Q 39,44 42,40" stroke="black" stroke-width="1.5" fill="none"/><path d="M 50,35 Q 53,31 56,35 Q 59,39 62,35" stroke="black" stroke-width="1.5" fill="none"/><path d="M 38,55 Q 41,51 44,55 Q 47,59 50,55" stroke="black" stroke-width="1.5" fill="none"/><path d="M 56,50 Q 59,46 62,50 Q 65,54 68,50" stroke="black" stroke-width="1.5" fill="none"/><circle cx="50" cy="15" r="2" fill="black" stroke="none"/><circle cx="50" cy="85" r="2" fill="black" stroke="none"/><circle cx="15" cy="50" r="2" fill="black" stroke="none"/><circle cx="85" cy="50" r="2" fill="black" stroke="none"/>'},"floor-lamp":{viewBox:"7 1 34 56",content:'<path d="M 8,56 Q 18,52 28,56" stroke="black" stroke-width="2" fill="none"/><line x1="18" y1="54" x2="18" y2="12" stroke="black" stroke-width="2"/><path d="M 18,12 Q 18,6 24,6 L 30,6" stroke="black" stroke-width="2" fill="none"/><rect x="24" y="2" width="16" height="14" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/>'},oven:{viewBox:"4 4 92 92",content:'<rect x="5" y="5" width="90" height="90" rx="3" ry="3" stroke="black" stroke-width="2" fill="none"/><circle cx="30" cy="30" r="14" stroke="black" stroke-width="2" fill="none"/><circle cx="30" cy="30" r="7" stroke="black" stroke-width="2" fill="none"/><circle cx="70" cy="30" r="14" stroke="black" stroke-width="2" fill="none"/><circle cx="70" cy="30" r="7" stroke="black" stroke-width="2" fill="none"/><circle cx="30" cy="70" r="14" stroke="black" stroke-width="2" fill="none"/><circle cx="30" cy="70" r="7" stroke="black" stroke-width="2" fill="none"/><circle cx="70" cy="70" r="14" stroke="black" stroke-width="2" fill="none"/><circle cx="70" cy="70" r="7" stroke="black" stroke-width="2" fill="none"/>'},plant:{viewBox:"4.25 4.25 51.5 51.5",content:'<circle cx="30" cy="30" r="25" stroke="black" stroke-width="1.5" fill="none"/><g transform="translate(30,30)"><path d="M 0,0 C -5,-10 -3,-18 0,-20 C 3,-18 5,-10 0,0 Z" stroke="black" stroke-width="1.5" fill="none"/><path d="M 0,0 C -5,-10 -3,-18 0,-20 C 3,-18 5,-10 0,0 Z" transform="rotate(72)" stroke="black" stroke-width="1.5" fill="none"/><path d="M 0,0 C -5,-10 -3,-18 0,-20 C 3,-18 5,-10 0,0 Z" transform="rotate(144)" stroke="black" stroke-width="1.5" fill="none"/><path d="M 0,0 C -5,-10 -3,-18 0,-20 C 3,-18 5,-10 0,0 Z" transform="rotate(216)" stroke="black" stroke-width="1.5" fill="none"/><path d="M 0,0 C -5,-10 -3,-18 0,-20 C 3,-18 5,-10 0,0 Z" transform="rotate(288)" stroke="black" stroke-width="1.5" fill="none"/></g>'},pool:{viewBox:"4 4 172 92",content:'<rect x="5" y="5" width="170" height="90" rx="20" ry="20" stroke="black" stroke-width="2" fill="none"/><rect x="12" y="12" width="156" height="76" rx="16" ry="16" stroke="black" stroke-width="2" fill="none"/><line x1="25" y1="30" x2="155" y2="30" stroke="black" stroke-width="1" stroke-dasharray="4 3"/><line x1="25" y1="50" x2="155" y2="50" stroke="black" stroke-width="1" stroke-dasharray="4 3"/><line x1="25" y1="70" x2="155" y2="70" stroke="black" stroke-width="1" stroke-dasharray="4 3"/><path d="M 20,12 L 20,25 L 35,25 L 35,18 L 28,18 L 28,12" stroke="black" stroke-width="1.5" fill="none"/>'},shower:{viewBox:"4 4 92 92",content:'<rect x="5" y="5" width="90" height="90" rx="5" ry="5" stroke="black" stroke-width="2" fill="none"/><circle cx="22" cy="22" r="9" stroke="black" stroke-width="2" fill="none"/><circle cx="22" cy="22" r="4" stroke="black" stroke-width="2" fill="none"/><circle cx="50" cy="50" r="5" stroke="black" stroke-width="2" fill="none"/><circle cx="50" cy="50" r="2" fill="black" stroke="none"/>'},"sofa-two-seater":{viewBox:"4 4 152 82",content:'<path d="M 15,10 Q 15,5 20,5 L 140,5 Q 145,5 145,10 L 145,25 L 15,25 Z" stroke="black" stroke-width="2" fill="none"/><path d="M 10,15 Q 5,15 5,20 L 5,80 Q 5,85 10,85 L 20,85 L 20,15 Z" stroke="black" stroke-width="2" fill="none"/><path d="M 140,15 L 140,85 L 150,85 Q 155,85 155,80 L 155,20 Q 155,15 150,15 Z" stroke="black" stroke-width="2" fill="none"/><rect x="20" y="25" width="120" height="60" rx="3" ry="3" stroke="black" stroke-width="2" fill="none"/><line x1="80" y1="28" x2="80" y2="82" stroke="black" stroke-width="2"/>'},"sofa-three-seater":{viewBox:"4 4 212 82",content:'<path d="M 15,10 Q 15,5 20,5 L 200,5 Q 205,5 205,10 L 205,25 L 15,25 Z" stroke="black" stroke-width="2" fill="none"/><path d="M 10,15 Q 5,15 5,20 L 5,80 Q 5,85 10,85 L 20,85 L 20,15 Z" stroke="black" stroke-width="2" fill="none"/><path d="M 200,15 L 200,85 L 210,85 Q 215,85 215,80 L 215,20 Q 215,15 210,15 Z" stroke="black" stroke-width="2" fill="none"/><rect x="20" y="25" width="180" height="60" rx="3" ry="3" stroke="black" stroke-width="2" fill="none"/><line x1="80" y1="28" x2="80" y2="82" stroke="black" stroke-width="2"/><line x1="140" y1="28" x2="140" y2="82" stroke="black" stroke-width="2"/>'},"table-dining-room":{viewBox:"7 4 166 112",content:'<rect x="35" y="28" width="110" height="64" rx="3" ry="3" stroke="black" stroke-width="2" fill="none"/><rect x="52" y="5" width="30" height="16" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/><rect x="98" y="5" width="30" height="16" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/><rect x="52" y="99" width="30" height="16" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/><rect x="98" y="99" width="30" height="16" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/><rect x="8" y="45" width="16" height="30" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/><rect x="156" y="45" width="16" height="30" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/>'},"table-dining-room-round":{viewBox:"7 7 106 106",content:'<circle cx="60" cy="60" r="30" stroke="black" stroke-width="2" fill="none"/><rect x="42" y="8" width="36" height="14" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/><rect x="42" y="98" width="36" height="14" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/><rect x="8" y="42" width="14" height="36" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/><rect x="98" y="42" width="14" height="36" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/>'},television:{viewBox:"4 1 152 17",content:'<rect x="5" y="2" width="150" height="8" rx="1" ry="1" stroke="black" stroke-width="2" fill="none"/><rect x="60" y="10" width="40" height="7" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/>'},"bedside-table":{viewBox:"4 4 42 42",content:'<rect x="5" y="5" width="40" height="40" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/><line x1="5" y1="25" x2="45" y2="25" stroke="black" stroke-width="2"/>'},bidet:{viewBox:"9 9 62 82",content:'<ellipse cx="40" cy="50" rx="30" ry="40" stroke="black" stroke-width="2" fill="none"/><ellipse cx="40" cy="53" rx="20" ry="28" stroke="black" stroke-width="2" fill="none"/><circle cx="40" cy="18" r="4" stroke="black" stroke-width="2" fill="none"/><circle cx="40" cy="18" r="1.5" fill="black" stroke="none"/>'},cabinet:{viewBox:"4 4 72 32",content:'<rect x="5" y="5" width="70" height="30" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/><line x1="8" y1="15" x2="72" y2="15" stroke="black" stroke-width="1" stroke-dasharray="3 2"/><line x1="8" y1="25" x2="72" y2="25" stroke="black" stroke-width="1" stroke-dasharray="3 2"/>'},counter:{viewBox:"4 4 192 32",content:'<rect x="5" y="5" width="190" height="30" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/>'},cupboard:{viewBox:"4 4 92 42",content:'<rect x="5" y="5" width="90" height="40" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/><line x1="50" y1="5" x2="50" y2="45" stroke="black" stroke-width="2"/><circle cx="43" cy="25" r="2" fill="black" stroke="none"/><circle cx="57" cy="25" r="2" fill="black" stroke="none"/>'},desk:{viewBox:"4 4 132 87.2485",content:'<rect x="30" y="64" width="66" height="14" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/><line x1="33" y1="78" x2="30" y2="86" stroke="black" stroke-width="2"/><line x1="93" y1="78" x2="96" y2="86" stroke="black" stroke-width="2"/><path d="M 30,86 Q 63,94 96,86" stroke="black" stroke-width="2.5" fill="none"/><rect x="5" y="5" width="130" height="55" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/><rect x="40" y="12" width="42" height="12" rx="1" ry="1" stroke="black" stroke-width="2" fill="none"/><rect x="40" y="26" width="42" height="26" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/><line x1="45" y1="32" x2="77" y2="32" stroke="black" stroke-width="1"/><line x1="45" y1="37" x2="77" y2="37" stroke="black" stroke-width="1"/><line x1="45" y1="42" x2="77" y2="42" stroke="black" stroke-width="1"/><rect x="54" y="44" width="14" height="6" rx="1" ry="1" stroke="black" stroke-width="1" fill="none"/><circle cx="110" cy="22" r="10" stroke="black" stroke-width="2" fill="none"/><circle cx="110" cy="22" r="4" stroke="black" stroke-width="2" fill="none"/>'},fridge:{viewBox:"4 4 62 62",content:'<rect x="5" y="5" width="60" height="60" rx="3" ry="3" stroke="black" stroke-width="2" fill="none"/><rect x="9" y="9" width="52" height="52" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/><line x1="14" y1="22" x2="14" y2="48" stroke="black" stroke-width="2.5"/><circle cx="57" cy="20" r="1.5" fill="black" stroke="none"/><circle cx="57" cy="50" r="1.5" fill="black" stroke="none"/>'},"kitchen-island":{viewBox:"4 4 192 72",content:'<rect x="5" y="5" width="190" height="70" rx="3" ry="3" stroke="black" stroke-width="2" fill="none"/><rect x="20" y="35" width="35" height="25" rx="5" ry="5" stroke="black" stroke-width="2" fill="none"/><circle cx="37" cy="47" r="3" stroke="black" stroke-width="2" fill="none"/><circle cx="37" cy="47" r="1" fill="black" stroke="none"/><circle cx="16" cy="32" r="3" stroke="black" stroke-width="2" fill="none"/><path d="M 16,32 Q 28,32 28,42" stroke="black" stroke-width="2" fill="none"/><circle cx="130" cy="25" r="10" stroke="black" stroke-width="2" fill="none"/><circle cx="130" cy="25" r="5" stroke="black" stroke-width="2" fill="none"/><circle cx="165" cy="25" r="10" stroke="black" stroke-width="2" fill="none"/><circle cx="165" cy="25" r="5" stroke="black" stroke-width="2" fill="none"/><circle cx="130" cy="55" r="10" stroke="black" stroke-width="2" fill="none"/><circle cx="130" cy="55" r="5" stroke="black" stroke-width="2" fill="none"/><circle cx="165" cy="55" r="10" stroke="black" stroke-width="2" fill="none"/><circle cx="165" cy="55" r="5" stroke="black" stroke-width="2" fill="none"/>'},"side-table":{viewBox:"7.2513 3.5 39.4975 40.5",content:'<circle cx="27" cy="25" r="18" stroke="black" stroke-width="2" fill="none"/><path d="M 21,8 Q 27,1 33,8" stroke="black" stroke-width="2" fill="none"/><path d="M 9,28 Q 6,37 15,39" stroke="black" stroke-width="2" fill="none"/><path d="M 39,39 Q 48,37 45,28" stroke="black" stroke-width="2" fill="none"/>'},"sliding-door":{viewBox:"-2.5 4.75 105 10.5",content:'<line x1="0" y1="10" x2="8" y2="10" stroke="black" stroke-width="5"/><line x1="92" y1="10" x2="100" y2="10" stroke="black" stroke-width="5"/><line x1="8" y1="6" x2="52" y2="6" stroke="black" stroke-width="2.5"/><line x1="48" y1="14" x2="92" y2="14" stroke="black" stroke-width="2.5"/>'},speaker:{viewBox:"2.25 2.25 25.5 35.5",content:'<rect x="3" y="3" width="24" height="34" rx="3" ry="3" stroke="black" stroke-width="1.5" fill="none"/><circle cx="15" cy="25" r="8" stroke="black" stroke-width="1.5" fill="none"/><circle cx="15" cy="25" r="4" stroke="black" stroke-width="1.5" fill="none"/><circle cx="15" cy="11" r="4" stroke="black" stroke-width="1.5" fill="none"/><circle cx="15" cy="11" r="1.5" fill="black" stroke="none"/>'},"washing-machine":{viewBox:"4 4 72 72",content:'<rect x="5" y="5" width="70" height="70" rx="5" ry="5" stroke="black" stroke-width="2" fill="none"/><line x1="5" y1="20" x2="75" y2="20" stroke="black" stroke-width="2"/><circle cx="22" cy="13" r="5" stroke="black" stroke-width="2" fill="none"/><line x1="22" y1="13" x2="22" y2="9" stroke="black" stroke-width="1.5"/><circle cx="55" cy="13" r="2.5" fill="black" stroke="none"/><circle cx="65" cy="13" r="2.5" fill="black" stroke="none"/><circle cx="40" cy="48" r="20" stroke="black" stroke-width="2" fill="none"/><circle cx="40" cy="48" r="14" stroke="black" stroke-width="2" fill="none"/>'},window:{viewBox:"-1 1 102 12",content:'<line x1="0" y1="2" x2="100" y2="2" stroke="black" stroke-width="2"/><line x1="0" y1="12" x2="100" y2="12" stroke="black" stroke-width="2"/><line x1="0" y1="7" x2="100" y2="7" stroke="black" stroke-width="1"/><line x1="50" y1="2" x2="50" y2="12" stroke="black" stroke-width="1.5"/>'},toilet:{viewBox:"17 3 66 103",content:'<rect x="18" y="4" width="64" height="24" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/><rect x="22" y="7" width="56" height="18" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/><ellipse cx="50" cy="16" rx="6" ry="4" stroke="black" stroke-width="2" fill="none"/><circle cx="30" cy="30" r="2.5" fill="black" stroke="none"/><circle cx="70" cy="30" r="2.5" fill="black" stroke="none"/><path d="M 20,32 L 20,60 Q 20,100 50,105 Q 80,100 80,60 L 80,32" stroke="black" stroke-width="2" fill="none"/><path d="M 24,34 L 24,58 Q 24,94 50,99 Q 76,94 76,58 L 76,34" stroke="black" stroke-width="2" fill="none"/><path d="M 32,40 L 32,58 Q 32,86 50,90 Q 68,86 68,58 L 68,40 Q 68,36 50,36 Q 32,36 32,40 Z" stroke="black" stroke-width="2" fill="none"/><line x1="24" y1="34" x2="76" y2="34" stroke="black" stroke-width="2"/>'},washbasin:{viewBox:"4 4 92 62",content:'<rect x="5" y="5" width="90" height="60" rx="8" ry="8" stroke="black" stroke-width="2" fill="none"/><ellipse cx="50" cy="40" rx="35" ry="20" stroke="black" stroke-width="2" fill="none"/><circle cx="50" cy="12" r="3.5" stroke="black" stroke-width="2" fill="none"/><rect x="48.5" y="13" width="3" height="6" rx="1" ry="1" stroke="black" stroke-width="2" fill="none"/><circle cx="50" cy="40" r="3" stroke="black" stroke-width="2" fill="none"/><circle cx="50" cy="40" r="1" fill="black" stroke="none"/>'}},Ye=[{type:"svg",icon:"armchair",label:"furniture.armchair",defaultWidth:800,defaultHeight:800},{type:"svg",icon:"bath",label:"furniture.bath",defaultWidth:1700,defaultHeight:700},{type:"svg",icon:"bed-double",label:"furniture.double_bed",defaultWidth:1600,defaultHeight:2e3},{type:"svg",icon:"bed-single",label:"furniture.single_bed",defaultWidth:900,defaultHeight:2e3},{type:"svg",icon:"door-left",label:"furniture.door_left_swing",defaultWidth:800,defaultHeight:800},{type:"svg",icon:"door-right",label:"furniture.door_right_swing",defaultWidth:800,defaultHeight:800},{type:"svg",icon:"table-dining-room",label:"furniture.dining_table",defaultWidth:1600,defaultHeight:900},{type:"svg",icon:"table-dining-room-round",label:"furniture.round_table",defaultWidth:1e3,defaultHeight:1e3},{type:"svg",icon:"floor-lamp",label:"furniture.lamp",defaultWidth:400,defaultHeight:400},{type:"svg",icon:"oven",label:"furniture.oven_stove",defaultWidth:600,defaultHeight:600},{type:"svg",icon:"plant",label:"furniture.plant",defaultWidth:400,defaultHeight:400},{type:"svg",icon:"shower",label:"furniture.shower",defaultWidth:900,defaultHeight:900},{type:"svg",icon:"sofa-two-seater",label:"furniture.sofa_2_seat",defaultWidth:1600,defaultHeight:800},{type:"svg",icon:"sofa-three-seater",label:"furniture.sofa_3_seat",defaultWidth:2400,defaultHeight:800},{type:"svg",icon:"television",label:"furniture.tv",defaultWidth:1200,defaultHeight:200},{type:"svg",icon:"toilet",label:"furniture.toilet",defaultWidth:400,defaultHeight:700},{type:"svg",icon:"car",label:"furniture.car",defaultWidth:1800,defaultHeight:4500},{type:"svg",icon:"carpet",label:"furniture.carpet",defaultWidth:2e3,defaultHeight:1400},{type:"svg",icon:"cat-bed",label:"furniture.cat_bed",defaultWidth:500,defaultHeight:500},{type:"svg",icon:"dog-bed",label:"furniture.dog_bed",defaultWidth:800,defaultHeight:600},{type:"svg",icon:"pool",label:"furniture.pool",defaultWidth:5e3,defaultHeight:3e3},{type:"svg",icon:"bedside-table",label:"furniture.bedside_table",defaultWidth:500,defaultHeight:500},{type:"svg",icon:"bidet",label:"furniture.bidet",defaultWidth:400,defaultHeight:500},{type:"svg",icon:"washbasin",label:"furniture.washbasin",defaultWidth:600,defaultHeight:420},{type:"svg",icon:"hot-tub",label:"furniture.hot_tub",defaultWidth:1500,defaultHeight:1500},{type:"svg",icon:"cabinet",label:"furniture.cabinet",defaultWidth:800,defaultHeight:400},{type:"svg",icon:"ceiling-fan",label:"furniture.ceiling_fan",defaultWidth:1200,defaultHeight:1200},{type:"svg",icon:"counter",label:"furniture.counter",defaultWidth:2e3,defaultHeight:400},{type:"svg",icon:"cupboard",label:"furniture.cupboard",defaultWidth:1e3,defaultHeight:500},{type:"svg",icon:"desk",label:"furniture.desk",defaultWidth:1400,defaultHeight:700},{type:"svg",icon:"fridge",label:"furniture.fridge",defaultWidth:700,defaultHeight:700},{type:"svg",icon:"kitchen-island",label:"furniture.kitchen_island",defaultWidth:2e3,defaultHeight:800},{type:"svg",icon:"side-table",label:"furniture.side_table",defaultWidth:500,defaultHeight:500},{type:"svg",icon:"sliding-door",label:"furniture.sliding_door",defaultWidth:1e3,defaultHeight:200},{type:"svg",icon:"speaker",label:"furniture.speaker",defaultWidth:300,defaultHeight:300},{type:"svg",icon:"washing-machine",label:"furniture.washing_machine",defaultWidth:600,defaultHeight:600},{type:"svg",icon:"window",label:"furniture.window",defaultWidth:1e3,defaultHeight:150}],$e=["corners.front_left","corners.front_right","corners.back_right","corners.back_left"],Ke=[["corners.left_wall","corners.front_wall"],["corners.right_wall","corners.front_wall"],["corners.right_wall","corners.back_wall"],["corners.left_wall","corners.back_wall"]],Je=["#2196F3","#FF5722","#4CAF50"];if(3!==Je.length)throw new Error(`TARGET_COLORS palette (${Je.length}) must match MAX_TARGETS (3)`);const We=Math.PI/3,je=xe*Math.sin(Math.PI/3);function Ve(e,t){if(!Re(e))return"var(--secondary-background-color, #e0e0e0)";const i=Me(e);if(i>0&&i<=7){const e=t[i-1];if(e)return e.color}return"var(--card-background-color, #fff)"}const Ze="var(--error-color, #cc3333)";function Xe(e,t,i){return`repeating-linear-gradient(${e}deg, transparent, transparent ${i}px, ${t} ${i}px, ${t} ${i+2}px)`}function qe(e,t){switch(e){case 1:return Xe(45,"rgba(60,60,60,0.7)",t);case 2:return Xe(-45,Ze,t);case 3:return`${Xe(-45,Ze,t)}, ${Xe(45,Ze,t)}`;default:return""}}let et=0;function tt(e,t,i){const s=e[6]*t+e[7]*i+1;return{x:(e[0]*t+e[1]*i+e[2])/s,y:(e[3]*t+e[4]*i+e[5])/s}}function it(e){const t=tt(e,0,0),i=tt(e,0,1e3),s=i.x-t.x,r=i.y-t.y,o=Math.sqrt(s*s+r*r);return!Number.isFinite(o)||o<1e-6?null:{sensorPos:t,dirX:s/o,dirY:r/o}}function st(e){return e?tt(e,0,0):null}function rt(e,t,i,s,r){if(!i)return"in_range";const{x:o,y:n}=Ge(e,t,s),a=o-i.sensorPos.x,l=n-i.sensorPos.y,c=a*a+l*l;if(c<1)return"in_range";const h=a*i.dirX+l*i.dirY;return h<=0||h*h<.25*c||c>36e6?"out_of_cone":c>r*r?"beyond_max_range":"in_range"}function ot(e,t,i,s,r){let o=Be,n=0,a=Se,l=0;for(let c=0;c<Ie;c++){if(!Re(e[c]))continue;const h=c%Be,d=Math.floor(c/Be);"out_of_cone"!==rt(h,d,t,i,s)&&(h<o&&(o=h),h>n&&(n=h),d<a&&(a=d),d>l&&(l=d),r?.(h,d))}return{minCol:o,maxCol:n,minRow:a,maxRow:l}}function nt(e,t,i,s){const r=ot(e,t,i,s),{minCol:o,maxCol:n,minRow:a,maxRow:l}=r;return o>n?r:{minCol:Math.max(0,o-1),maxCol:Math.min(19,n+1),minRow:Math.max(0,a-1),maxRow:Math.min(19,l+1)}}function at(e,t){const i=He(t);return{minX:(e.minCol-i)*De,maxX:(e.maxCol+1-i)*De,minY:e.minRow*De,maxY:(e.maxRow+1)*De}}function lt(e,t,i,s){if(e<=0||t<=0)return 0;const r=st(i);if(r){let t=0;const i=Ue(s);for(let o=i.minRow;o<=i.maxRow;o++)for(let n=i.minCol;n<=i.maxCol;n++){if(!Re(s[o*Be+n]))continue;const{x:i,y:a}=Ge(n,o,e),l=i-r.x,c=a-r.y,h=Math.sqrt(l*l+c*c);h>t&&(t=h)}if(t>0){const e=t/1e3;return Math.ceil(2*e)/2}}const o=Math.max(e,t)/1e3;return Math.ceil(2*o)/2}function ct(e){const t=(e,t,i,s,r,o)=>{const n=((e,t)=>Math.sqrt((e.raw_x-t.raw_x)**2+(e.raw_y-t.raw_y)**2))(e,t),a=r-o;return Math.sqrt(Math.max(n*n-a*a,0))+i+s},i=e=>e.offset_side??0,s=e=>e.offset_fb??0,[r,o,n,a]=e,l=Math.round(t(r,o,i(r),i(o),s(r),s(o))),c=t(r,a,s(r),s(a),i(r),i(a)),h=t(o,n,s(o),s(n),i(o),i(n));return{width:l,depth:Math.round((c+h)/2)}}function ht(e){if(0===e.length)return 0;const t=[...e].sort((e,t)=>e-t),i=Math.floor(t.length/2);return t.length%2?t[i]:(t[i-1]+t[i])/2}function dt(e,t,i,s,r){const o=s&&null!=r?s:null,n=r??0,a=s?.sensorPos??st(i);let l=0;const c=(e,i)=>(s,r)=>{const{x:o,y:n}=Ge(s,r,t),a=o-e,c=n-i,h=a*a+c*c;h>l&&(l=h)},h=ot(e,o,t,n,a?c(a.x,a.y):void 0);if(h.minCol>h.maxCol)return null;const d=(h.maxCol-h.minCol+1)*De,A=(h.maxRow-h.minRow+1)*De;return a||ot(e,o,t,n,c(d/2,0)),{widthM:d/1e3,depthM:A/1e3,furthestM:Math.sqrt(l)/1e3}}function At(e,t){const i=t&&t.cache?t.cache:Et,s=t&&t.serializer?t.serializer:ft;return(t&&t.strategy?t.strategy:pt)(e,{cache:i,serializer:s})}function gt(e,t,i,s){const r=null==(o=s)||"number"==typeof o||"boolean"==typeof o?s:i(s);var o;let n=t.get(r);return void 0===n&&(n=e.call(this,s),t.set(r,n)),n}function ut(e,t,i){const s=Array.prototype.slice.call(arguments,3),r=i(s);let o=t.get(r);return void 0===o&&(o=e.apply(this,s),t.set(r,o)),o}function _t(e,t,i,s,r){return i.bind(t,e,s,r)}function pt(e,t){return _t(e,this,1===e.length?gt:ut,t.cache.create(),t.serializer)}const ft=function(){return JSON.stringify(arguments)};class wt{cache;constructor(){this.cache=Object.create(null)}get(e){return this.cache[e]}set(e,t){this.cache[e]=t}}const Et={create:function(){return new wt}},mt={variadic:function(e,t){return _t(e,this,ut,t.cache.create(),t.serializer)}},bt=/(?:[Eec]{1,6}|G{1,5}|[Qq]{1,5}|(?:[yYur]+|U{1,5})|[ML]{1,5}|d{1,2}|D{1,3}|F{1}|[abB]{1,5}|[hkHK]{1,2}|w{1,2}|W{1}|m{1,2}|s{1,2}|[zZOvVxX]{1,4})(?=([^']*'[^']*')*[^']*$)/g;function yt(e){const t={};return e.replace(bt,e=>{const i=e.length;switch(e[0]){case"G":t.era=4===i?"long":5===i?"narrow":"short";break;case"y":t.year=2===i?"2-digit":"numeric";break;case"Y":case"u":case"U":case"r":throw new RangeError("`Y/u/U/r` (year) patterns are not supported, use `y` instead");case"q":case"Q":throw new RangeError("`q/Q` (quarter) patterns are not supported");case"M":case"L":t.month=["numeric","2-digit","short","long","narrow"][i-1];break;case"w":case"W":throw new RangeError("`w/W` (week) patterns are not supported");case"d":t.day=["numeric","2-digit"][i-1];break;case"D":case"F":case"g":throw new RangeError("`D/F/g` (day) patterns are not supported, use `d` instead");case"E":t.weekday=4===i?"long":5===i?"narrow":"short";break;case"e":if(i<4)throw new RangeError("`e..eee` (weekday) patterns are not supported");t.weekday=["short","long","narrow","short"][i-4];break;case"c":if(i<4)throw new RangeError("`c..ccc` (weekday) patterns are not supported");t.weekday=["short","long","narrow","short"][i-4];break;case"a":t.hour12=!0;break;case"b":case"B":throw new RangeError("`b/B` (period) patterns are not supported, use `a` instead");case"h":t.hourCycle="h12",t.hour=["numeric","2-digit"][i-1];break;case"H":t.hourCycle="h23",t.hour=["numeric","2-digit"][i-1];break;case"K":t.hourCycle="h11",t.hour=["numeric","2-digit"][i-1];break;case"k":t.hourCycle="h24",t.hour=["numeric","2-digit"][i-1];break;case"j":case"J":case"C":throw new RangeError("`j/J/C` (hour) patterns are not supported, use `h/H/K/k` instead");case"m":t.minute=["numeric","2-digit"][i-1];break;case"s":t.second=["numeric","2-digit"][i-1];break;case"S":case"A":throw new RangeError("`S/A` (second) patterns are not supported, use `s` instead");case"z":t.timeZoneName=i<4?"short":"long";break;case"Z":case"O":case"v":case"V":case"X":case"x":throw new RangeError("`Z/O/v/V/X/x` (timeZone) patterns are not supported, use `z` instead")}return""}),t}const Ct=/[\t-\r \x85\u200E\u200F\u2028\u2029]/i;function vt(e){return e.replace(/^(.*?)-/,"")}const Bt=/^\.(?:(0+)(\*)?|(#+)|(0+)(#+))$/g,St=/^(@+)?(\+|#+)?[rs]?$/g,It=/(\*)(0+)|(#+)(0+)|(0+)/g,Dt=/^(0+)$/;function xt(e){const t={};return"r"===e[e.length-1]?t.roundingPriority="morePrecision":"s"===e[e.length-1]&&(t.roundingPriority="lessPrecision"),e.replace(St,function(e,i,s){return"string"!=typeof s?(t.minimumSignificantDigits=i.length,t.maximumSignificantDigits=i.length):"+"===s?t.minimumSignificantDigits=i.length:"#"===i[0]?t.maximumSignificantDigits=i.length:(t.minimumSignificantDigits=i.length,t.maximumSignificantDigits=i.length+("string"==typeof s?s.length:0)),""}),t}function Rt(e){switch(e){case"sign-auto":return{signDisplay:"auto"};case"sign-accounting":case"()":return{currencySign:"accounting"};case"sign-always":case"+!":return{signDisplay:"always"};case"sign-accounting-always":case"()!":return{signDisplay:"always",currencySign:"accounting"};case"sign-except-zero":case"+?":return{signDisplay:"exceptZero"};case"sign-accounting-except-zero":case"()?":return{signDisplay:"exceptZero",currencySign:"accounting"};case"sign-never":case"+_":return{signDisplay:"never"}}}function Mt(e){let t;if("E"===e[0]&&"E"===e[1]?(t={notation:"engineering"},e=e.slice(2)):"E"===e[0]&&(t={notation:"scientific"},e=e.slice(1)),t){const i=e.slice(0,2);if("+!"===i?(t.signDisplay="always",e=e.slice(2)):"+?"===i&&(t.signDisplay="exceptZero",e=e.slice(2)),!Dt.test(e))throw new Error("Malformed concise eng/scientific notation");t.minimumIntegerDigits=e.length}return t}function kt(e){const t=Rt(e);return t||{}}function Tt(e){let t={};for(const i of e){switch(i.stem){case"percent":case"%":t.style="percent";continue;case"%x100":t.style="percent",t.scale=100;continue;case"currency":t.style="currency",t.currency=i.options[0];continue;case"group-off":case",_":t.useGrouping=!1;continue;case"precision-integer":case".":t.maximumFractionDigits=0;continue;case"measure-unit":case"unit":t.style="unit",t.unit=vt(i.options[0]);continue;case"compact-short":case"K":t.notation="compact",t.compactDisplay="short";continue;case"compact-long":case"KK":t.notation="compact",t.compactDisplay="long";continue;case"scientific":t={...t,notation:"scientific",...i.options.reduce((e,t)=>({...e,...kt(t)}),{})};continue;case"engineering":t={...t,notation:"engineering",...i.options.reduce((e,t)=>({...e,...kt(t)}),{})};continue;case"notation-simple":t.notation="standard";continue;case"unit-width-narrow":t.currencyDisplay="narrowSymbol",t.unitDisplay="narrow";continue;case"unit-width-short":t.currencyDisplay="code",t.unitDisplay="short";continue;case"unit-width-full-name":t.currencyDisplay="name",t.unitDisplay="long";continue;case"unit-width-iso-code":t.currencyDisplay="symbol";continue;case"scale":t.scale=parseFloat(i.options[0]);continue;case"rounding-mode-floor":t.roundingMode="floor";continue;case"rounding-mode-ceiling":t.roundingMode="ceil";continue;case"rounding-mode-down":t.roundingMode="trunc";continue;case"rounding-mode-up":t.roundingMode="expand";continue;case"rounding-mode-half-even":t.roundingMode="halfEven";continue;case"rounding-mode-half-down":t.roundingMode="halfTrunc";continue;case"rounding-mode-half-up":t.roundingMode="halfExpand";continue;case"integer-width":if(i.options.length>1)throw new RangeError("integer-width stems only accept a single optional option");i.options[0].replace(It,function(e,i,s,r,o,n){if(i)t.minimumIntegerDigits=s.length;else{if(r&&o)throw new Error("We currently do not support maximum integer digits");if(n)throw new Error("We currently do not support exact integer digits")}return""});continue}if(Dt.test(i.stem)){t.minimumIntegerDigits=i.stem.length;continue}if(Bt.test(i.stem)){if(i.options.length>1)throw new RangeError("Fraction-precision stems only accept a single optional option");i.stem.replace(Bt,function(e,i,s,r,o,n){return"*"===s?t.minimumFractionDigits=i.length:r&&"#"===r[0]?t.maximumFractionDigits=r.length:o&&n?(t.minimumFractionDigits=o.length,t.maximumFractionDigits=o.length+n.length):(t.minimumFractionDigits=i.length,t.maximumFractionDigits=i.length),""});const e=i.options[0];"w"===e?t={...t,trailingZeroDisplay:"stripIfInteger"}:e&&(t={...t,...xt(e)});continue}if(St.test(i.stem)){t={...t,...xt(i.stem)};continue}const e=Rt(i.stem);e&&(t={...t,...e});const s=Mt(i.stem);s&&(t={...t,...s})}return t}let Ft=function(e){return e[e.literal=0]="literal",e[e.argument=1]="argument",e[e.number=2]="number",e[e.date=3]="date",e[e.time=4]="time",e[e.select=5]="select",e[e.plural=6]="plural",e[e.pound=7]="pound",e[e.tag=8]="tag",e}({}),Pt=function(e){return e[e.number=0]="number",e[e.dateTime=1]="dateTime",e}({});function Ut(e){return e.type===Ft.literal}function Ot(e){return e.type===Ft.argument}function Qt(e){return e.type===Ft.number}function zt(e){return e.type===Ft.date}function Ht(e){return e.type===Ft.time}function Gt(e){return e.type===Ft.select}function Lt(e){return e.type===Ft.plural}function Nt(e){return e.type===Ft.pound}function Yt(e){return e.type===Ft.tag}function $t(e){return!(!e||"object"!=typeof e||e.type!==Pt.number)}function Kt(e){return!(!e||"object"!=typeof e||e.type!==Pt.dateTime)}let Jt=function(e){return e[e.EXPECT_ARGUMENT_CLOSING_BRACE=1]="EXPECT_ARGUMENT_CLOSING_BRACE",e[e.EMPTY_ARGUMENT=2]="EMPTY_ARGUMENT",e[e.MALFORMED_ARGUMENT=3]="MALFORMED_ARGUMENT",e[e.EXPECT_ARGUMENT_TYPE=4]="EXPECT_ARGUMENT_TYPE",e[e.INVALID_ARGUMENT_TYPE=5]="INVALID_ARGUMENT_TYPE",e[e.EXPECT_ARGUMENT_STYLE=6]="EXPECT_ARGUMENT_STYLE",e[e.INVALID_NUMBER_SKELETON=7]="INVALID_NUMBER_SKELETON",e[e.INVALID_DATE_TIME_SKELETON=8]="INVALID_DATE_TIME_SKELETON",e[e.EXPECT_NUMBER_SKELETON=9]="EXPECT_NUMBER_SKELETON",e[e.EXPECT_DATE_TIME_SKELETON=10]="EXPECT_DATE_TIME_SKELETON",e[e.UNCLOSED_QUOTE_IN_ARGUMENT_STYLE=11]="UNCLOSED_QUOTE_IN_ARGUMENT_STYLE",e[e.EXPECT_SELECT_ARGUMENT_OPTIONS=12]="EXPECT_SELECT_ARGUMENT_OPTIONS",e[e.EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE=13]="EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE",e[e.INVALID_PLURAL_ARGUMENT_OFFSET_VALUE=14]="INVALID_PLURAL_ARGUMENT_OFFSET_VALUE",e[e.EXPECT_SELECT_ARGUMENT_SELECTOR=15]="EXPECT_SELECT_ARGUMENT_SELECTOR",e[e.EXPECT_PLURAL_ARGUMENT_SELECTOR=16]="EXPECT_PLURAL_ARGUMENT_SELECTOR",e[e.EXPECT_SELECT_ARGUMENT_SELECTOR_FRAGMENT=17]="EXPECT_SELECT_ARGUMENT_SELECTOR_FRAGMENT",e[e.EXPECT_PLURAL_ARGUMENT_SELECTOR_FRAGMENT=18]="EXPECT_PLURAL_ARGUMENT_SELECTOR_FRAGMENT",e[e.INVALID_PLURAL_ARGUMENT_SELECTOR=19]="INVALID_PLURAL_ARGUMENT_SELECTOR",e[e.DUPLICATE_PLURAL_ARGUMENT_SELECTOR=20]="DUPLICATE_PLURAL_ARGUMENT_SELECTOR",e[e.DUPLICATE_SELECT_ARGUMENT_SELECTOR=21]="DUPLICATE_SELECT_ARGUMENT_SELECTOR",e[e.MISSING_OTHER_CLAUSE=22]="MISSING_OTHER_CLAUSE",e[e.INVALID_TAG=23]="INVALID_TAG",e[e.INVALID_TAG_NAME=25]="INVALID_TAG_NAME",e[e.UNMATCHED_CLOSING_TAG=26]="UNMATCHED_CLOSING_TAG",e[e.UNCLOSED_TAG=27]="UNCLOSED_TAG",e}({});const Wt=/[ \xA0\u1680\u2000-\u200A\u202F\u205F\u3000]/,jt={"001":["H","h"],419:["h","H","hB","hb"],AC:["H","h","hb","hB"],AD:["H","hB"],AE:["h","hB","hb","H"],AF:["H","hb","hB","h"],AG:["h","hb","H","hB"],AI:["H","h","hb","hB"],AL:["h","H","hB"],AM:["H","hB"],AO:["H","hB"],AR:["h","H","hB","hb"],AS:["h","H"],AT:["H","hB"],AU:["h","hb","H","hB"],AW:["H","hB"],AX:["H"],AZ:["H","hB","h"],BA:["H","hB","h"],BB:["h","hb","H","hB"],BD:["h","hB","H"],BE:["H","hB"],BF:["H","hB"],BG:["H","hB","h"],BH:["h","hB","hb","H"],BI:["H","h"],BJ:["H","hB"],BL:["H","hB"],BM:["h","hb","H","hB"],BN:["hb","hB","h","H"],BO:["h","H","hB","hb"],BQ:["H"],BR:["H","hB"],BS:["h","hb","H","hB"],BT:["h","H"],BW:["H","h","hb","hB"],BY:["H","h"],BZ:["H","h","hb","hB"],CA:["h","hb","H","hB"],CC:["H","h","hb","hB"],CD:["hB","H"],CF:["H","h","hB"],CG:["H","hB"],CH:["H","hB","h"],CI:["H","hB"],CK:["H","h","hb","hB"],CL:["h","H","hB","hb"],CM:["H","h","hB"],CN:["H","hB","hb","h"],CO:["h","H","hB","hb"],CP:["H"],CR:["h","H","hB","hb"],CU:["h","H","hB","hb"],CV:["H","hB"],CW:["H","hB"],CX:["H","h","hb","hB"],CY:["h","H","hb","hB"],CZ:["H"],DE:["H","hB"],DG:["H","h","hb","hB"],DJ:["h","H"],DK:["H"],DM:["h","hb","H","hB"],DO:["h","H","hB","hb"],DZ:["h","hB","hb","H"],EA:["H","h","hB","hb"],EC:["h","H","hB","hb"],EE:["H","hB"],EG:["h","hB","hb","H"],EH:["h","hB","hb","H"],ER:["h","H"],ES:["H","hB","h","hb"],ET:["hB","hb","h","H"],FI:["H"],FJ:["h","hb","H","hB"],FK:["H","h","hb","hB"],FM:["h","hb","H","hB"],FO:["H","h"],FR:["H","hB"],GA:["H","hB"],GB:["H","h","hb","hB"],GD:["h","hb","H","hB"],GE:["H","hB","h"],GF:["H","hB"],GG:["H","h","hb","hB"],GH:["h","H"],GI:["H","h","hb","hB"],GL:["H","h"],GM:["h","hb","H","hB"],GN:["H","hB"],GP:["H","hB"],GQ:["H","hB","h","hb"],GR:["h","H","hb","hB"],GS:["H","h","hb","hB"],GT:["h","H","hB","hb"],GU:["h","hb","H","hB"],GW:["H","hB"],GY:["h","hb","H","hB"],HK:["h","hB","hb","H"],HN:["h","H","hB","hb"],HR:["H","hB"],HU:["H","h"],IC:["H","h","hB","hb"],ID:["H"],IE:["H","h","hb","hB"],IL:["H","hB"],IM:["H","h","hb","hB"],IN:["h","H"],IO:["H","h","hb","hB"],IQ:["h","hB","hb","H"],IR:["hB","H"],IS:["H"],IT:["H","hB"],JE:["H","h","hb","hB"],JM:["h","hb","H","hB"],JO:["h","hB","hb","H"],JP:["H","K","h"],KE:["hB","hb","H","h"],KG:["H","h","hB","hb"],KH:["hB","h","H","hb"],KI:["h","hb","H","hB"],KM:["H","h","hB","hb"],KN:["h","hb","H","hB"],KP:["h","H","hB","hb"],KR:["h","H","hB","hb"],KW:["h","hB","hb","H"],KY:["h","hb","H","hB"],KZ:["H","hB"],LA:["H","hb","hB","h"],LB:["h","hB","hb","H"],LC:["h","hb","H","hB"],LI:["H","hB","h"],LK:["H","h","hB","hb"],LR:["h","hb","H","hB"],LS:["h","H"],LT:["H","h","hb","hB"],LU:["H","h","hB"],LV:["H","hB","hb","h"],LY:["h","hB","hb","H"],MA:["H","h","hB","hb"],MC:["H","hB"],MD:["H","hB"],ME:["H","hB","h"],MF:["H","hB"],MG:["H","h"],MH:["h","hb","H","hB"],MK:["H","h","hb","hB"],ML:["H"],MM:["hB","hb","H","h"],MN:["H","h","hb","hB"],MO:["h","hB","hb","H"],MP:["h","hb","H","hB"],MQ:["H","hB"],MR:["h","hB","hb","H"],MS:["H","h","hb","hB"],MT:["H","h"],MU:["H","h"],MV:["H","h"],MW:["h","hb","H","hB"],MX:["h","H","hB","hb"],MY:["hb","hB","h","H"],MZ:["H","hB"],NA:["h","H","hB","hb"],NC:["H","hB"],NE:["H"],NF:["H","h","hb","hB"],NG:["H","h","hb","hB"],NI:["h","H","hB","hb"],NL:["H","hB"],NO:["H","h"],NP:["H","h","hB"],NR:["H","h","hb","hB"],NU:["H","h","hb","hB"],NZ:["h","hb","H","hB"],OM:["h","hB","hb","H"],PA:["h","H","hB","hb"],PE:["h","H","hB","hb"],PF:["H","h","hB"],PG:["h","H"],PH:["h","hB","hb","H"],PK:["h","hB","H"],PL:["H","h"],PM:["H","hB"],PN:["H","h","hb","hB"],PR:["h","H","hB","hb"],PS:["h","hB","hb","H"],PT:["H","hB"],PW:["h","H"],PY:["h","H","hB","hb"],QA:["h","hB","hb","H"],RE:["H","hB"],RO:["H","hB"],RS:["H","hB","h"],RU:["H"],RW:["H","h"],SA:["h","hB","hb","H"],SB:["h","hb","H","hB"],SC:["H","h","hB"],SD:["h","hB","hb","H"],SE:["H"],SG:["h","hb","H","hB"],SH:["H","h","hb","hB"],SI:["H","hB"],SJ:["H"],SK:["H"],SL:["h","hb","H","hB"],SM:["H","h","hB"],SN:["H","h","hB"],SO:["h","H"],SR:["H","hB"],SS:["h","hb","H","hB"],ST:["H","hB"],SV:["h","H","hB","hb"],SX:["H","h","hb","hB"],SY:["h","hB","hb","H"],SZ:["h","hb","H","hB"],TA:["H","h","hb","hB"],TC:["h","hb","H","hB"],TD:["h","H","hB"],TF:["H","h","hB"],TG:["H","hB"],TH:["H","h"],TJ:["H","h"],TL:["H","hB","hb","h"],TM:["H","h"],TN:["h","hB","hb","H"],TO:["h","H"],TR:["H","hB"],TT:["h","hb","H","hB"],TW:["hB","hb","h","H"],TZ:["hB","hb","H","h"],UA:["H","hB","h"],UG:["hB","hb","H","h"],UM:["h","hb","H","hB"],US:["h","hb","H","hB"],UY:["h","H","hB","hb"],UZ:["H","hB","h"],VA:["H","h","hB"],VC:["h","hb","H","hB"],VE:["h","H","hB","hb"],VG:["h","hb","H","hB"],VI:["h","hb","H","hB"],VN:["H","h"],VU:["h","H"],WF:["H","hB"],WS:["h","H"],XK:["H","hB","h"],YE:["h","hB","hb","H"],YT:["H","hB"],ZA:["H","h","hb","hB"],ZM:["h","hb","H","hB"],ZW:["H","h"],"af-ZA":["H","h","hB","hb"],"ar-001":["h","hB","hb","H"],"ca-ES":["H","h","hB"],"en-001":["h","hb","H","hB"],"en-HK":["h","hb","H","hB"],"en-IL":["H","h","hb","hB"],"en-MY":["h","hb","H","hB"],"es-BR":["H","h","hB","hb"],"es-ES":["H","h","hB","hb"],"es-GQ":["H","h","hB","hb"],"fr-CA":["H","h","hB"],"gl-ES":["H","h","hB"],"gu-IN":["hB","hb","h","H"],"hi-IN":["hB","h","H"],"it-CH":["H","h","hB"],"it-IT":["H","h","hB"],"kn-IN":["hB","h","H"],"ku-SY":["H","hB"],"ml-IN":["hB","h","H"],"mr-IN":["hB","hb","h","H"],"pa-IN":["hB","hb","h","H"],"ta-IN":["hB","h","hb","H"],"te-IN":["hB","h","H"],"zu-ZA":["H","hB","hb","h"]};function Vt(e){let t=e.hourCycle;if(void 0===t&&e.hourCycles&&e.hourCycles.length&&(t=e.hourCycles[0]),t)switch(t){case"h24":return"k";case"h23":return"H";case"h12":return"h";case"h11":return"K";default:throw new Error("Invalid hourCycle")}const i=e.language;let s;"root"!==i&&(s=e.maximize().region);return(jt[s||""]||jt[i||""]||jt[`${i}-001`]||jt["001"])[0]}const Zt=new RegExp(`^${Wt.source}*`),Xt=new RegExp(`${Wt.source}*$`);function qt(e,t){return{start:e,end:t}}const ei=!!Object.fromEntries,ti=!!String.prototype.trimStart,ii=!!String.prototype.trimEnd,si=ei?Object.fromEntries:function(e){const t={};for(const[i,s]of e)t[i]=s;return t},ri=ti?function(e){return e.trimStart()}:function(e){return e.replace(Zt,"")},oi=ii?function(e){return e.trimEnd()}:function(e){return e.replace(Xt,"")},ni=new RegExp("([^\\p{White_Space}\\p{Pattern_Syntax}]*)","yu");class ai{message;position;locale;ignoreTag;requiresOtherClause;shouldParseSkeletons;constructor(e,t={}){this.message=e,this.position={offset:0,line:1,column:1},this.ignoreTag=!!t.ignoreTag,this.locale=t.locale,this.requiresOtherClause=!!t.requiresOtherClause,this.shouldParseSkeletons=!!t.shouldParseSkeletons}parse(){if(0!==this.offset())throw Error("parser can only be used once");return this.parseMessage(0,"",!1)}parseMessage(e,t,i){let s=[];for(;!this.isEOF();){const r=this.char();if(123===r){const t=this.parseArgument(e,i);if(t.err)return t;s.push(t.val)}else{if(125===r&&e>0)break;if(35!==r||"plural"!==t&&"selectordinal"!==t){if(60===r&&!this.ignoreTag&&47===this.peek()){if(i)break;return this.error(Jt.UNMATCHED_CLOSING_TAG,qt(this.clonePosition(),this.clonePosition()))}if(60===r&&!this.ignoreTag&&li(this.peek()||0)){const i=this.parseTag(e,t);if(i.err)return i;s.push(i.val)}else{const i=this.parseLiteral(e,t);if(i.err)return i;s.push(i.val)}}else{const e=this.clonePosition();this.bump(),s.push({type:Ft.pound,location:qt(e,this.clonePosition())})}}}return{val:s,err:null}}parseTag(e,t){const i=this.clonePosition();this.bump();const s=this.parseTagName();if(this.bumpSpace(),this.bumpIf("/>"))return{val:{type:Ft.literal,value:`<${s}/>`,location:qt(i,this.clonePosition())},err:null};if(this.bumpIf(">")){const r=this.parseMessage(e+1,t,!0);if(r.err)return r;const o=r.val,n=this.clonePosition();if(this.bumpIf("</")){if(this.isEOF()||!li(this.char()))return this.error(Jt.INVALID_TAG,qt(n,this.clonePosition()));const e=this.clonePosition();return s!==this.parseTagName()?this.error(Jt.UNMATCHED_CLOSING_TAG,qt(e,this.clonePosition())):(this.bumpSpace(),this.bumpIf(">")?{val:{type:Ft.tag,value:s,children:o,location:qt(i,this.clonePosition())},err:null}:this.error(Jt.INVALID_TAG,qt(n,this.clonePosition())))}return this.error(Jt.UNCLOSED_TAG,qt(i,this.clonePosition()))}return this.error(Jt.INVALID_TAG,qt(i,this.clonePosition()))}parseTagName(){const e=this.offset();for(this.bump();!this.isEOF()&&ci(this.char());)this.bump();return this.message.slice(e,this.offset())}parseLiteral(e,t){const i=this.clonePosition();let s="";for(;;){const i=this.tryParseQuote(t);if(i){s+=i;continue}const r=this.tryParseUnquoted(e,t);if(r){s+=r;continue}const o=this.tryParseLeftAngleBracket();if(!o)break;s+=o}const r=qt(i,this.clonePosition());return{val:{type:Ft.literal,value:s,location:r},err:null}}tryParseLeftAngleBracket(){return this.isEOF()||60!==this.char()||!this.ignoreTag&&(li(e=this.peek()||0)||47===e)?null:(this.bump(),"<");var e}tryParseQuote(e){if(this.isEOF()||39!==this.char())return null;switch(this.peek()){case 39:return this.bump(),this.bump(),"'";case 123:case 60:case 62:case 125:break;case 35:if("plural"===e||"selectordinal"===e)break;return null;default:return null}this.bump();const t=[this.char()];for(this.bump();!this.isEOF();){const e=this.char();if(39===e){if(39!==this.peek()){this.bump();break}t.push(39),this.bump()}else t.push(e);this.bump()}return String.fromCodePoint(...t)}tryParseUnquoted(e,t){if(this.isEOF())return null;const i=this.char();return 60===i||123===i||35===i&&("plural"===t||"selectordinal"===t)||125===i&&e>0?null:(this.bump(),String.fromCodePoint(i))}parseArgument(e,t){const i=this.clonePosition();if(this.bump(),this.bumpSpace(),this.isEOF())return this.error(Jt.EXPECT_ARGUMENT_CLOSING_BRACE,qt(i,this.clonePosition()));if(125===this.char())return this.bump(),this.error(Jt.EMPTY_ARGUMENT,qt(i,this.clonePosition()));let s=this.parseIdentifierIfPossible().value;if(!s)return this.error(Jt.MALFORMED_ARGUMENT,qt(i,this.clonePosition()));if(this.bumpSpace(),this.isEOF())return this.error(Jt.EXPECT_ARGUMENT_CLOSING_BRACE,qt(i,this.clonePosition()));switch(this.char()){case 125:return this.bump(),{val:{type:Ft.argument,value:s,location:qt(i,this.clonePosition())},err:null};case 44:return this.bump(),this.bumpSpace(),this.isEOF()?this.error(Jt.EXPECT_ARGUMENT_CLOSING_BRACE,qt(i,this.clonePosition())):this.parseArgumentOptions(e,t,s,i);default:return this.error(Jt.MALFORMED_ARGUMENT,qt(i,this.clonePosition()))}}parseIdentifierIfPossible(){const e=this.clonePosition(),t=this.offset(),i=function(e,t){return ni.lastIndex=t,ni.exec(e)[1]??""}(this.message,t),s=t+i.length;this.bumpTo(s);return{value:i,location:qt(e,this.clonePosition())}}parseArgumentOptions(e,t,i,s){let r=this.clonePosition(),o=this.parseIdentifierIfPossible().value,n=this.clonePosition();switch(o){case"":return this.error(Jt.EXPECT_ARGUMENT_TYPE,qt(r,n));case"number":case"date":case"time":{this.bumpSpace();let e=null;if(this.bumpIf(",")){this.bumpSpace();const t=this.clonePosition(),i=this.parseSimpleArgStyleIfPossible();if(i.err)return i;const s=oi(i.val);if(0===s.length)return this.error(Jt.EXPECT_ARGUMENT_STYLE,qt(this.clonePosition(),this.clonePosition()));e={style:s,styleLocation:qt(t,this.clonePosition())}}const t=this.tryParseArgumentClose(s);if(t.err)return t;const r=qt(s,this.clonePosition());if(e&&e.style.startsWith("::")){let t=ri(e.style.slice(2));if("number"===o){const s=this.parseNumberSkeletonFromString(t,e.styleLocation);return s.err?s:{val:{type:Ft.number,value:i,location:r,style:s.val},err:null}}{if(0===t.length)return this.error(Jt.EXPECT_DATE_TIME_SKELETON,r);let s=t;this.locale&&(s=function(e,t){let i="";for(let s=0;s<e.length;s++){const r=e.charAt(s);if("j"===r){let o=0;for(;s+1<e.length&&e.charAt(s+1)===r;)o++,s++;let n=1+(1&o),a=o<2?1:3+(o>>1),l="a",c=Vt(t);for("H"!=c&&"k"!=c||(a=0);a-- >0;)i+=l;for(;n-- >0;)i=c+i}else i+="J"===r?"H":r}return i}(t,this.locale));const n={type:Pt.dateTime,pattern:s,location:e.styleLocation,parsedOptions:this.shouldParseSkeletons?yt(s):{}};return{val:{type:"date"===o?Ft.date:Ft.time,value:i,location:r,style:n},err:null}}}return{val:{type:"number"===o?Ft.number:"date"===o?Ft.date:Ft.time,value:i,location:r,style:e?.style??null},err:null}}case"plural":case"selectordinal":case"select":{const r=this.clonePosition();if(this.bumpSpace(),!this.bumpIf(","))return this.error(Jt.EXPECT_SELECT_ARGUMENT_OPTIONS,qt(r,{...r}));this.bumpSpace();let n=this.parseIdentifierIfPossible(),a=0;if("select"!==o&&"offset"===n.value){if(!this.bumpIf(":"))return this.error(Jt.EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE,qt(this.clonePosition(),this.clonePosition()));this.bumpSpace();const e=this.tryParseDecimalInteger(Jt.EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE,Jt.INVALID_PLURAL_ARGUMENT_OFFSET_VALUE);if(e.err)return e;this.bumpSpace(),n=this.parseIdentifierIfPossible(),a=e.val}const l=this.tryParsePluralOrSelectOptions(e,o,t,n);if(l.err)return l;const c=this.tryParseArgumentClose(s);if(c.err)return c;const h=qt(s,this.clonePosition());return"select"===o?{val:{type:Ft.select,value:i,options:si(l.val),location:h},err:null}:{val:{type:Ft.plural,value:i,options:si(l.val),offset:a,pluralType:"plural"===o?"cardinal":"ordinal",location:h},err:null}}default:return this.error(Jt.INVALID_ARGUMENT_TYPE,qt(r,n))}}tryParseArgumentClose(e){return this.isEOF()||125!==this.char()?this.error(Jt.EXPECT_ARGUMENT_CLOSING_BRACE,qt(e,this.clonePosition())):(this.bump(),{val:!0,err:null})}parseSimpleArgStyleIfPossible(){let e=0;const t=this.clonePosition();for(;!this.isEOF();){switch(this.char()){case 39:{this.bump();let e=this.clonePosition();if(!this.bumpUntil("'"))return this.error(Jt.UNCLOSED_QUOTE_IN_ARGUMENT_STYLE,qt(e,this.clonePosition()));this.bump();break}case 123:e+=1,this.bump();break;case 125:if(!(e>0))return{val:this.message.slice(t.offset,this.offset()),err:null};e-=1;break;default:this.bump()}}return{val:this.message.slice(t.offset,this.offset()),err:null}}parseNumberSkeletonFromString(e,t){let i=[];try{i=function(e){if(0===e.length)throw new Error("Number skeleton cannot be empty");const t=e.split(Ct).filter(e=>e.length>0),i=[];for(const e of t){let t=e.split("/");if(0===t.length)throw new Error("Invalid number skeleton");const[s,...r]=t;for(const e of r)if(0===e.length)throw new Error("Invalid number skeleton");i.push({stem:s,options:r})}return i}(e)}catch{return this.error(Jt.INVALID_NUMBER_SKELETON,t)}return{val:{type:Pt.number,tokens:i,location:t,parsedOptions:this.shouldParseSkeletons?Tt(i):{}},err:null}}tryParsePluralOrSelectOptions(e,t,i,s){let r=!1;const o=[],n=new Set;let{value:a,location:l}=s;for(;;){if(0===a.length){const e=this.clonePosition();if("select"===t||!this.bumpIf("="))break;{const t=this.tryParseDecimalInteger(Jt.EXPECT_PLURAL_ARGUMENT_SELECTOR,Jt.INVALID_PLURAL_ARGUMENT_SELECTOR);if(t.err)return t;l=qt(e,this.clonePosition()),a=this.message.slice(e.offset,this.offset())}}if(n.has(a))return this.error("select"===t?Jt.DUPLICATE_SELECT_ARGUMENT_SELECTOR:Jt.DUPLICATE_PLURAL_ARGUMENT_SELECTOR,l);"other"===a&&(r=!0),this.bumpSpace();const s=this.clonePosition();if(!this.bumpIf("{"))return this.error("select"===t?Jt.EXPECT_SELECT_ARGUMENT_SELECTOR_FRAGMENT:Jt.EXPECT_PLURAL_ARGUMENT_SELECTOR_FRAGMENT,qt(this.clonePosition(),this.clonePosition()));const c=this.parseMessage(e+1,t,i);if(c.err)return c;const h=this.tryParseArgumentClose(s);if(h.err)return h;o.push([a,{value:c.val,location:qt(s,this.clonePosition())}]),n.add(a),this.bumpSpace(),({value:a,location:l}=this.parseIdentifierIfPossible())}return 0===o.length?this.error("select"===t?Jt.EXPECT_SELECT_ARGUMENT_SELECTOR:Jt.EXPECT_PLURAL_ARGUMENT_SELECTOR,qt(this.clonePosition(),this.clonePosition())):this.requiresOtherClause&&!r?this.error(Jt.MISSING_OTHER_CLAUSE,qt(this.clonePosition(),this.clonePosition())):{val:o,err:null}}tryParseDecimalInteger(e,t){let i=1;const s=this.clonePosition();this.bumpIf("+")||this.bumpIf("-")&&(i=-1);let r=!1,o=0;for(;!this.isEOF();){const e=this.char();if(!(e>=48&&e<=57))break;r=!0,o=10*o+(e-48),this.bump()}const n=qt(s,this.clonePosition());return r?(o*=i,Number.isSafeInteger(o)?{val:o,err:null}:this.error(t,n)):this.error(e,n)}offset(){return this.position.offset}isEOF(){return this.offset()===this.message.length}clonePosition(){return{offset:this.position.offset,line:this.position.line,column:this.position.column}}char(){const e=this.position.offset;if(e>=this.message.length)throw Error("out of bound");const t=this.message.codePointAt(e);if(void 0===t)throw Error(`Offset ${e} is at invalid UTF-16 code unit boundary`);return t}error(e,t){return{val:null,err:{kind:e,message:this.message,location:t}}}bump(){if(this.isEOF())return;const e=this.char();10===e?(this.position.line+=1,this.position.column=1,this.position.offset+=1):(this.position.column+=1,this.position.offset+=e<65536?1:2)}bumpIf(e){if(this.message.startsWith(e,this.offset())){for(let t=0;t<e.length;t++)this.bump();return!0}return!1}bumpUntil(e){const t=this.offset(),i=this.message.indexOf(e,t);return i>=0?(this.bumpTo(i),!0):(this.bumpTo(this.message.length),!1)}bumpTo(e){if(this.offset()>e)throw Error(`targetOffset ${e} must be greater than or equal to the current offset ${this.offset()}`);for(e=Math.min(e,this.message.length);;){const t=this.offset();if(t===e)break;if(t>e)throw Error(`targetOffset ${e} is at invalid UTF-16 code unit boundary`);if(this.bump(),this.isEOF())break}}bumpSpace(){for(;!this.isEOF()&&hi(this.char());)this.bump()}peek(){if(this.isEOF())return null;const e=this.char(),t=this.offset();return this.message.charCodeAt(t+(e>=65536?2:1))??null}}function li(e){return e>=97&&e<=122||e>=65&&e<=90}function ci(e){return 45===e||46===e||e>=48&&e<=57||95===e||e>=97&&e<=122||e>=65&&e<=90||183==e||e>=192&&e<=214||e>=216&&e<=246||e>=248&&e<=893||e>=895&&e<=8191||e>=8204&&e<=8205||e>=8255&&e<=8256||e>=8304&&e<=8591||e>=11264&&e<=12271||e>=12289&&e<=55295||e>=63744&&e<=64975||e>=65008&&e<=65533||e>=65536&&e<=983039}function hi(e){return e>=9&&e<=13||32===e||133===e||e>=8206&&e<=8207||8232===e||8233===e}function di(e){e.forEach(e=>{if(delete e.location,Gt(e)||Lt(e))for(const t in e.options)delete e.options[t].location,di(e.options[t].value);else Qt(e)&&$t(e.style)||(zt(e)||Ht(e))&&Kt(e.style)?delete e.style.location:Yt(e)&&di(e.children)})}function Ai(e,t={}){t={shouldParseSkeletons:!0,requiresOtherClause:!0,...t};const i=new ai(e,t).parse();if(i.err){const e=SyntaxError(Jt[i.err.kind]);throw e.location=i.err.location,e.originalMessage=i.err.message,e}return t?.captureLocation||di(i.val),i.val}let gi=function(e){return e.MISSING_VALUE="MISSING_VALUE",e.INVALID_VALUE="INVALID_VALUE",e.MISSING_INTL_API="MISSING_INTL_API",e}({});class ui extends Error{code;originalMessage;constructor(e,t,i){super(e),this.code=t,this.originalMessage=i}toString(){return`[formatjs Error: ${this.code}] ${this.message}`}}class _i extends ui{constructor(e,t,i,s){super(`Invalid values for "${e}": "${t}". Options are "${Object.keys(i).join('", "')}"`,gi.INVALID_VALUE,s)}}class pi extends ui{constructor(e,t,i){super(`Value for "${e}" must be of type ${t}`,gi.INVALID_VALUE,i)}}class fi extends ui{constructor(e,t){super(`The intl string context variable "${e}" was not provided to the string "${t}"`,gi.MISSING_VALUE,t)}}let wi=function(e){return e[e.literal=0]="literal",e[e.object=1]="object",e}({});function Ei(e){return"function"==typeof e}function mi(e,t,i,s,r,o,n){if(1===e.length&&Ut(e[0]))return[{type:wi.literal,value:e[0].value}];const a=[];for(const l of e){if(Ut(l)){a.push({type:wi.literal,value:l.value});continue}if(Nt(l)){"number"==typeof o&&a.push({type:wi.literal,value:i.getNumberFormat(t).format(o)});continue}const{value:e}=l;if(!r||!(e in r))throw new fi(e,n);let c=r[e];if(Ot(l))c&&"string"!=typeof c&&"number"!=typeof c&&"bigint"!=typeof c||(c="string"==typeof c||"number"==typeof c||"bigint"==typeof c?String(c):""),a.push({type:"string"==typeof c?wi.literal:wi.object,value:c});else{if(zt(l)){const e="string"==typeof l.style?s.date[l.style]:Kt(l.style)?l.style.parsedOptions:void 0;a.push({type:wi.literal,value:i.getDateTimeFormat(t,e).format(c)});continue}if(Ht(l)){const e="string"==typeof l.style?s.time[l.style]:Kt(l.style)?l.style.parsedOptions:s.time.medium;a.push({type:wi.literal,value:i.getDateTimeFormat(t,e).format(c)});continue}if(Qt(l)){const e="string"==typeof l.style?s.number[l.style]:$t(l.style)?l.style.parsedOptions:void 0;if(e&&e.scale){const t=e.scale||1;if("bigint"==typeof c){if(!Number.isInteger(t))throw new TypeError(`Cannot apply fractional scale ${t} to bigint value. Scale must be an integer when formatting bigint.`);c*=BigInt(t)}else c*=t}a.push({type:wi.literal,value:i.getNumberFormat(t,e).format(c)});continue}if(Yt(l)){const{children:e,value:c}=l,h=r[c];if(!Ei(h))throw new pi(c,"function",n);let d=h(mi(e,t,i,s,r,o).map(e=>e.value));Array.isArray(d)||(d=[d]),a.push(...d.map(e=>({type:"string"==typeof e?wi.literal:wi.object,value:e})))}if(Gt(l)){const e=c,o=(Object.prototype.hasOwnProperty.call(l.options,e)?l.options[e]:void 0)||l.options.other;if(!o)throw new _i(l.value,c,Object.keys(l.options),n);a.push(...mi(o.value,t,i,s,r));continue}if(Lt(l)){const e=`=${c}`;let o=Object.prototype.hasOwnProperty.call(l.options,e)?l.options[e]:void 0;if(!o){if(!Intl.PluralRules)throw new ui('Intl.PluralRules is not available in this environment.\nTry polyfilling it using "@formatjs/intl-pluralrules"\n',gi.MISSING_INTL_API,n);const e="bigint"==typeof c?Number(c):c,s=i.getPluralRules(t,{type:l.pluralType}).select(e-(l.offset||0));o=(Object.prototype.hasOwnProperty.call(l.options,s)?l.options[s]:void 0)||l.options.other}if(!o)throw new _i(l.value,c,Object.keys(l.options),n);const h="bigint"==typeof c?Number(c):c;a.push(...mi(o.value,t,i,s,r,h-(l.offset||0)));continue}}}return(l=a).length<2?l:l.reduce((e,t)=>{const i=e[e.length-1];return i&&i.type===wi.literal&&t.type===wi.literal?i.value+=t.value:e.push(t),e},[]);var l}function bi(e,t){return t?Object.keys(e).reduce((i,s)=>{var r,o;return i[s]=(r=e[s],(o=t[s])?{...r,...o,...Object.keys(r).reduce((e,t)=>(e[t]={...r[t],...o[t]},e),{})}:r),i},{...e}):e}function yi(e){return{create:()=>({get:t=>e[t],set(t,i){e[t]=i}})}}class Ci{ast;locales;resolvedLocale;formatters;formats;message;formatterCache={number:{},dateTime:{},pluralRules:{}};constructor(e,t=Ci.defaultLocale,i,s){if(this.locales=t,this.resolvedLocale=Ci.resolveLocale(t),"string"==typeof e){if(this.message=e,!Ci.__parse)throw new TypeError("IntlMessageFormat.__parse must be set to process `message` of type `string`");const{...t}=s||{};this.ast=Ci.__parse(e,{...t,locale:this.resolvedLocale})}else this.ast=e;if(!Array.isArray(this.ast))throw new TypeError("A message must be provided as a String or AST.");this.formats=bi(Ci.formats,i),this.formatters=s&&s.formatters||function(e={number:{},dateTime:{},pluralRules:{}}){return{getNumberFormat:At((...e)=>new Intl.NumberFormat(...e),{cache:yi(e.number),strategy:mt.variadic}),getDateTimeFormat:At((...e)=>new Intl.DateTimeFormat(...e),{cache:yi(e.dateTime),strategy:mt.variadic}),getPluralRules:At((...e)=>new Intl.PluralRules(...e),{cache:yi(e.pluralRules),strategy:mt.variadic})}}(this.formatterCache)}format=e=>{const t=this.formatToParts(e);if(1===t.length)return t[0].value;const i=t.reduce((e,t)=>(e.length&&t.type===wi.literal&&"string"==typeof e[e.length-1]?e[e.length-1]+=t.value:e.push(t.value),e),[]);return i.length<=1?i[0]||"":i};formatToParts=e=>mi(this.ast,this.locales,this.formatters,this.formats,e,void 0,this.message);resolvedOptions=()=>({locale:this.resolvedLocale?.toString()||Intl.NumberFormat.supportedLocalesOf(this.locales)[0]});getAst=()=>this.ast;static memoizedDefaultLocale=null;static get defaultLocale(){return Ci.memoizedDefaultLocale||(Ci.memoizedDefaultLocale=(new Intl.NumberFormat).resolvedOptions().locale),Ci.memoizedDefaultLocale}static resolveLocale=e=>{if(void 0===Intl.Locale)return;const t=Intl.NumberFormat.supportedLocalesOf(e);return t.length>0?new Intl.Locale(t[0]):new Intl.Locale("string"==typeof e?e:e[0])};static __parse=Ai;static formats={number:{integer:{maximumFractionDigits:0},currency:{style:"currency"},percent:{style:"percent"}},date:{short:{month:"numeric",day:"numeric",year:"2-digit"},medium:{month:"short",day:"numeric",year:"numeric"},long:{month:"long",day:"numeric",year:"numeric"},full:{weekday:"long",month:"long",day:"numeric",year:"numeric"}},time:{short:{hour:"numeric",minute:"numeric"},medium:{hour:"numeric",minute:"numeric",second:"numeric"},long:{hour:"numeric",minute:"numeric",second:"numeric",timeZoneName:"short"},full:{hour:"numeric",minute:"numeric",second:"numeric",timeZoneName:"short"}}}}const vi={en:{common:{save:"Save",saving:"Saving...",cancel:"Cancel",delete:"Delete",close:"Close",add:"Add",discard:"Discard",loading:"Loading..."},furniture:{armchair:"Armchair",bath:"Bath",bedside_table:"Bedside table",bidet:"Bidet",car:"Car",carpet:"Carpet",cat_bed:"Cat bed",cabinet:"Cabinet",ceiling_fan:"Ceiling fan",counter:"Counter",cupboard:"Cupboard",desk:"Desk",dog_bed:"Dog bed",dining_table:"Dining table",door_left_swing:"Door (left swing)",door_right_swing:"Door (right swing)",double_bed:"Double bed",fridge:"Fridge",hot_tub:"Hot tub",kitchen_island:"Kitchen island",lamp:"Lamp",oven_stove:"Oven / stove",plant:"Plant",pool:"Pool",round_table:"Round table",shower:"Shower",side_table:"Side table",single_bed:"Single bed",sliding_door:"Sliding door",sofa_2_seat:"Sofa (2 seat)",sofa_3_seat:"Sofa (3 seat)",speaker:"Speaker",tv:"TV",washbasin:"Wash basin",washing_machine:"Washing machine",toilet:"Toilet",window:"Window",custom_icon:"Custom icon",custom:"Custom",search_placeholder:"Search furniture..."},corners:{front_left:"Front-left",front_right:"Front-right",back_right:"Back-right",back_left:"Back-left",left_wall:"left wall",right_wall:"right wall",front_wall:"front wall",back_wall:"back wall"},wizard:{how_calibration_works:"How room calibration works",calibrate_room_size:"Calibrate room size",begin_marking:"Start calibration",mark_corner:"Mark {corner}",recording:"Recording... {current}s / {total}s",paused:"Paused — need exactly one target visible",stand_still:"Stand still",no_target:"No target detected. Make sure you are visible to the sensor.",multiple_targets:"Multiple targets detected. Only one person should be in the room during calibration.",save_prompt:"Click Save to store this room's calibration, or click a corner above to re-mark it.",save_failed:"Saving the calibration failed. Check that the device is online and try again.",invalid_corners:"The marked corners don't form a valid room shape. Re-mark the corners and try again.",walk_instruction_full:"<strong>Walk to each corner</strong> in order (1 → 2 → 3 → 4) and click Mark. Stand still for a few seconds so the sensor can lock on.",cant_reach:"<strong>Can't reach a corner?</strong> Stand as close as you can and enter the distance from each wall in the offset fields — like corner 4 in the diagram above, where a plant is in the way.",corner_sensor_hint:"In this example, your sensor is mounted in Corner 2, but it can be anywhere. You can stand right in front of it.",walk_instruction:"Walk to each corner of the room and click Mark. The sensor will record your position over {duration} seconds.",corner_step:"Corner {index}/4: Walk to the {corner}",distance_from:"Distance from:",distance_from_side:"Distance from {wall} (cm)",front_wall_label:"Front wall (sensor side)",back_wall_label:"Back wall",sensor:"Sensor",no_presence:"No presence",dont_show_again:"Don't show this again"},dialogs:{delete_calibration_title:"Delete room calibration?",delete_calibration_body:"This will also delete all detection zones and furniture. This cannot be undone.",unsaved_changes:"You have unsaved changes",unsaved_changes_body:"Your changes will be lost if you navigate away without applying.",backup_configuration:"Backup configuration",restore_configuration:"Restore configuration",no_configurations:"No saved configurations.",configuration_name:"Configuration name"},menu:{settings:"Settings",room_calibration:"Calibrate room size",delete_calibration:"Delete room calibration",detection_zones:"Detection zones",furniture:"Furniture",overlays:"Overlays"},settings:{title:"Settings",detection_ranges:"Detection Ranges",sensor_calibration:"Sensor Calibration",entities:"Entities",target_sensor:"Target Sensor",stuck_target_timeout:"Stuck target timeout",static_sensor:"Static Sensor",motion_sensor:"Motion Sensor",environmental:"Environmental",auto:"Auto",max_distance:"Max distance",min_distance:"Min distance",presence_timeout:"Presence timeout",trigger_threshold:"Trigger threshold",renew_threshold:"Renew threshold",illuminance_offset:"Illuminance offset",humidity_offset:"Humidity offset",temperature_offset:"Temperature offset",presence_delay:"Presence delay",furthest_point:"Current furthest point from sensor:",logging:"Logging",log_system:"System",log_epp:"Zone Engine",log_led:"LED",log_networking:"Network",log_ble:"Bluetooth",log_co2:"CO2",led_and_relay:"LED and Relay",led:"LED",led_mode:"Mode",led_brightness:"Brightness",led_presence_color:"Occupancy color",manual_control:"Manual Control",presence:"Occupancy",environmental_presence:"Environmental + Occupancy",relay:"Relay",relay_trigger_mode:"Trigger Mode",relay_contact_mode:"Contact Mode",relay_disabled:"Disabled",relay_motion:"Motion Only",relay_presence:"Presence Only",relay_occupancy:"Occupancy",relay_normally_open:"Normally Open (NO)",relay_normally_closed:"Normally Closed (NC)",update_rate:"Update rate",reset_to_default:"Reset to default",show_info:"Show info",frequency:{"5hz":"5 Hz","2hz":"2 Hz","1hz":"1 Hz","0_5hz":"0.5 Hz"},log_level:{none:"None",error:"Error",warning:"Warning",info:"Info",debug:"Debug"}},sidebar:{detection_zones:"Detection zones",furniture:"Furniture",overlays:"Overlays",live_overview:"Live overview",add_zone:"Add zone",rest_of_room:"Rest of room",room:"Room"},zones:{type:"Type",default:"Default",bed:"Bed",seating:"Seating",transit:"Transit",custom:"Custom",trigger:"Trigger",renew:"Renew",presence_timeout:"Presence timeout",handoff_timeout:"Handoff timeout",seconds_suffix:"s",remove_zone:"Remove zone"},overlays:{entry_exit:"Entry / Exit",interference:"Interference",suppress:"Suppress",click_to_paint:"Click to paint"},live:{presence:"Presence",detected:"Detected",clear:"Clear",show_info:"Show info",environment:"Environment",occupancy:"Occupancy",static_presence:"Static presence",motion_presence:"Motion presence",target_presence:"Target presence",mmwave:"mmWave",delete_target:"Delete target",mark_interference:"Mark as interference source",suppress_detection:"Suppress detection",grid_dimensions:"{width, number, ::.0}m × {depth, number, ::.0}m · Furthest point: {furthest, number, ::.0}m",illuminance_value:"{value, number, ::.0} lux",temperature_value:"{value, number, ::.0} °C",humidity_value:"{value, number, ::.0} %",co2_value:"{value, number} ppm",debug:{detection_events:"Detection events",copy_all:"Copy all",clear:"Clear",waiting_for_events:"Waiting for events...",static:"Static",motion:"Motion",occ:"Occ",on:"on",off:"off",active:"active",pending:"pending",inactive:"inactive",occupied:"occupied",room:"Room",no_targets:"no targets",all_clear:"all clear",zone_n:"Zone {n}"}},entities:{room_level:"Room level",zone_level:"Zone level",target_level:"Target level",occupancy:"Occupancy",static_presence:"Static presence",motion_presence:"Motion presence",target_presence:"Target presence",mmwave:"mmWave presence",target_count:"Target count",zone_presence:"Presence",zone_target_count:"Target count",xy:"XY position",active:"Active",target_signal:"Signal",target_zone:"Zone",illuminance:"Illuminance",humidity:"Humidity",temperature:"Temperature",co2:"CO₂"},info:{occupancy:"Combined occupancy from all sources — PIR motion, static mmWave presence, and zone tracking. Shows detected if any source detects presence.",static_presence:"mmWave radar detects stationary people by measuring micro-movements like breathing. Works through furniture and blankets.",motion_presence:"Passive infrared sensor detects movement by sensing body heat. Fast response but only triggers on motion, not stationary presence.",target_presence:"Whether any target is actively tracked by the mmWave radar. Detected when at least one target point is being reported.",mmwave:"Combines static mmWave presence and the target tracker, ignoring the PIR motion sensor. Detected when either source is on, except while the static sensor is off and the target tracker is only pending.",zone_occupancy:"Zone {slot} occupancy. Currently {count} {count, plural, one {target} other {targets}} detected. Sensitivity determines how many consecutive frames are needed to confirm presence.",rest_of_room_occupancy:"Covers the entire room outside of any defined zones. Currently {count} {count, plural, one {target} other {targets}} detected.",target_auto_range:"Automatically set max distance from room dimensions.",target_max_distance:"Maximum detection distance for the target sensor (LD2450). Hardware limit: 6m.",stuck_target_timeout:"Auto-dismiss a target reported at exactly the same coordinates for this many seconds. Set to 0 to disable. Default is 300 seconds (5 minutes).",static_min_distance:"Minimum detection distance for the static sensor.",static_max_distance:"Maximum detection distance for the static sensor. Hardware limit: 16m.",motion_timeout:"Time after last motion before the motion sensor clears.",static_timeout:"Time after last static detection before the sensor clears.",trigger_threshold:"Minimum signal strength needed to initially detect static presence. Higher = harder to trigger.",renew_threshold:"Minimum signal strength needed to maintain static presence detection. Higher = harder to renew.",illuminance_offset:"Adjust the illuminance reading by a fixed amount.",humidity_offset:"Adjust the humidity reading by a fixed amount.",temperature_offset:"Adjust the temperature reading by a fixed amount.",presence_delay:"Delay before reporting presence after initial detection. Helps filter brief false positives.",room_occupancy:"Combined room occupancy from all sensors.",room_static:"mmWave static presence detection.",room_motion:"PIR motion detection.",room_target_presence:"Whether any target is actively tracked.",room_mmwave:"Combined static mmWave + target tracker, ignoring PIR motion. Off when only the target tracker is pending and static is inactive.",room_target_count:"Number of targets detected in the room.",zone_presence:"Per-zone occupancy based on target tracking.",zone_target_count:"Number of targets in each zone.",xy:"XY coordinates mapped to the room grid.",active:"Whether each target slot is actively tracking.",target_signal:"Signal strength for each target (higher = stronger detection).",target_zone:"Which zone each target is currently in.",illuminance:"BH1750 illuminance sensor.",humidity:"SHTC3 humidity sensor.",temperature:"SHTC3 temperature sensor.",co2:"SCD40 CO₂ sensor (optional module).",log_system:"Framework logs including OTA, API, mDNS, I2C, and sensor drivers.",log_epp:"Zone engine logs — zone detection, target tracking, and configuration.",log_led:"LED control script logs — mode transitions and decision tree.",log_networking:"WiFi or Ethernet connection and DHCP logs.",log_ble:"Bluetooth Low Energy scanner and proxy logs.",log_co2:"CO2 sensor (SCD4x) logs.",led_mode:"Controls the RGB LED behavior. Manual Control disables automatic LED and lets you control it as a standard HA light entity.",led_brightness:"Brightness multiplier for the RGB LED in automatic modes.",led_presence_color:"Color used for occupancy indication when LED is in Occupancy or Environmental + Occupancy mode.",relay_trigger_mode:"What activates the relay. Disabled leaves the relay under manual control via the relay switch entity. Any other mode follows the chosen presence signal automatically and overrides manual control.",relay_contact_mode:'Normally Open closes the relay when the trigger fires (typical "active = closed"). Normally Closed opens it instead — useful for security circuits that expect a closed loop in the idle state.'},dimensions:{width_cm:"W (cm)",height_cm:"H (cm)",rotation:"Rot"},protocol:{firmware_behind:"This sensor's firmware needs to be updated to work with this version of the integration.",firmware_ahead:"This sensor's firmware is newer than the integration. Update the Everything Presence Pro Grid integration via HACS.",open_hacs:"Open in HACS",unavailable:"Device is offline — firmware version cannot be determined.",update_firmware:"Update Firmware"},tabs:{device_configuration:"Device Configuration",flash_firmware:"Flash Firmware",help:"Open user guide"},flasher:{title:"Flash Firmware",devices_on_network:"Installed Devices",no_devices:"No Everything Presence Pro devices installed.",no_eppgrid_devices:"No devices with Everything Presence Pro Grid firmware found.",flash_from_tab:"Flash your devices from the Flash Firmware tab",offline:"Offline",online:"Online",usb_title:"USB Connection",usb_flash_title:"Flash Firmware",usb_flash_desc:"Install or update firmware and configure WiFi.",usb_wifi_title:"Configure WiFi",usb_wifi_desc:"Set up WiFi on an already flashed device.",usb_browser_warning:"USB flashing requires Chrome or Edge browser.",select_variant:"Select firmware variant:",cancelling:"Cancelling...",wifi:"WiFi",ethernet:"Ethernet",go_to_config:"Go to Device Configuration",flash_usb:"Flash firmware over USB",loading:"Loading devices...",configure_wifi:"Configure WiFi",scan:"Scan Again",select_a_network:"Select a network...",manual_ssid:"Enter SSID manually (hidden network)",enter_ssid:"Enter SSID",wifi_password:"WiFi password",show_password:"Show password",ip_address:"IP Address: {ip}",connect:"Connect",usb_flash:"Flash via USB",usb_step_connecting:"Connecting to device...",usb_step_wifi_check:"Checking existing WiFi connection...",usb_step_flashing:"Flashing firmware {version}...",usb_step_scanning:"Scanning for WiFi networks...",wifi_scan_hint:"If the device is already connected to WiFi, scanning may not work. Use manual SSID entry instead.",usb_step_provisioning:"Configuring WiFi...",usb_step_wifi_connecting:"Connecting to WiFi...",usb_step_reading_ip:"Detecting device IP address...",wifi_configured:"WiFi configured successfully",configure_wifi_override:"Not this network? Configure WiFi",go_to_integrations:"Go to Integrations",copy_ip:"Copy IP address",retry_ha_add:"Retry adding to Home Assistant",flash_another:"Flash another device",ha_add:{adding:"Adding device to Home Assistant...",retrying:"Waiting for device to come online (attempt {attempt} of {max})...",added:"Device added to Home Assistant",already_added:"Device is already in Home Assistant",needs_auth:"Device reached — complete setup in Integrations to provide the encryption key",cannot_connect:"Couldn't reach the device on the network. Check that Home Assistant and the device are on the same network.",failed:"Failed to add: {reason}"},usb_ethernet_complete:"Firmware flashed successfully!",usb_ethernet_hint:"Connect the device to your network via ethernet cable. It will be automatically detected by ESPHome.",go_to_devices:"Go to Settings → Devices",usb_retry:"Retry",confirm_delete_title:"Remove old configuration?",confirm_delete_message:"This device was previously configured with the original firmware. The old configuration will be removed from Home Assistant.",update:"Update",integration_update:"Integration update needed",integration_outdated_title:"Integration update required",integration_outdated_body:"One or more devices have firmware that is newer than this version of the integration. Update the Everything Presence Pro Grid integration to restore full functionality.",open_hacs:"Open in HACS",ota_retry:"Retry",cancel:"Cancel",start_over:"Start over",cancelled_ip_hint:"Device reachable at {ip} — it should appear in Home Assistant discovery shortly.",errors:{start_failed:"Failed to start update. Is the device online?",connect_failed:"Failed to connect to device",connection_lost:"Connection lost during update",update_timeout:"Update timed out",device_offline:"Device went offline during update",update_failed_generic:"Update failed",ota_failed_version_unchanged:"Update failed — firmware version unchanged",ota_timeout:"OTA update timed out",ota_device_error:"Update failed: {message}",flash_cancelled:"Flash cancelled",timeout:"Timeout",aborted:"Cancelled",port_closed:"Serial connection lost — the device may have been unplugged. Reconnect it and try again."}},connection:{connecting:"Connecting to device...",offline:"Device is offline",failed:"Cannot connect to device",client_count:"{count} client(s) are currently connected.",check_connections:"Check for other browser tabs with this panel open, ESPHome log sessions, or additional Home Assistant instances.",retry:"Retry",ha_reconnecting:"Reconnecting to Home Assistant..."},usb:{errors:{serial_port_busy:"Serial port is busy from a previous operation. Refresh the page and try again.",serial_port_unavailable:"Serial port not available",device_disconnected:"Device disconnected. Unplug, plug it back in, and try again.",manifest_download_failed:"Failed to download firmware manifest",file_download_failed:"Failed to download firmware file: {file}",port_open_failed:"Could not open serial port. Unplug the device, plug it back in, and try again.",no_device_response:"No response from device — it may be flashed with ethernet firmware which does not support WiFi configuration.",base_url_required:"baseUrl is required for firmware download",flash_failed:"Firmware flash failed."}},wifi:{errors:{provisioning_failed:"WiFi provisioning failed",scan_failed:"WiFi scan failed",connection_failed:"WiFi connection failed — check SSID/password and try again",error_code:"WiFi error (code {code})",invalid_command:"Invalid command — device may need to be power-cycled",unknown_command:"Unknown command",not_authorized:"Not authorized",ssid_too_long:"WiFi network name is too long (max 32 bytes)",password_too_long:"WiFi password is too long (max 64 bytes)"}},errors:{apply_layout:"Saving the room layout failed. Check that the device is online and try again.",save_settings:"Saving the settings failed. Check that the device is online and try again.",save_configuration:"Saving the configuration backup failed. Try again.",load_configuration:"Restoring the configuration failed. It may be in an old format — re-save it and try again."}},es:{common:{save:"Guardar",saving:"Guardando...",cancel:"Cancelar",delete:"Eliminar",close:"Cerrar",add:"Añadir",discard:"Descartar",loading:"Cargando..."},furniture:{armchair:"Sillón",bath:"Bañera",bedside_table:"Mesita de noche",bidet:"Bidé",car:"Coche",carpet:"Alfombra",cat_bed:"Cama para gato",cabinet:"Armario",ceiling_fan:"Ventilador de techo",counter:"Mostrador",cupboard:"Alacena",desk:"Escritorio",dog_bed:"Cama para perro",dining_table:"Mesa de comedor",door_left_swing:"Puerta (apertura izquierda)",door_right_swing:"Puerta (apertura derecha)",double_bed:"Cama doble",fridge:"Nevera",hot_tub:"Jacuzzi",kitchen_island:"Isla de cocina",lamp:"Lámpara",oven_stove:"Horno / cocina",plant:"Planta",pool:"Piscina",round_table:"Mesa redonda",shower:"Ducha",side_table:"Mesa auxiliar",single_bed:"Cama individual",sliding_door:"Puerta corredera",sofa_2_seat:"Sofá (2 plazas)",sofa_3_seat:"Sofá (3 plazas)",speaker:"Altavoz",tv:"TV",washbasin:"Lavabo",washing_machine:"Lavadora",toilet:"Inodoro",window:"Ventana",custom_icon:"Icono personalizado",custom:"Personalizado",search_placeholder:"Buscar mobiliario..."},corners:{front_left:"Frente-izquierda",front_right:"Frente-derecha",back_right:"Fondo-derecha",back_left:"Fondo-izquierda",left_wall:"pared izquierda",right_wall:"pared derecha",front_wall:"pared frontal",back_wall:"pared del fondo"},wizard:{how_calibration_works:"Cómo funciona la calibración de la habitación",calibrate_room_size:"Calibrar tamaño de la habitación",begin_marking:"Iniciar calibración",mark_corner:"Marcar {corner}",recording:"Grabando... {current}s / {total}s",paused:"En pausa — se necesita exactamente un objetivo visible",stand_still:"Permanece inmóvil",no_target:"No se detecta ningún objetivo. Asegúrate de que el sensor pueda verte.",multiple_targets:"Se detectan varios objetivos. Solo debe haber una persona en la habitación durante la calibración.",save_prompt:"Haz clic en Guardar para almacenar la calibración de esta habitación, o haz clic en una esquina superior para volver a marcarla.",save_failed:"No se pudo guardar la calibración. Comprueba que el dispositivo está en línea y vuelve a intentarlo.",invalid_corners:"Las esquinas marcadas no forman una sala válida. Vuelve a marcar las esquinas e inténtalo de nuevo.",walk_instruction_full:"<strong>Camina hasta cada esquina</strong> en orden (1 → 2 → 3 → 4) y haz clic en Marcar. Permanece inmóvil unos segundos para que el sensor pueda registrar tu posición.",cant_reach:"<strong>¿No puedes llegar a una esquina?</strong> Acércate todo lo que puedas e introduce la distancia a cada pared en los campos de desplazamiento, como en la esquina 4 del diagrama superior, donde hay una planta en el camino.",corner_sensor_hint:"En este ejemplo, el sensor está montado en la esquina 2, pero puede estar en cualquier lugar. Puedes colocarte justo delante de él.",walk_instruction:"Camina hasta cada esquina de la habitación y haz clic en Marcar. El sensor registrará tu posición durante {duration} segundos.",corner_step:"Esquina {index}/4: Camina hasta la {corner}",distance_from:"Distancia desde:",distance_from_side:"Distancia desde {wall} (cm)",front_wall_label:"Pared frontal (lado del sensor)",back_wall_label:"Pared del fondo",sensor:"Sensor",no_presence:"Sin presencia",dont_show_again:"No mostrar esto de nuevo"},dialogs:{delete_calibration_title:"¿Eliminar la calibración de la habitación?",delete_calibration_body:"Esto también eliminará todas las zonas de detección y el mobiliario. Esta acción no se puede deshacer.",unsaved_changes:"Tienes cambios sin guardar",unsaved_changes_body:"Los cambios se perderán si navegas a otra página sin aplicarlos.",backup_configuration:"Respaldar configuración",restore_configuration:"Restaurar configuración",no_configurations:"No hay configuraciones guardadas.",configuration_name:"Nombre de la configuración"},menu:{settings:"Ajustes",room_calibration:"Calibrar tamaño de la habitación",delete_calibration:"Eliminar calibración de la habitación",detection_zones:"Zonas de detección",furniture:"Mobiliario",overlays:"Capas"},settings:{title:"Ajustes",detection_ranges:"Rangos de detección",sensor_calibration:"Calibración del sensor",entities:"Entidades",target_sensor:"Sensor de objetivos",stuck_target_timeout:"Tiempo de objetivo atascado",static_sensor:"Sensor estático",motion_sensor:"Sensor de movimiento",environmental:"Ambiental",auto:"Auto",max_distance:"Distancia máxima",min_distance:"Distancia mínima",presence_timeout:"Tiempo de espera de presencia",trigger_threshold:"Umbral de activación",renew_threshold:"Umbral de renovación",illuminance_offset:"Desplazamiento de iluminancia",humidity_offset:"Desplazamiento de humedad",temperature_offset:"Desplazamiento de temperatura",presence_delay:"Retardo de presencia",furthest_point:"Punto más lejano actual del sensor:",logging:"Registro",log_system:"Sistema",log_epp:"Motor de zonas",log_led:"LED",log_networking:"Red",log_ble:"Bluetooth",log_co2:"CO2",led_and_relay:"LED y relé",led:"LED",led_mode:"Modo",led_brightness:"Brillo",led_presence_color:"Color de ocupación",manual_control:"Control manual",presence:"Ocupación",environmental_presence:"Ambiental + Ocupación",relay:"Relé",relay_trigger_mode:"Modo de activación",relay_contact_mode:"Modo de contacto",relay_disabled:"Desactivado",relay_motion:"Solo movimiento",relay_presence:"Solo presencia",relay_occupancy:"Ocupación",relay_normally_open:"Normalmente abierto (NA)",relay_normally_closed:"Normalmente cerrado (NC)",update_rate:"Frecuencia de actualización",reset_to_default:"Restablecer valores predeterminados",show_info:"Mostrar información",frequency:{"5hz":"5 Hz","2hz":"2 Hz","1hz":"1 Hz","0_5hz":"0,5 Hz"},log_level:{none:"Ninguno",error:"Error",warning:"Advertencia",info:"Información",debug:"Depuración"}},sidebar:{detection_zones:"Zonas de detección",furniture:"Mobiliario",overlays:"Capas",live_overview:"Vista en directo",add_zone:"Añadir zona",rest_of_room:"Resto de la habitación",room:"Habitación"},zones:{type:"Tipo",default:"Predeterminado",bed:"Cama",seating:"Asiento",transit:"Tránsito",custom:"Personalizado",trigger:"Activación",renew:"Renovación",presence_timeout:"Tiempo de espera de presencia",handoff_timeout:"Tiempo de espera de transferencia",seconds_suffix:"s",remove_zone:"Eliminar zona"},overlays:{entry_exit:"Entrada / Salida",interference:"Interferencia",suppress:"Suprimir",click_to_paint:"Haz clic para pintar"},live:{presence:"Presencia",detected:"Detectado",clear:"Sin detección",show_info:"Mostrar información",environment:"Entorno",occupancy:"Ocupación",static_presence:"Presencia estática",motion_presence:"Presencia en movimiento",target_presence:"Presencia de objetivo",mmwave:"mmWave",delete_target:"Eliminar objetivo",mark_interference:"Marcar como fuente de interferencia",suppress_detection:"Suprimir detección",grid_dimensions:"{width, number, ::.0}m × {depth, number, ::.0}m · Punto más lejano: {furthest, number, ::.0}m",illuminance_value:"{value, number, ::.0} lux",temperature_value:"{value, number, ::.0} °C",humidity_value:"{value, number, ::.0} %",co2_value:"{value, number} ppm",debug:{detection_events:"Eventos de detección",copy_all:"Copiar todo",clear:"Borrar",waiting_for_events:"Esperando eventos...",static:"Estático",motion:"Movimiento",occ:"Ocup",on:"sí",off:"no",active:"activo",pending:"pendiente",inactive:"inactivo",occupied:"ocupada",room:"Habitación",no_targets:"sin objetivos",all_clear:"todo despejado",zone_n:"Zona {n}"}},entities:{room_level:"Nivel de habitación",zone_level:"Nivel de zona",target_level:"Nivel de objetivo",occupancy:"Ocupación",static_presence:"Presencia estática",motion_presence:"Presencia en movimiento",target_presence:"Presencia de objetivo",mmwave:"Presencia mmWave",target_count:"Número de objetivos",zone_presence:"Presencia",zone_target_count:"Número de objetivos",xy:"Posición XY",active:"Activo",target_signal:"Señal",target_zone:"Zona",illuminance:"Iluminancia",humidity:"Humedad",temperature:"Temperatura",co2:"CO₂"},info:{occupancy:"Ocupación combinada de todas las fuentes: sensor PIR de movimiento, presencia estática por radar mmWave y seguimiento de zonas. Muestra «detectado» si alguna fuente detecta presencia.",static_presence:"El radar mmWave detecta personas inmóviles midiendo micromovimientos como la respiración. Funciona a través de muebles y mantas.",motion_presence:"El sensor infrarrojo pasivo detecta movimiento captando el calor corporal. Respuesta rápida, pero solo se activa con movimiento, no con presencia estática.",target_presence:"Indica si el radar mmWave está rastreando activamente algún objetivo. Se muestra como detectado cuando se está reportando al menos un punto objetivo.",mmwave:"Combina la presencia mmWave estática y el seguimiento de objetivos, ignorando el sensor PIR de movimiento. Detectado cuando alguna de las dos fuentes está activa, salvo cuando el sensor estático está apagado y el seguimiento de objetivos solo está pendiente.",zone_occupancy:"Ocupación de la zona {slot}. Actualmente se detectan {count} {count, plural, one {objetivo} other {objetivos}}. La sensibilidad determina cuántos fotogramas consecutivos son necesarios para confirmar presencia.",rest_of_room_occupancy:"Cubre toda la habitación fuera de las zonas definidas. Actualmente se detectan {count} {count, plural, one {objetivo} other {objetivos}}.",target_auto_range:"Establece automáticamente la distancia máxima a partir de las dimensiones de la habitación.",target_max_distance:"Distancia máxima de detección para el sensor de objetivos (LD2450). Límite hardware: 6 m.",stuck_target_timeout:"Descarta automáticamente un objetivo reportado exactamente en las mismas coordenadas durante este número de segundos. Establece 0 para deshabilitar. Por defecto 300 segundos (5 minutos).",static_min_distance:"Distancia mínima de detección para el sensor estático.",static_max_distance:"Distancia máxima de detección para el sensor estático. Límite hardware: 16 m.",motion_timeout:"Tiempo tras el último movimiento antes de que el sensor de movimiento se limpie.",static_timeout:"Tiempo tras la última detección estática antes de que el sensor se limpie.",trigger_threshold:"Intensidad de señal mínima necesaria para detectar inicialmente presencia estática. Más alto = más difícil de activar.",renew_threshold:"Intensidad de señal mínima necesaria para mantener la detección de presencia estática. Más alto = más difícil de renovar.",illuminance_offset:"Ajusta la lectura de iluminancia en un valor fijo.",humidity_offset:"Ajusta la lectura de humedad en un valor fijo.",temperature_offset:"Ajusta la lectura de temperatura en un valor fijo.",presence_delay:"Retardo antes de notificar presencia tras la detección inicial. Ayuda a filtrar falsos positivos breves.",room_occupancy:"Ocupación combinada de la habitación procedente de todos los sensores.",room_static:"Detección de presencia estática por radar mmWave.",room_motion:"Detección de movimiento por PIR.",room_target_presence:"Indica si se está rastreando activamente algún objetivo.",room_mmwave:"Presencia mmWave estática + seguimiento de objetivos, ignorando el PIR de movimiento. Apagado si el sensor estático está inactivo y el seguimiento solo está pendiente.",room_target_count:"Número de objetivos detectados en la habitación.",zone_presence:"Ocupación por zona basada en el seguimiento de objetivos.",zone_target_count:"Número de objetivos en cada zona.",xy:"Coordenadas XY mapeadas a la cuadrícula de la habitación.",active:"Indica si cada ranura de objetivo está rastreando activamente.",target_signal:"Intensidad de señal de cada objetivo (más alta = detección más sólida).",target_zone:"Zona en la que se encuentra actualmente cada objetivo.",illuminance:"Sensor de iluminancia BH1750.",humidity:"Sensor de humedad SHTC3.",temperature:"Sensor de temperatura SHTC3.",co2:"Sensor de CO₂ SCD40 (módulo opcional).",log_system:"Registros del framework: OTA, API, mDNS, I2C y controladores de sensores.",log_epp:"Registros del motor de zonas: detección de zonas, seguimiento de objetivos y configuración.",log_led:"Registros del script de control del LED: transiciones de modo y árbol de decisión.",log_networking:"Registros de conexión WiFi o Ethernet y DHCP.",log_ble:"Registros del escáner y proxy Bluetooth de baja energía.",log_co2:"Registros del sensor de CO2 (SCD4x).",led_mode:"Controla el comportamiento del LED RGB. El control manual desactiva el LED automático y permite controlarlo como una entidad de luz estándar de HA.",led_brightness:"Multiplicador de brillo para el LED RGB en los modos automáticos.",led_presence_color:"Color utilizado para indicar ocupación cuando el LED está en modo Ocupación o Ambiental + Ocupación.",relay_trigger_mode:"Qué activa el relé. Desactivado deja el relé bajo control manual a través de la entidad de interruptor del relé. Cualquier otro modo sigue automáticamente la señal de presencia elegida y anula el control manual.",relay_contact_mode:'Normalmente abierto cierra el relé cuando se dispara el activador (típico "activo = cerrado"). Normalmente cerrado lo abre en su lugar — útil para circuitos de seguridad que esperan un bucle cerrado en estado inactivo.'},dimensions:{width_cm:"An (cm)",height_cm:"Al (cm)",rotation:"Rot"},protocol:{firmware_behind:"El firmware de este sensor debe actualizarse para funcionar con esta versión de la integración.",firmware_ahead:"El firmware de este sensor es más reciente que la integración. Actualiza la integración Everything Presence Pro Grid desde HACS.",open_hacs:"Abrir en HACS",unavailable:"El dispositivo no está disponible — no se puede determinar la versión del firmware.",update_firmware:"Actualizar firmware"},tabs:{device_configuration:"Configuración del dispositivo",flash_firmware:"Instalar firmware",help:"Abrir la guía del usuario"},flasher:{title:"Instalar firmware",devices_on_network:"Dispositivos instalados",no_devices:"No hay dispositivos Everything Presence Pro instalados.",no_eppgrid_devices:"No se han encontrado dispositivos con firmware Everything Presence Pro Grid.",flash_from_tab:"Instala el firmware de tus dispositivos desde la pestaña Instalar firmware",offline:"Sin conexión",online:"Conectado",usb_title:"Conexión USB",usb_flash_title:"Instalar firmware",usb_flash_desc:"Instala o actualiza el firmware y configura el WiFi.",usb_wifi_title:"Configurar WiFi",usb_wifi_desc:"Configura el WiFi en un dispositivo que ya tiene firmware instalado.",usb_browser_warning:"La instalación por USB requiere el navegador Chrome o Edge.",select_variant:"Selecciona la variante de firmware:",cancelling:"Cancelando...",wifi:"WiFi",ethernet:"Ethernet",go_to_config:"Ir a la configuración del dispositivo",flash_usb:"Instalar firmware por USB",loading:"Cargando dispositivos...",configure_wifi:"Configurar WiFi",scan:"Buscar de nuevo",select_a_network:"Selecciona una red...",manual_ssid:"Introducir SSID manualmente (red oculta)",enter_ssid:"Introducir SSID",wifi_password:"Contraseña WiFi",show_password:"Mostrar contraseña",ip_address:"Dirección IP: {ip}",connect:"Conectar",usb_flash:"Instalar por USB",usb_step_connecting:"Conectando al dispositivo...",usb_step_wifi_check:"Comprobando conexión WiFi existente...",usb_step_flashing:"Instalando firmware {version}...",usb_step_scanning:"Buscando redes WiFi...",wifi_scan_hint:"Si el dispositivo ya está conectado al WiFi, es posible que la búsqueda no funcione. Usa la entrada manual de SSID en su lugar.",usb_step_provisioning:"Configurando WiFi...",usb_step_wifi_connecting:"Conectando al WiFi...",usb_step_reading_ip:"Detectando la dirección IP del dispositivo...",wifi_configured:"WiFi configurado correctamente",configure_wifi_override:"¿No es esta red? Configurar WiFi",go_to_integrations:"Ir a Integraciones",copy_ip:"Copiar dirección IP",retry_ha_add:"Reintentar añadir a Home Assistant",flash_another:"Flashear otro dispositivo",ha_add:{adding:"Añadiendo dispositivo a Home Assistant...",retrying:"Esperando a que el dispositivo esté disponible (intento {attempt} de {max})...",added:"Dispositivo añadido a Home Assistant",already_added:"El dispositivo ya está en Home Assistant",needs_auth:"Dispositivo accesible — completa la configuración en Integraciones para proporcionar la clave de cifrado",cannot_connect:"No se pudo conectar al dispositivo en la red. Comprueba que Home Assistant y el dispositivo están en la misma red.",failed:"Error al añadir: {reason}"},usb_ethernet_complete:"¡Firmware instalado correctamente!",usb_ethernet_hint:"Conecta el dispositivo a tu red mediante cable Ethernet. ESPHome lo detectará automáticamente.",go_to_devices:"Ir a Ajustes → Dispositivos",usb_retry:"Reintentar",confirm_delete_title:"¿Eliminar la configuración antigua?",confirm_delete_message:"Este dispositivo se configuró anteriormente con el firmware original. La configuración antigua se eliminará de Home Assistant.",update:"Actualizar",integration_update:"Actualización de la integración necesaria",integration_outdated_title:"Se requiere actualización de la integración",integration_outdated_body:"Uno o más dispositivos tienen un firmware más reciente que esta versión de la integración. Actualiza la integración Everything Presence Pro Grid para restaurar toda la funcionalidad.",open_hacs:"Abrir en HACS",ota_retry:"Reintentar",cancel:"Cancelar",start_over:"Empezar de nuevo",cancelled_ip_hint:"El dispositivo es accesible en {ip} — debería aparecer en la detección de Home Assistant pronto.",errors:{start_failed:"No se ha podido iniciar la actualización. ¿El dispositivo está en línea?",connect_failed:"No se ha podido conectar al dispositivo",connection_lost:"Se perdió la conexión durante la actualización",update_timeout:"La actualización ha agotado el tiempo de espera",device_offline:"El dispositivo se desconectó durante la actualización",update_failed_generic:"Error en la actualización",ota_failed_version_unchanged:"Actualización fallida — la versión del firmware no ha cambiado",ota_timeout:"La actualización OTA ha agotado el tiempo de espera",ota_device_error:"Error en la actualización: {message}",flash_cancelled:"Instalación cancelada",timeout:"Tiempo de espera agotado",aborted:"Cancelado",port_closed:"Conexión serie perdida — puede que el dispositivo se haya desconectado. Vuelve a conectarlo e inténtalo de nuevo."}},connection:{connecting:"Conectando al dispositivo...",offline:"El dispositivo no está disponible",failed:"No se puede conectar al dispositivo",client_count:"Hay {count} cliente(s) conectados actualmente.",check_connections:"Comprueba si hay otras pestañas del navegador con este panel abierto, sesiones de registro de ESPHome o instancias adicionales de Home Assistant.",retry:"Reintentar",ha_reconnecting:"Reconectando a Home Assistant..."},usb:{errors:{serial_port_busy:"El puerto serie está ocupado por una operación anterior. Actualiza la página e inténtalo de nuevo.",serial_port_unavailable:"Puerto serie no disponible",device_disconnected:"Dispositivo desconectado. Desconéctalo, vuelve a conectarlo e inténtalo de nuevo.",manifest_download_failed:"No se ha podido descargar el manifiesto del firmware",file_download_failed:"No se ha podido descargar el archivo de firmware: {file}",port_open_failed:"No se ha podido abrir el puerto serie. Desconecta el dispositivo, vuelve a conectarlo e inténtalo de nuevo.",no_device_response:"Sin respuesta del dispositivo — puede que tenga instalado el firmware Ethernet, que no admite configuración WiFi.",base_url_required:"baseUrl es obligatorio para la descarga del firmware",flash_failed:"Error al instalar el firmware."}},wifi:{errors:{provisioning_failed:"Error al configurar el WiFi",scan_failed:"Error al buscar redes WiFi",connection_failed:"Error de conexión WiFi — comprueba el SSID y la contraseña e inténtalo de nuevo",error_code:"Error de WiFi (código {code})",invalid_command:"Comando no válido — puede que el dispositivo necesite reiniciarse",unknown_command:"Comando desconocido",not_authorized:"No autorizado",ssid_too_long:"El nombre de la red WiFi es demasiado largo (máximo 32 bytes)",password_too_long:"La contraseña WiFi es demasiado larga (máximo 64 bytes)"}},errors:{apply_layout:"No se pudo guardar la distribución de la habitación. Comprueba que el dispositivo está en línea e inténtalo de nuevo.",save_settings:"No se pudieron guardar los ajustes. Comprueba que el dispositivo está en línea e inténtalo de nuevo.",save_configuration:"No se pudo guardar la copia de seguridad de la configuración. Inténtalo de nuevo.",load_configuration:"No se pudo restaurar la configuración. Puede que esté en un formato antiguo — vuelve a guardarla e inténtalo de nuevo."}}},Bi=Object.assign(e=>e,{formatNumber:(e,t=1)=>e.toFixed(t),lang:"en"});function Si(e,t){const i=t.split(".");let s=e;for(const e of i){if(null==s||"object"!=typeof s)return;s=s[e]}return"string"==typeof s?s:void 0}const Ii=n`
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

  .configuration-name-input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 8px;
    font-size: 15px;
    box-sizing: border-box;
    background: var(--card-background-color, #fff);
    color: var(--primary-text-color, #212121);
  }

  .configuration-card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 12px;
  }

  .configuration-card {
    position: relative;
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    transition: box-shadow 0.15s;
  }

  .configuration-card:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  }

  .configuration-card:focus-visible,
  .configuration-card-delete:focus-visible {
    outline: 2px solid var(--primary-color, #03a9f4);
    outline-offset: 2px;
  }

  .configuration-card-thumbnail {
    background: var(--secondary-background-color, #f5f5f5);
    padding: 8px;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .configuration-card-thumbnail svg {
    width: 100%;
    height: 100%;
  }

  .configuration-card-info {
    padding: 6px 8px;
  }

  .configuration-card-name {
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .configuration-card-size {
    font-size: 10px;
    color: var(--secondary-text-color, #757575);
  }

  .configuration-card-delete {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: none;
    background: rgba(0, 0, 0, 0.4);
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    z-index: 1;
  }

  .configuration-card-delete:hover {
    background: var(--error-color, #f44336);
  }

  .configuration-card-delete ha-icon {
    --mdc-icon-size: 14px;
  }
`,Di=n`
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
`,xi=n`
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
`,Ri=n`
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
`,Mi=n`
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
`,ki=n`
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

  .panel-header ha-select {
    --mdc-typography-subtitle1-font-size: 16px;
    --mdc-typography-subtitle1-font-weight: 500;
    min-width: 200px;
  }
`;class Ti extends ce{constructor(){super(...arguments),this.localize=Bi,this.showBackup=!1,this.showRestore=!1,this.configurations=[],this.configurationName="",this.perspective=null,this.maxRangeMm=0,this.sensorFov=null,this._configurationMetricsCache=new WeakMap}_getConfigurationMetrics(e){const t=this.perspective,i=this.maxRangeMm,s=this._configurationMetricsCache.get(e);if(s&&s.perspective===t&&s.maxRangeMm===i)return{widthM:s.widthM,depthM:s.depthM};const r=dt(new Uint8Array(e.grid),e.roomWidth,t,this.sensorFov,i),o=r?r.widthM:e.roomWidth/1e3,n=r?r.depthM:e.roomDepth/1e3;return this._configurationMetricsCache.set(e,{perspective:t,maxRangeMm:i,widthM:o,depthM:n}),{widthM:o,depthM:n}}_dispatch(e,t){this.dispatchEvent(new CustomEvent(e,{detail:t,bubbles:!0,composed:!0}))}render(){return Y`
      ${this.showBackup?this._renderBackupDialog():J}
      ${this.showRestore?this._renderRestoreDialog():J}
    `}_renderBackupDialog(){return Y`
      <div class="template-dialog">
        <div class="template-dialog-card">
          <h3>${this.localize("dialogs.backup_configuration")}</h3>
          <input
            type="text"
            class="configuration-name-input"
            placeholder="${this.localize("dialogs.configuration_name")}"
            .value=${this.configurationName}
            @input=${e=>{this._dispatch("configuration-name-change",e.target.value)}}
          />
          <div class="template-dialog-actions">
            <button
              class="wizard-btn wizard-btn-back"
              @click=${()=>this._dispatch("backup-cancel")}
            >${this.localize("common.cancel")}</button>
            <button
              class="wizard-btn wizard-btn-primary"
              ?disabled=${!this.configurationName.trim()}
              @click=${()=>this._dispatch("configuration-save")}
            >${this.localize("common.save")}</button>
          </div>
        </div>
      </div>
    `}_renderRestoreDialog(){const e=this.configurations.filter(e=>Array.isArray(e.zones)&&8===e.zones.length);return Y`
      <div class="template-dialog">
        <div class="template-dialog-card">
          <h3>${this.localize("dialogs.restore_configuration")}</h3>
          ${0===e.length?Y`<p class="overlay-help">${this.localize("dialogs.no_configurations")}</p>`:Y`<div class="configuration-card-grid">
                  ${e.map(e=>Y`
                    <div class="configuration-card"
                      role="button"
                      tabindex="0"
                      @click=${()=>this._dispatch("configuration-load",e.name)}
                      @keydown=${t=>{"Enter"!==t.key&&" "!==t.key||(t.preventDefault(),this._dispatch("configuration-load",e.name))}}
                    >
                      <button class="configuration-card-delete"
                        type="button"
                        aria-label="${this.localize("common.delete")}"
                        @click=${t=>{t.stopPropagation(),this._dispatch("configuration-delete",e.name)}}
                        @keydown=${e=>{e.stopPropagation()}}
                      >
                        <ha-icon icon="mdi:close"></ha-icon>
                      </button>
                      <div class="configuration-card-thumbnail">
                        ${function(e,t,i,s,r){const o=e instanceof Uint8Array?e:new Uint8Array(e),n=Oe(o);if(n.minCol>n.maxCol||n.minRow>n.maxRow)return $`<svg viewBox="0 0 1 1" preserveAspectRatio="xMidYMid meet"></svg>`;const{minCol:a,maxCol:l,minRow:c,maxRow:h}=n,d=l-a+1,A=h-c+1,g=[],u=[],_=new Set,p=++et,f=e=>`overlay-${e}-${p}`;for(let e=c;e<=h;e++)for(let i=a;i<=l;i++){const s=o[e*Be+i];if(!Re(s))continue;const r=Ve(s,t);g.push($`<rect x="${i-a}" y="${e-c}" width="1" height="1" fill="${r}" />`);const n=i-a,l=e-c,h=Te(s);1===h?(_.add("entry"),u.push($`<rect x="${n}" y="${l}" width="1" height="1" fill="url(#${f("entry")})" />`)):2===h?(_.add("interference"),u.push($`<rect x="${n}" y="${l}" width="1" height="1" fill="url(#${f("interference")})" />`)):3===h&&(_.add("suppress"),u.push($`<rect x="${n}" y="${l}" width="1" height="1" fill="url(#${f("suppress")})" />`))}const w=_.size>0?$`<defs>
			${_.has("entry")?$`<pattern id="${f("entry")}" width="0.25" height="0.25" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
				<line x1="0" y1="0" x2="0" y2="0.25" stroke="rgba(80,80,80,0.5)" stroke-width="0.08" />
			</pattern>`:""}
			${_.has("interference")?$`<pattern id="${f("interference")}" width="0.25" height="0.25" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
				<line x1="0" y1="0" x2="0" y2="0.25" stroke="rgba(244,67,54,0.5)" stroke-width="0.08" />
			</pattern>`:""}
			${_.has("suppress")?$`<pattern id="${f("suppress")}" width="0.25" height="0.25" patternUnits="userSpaceOnUse">
				<line x1="0" y1="0" x2="0.25" y2="0.25" stroke="rgba(244,67,54,0.5)" stroke-width="0.06" />
				<line x1="0.25" y1="0" x2="0" y2="0.25" stroke="rgba(244,67,54,0.5)" stroke-width="0.06" />
			</pattern>`:""}
		</defs>`:"",E=He(i),m=[];for(const e of r){const t=e.x/De+E-a,i=e.y/De-c,s=e.width/De,r=e.height/De,o=t+s/2,n=i+r/2,l="svg"===e.type&&Object.hasOwn(Ne,e.icon)?Ne[e.icon]:void 0;if(l){const[a,c,h,d]=l.viewBox.split(" ").map(Number),A=s/h,g=r/d,u=[e.rotation?`rotate(${e.rotation}, ${o}, ${n})`:"",`translate(${t}, ${i})`,`scale(${A}, ${g})`,`translate(${-a}, ${-c})`].filter(Boolean);m.push($`<g transform="${u.join(" ")}">
					${be(l.content)}
				</g>`)}else{const a=e.rotation?`rotate(${e.rotation}, ${o}, ${n})`:"";m.push($`<rect x="${t}" y="${i}" width="${s}" height="${r}"
					fill="none" stroke="rgba(0,0,0,0.4)" stroke-width="0.15"
					rx="0.1" transform="${a}" />`)}}return $`<svg viewBox="0 0 ${d} ${A}" preserveAspectRatio="xMidYMid meet">
    ${w}
    ${g}
    ${u}
    ${m}
  </svg>`}(e.grid,e.zones?.slice(1)??new Array(7).fill(null),e.roomWidth,e.roomDepth,e.furniture??[])}
                      </div>
                      <div class="configuration-card-info">
                        <div class="configuration-card-name">${e.name}</div>
                        <div class="configuration-card-size">${(()=>{const{widthM:t,depthM:i}=this._getConfigurationMetrics(e);return`${this.localize.formatNumber(t,1)}m × ${this.localize.formatNumber(i,1)}m`})()}</div>
                      </div>
                    </div>
                  `)}
                </div>`}
          <div class="template-dialog-actions">
            <button
              class="wizard-btn wizard-btn-back"
              @click=${()=>this._dispatch("restore-close")}
            >${this.localize("common.close")}</button>
          </div>
        </div>
      </div>
    `}}Ti.styles=[Ii,Di,n`
      .overlay-help {
        font-size: 13px;
        color: var(--secondary-text-color, #757575);
        margin: 0;
      }
    `],e([ge({attribute:!1})],Ti.prototype,"localize",void 0),e([ge({type:Boolean})],Ti.prototype,"showBackup",void 0),e([ge({type:Boolean})],Ti.prototype,"showRestore",void 0),e([ge({attribute:!1})],Ti.prototype,"configurations",void 0),e([ge({type:String})],Ti.prototype,"configurationName",void 0),e([ge({attribute:!1})],Ti.prototype,"perspective",void 0),e([ge({type:Number})],Ti.prototype,"maxRangeMm",void 0),e([ge({attribute:!1})],Ti.prototype,"sensorFov",void 0),customElements.get("epp-configuration-dialogs")||customElements.define("epp-configuration-dialogs",Ti);
/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Fi=Symbol.for(""),Pi=e=>{if(e?.r===Fi)return e?._$litStatic$},Ui=(e,...t)=>({_$litStatic$:t.reduce((t,i,s)=>t+(e=>{if(void 0!==e._$litStatic$)return e._$litStatic$;throw Error(`Value passed to 'literal' function must be a 'literal' result: ${e}. Use 'unsafeStatic' to pass non-literal values, but\n            take care to ensure page security.`)})(i)+e[s+1],e[0]),r:Fi}),Oi=new Map,Qi=(e=>(t,...i)=>{const s=i.length;let r,o;const n=[],a=[];let l,c=0,h=!1;for(;c<s;){for(l=t[c];c<s&&void 0!==(o=i[c],r=Pi(o));)l+=r+t[++c],h=!0;c!==s&&a.push(o),n.push(l),c++}if(c===s&&n.push(t[s]),h){const e=n.join("$$lit$$");void 0===(t=Oi.get(e))&&(n.raw=n,Oi.set(e,t=n)),i=a}return e(t,...i)})(Y);class zi{constructor(e){this._specs=e,this._attached=!1;for(const t of e)if(!t.listener)throw new Error(`DocumentListenerGroup: listener for "${t.type}" is undefined — declare handler fields before the group that references them`)}get attached(){return this._attached}attach(){if(!this._attached){for(const e of this._specs)e.target.addEventListener(e.type,e.listener,e.options);this._attached=!0}}detach(){if(this._attached){for(const e of this._specs)e.target.removeEventListener(e.type,e.listener,e.options);this._attached=!1}}}const Hi=["M12 13C12.8 13 13.61 13.13 14.38 13.36C14.28 13.73 14.2 14.11 14.2 14.5V14.74C13.5 15.34 13 16.24 13 17.2V20.24L12 21.5C7.88 16.37 4.39 12.06 .365 7C3.69 4.41 7.78 3 12 3C16.2 3 20.31 4.41 23.64 7L20.91 10.39C20.32 10.14 19.68 10 19 10C18.87 10 18.75 10.03 18.62 10.04L20.7 7.45C18.08 5.86 15.06 5 12 5S5.9 5.85 3.26 7.44L8.38 13.8C9.5 13.28 10.74 13 12 13M23 17.3V20.8C23 21.4 22.4 22 21.7 22H16.2C15.6 22 15 21.4 15 20.7V17.2C15 16.6 15.6 16 16.2 16V14.5C16.2 13.1 17.6 12 19 12S21.8 13.1 21.8 14.5V16C22.4 16 23 16.6 23 17.3M20.5 14.5C20.5 13.7 19.8 13.2 19 13.2S17.5 13.7 17.5 14.5V16H20.5V14.5Z","M14.2 14.5V14.74C13.5 15.34 13 16.24 13 17.2V20.24L12 21.5C7.88 16.37 4.39 12.06 .365 7C3.69 4.41 7.78 3 12 3C16.2 3 20.31 4.41 23.64 7L20.91 10.39C20.32 10.14 19.68 10 19 10C18.87 10 18.74 10.03 18.61 10.04L20.7 7.45C18.08 5.86 15.06 5 12 5S5.9 5.85 3.26 7.44L6.5 11.43C7.73 10.75 9.61 10 12 10C13.68 10 15.12 10.38 16.26 10.84C15.03 11.67 14.2 13 14.2 14.5M23 17.3V20.8C23 21.4 22.4 22 21.7 22H16.2C15.6 22 15 21.4 15 20.7V17.2C15 16.6 15.6 16 16.2 16V14.5C16.2 13.1 17.6 12 19 12S21.8 13.1 21.8 14.5V16C22.4 16 23 16.6 23 17.3M20.5 14.5C20.5 13.7 19.8 13.2 19 13.2S17.5 13.7 17.5 14.5V16H20.5V14.5Z","M19 10C19.68 10 20.32 10.14 20.91 10.39L23.64 7C20.31 4.41 16.2 3 12 3C7.78 3 3.69 4.41 .365 7C4.39 12.06 7.88 16.37 12 21.5L13 20.24V17.2C13 16.24 13.5 15.34 14.2 14.74V14.5C14.2 12.06 16.4 10 19 10M12 8C9 8 6.67 9 5.2 9.84L3.26 7.44C5.9 5.85 8.91 5 12 5S18.08 5.86 20.7 7.45L18.76 9.88C17.25 9 14.87 8 12 8M21.8 16V14.5C21.8 13.1 20.4 12 19 12S16.2 13.1 16.2 14.5V16C15.6 16 15 16.6 15 17.2V20.7C15 21.4 15.6 22 16.2 22H21.7C22.4 22 23 21.4 23 20.8V17.3C23 16.6 22.4 16 21.8 16M20.5 16H17.5V14.5C17.5 13.7 18.2 13.2 19 13.2S20.5 13.7 20.5 14.5V16Z","M14.2 14.5V14.74C13.5 15.34 13 16.24 13 17.2V20.24L12 21.5C7.88 16.37 4.39 12.06 .365 7C3.69 4.41 7.78 3 12 3C16.2 3 20.31 4.41 23.64 7L20.91 10.39C20.32 10.14 19.68 10 19 10C16.4 10 14.2 12.06 14.2 14.5M23 17.3V20.8C23 21.4 22.4 22 21.7 22H16.2C15.6 22 15 21.4 15 20.7V17.2C15 16.6 15.6 16 16.2 16V14.5C16.2 13.1 17.6 12 19 12S21.8 13.1 21.8 14.5V16C22.4 16 23 16.6 23 17.3M20.5 14.5C20.5 13.7 19.8 13.2 19 13.2S17.5 13.7 17.5 14.5V16H20.5V14.5Z"],Gi=["M12 13C12.74 13 13.5 13.12 14.22 13.31C14.22 13.38 14.2 13.44 14.2 13.5V14.74C13.5 15.34 13 16.24 13 17.2V20.24L12 21.5C7.88 16.37 4.39 12.06 .365 7C3.69 4.41 7.78 3 12 3C16.2 3 20.31 4.41 23.64 7L21.5 9.69C20.86 9.33 20.16 9.11 19.42 9.04L20.7 7.45C18.08 5.86 15.06 5 12 5S5.9 5.85 3.26 7.44L8.38 13.8C9.5 13.28 10.74 13 12 13M21.8 16H17.5V13.5C17.5 12.7 18.2 12.2 19 12.2S20.5 12.7 20.5 13.5V14H21.8V13.5C21.8 12.1 20.4 11 19 11S16.2 12.1 16.2 13.5V16C15.6 16 15 16.6 15 17.2V20.7C15 21.4 15.6 22 16.2 22H21.7C22.4 22 23 21.4 23 20.8V17.3C23 16.6 22.4 16 21.8 16Z","M15.44 10.55C14.68 11.35 14.2 12.38 14.2 13.5V14.74C13.5 15.34 13 16.24 13 17.2V20.24L12 21.5C7.88 16.37 4.39 12.06 .365 7C3.69 4.41 7.78 3 12 3C16.2 3 20.31 4.41 23.64 7L21.5 9.69C20.86 9.33 20.16 9.1 19.41 9.04L20.7 7.45C18.08 5.86 15.06 5 12 5S5.9 5.85 3.26 7.44L6.5 11.43C7.73 10.75 9.61 10 12 10C13.29 10 14.45 10.23 15.44 10.55M21.8 16H17.5V13.5C17.5 12.7 18.2 12.2 19 12.2S20.5 12.7 20.5 13.5V14H21.8V13.5C21.8 12.1 20.4 11 19 11S16.2 12.1 16.2 13.5V16C15.6 16 15 16.6 15 17.2V20.7C15 21.4 15.6 22 16.2 22H21.7C22.4 22 23 21.4 23 20.8V17.3C23 16.6 22.4 16 21.8 16Z","M14.2 13.5V14.74C13.5 15.34 13 16.24 13 17.2V20.24L12 21.5C7.88 16.37 4.39 12.06 .365 7C3.69 4.41 7.78 3 12 3C16.2 3 20.31 4.41 23.64 7L21.5 9.69C20.86 9.33 20.17 9.11 19.42 9.04L20.7 7.45C18.08 5.86 15.06 5 12 5S5.9 5.85 3.26 7.44L5.2 9.84C6.67 9 9 8 12 8C14.18 8 16.08 8.58 17.53 9.25C15.63 9.85 14.2 11.54 14.2 13.5M21.8 16H17.5V13.5C17.5 12.7 18.2 12.2 19 12.2S20.5 12.7 20.5 13.5V14H21.8V13.5C21.8 12.1 20.4 11 19 11S16.2 12.1 16.2 13.5V16C15.6 16 15 16.6 15 17.2V20.7C15 21.4 15.6 22 16.2 22H21.7C22.4 22 23 21.4 23 20.8V17.3C23 16.6 22.4 16 21.8 16Z","M14.2 13.5V14.74C13.5 15.34 13 16.24 13 17.2V20.24L12 21.5C7.88 16.37 4.39 12.06 .365 7C3.69 4.41 7.78 3 12 3C16.2 3 20.31 4.41 23.64 7L21.5 9.69C20.75 9.26 19.9 9 19 9C16.4 9 14.2 11.06 14.2 13.5M21.8 16H17.5V13.5C17.5 12.7 18.2 12.2 19 12.2S20.5 12.7 20.5 13.5V14H21.8V13.5C21.8 12.1 20.4 11 19 11S16.2 12.1 16.2 13.5V16C15.6 16 15 16.6 15 17.2V20.7C15 21.4 15.6 22 16.2 22H21.7C22.4 22 23 21.4 23 20.8V17.3C23 16.6 22.4 16 21.8 16Z"];function Li(e,t){const i=e>=-50?3:e>=-65?2:e>=-75?1:0;return t?Hi[i]:Gi[i]}const Ni=n`
  :host {
    display: block;
    padding: 16px;
  }

  .flasher-content {
    max-width: 600px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .card-header {
    font-size: 18px;
    font-weight: 400;
    line-height: 48px;
    padding: 8px 16px 0;
    color: var(--ha-card-header-color, var(--primary-text-color, #212121));
  }

  .card-content {
    padding: 16px;
  }

  .device-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .device-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    min-height: 60px;
    background: var(--card-background-color, #fff);
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 10px;
  }
  .device-info-faded {
    opacity: 0.5;
  }

  .device-info {
    flex: 1;
    min-width: 0;
  }

  .device-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--primary-text-color, #212121);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .device-mac {
    font-weight: 400;
    color: var(--secondary-text-color, #757575);
  }
  .device-host {
    font-size: 12px;
    color: var(--secondary-text-color, #757575);
    margin-top: 2px;
  }

  .firmware-badge {
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 10px;
    flex-shrink: 0;
  }

  .firmware-badge-original {
    background: color-mix(in srgb, var(--warning-color, #ff9800) 12%, transparent);
    color: var(--warning-color, #ff9800);
  }

  .firmware-badge-offline {
    background: color-mix(in srgb, var(--secondary-text-color, #757575) 12%, transparent);
    color: var(--secondary-text-color, #757575);
  }

  .firmware-badge-behind {
    background: var(--warning-color, #ff9800);
    color: var(--text-primary-color, #fff);
  }

  .firmware-badge-online {
    background: color-mix(in srgb, var(--success-color, #4caf50) 12%, transparent);
    color: var(--success-color, #4caf50);
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
    stroke: var(--divider-color, #e0e0e0);
    stroke-width: 3;
  }
  .ota-fill {
    fill: none;
    stroke: var(--primary-color, #03a9f4);
    stroke-width: 3;
    stroke-linecap: round;
    transition: stroke-dashoffset 0.3s ease;
  }
  .ota-pct {
    position: absolute;
    font-size: 10px;
    font-weight: 600;
    color: var(--primary-text-color, #212121);
  }
  .ota-spinner {
    width: 31px;
    height: 31px;
    border: 3px solid var(--divider-color, #e0e0e0);
    border-top-color: var(--primary-color, #03a9f4);
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
    color: var(--success-color, #4caf50);
    flex-shrink: 0;
  }
  .ota-error {
    display: flex;
    align-items: center;
    gap: 4px;
    position: relative;
    flex-shrink: 0;
  }
  .ota-error-icon {
    --mdc-icon-size: 20px;
    color: var(--error-color, #f44336);
    cursor: pointer;
  }
  .ota-error-popover {
    position: absolute;
    bottom: 100%;
    right: 0;
    background: var(--error-color, #f44336);
    color: white;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 12px;
    white-space: nowrap;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    z-index: 10;
    margin-bottom: 4px;
  }

  .integration-version {
    font-size: 0.8em;
    font-weight: normal;
    opacity: 0.7;
    margin-left: 8px;
  }

  .update-banner {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    margin-bottom: 16px;
    background: var(--info-color, #2196f3);
    color: white;
    border-radius: 8px;
  }
  .update-banner ha-icon {
    --mdc-icon-size: 24px;
    flex-shrink: 0;
    margin-top: 2px;
  }
  .update-banner p {
    margin: 4px 0 8px;
  }
  .update-banner .update-link {
    color: white;
    font-weight: 500;
    text-decoration: underline;
  }

  .usb-section {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 8px;
  }

  .usb-icon {
    --mdc-icon-size: 32px;
    color: var(--secondary-text-color, #757575);
    flex-shrink: 0;
  }

  .usb-section-text {
    flex: 1;
    min-width: 0;
  }

  .usb-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--primary-text-color, #212121);
  }

  .usb-description {
    font-size: 13px;
    color: var(--secondary-text-color, #757575);
    margin-top: 2px;
  }

  .usb-actions {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .usb-action {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 12px;
    cursor: pointer;
    transition: background 0.15s;
  }

  .usb-action:hover {
    background: var(--secondary-background-color, #f5f5f5);
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
    color: var(--primary-color, #03a9f4);
    flex-shrink: 0;
  }

  .usb-action-text {
    flex: 1;
    min-width: 0;
  }

  .usb-action-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--primary-text-color, #212121);
  }

  .usb-action-desc {
    font-size: 13px;
    color: var(--secondary-text-color, #757575);
    margin-top: 2px;
  }

  .usb-connect-btn {
    padding: 8px 20px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    background: var(--primary-color, #03a9f4);
    color: var(--text-primary-color, #fff);
    flex-shrink: 0;
  }

  .browser-warning {
    margin-top: 8px;
    font-size: 12px;
    color: var(--warning-color, #ff9800);
  }

  .usb-select-label {
    margin: 0 0 12px;
    font-size: 14px;
    color: var(--secondary-text-color, #757575);
  }

  .usb-error {
    text-align: center;
    padding: 24px 0;
    color: var(--error-color, #f44336);
  }

  .usb-error ha-icon {
    --mdc-icon-size: 48px;
    margin-bottom: 8px;
  }

  .usb-error p {
    margin: 0;
    font-size: 14px;
  }

  .usb-complete {
    text-align: center;
    padding: 24px 0;
    color: var(--success-color, #4caf50);
    max-width: 400px;
    margin: 0 auto;
  }

  .usb-complete ha-icon {
    --mdc-icon-size: 48px;
    margin-bottom: 16px;
  }

  .usb-complete p {
    margin: 4px 0;
    font-size: 14px;
  }

  .usb-ip {
    color: var(--primary-text-color, #212121);
    font-weight: 500;
    margin-top: 4px;
  }

  .ha-add-result {
    color: var(--secondary-text-color);
    font-size: 14px;
    margin-top: 8px;
  }

  .usb-status {
    text-align: center;
    padding: 24px 0;
  }

  .usb-status p {
    margin: 0;
    font-size: 14px;
    color: var(--primary-text-color, #212121);
  }

  .usb-hint {
    margin-top: 12px !important;
    font-size: 12px !important;
    color: var(--secondary-text-color, #757575) !important;
  }

  .wifi-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  ha-select,
  ha-input,
  ha-textfield {
    width: 100%;
  }

  .usb-progress {
    margin-top: 16px;
    background: var(--divider-color, #e0e0e0);
    border-radius: 4px;
    height: 8px;
    position: relative;
    overflow: hidden;
  }

  .usb-progress-bar {
    height: 100%;
    background: var(--primary-color, #03a9f4);
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .usb-progress span {
    display: block;
    text-align: center;
    margin-top: 8px;
    font-size: 13px;
    color: var(--secondary-text-color, #757575);
  }

  .flasher-loading {
    padding: 32px 24px;
    text-align: center;
    color: var(--secondary-text-color, #757575);
    font-size: 14px;
  }

  .flasher-empty {
    padding: 24px 16px 32px;
    text-align: center;
    color: var(--secondary-text-color, #757575);
  }

  .flasher-empty ha-icon {
    --mdc-icon-size: 48px;
    margin-bottom: 8px;
    opacity: 0.5;
  }

  .flasher-empty p {
    margin: 0;
    font-size: 14px;
  }

  .variant-selector {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
  }


  .confirm-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  .ha-add-progress {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 16px;
    color: var(--secondary-text-color);
    font-size: 14px;
  }

  .wifi-override-row {
    margin-top: 12px;
    text-align: center;
  }

  .wifi-override-link {
    color: var(--primary-color);
    cursor: pointer;
    text-decoration: underline;
    font-size: 0.9em;
  }

  .wifi-override-link:hover {
    opacity: 0.8;
  }

  .cancelled-ip-hint {
    padding: 10px 14px;
    margin-bottom: 12px;
    background: var(--info-color, #3b82f6);
    color: var(--text-primary-color, white);
    border-radius: 4px;
    font-size: 0.9em;
  }

`;class Yi extends ce{constructor(){super(...arguments),this.flashableDevices=[],this.loading=!1,this.localize=Bi,this._selectedVariant="wifi",this.firmwareVersion="",this.integrationVersion="",this.usbFlashState=null,this.wifiNetworks=[],this.otaStates={},this.cancelledDeviceIpHint=null,this._hasWebSerial="undefined"!=typeof navigator&&"serial"in navigator,this._showUsbFlash=!1,this._cancelling=!1,this._selectedSsid="",this._manualSsid=!1,this._wifiPassword="",this._showPassword=!1,this._errorPopoverMac=null,this._closeErrorPopover=()=>{null!==this._errorPopoverMac&&(this._errorPopoverMac=null),this._popoverListeners.detach()},this._onPopoverKeydown=e=>{"Escape"===e.key&&this._closeErrorPopover()},this._onPopoverPointerDown=e=>{e.composedPath().some(e=>e instanceof HTMLElement&&e.classList.contains("ota-error"))||this._closeErrorPopover()},this._popoverListeners=new zi([{target:document,type:"keydown",listener:this._onPopoverKeydown},{target:document,type:"pointerdown",listener:this._onPopoverPointerDown,options:!0},{target:window,type:"scroll",listener:this._closeErrorPopover,options:!0}])}_dispatchUpdateFirmware(e){this.dispatchEvent(new CustomEvent("update-firmware",{detail:{mac:e.mac},bubbles:!0,composed:!0}))}disconnectedCallback(){super.disconnectedCallback(),this._popoverListeners.detach()}_toggleErrorPopover(e,t){e.stopPropagation(),this._errorPopoverMac===t?this._closeErrorPopover():(this._errorPopoverMac=t,this._popoverListeners.attach())}_dispatchRetryOta(e){this._closeErrorPopover(),this.dispatchEvent(new CustomEvent("retry-ota",{detail:{mac:e.mac},bubbles:!0,composed:!0}))}_renderOtaIndicator(e){const t=this.otaStates[e.mac];if(!t)return J;switch(t.state){case"updating":{if(null==t.progress)return Y`<div class="ota-spinner"></div>`;const e=14,i=2*Math.PI*e,s=i-t.progress/100*i;return Y`
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
						${e.available?Y`<ha-button
									@click=${()=>this._dispatchRetryOta(e)}>
									${this.localize("flasher.ota_retry")}
								</ha-button>`:J}
						${this._errorPopoverMac===e.mac?Y`<div class="ota-error-popover">${t.errorKey?this.localize(t.errorKey,t.errorParams):""}</div>`:J}
					</div>`}}_onUsbConnect(){this._hasWebSerial&&(this._showUsbFlash=!0)}_dispatchFlashComplete(){this.dispatchEvent(new CustomEvent("flash-complete",{bubbles:!0,composed:!0}))}_dispatchUsbFlash(){this.dispatchEvent(new CustomEvent("usb-flash",{detail:{variant:this._getFirmwareVariant()},bubbles:!0,composed:!0}))}_dispatchUsbRetry(){this.dispatchEvent(new CustomEvent("usb-retry",{bubbles:!0,composed:!0}))}_dispatchRetryHaAdd(){this.dispatchEvent(new CustomEvent("retry-ha-add",{bubbles:!0,composed:!0}))}_dispatchCancel(){null==this.usbFlashState?this._showUsbFlash=!1:this._cancelling=!0,this._wifiPassword="",this.dispatchEvent(new CustomEvent("flasher-cancel",{bubbles:!0,composed:!0}))}updated(e){e.has("usbFlashState")&&null==this.usbFlashState&&(this._cancelling=!1)}_renderCancelButton(e){const t=this._cancelling?this.localize("flasher.cancelling"):this.localize("flasher.cancel");return Y`<ha-button
			class=${e??""}
			@click=${this._dispatchCancel}
			?disabled=${this._cancelling}
		>${t}</ha-button>`}async _copyIp(e){if(e&&navigator.clipboard)try{await navigator.clipboard.writeText(e)}catch(e){console.error("failed to copy IP",e)}}_dispatchWifiScan(){this.dispatchEvent(new CustomEvent("wifi-scan",{bubbles:!0,composed:!0}))}_dispatchWifiProvision(){const e={ssid:this._selectedSsid,password:this._wifiPassword};this._wifiPassword="",this.dispatchEvent(new CustomEvent("wifi-provision",{detail:e,bubbles:!0,composed:!0}))}_renderLoading(){return Y`<div class="flasher-loading">${this.localize("flasher.loading")}</div>`}_renderWifiProvisioning(){const e=[...this.wifiNetworks].sort((e,t)=>t.rssi-e.rssi),t=this._manualSsid||0===e.length;return Y`
      <div class="flasher-content">
        <ha-card>
          <div class="card-header">${this.localize("flasher.configure_wifi")}</div>
          <div class="card-content wifi-form">

            ${e.length>0?Y`
                <ha-select
                  .label=${this.localize("flasher.select_a_network")}
                  .value=${this._selectedSsid}
                  .options=${e.map(e=>({value:e.ssid,label:e.ssid,iconPath:Li(e.rssi,e.authRequired)}))}
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

            ${(()=>{const e=customElements.get("ha-input")?Ui`ha-input`:Ui`ha-textfield`,i=t?Qi`
                <${e}
                  .label=${this.localize("flasher.enter_ssid")}
                  autocomplete="off"
                  .value=${this._selectedSsid}
                  @input=${e=>{this._selectedSsid=e.target.value}}
                ></${e}>
              `:J,s=Qi`
              <${e}
                .label=${this.localize("flasher.wifi_password")}
                type=${this._showPassword?"text":"password"}
                autocomplete="new-password"
                .value=${this._wifiPassword}
                @input=${e=>{this._wifiPassword=e.target.value}}
              ></${e}>
            `;return Y`${i}${s}`})()}

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
              <ha-button @click=${this._dispatchWifiScan}>
                ${this.localize("flasher.scan")}
              </ha-button>
              <ha-button
                appearance="accent"
                .disabled=${!this._selectedSsid}
                @click=${this._dispatchWifiProvision}
              >
                ${this.localize("flasher.connect")}
              </ha-button>
            </div>
          </div>
        </ha-card>
      </div>
    `}_deviceRowDescriptor(e){const t=[],i=this.otaStates[e.mac],s="eppgrid"===e.firmware_type;e.available||t.push({cls:"firmware-badge-offline",labelKey:"flasher.offline"}),!s||!e.available||i||e.update_available||"compatible"!==e.firmware_status&&"firmware_ahead"!==e.firmware_status||t.push({cls:"firmware-badge-online",labelKey:"flasher.online"}),"original"===e.firmware_type&&t.push({cls:"firmware-badge-original",labelKey:"flasher.flash_usb"}),s&&"firmware_ahead"===e.firmware_status&&t.push({cls:"firmware-badge-ahead",labelKey:"flasher.integration_update"});return{badges:t,action:i?this._renderOtaIndicator(e):s&&(e.update_available||"firmware_behind"===e.firmware_status)?Y`<ha-button
							appearance="accent"
							@click=${()=>this._dispatchUpdateFirmware(e)}
						>${this.localize("flasher.update")}</ha-button>`:J}}_renderDeviceList(){const{flashableDevices:e}=this,t=e.some(e=>"eppgrid"===e.firmware_type&&"firmware_ahead"===e.firmware_status);return Y`
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
                  ${e.map(e=>{const t=!e.available||"original"===e.firmware_type,{badges:i,action:s}=this._deviceRowDescriptor(e);return Y`
                      <div class="device-row">
                        <div class="device-info${t?" device-info-faded":""}">
                          <div class="device-name">${e.name} <span class="device-mac">(${e.mac.replace(/:/g,"").slice(-6).toLowerCase()})</span></div>
                          <div class="device-host">${e.host??this.localize("flasher.offline")}${"eppgrid"===e.firmware_type&&e.firmware_version&&"unknown"!==e.firmware_version?` - v${e.firmware_version}`:""}</div>
                        </div>
                        ${i.map(e=>Y`<span class="firmware-badge ${e.cls}">${this.localize(e.labelKey)}</span>`)}
                        ${s}
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
                ${this.localize("flasher.usb_browser_warning")}
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
							<ha-button @click=${this._dispatchCancel}>
								${this.localize("flasher.start_over")}
							</ha-button>
							${e.fatal?J:Y`<ha-button appearance="accent" @click=${this._dispatchUsbRetry}>
								${this.localize("flasher.usb_retry")}
							</ha-button>`}
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
						${e.autoSkipped?Y`<div class="wifi-override-row">
									<ha-button
										class="wifi-override-link"
										appearance="plain"
										@click=${this._dispatchWifiScan}
									>
										${this.localize("flasher.configure_wifi_override")}
									</ha-button>
								</div>`:J}
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
									<ha-button appearance="accent">${this.localize("flasher.go_to_devices")}</ha-button>
								</a>
							</div>
						</div>
					</ha-card>
				</div>
			`;const i=e.ip,s=e.haAdd,r="added"===s?.type||"already_added"===s?.type,o=r?"mdi:check-circle-outline":"mdi:alert-outline",n=s?.type??"failed",a="failed"===s?.type?s.reason??"unknown":"";return Y`
			<div class="flasher-content">
				<ha-card>
					<div class="card-content">
						<div class="usb-complete">
							<ha-icon icon=${o}></ha-icon>
							<p>${this.localize("flasher.wifi_configured")}</p>
							${i?Y`<p class="usb-ip">${this.localize("flasher.ip_address",{ip:i})}</p>`:J}
							<p class="ha-add-result">
								${this.localize(`flasher.ha_add.${n}`,{reason:a})}
							</p>
						</div>
						<div class="confirm-actions">
							${r?Y`<ha-button appearance="accent" @click=${this._dispatchFlashComplete}>
									${this.localize("flasher.go_to_config")}
								</ha-button>`:"needs_auth"===s?.type?Y`<a href="/config/integrations/dashboard">
										<ha-button appearance="accent">${this.localize("flasher.go_to_integrations")}</ha-button>
									</a>`:Y`
										<ha-button @click=${()=>this._copyIp(i??"")}>
											${this.localize("flasher.copy_ip")}
										</ha-button>
										<ha-button appearance="accent" @click=${this._dispatchRetryHaAdd}>
											${this.localize("flasher.retry_ha_add")}
										</ha-button>
									`}
							<ha-button @click=${this._dispatchCancel}>
								${this.localize("flasher.flash_another")}
							</ha-button>
						</div>
					</div>
				</ha-card>
			</div>
		`}_renderUsbProgress(e){const t={connecting:"flasher.usb_step_connecting",flashing:"flasher.usb_step_flashing",wifi_check:"flasher.usb_step_wifi_check",wifi_scan:"flasher.usb_step_scanning",wifi_provision:"flasher.usb_step_provisioning",wifi_connecting:"flasher.usb_step_wifi_connecting",reading_ip:"flasher.usb_step_reading_ip"}[e.step]??e.step,i="flashing"===e.step?{version:this.firmwareVersion}:void 0,s="flashing"!==e.step&&"connecting"!==e.step;return Y`
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
							<ha-button
								class="${"wifi"===this._selectedVariant?"selected":"unselected"}"
								appearance="${"wifi"===this._selectedVariant?"accent":"outlined"}"
								@click=${()=>{this._selectedVariant="wifi"}}
							>${this.localize("flasher.wifi")}</ha-button>
							<ha-button
								class="${"ethernet"===this._selectedVariant?"selected":"unselected"}"
								appearance="${"ethernet"===this._selectedVariant?"accent":"outlined"}"
								@click=${()=>{this._selectedVariant="ethernet"}}
							>${this.localize("flasher.ethernet")}</ha-button>
						</div>
						<div class="confirm-actions">
							${this._renderCancelButton()}
							<ha-button appearance="accent" @click=${this._dispatchUsbFlash}>
								${this.localize("flasher.usb_flash")}
							</ha-button>
						</div>
					</div>
				</ha-card>
			</div>
		`}}function $i(e,t){return e/(t+1)*De}function Ki(e,t,i){const s=i*Math.PI/180,r=Math.abs(Math.cos(s)),o=Math.abs(Math.sin(s));return{dxBox:(e*r+t*o-e)/2,dyBox:(e*o+t*r-t)/2}}function Ji(e,t,i){const s=i-t;return Math.round((e+s+360)%360)}Yi.styles=[Ni],e([ge({attribute:!1})],Yi.prototype,"flashableDevices",void 0),e([ge({type:Boolean})],Yi.prototype,"loading",void 0),e([ge({attribute:!1})],Yi.prototype,"localize",void 0),e([ue()],Yi.prototype,"_selectedVariant",void 0),e([ge()],Yi.prototype,"firmwareVersion",void 0),e([ge()],Yi.prototype,"integrationVersion",void 0),e([ge({attribute:!1})],Yi.prototype,"usbFlashState",void 0),e([ge({attribute:!1})],Yi.prototype,"wifiNetworks",void 0),e([ge({attribute:!1})],Yi.prototype,"otaStates",void 0),e([ge({attribute:!1})],Yi.prototype,"cancelledDeviceIpHint",void 0),e([ue()],Yi.prototype,"_hasWebSerial",void 0),e([ue()],Yi.prototype,"_showUsbFlash",void 0),e([ue()],Yi.prototype,"_cancelling",void 0),e([ue()],Yi.prototype,"_selectedSsid",void 0),e([ue()],Yi.prototype,"_manualSsid",void 0),e([ue()],Yi.prototype,"_wifiPassword",void 0),e([ue()],Yi.prototype,"_showPassword",void 0),e([ue()],Yi.prototype,"_errorPopoverMac",void 0),customElements.get("epp-flasher-view")||customElements.define("epp-flasher-view",Yi);class Wi extends ce{constructor(){super(...arguments),this.furniture=[],this.selectedFurnitureId=null,this.hass=void 0,this.localize=Bi,this.showCustomIconPicker=!1,this.customIconValue="",this._searchQuery=""}render(){return this._renderFurnitureSidebar()}_renderFurnitureSidebar(){const e=this.furniture.find(e=>e.id===this.selectedFurnitureId);return Y`
			<input
				type="search"
				class="furn-search"
				.value=${this._searchQuery}
				placeholder=${this.localize("furniture.search_placeholder")}
				aria-label=${this.localize("furniture.search_placeholder")}
				@input=${e=>{this._searchQuery=e.target.value}}
			/>

			${e?Y`
						<div class="furn-selected-info">
							<div class="sidebar-item-row">
								<ha-icon icon="${e.icon}" style="--mdc-icon-size: 20px;"></ha-icon>
								<strong>${this.localize(e.label)}</strong>
								<button class="sidebar-remove-btn" @click=${()=>this._fireRemove(e.id)}>
									<ha-icon icon="mdi:close"></ha-icon>
								</button>
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
				${function(e,t,i){const s=t.trim().toLowerCase(),r=e.map(e=>{const t=i(e.label);return{sticker:e,localizedLabel:t,normalizedLabel:t.toLowerCase()}}),o=s?r.filter(e=>e.normalizedLabel.includes(s)):r;return o.slice().sort((e,t)=>e.localizedLabel.localeCompare(t.localizedLabel)).map(e=>e.sticker)}(Ye,this._searchQuery,this.localize).map(e=>Y`
						<button class="furn-sticker" @click=${()=>this._fireAdd(e)}>
							${"svg"===e.type&&Object.hasOwn(Ne,e.icon)?$`<svg viewBox="${Ne[e.icon].viewBox}" class="furn-sticker-svg">
										${be(Ne[e.icon].content)}
									</svg>`:Y`<ha-icon icon="${e.icon}" style="--mdc-icon-size: 24px;"></ha-icon>`}
							<span>${this.localize(e.label)}</span>
						</button>
					`)}
				<button class="furn-sticker furn-custom" @click=${()=>{this.dispatchEvent(new CustomEvent("custom-icon-toggle",{bubbles:!0,composed:!0}))}}>
					<ha-icon icon="mdi:plus" style="--mdc-icon-size: 24px;"></ha-icon>
					<span>${this.localize("furniture.custom_icon")}</span>
				</button>
			</div>
			${this.showCustomIconPicker?Y`
						<div class="template-dialog">
							<div class="template-dialog-card">
								<h3>${this.localize("furniture.custom_icon")}</h3>
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
					`:J}
		`}_fireAdd(e){this.dispatchEvent(new CustomEvent("furniture-add",{detail:e,bubbles:!0,composed:!0}))}_fireRemove(e){this.dispatchEvent(new CustomEvent("furniture-remove",{detail:e,bubbles:!0,composed:!0}))}_fireUpdate(e,t){this.dispatchEvent(new CustomEvent("furniture-update",{detail:{id:e,updates:t},bubbles:!0,composed:!0}))}_fireDimensionUpdate(e,t,i){const s=parseInt(i,10);Number.isFinite(s)&&this._fireUpdate(e,{[t]:Math.max(100,10*s)})}}function ji(e,t,i,s){if(i<=0||s<=0)return null;return{col:He(i)+e/De,row:t/De}}function Vi(e){const t=Math.floor(e.col),i=Math.floor(e.row);return t<0||t>=Be||i<0||i>=Se?null:i*Be+t}function Zi(e,t){return{xPct:(e+je)/(2*je)*100,yPct:t/xe*100}}Wi.styles=[Ii,Di,Mi,n`
			:host {
				display: block;
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

			.furn-search {
				position: sticky;
				top: 0;
				z-index: 2;
				width: 100%;
				padding: 6px 8px;
				margin-bottom: 6px;
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
		`],e([ge({attribute:!1})],Wi.prototype,"furniture",void 0),e([ge({attribute:!1})],Wi.prototype,"selectedFurnitureId",void 0),e([ge({attribute:!1})],Wi.prototype,"hass",void 0),e([ge({attribute:!1})],Wi.prototype,"localize",void 0),e([ge({attribute:!1})],Wi.prototype,"showCustomIconPicker",void 0),e([ge({attribute:!1})],Wi.prototype,"customIconValue",void 0),e([ue()],Wi.prototype,"_searchQuery",void 0),customElements.get("epp-furniture-sidebar")||customElements.define("epp-furniture-sidebar",Wi);class Xi extends ce{constructor(){super(...arguments),this.furniture=[],this.selectedFurnitureId=null,this.roomWidth=3e3,this.cellPx=28,this.minCol=0,this.minRow=0,this.visCols=20,this.visRows=20,this.sidebarTab="zones",this.localize=Bi}_mmToPx(e){return function(e,t){return e/De*(t+1)}(e,this.cellPx)}_fireEvent(e,t){this.dispatchEvent(new CustomEvent(e,{bubbles:!0,composed:!0,detail:t}))}_itemRotation(e){return this.furniture.find(t=>t.id===e)?.rotation??0}_onItemPointerDown(e,t){this._fireEvent("furniture-select",t),this._fireEvent("furniture-pointer-down",{e:e,id:t,type:"move",rotation:this._itemRotation(t)})}_onResizePointerDown(e,t,i){this._fireEvent("furniture-pointer-down",{e:e,id:t,type:"resize",handle:i,rotation:this._itemRotation(t)})}_onRotatePointerDown(e,t){this._fireEvent("furniture-pointer-down",{e:e,id:t,type:"rotate",rotation:this._itemRotation(t)})}_onDeletePointerDown(e,t){e.stopPropagation(),this._fireEvent("furniture-delete",t)}render(){if(!this.furniture.length)return J;const e=He(this.roomWidth),t=this.cellPx+1,i="furniture"===this.sidebarTab;return Y`
			<div class="furniture-overlay ${i?"":"non-interactive"}">
				${this.furniture.map(i=>{const s=(e-this.minCol)*t+this._mmToPx(i.x),r=(0-this.minRow)*t+this._mmToPx(i.y),o=this._mmToPx(i.width),n=this._mmToPx(i.height),a=this.selectedFurnitureId===i.id;return Y`
						<div
							class="furniture-item ${a?"selected":""}"
							data-id="${i.id}"
							style="
								left: ${s}px; top: ${r}px;
								width: ${o}px; height: ${n}px;
								transform: rotate(${i.rotation}deg);
							"
							@pointerdown=${e=>this._onItemPointerDown(e,i.id)}
						>
							${"svg"===i.type&&Object.hasOwn(Ne,i.icon)?$`<svg viewBox="${Ne[i.icon].viewBox}" preserveAspectRatio="none" class="furn-svg">
										${be(Ne[i.icon].content)}
									</svg>`:Y`<ha-icon icon="${i.icon}" style="--mdc-icon-size: ${.6*Math.min(o,n)}px;"></ha-icon>`}
							${a?Y`
										<!-- Resize handles (cursor follows visual rotation) -->
										${["n","s","e","w","ne","nw","se","sw"].map(e=>Y`
												<div
													class="furn-handle furn-handle-${e}"
													style="cursor: ${function(e,t){const i=e.includes("e")?1:e.includes("w")?-1:0,s=e.includes("s")?1:e.includes("n")?-1:0,r=((180*Math.atan2(i,-s)/Math.PI+t)%180+180)%180;switch(45*Math.round(r/45)%180){case 0:return"ns-resize";case 45:return"nesw-resize";case 90:return"ew-resize";default:return"nwse-resize"}}(e,i.rotation)};"
													@pointerdown=${t=>this._onResizePointerDown(t,i.id,e)}
												></div>
											`)}
										<!-- Rotate handle with stem -->
										<div class="furn-rotate-stem"></div>
										<div class="furn-rotate-handle" @pointerdown=${e=>this._onRotatePointerDown(e,i.id)}>
											<ha-icon icon="mdi:rotate-right" style="--mdc-icon-size: 14px;"></ha-icon>
										</div>
										<!-- Delete button -->
										<div class="furn-delete-btn" @pointerdown=${e=>this._onDeletePointerDown(e,i.id)}>
											<ha-icon icon="mdi:close" style="--mdc-icon-size: 14px;"></ha-icon>
										</div>
									`:J}
						</div>
					`})}
			</div>
		`}}Xi.styles=n`
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

		/* touch-action: none on every draggable surface — otherwise the
		   browser claims the touch gesture for scrolling mid-drag and fires
		   pointercancel, wedging the drag. */
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
			touch-action: none;
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
			background: var(--primary-color, #03a9f4);
			border: 1px solid var(--card-background-color, #fff);
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
			touch-action: none;
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
	`,e([ge({attribute:!1})],Xi.prototype,"furniture",void 0),e([ge({attribute:!1})],Xi.prototype,"selectedFurnitureId",void 0),e([ge({type:Number})],Xi.prototype,"roomWidth",void 0),e([ge({type:Number})],Xi.prototype,"cellPx",void 0),e([ge({type:Number})],Xi.prototype,"minCol",void 0),e([ge({type:Number})],Xi.prototype,"minRow",void 0),e([ge({type:Number})],Xi.prototype,"visCols",void 0),e([ge({type:Number})],Xi.prototype,"visRows",void 0),e([ge({attribute:!1})],Xi.prototype,"sidebarTab",void 0),e([ge({attribute:!1})],Xi.prototype,"localize",void 0),customElements.get("epp-furniture-overlay")||customElements.define("epp-furniture-overlay",Xi);const qi={[ye]:`background-image: ${qe(1,6)};`,[Ce]:`background-image: ${qe(2,5)};`,[ve]:`background-image: ${qe(3,5)};`};class es extends ce{constructor(){super(...arguments),this.grid=new Uint8Array(0),this.zoneConfigs=[],this.targets=[],this.roomWidth=0,this.roomDepth=0,this.perspective=null,this.furniture=[],this.selectedFurnitureId=null,this.sidebarTab="zones",this.editable=!1,this.activeZone=null,this.occupancy={},this.targetPrevXY=[],this.localize=Bi,this.maxRangeMm=xe,this.maxGridPx=480,this.dismissedTargets=new Map,this.frozenBounds=null,this._fovCache=null,this._fovPerspective=es._FOV_UNCACHED,this._scanCache=null,this._lastEnterIdx=-1,this._onStrokeEnd=()=>{this._lastEnterIdx=-1,this.dispatchEvent(new CustomEvent("cell-paint",{detail:{action:"up"},bubbles:!0,composed:!0}))}}willUpdate(e){if((e.has("targets")||e.has("dismissedTargets")||e.has("roomWidth")||e.has("roomDepth"))&&0!==this.dismissedTargets.size)for(const[e,t]of this.dismissedTargets){const i=this.targets[e];if(!i||"inactive"===i.status||null==i.x||null==i.y)continue;const s=ji(i.x,i.y,this.roomWidth,this.roomDepth);if(!s)continue;Vi(s)!==t&&this.dispatchEvent(new CustomEvent("target-undismissed",{detail:{targetIndex:e},bubbles:!0,composed:!0}))}}render(){const e=this._getScan(),t=this.frozenBounds??e.bounds,i=t.minCol>t.maxCol,s=i?0:t.minCol,r=i?19:t.maxCol,o=i?0:t.minRow,n=i?19:t.maxRow,a=r-s+1,l=n-o+1,c=Math.min(Math.floor(this.maxGridPx/a),Math.floor(this.maxGridPx/l),32);return Y`
			<div class="grid-targets-wrapper">
				<div
					class="grid"
					style="grid-template-columns: repeat(${a}, ${c}px); grid-template-rows: repeat(${l}, ${c}px);"
					@pointerup=${this.editable?this._onStrokeEnd:J}
					@pointercancel=${this.editable?this._onStrokeEnd:J}
				>
					${this._renderVisibleCells(e.status,s,r,o,n,c)}
				</div>
				${this._renderFurnitureOverlay(c,s,o,a,l)}
				${this._renderTargetDots(s,r,o,n,a,l)}
			</div>
			${this._renderGridDimensions(e.metrics)}
		`}_getSensorFov(){return this.perspective?(this._fovPerspective===this.perspective||(this._fovCache=it(this.perspective),this._fovPerspective=this.perspective),this._fovCache):null}_getScan(){const e=this._getSensorFov(),t=this._scanCache;if(t&&t.grid===this.grid&&t.fov===e&&t.perspective===this.perspective&&t.roomWidth===this.roomWidth&&t.maxRangeMm===this.maxRangeMm)return t;const i=new Array(Ie);for(let t=0;t<Se;t++)for(let s=0;s<Be;s++)i[t*Be+s]=rt(s,t,e,this.roomWidth,this.maxRangeMm);return this._scanCache={grid:this.grid,fov:e,perspective:this.perspective,roomWidth:this.roomWidth,maxRangeMm:this.maxRangeMm,status:i,bounds:nt(this.grid,e,this.roomWidth,this.maxRangeMm),metrics:dt(this.grid,this.roomWidth,this.perspective,e,this.maxRangeMm)},this._scanCache}_renderVisibleCells(e,t,i,s,r,o){const n=this.occupancy,a=[];for(let l=s;l<=r;l++)for(let s=t;s<=i;s++){const t=l*Be+s,i=this.grid[t],r=e[t],c="in_range"===r,h=Re(i);let d;d="in_range"===r?Ve(i,this.zoneConfigs):"beyond_max_range"===r&&h?"repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,0.13) 3px, rgba(0,0,0,0.13) 4px), repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(0,0,0,0.13) 3px, rgba(0,0,0,0.13) 4px), #fff":"beyond_max_range"===r?Ve(i,this.zoneConfigs):"repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,0.13) 3px, rgba(0,0,0,0.13) 4px), repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(0,0,0,0.13) 3px, rgba(0,0,0,0.13) 4px), #c8c8c8";let A="";if(c&&Re(i)){const e=Me(i);if(n[e]){const t=e>0?this.zoneConfigs[e-1]?.color:null;A=`position: relative; z-index: 1; box-shadow: 0 0 8px 1px color-mix(in srgb, ${t??"#999"} 60%, ${t?"#222":"#444"});`}}const g=c&&Re(i)?qi[Te(i)]??"":"",u=this.editable&&c;a.push(Y`
					<div
						class="cell"
						style="background: ${d}; width: ${o}px; height: ${o}px; ${A} ${g}"
						@pointerdown=${u?e=>this._onCellPointerDown(t,e):J}
						@pointerenter=${u?()=>this._onCellPointerEnter(t):J}
					></div>
				`)}return a}_onCellPointerDown(e,t){const i=t.target;i?.hasPointerCapture?.(t.pointerId)&&i.releasePointerCapture(t.pointerId),this._lastEnterIdx=-1,this.dispatchEvent(new CustomEvent("cell-paint",{detail:{index:e,action:"down"},bubbles:!0,composed:!0}))}_onCellPointerEnter(e){e!==this._lastEnterIdx&&(this._lastEnterIdx=e,this.dispatchEvent(new CustomEvent("cell-paint",{detail:{index:e,action:"enter"},bubbles:!0,composed:!0})))}_renderTargetDots(e,t,i,s,r,o){const n=[],a=Math.min(this.targets.length,3);for(let l=0;l<a;l++)n.push(this._renderTargetDot(this.targets[l],l,e,t,i,s,r,o));return Y`
			<div class="targets-overlay" style="pointer-events: none;">${n}</div>
		`}_renderTargetDot(e,t,i,s,r,o,n,a){if("inactive"===e.status)return J;const l=e=>null!==e&&e.col>=i&&e.col<=s&&e.row>=r&&e.row<=o;let c=null!=e.x&&null!=e.y?ji(e.x,e.y,this.roomWidth,this.roomDepth):null;if("pending"===e.status&&!l(c)&&this.targetPrevXY[t]&&(c=ji(this.targetPrevXY[t].x,this.targetPrevXY[t].y,this.roomWidth,this.roomDepth)),null===c||!l(c))return J;const h=Math.max(0,Math.min(100,(c.col-i)/n*100)),d=Math.max(0,Math.min(100,(c.row-r)/a*100)),A=Vi(c);if(null!==A&&this.dismissedTargets.get(t)===A)return J;if(null!==A&&A<this.grid.length){const e=Te(this.grid[A]);if(2===e||3===e){const e=Me(this.grid[A]);if(!this.occupancy[e])return J}}const g="pending"===e.status?.3:1;return Y`
			<div
				class="target-dot ${this.editable?"":"clickable"}"
				style="left: ${h}%; top: ${d}%; background: ${Je[t]}; opacity: ${g}; transition: opacity 0.5s ease;"
				@click=${i=>{this.editable||(i.stopPropagation(),this.dispatchEvent(new CustomEvent("target-click",{detail:{targetIndex:t,x:e.x,y:e.y,pctX:h,pctY:d},bubbles:!0,composed:!0})))}}
			></div>
			${"active"===e.status&&e.signal>0?Y`
						<div style="position: absolute; left: ${h}%; top: ${d}%; transform: translate(-50%, -280%); background: rgba(0,0,0,0.7); color: #fff; font-size: 10px; font-weight: bold; padding: 0 4px; border-radius: 6px; pointer-events: none;">
							${e.signal}
						</div>
					`:J}
		`}_renderGridDimensions(e){return e?Y`
			<div class="grid-dimensions">
				${this.localize("live.grid_dimensions",{width:e.widthM,depth:e.depthM,furthest:e.furthestM})}
			</div>
		`:J}_renderFurnitureOverlay(e,t,i,s,r){return this.furniture.length?Y`
			<epp-furniture-overlay
				.furniture=${this.furniture}
				.selectedFurnitureId=${this.selectedFurnitureId}
				.roomWidth=${this.roomWidth}
				.cellPx=${e}
				.minCol=${t}
				.minRow=${i}
				.visCols=${s}
				.visRows=${r}
				.sidebarTab=${this.sidebarTab}
				.localize=${this.localize}
			></epp-furniture-overlay>
		`:J}}es.styles=n`
		:host {
			display: block;
		}

		.grid-targets-wrapper {
			position: relative;
			display: inline-block;
			vertical-align: top;
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

		.grid-dimensions {
			text-align: center;
			font-size: 12px;
			color: var(--secondary-text-color, #757575);
			margin-top: 8px;
		}
	`,es._FOV_UNCACHED={},e([ge({attribute:!1})],es.prototype,"grid",void 0),e([ge({attribute:!1})],es.prototype,"zoneConfigs",void 0),e([ge({attribute:!1})],es.prototype,"targets",void 0),e([ge({type:Number})],es.prototype,"roomWidth",void 0),e([ge({type:Number})],es.prototype,"roomDepth",void 0),e([ge({attribute:!1})],es.prototype,"perspective",void 0),e([ge({attribute:!1})],es.prototype,"furniture",void 0),e([ge({attribute:!1})],es.prototype,"selectedFurnitureId",void 0),e([ge({attribute:!1})],es.prototype,"sidebarTab",void 0),e([ge({type:Boolean,reflect:!0})],es.prototype,"editable",void 0),e([ge({attribute:!1})],es.prototype,"activeZone",void 0),e([ge({attribute:!1})],es.prototype,"occupancy",void 0),e([ge({attribute:!1})],es.prototype,"targetPrevXY",void 0),e([ge({attribute:!1})],es.prototype,"localize",void 0),e([ge({type:Number})],es.prototype,"maxRangeMm",void 0),e([ge({type:Number})],es.prototype,"maxGridPx",void 0),e([ge({attribute:!1})],es.prototype,"dismissedTargets",void 0),e([ge({attribute:!1})],es.prototype,"frozenBounds",void 0),customElements.get("epp-grid")||customElements.define("epp-grid",es);class ts extends ce{constructor(){super(...arguments),this.sensorState={occupancy:!1,static_presence:!1,motion_presence:!1,target_presence:!1,mmwave:!1,illuminance:null,temperature:null,humidity:null,co2:null},this.zoneState={occupancy:{},target_counts:{},frame_count:0},this.zoneConfigs=[],this.hasPerspective=!1,this.localize=Bi,this._expandedSensorInfo=null}_renderRow(e){const t=void 0!==e.color?Y`
					<div
						class="live-sensor-dot"
						style=${e.color?`background: ${e.color};${e.on?` box-shadow: 0 0 6px 2px ${e.color};`:""}`:"background: #fff; border: 1px solid #ccc;"+(e.on?" box-shadow: 0 0 6px 2px #999;":"")}
					></div>
				`:Y`<div class="live-sensor-dot ${e.on?"on":"off"}"></div>`;return Y`
			<div class="live-sensor-row">
				${t}
				<span class="live-sensor-label">${e.label}</span>
				<span class="live-sensor-state ${e.on?"detected":""}">${e.on?this.localize("live.detected"):this.localize("live.clear")}</span>
				<button class="live-sensor-info-btn"
					type="button"
					aria-label=${this.localize("live.show_info")}
					@click=${()=>{this._expandedSensorInfo=this._expandedSensorInfo===e.id?null:e.id}}
				>
					<ha-icon icon="mdi:information-outline" style="--mdc-icon-size: 16px;"></ha-icon>
				</button>
			</div>
			${this._expandedSensorInfo===e.id?Y`<div class="live-sensor-info-text">${e.info}</div>`:J}
		`}render(){const e=this.sensorState,t=this.zoneState,i=[{id:"occupancy",label:this.localize("live.occupancy"),on:e.occupancy_state??e.occupancy,info:this.localize("info.occupancy")},{id:"static",label:this.localize("live.static_presence"),on:e.static_state?"I"!==e.static_state:e.static_presence,info:this.localize("info.static_presence")},{id:"motion",label:this.localize("live.motion_presence"),on:e.motion_state?"I"!==e.motion_state:e.motion_presence,info:this.localize("info.motion_presence")},{id:"target",label:this.localize("live.target_presence"),on:e.target_presence,info:this.localize("info.target_presence")},{id:"mmwave",label:this.localize("live.mmwave"),on:e.mmwave,info:this.localize("info.mmwave")}],s=[],r=t.occupancy[0]??!1,o=t.target_counts[0]??0;s.push({id:"zone_0",label:this.localize("sidebar.rest_of_room"),on:r,info:this.localize("info.rest_of_room_occupancy",{count:o}),color:null});for(let e=0;e<7;e++){const i=this.zoneConfigs[e];if(!i)continue;const r=e+1,o=t.occupancy[r]??!1,n=t.target_counts[r]??0;s.push({id:`zone_${r}`,label:i.name,on:o,info:this.localize("info.zone_occupancy",{slot:r,count:n}),color:i.color})}const n=[];return null!==e.illuminance&&n.push({id:"illuminance",label:this.localize("entities.illuminance"),value:this.localize("live.illuminance_value",{value:e.illuminance})}),null!==e.temperature&&n.push({id:"temperature",label:this.localize("entities.temperature"),value:this.localize("live.temperature_value",{value:e.temperature})}),null!==e.humidity&&n.push({id:"humidity",label:this.localize("entities.humidity"),value:this.localize("live.humidity_value",{value:e.humidity})}),null!==e.co2&&n.push({id:"co2",label:this.localize("entities.co2"),value:this.localize("live.co2_value",{value:e.co2})}),Y`
      <div style="padding: 8px 0;">
        <div class="live-section-header">${this.localize("live.presence")}</div>
        ${i.map(e=>this._renderRow(e))}

        ${this.hasPerspective?Y`
        <hr style="border: none; border-top: 1px solid var(--divider-color, #eee); margin: 10px 12px;"/>

        <button class="live-section-header live-section-link" @click=${()=>{this.dispatchEvent(new CustomEvent("view-change",{detail:{view:"editor",sidebarTab:"zones"},bubbles:!0,composed:!0}))}}>${this.localize("sidebar.detection_zones")}</button>
        ${s.map(e=>this._renderRow(e))}
        `:J}

        <hr style="border: none; border-top: 1px solid var(--divider-color, #eee); margin: 10px 12px;"/>

        ${n.length?Y`
          <div class="live-section-header">${this.localize("live.environment")}</div>
          ${n.map(e=>Y`
            <div class="live-sensor-row">
              <span class="live-sensor-label">${e.label}</span>
              <span class="live-sensor-value">${e.value}</span>
            </div>
          `)}
        `:J}

      </div>
    `}}ts.styles=n`
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
      box-sizing: border-box;
    }

    .live-sensor-dot.on {
      background: var(--success-color, #4caf50);
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
      color: var(--success-color, #4caf50);
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

  `,e([ge({attribute:!1})],ts.prototype,"sensorState",void 0),e([ge({attribute:!1})],ts.prototype,"zoneState",void 0),e([ge({attribute:!1})],ts.prototype,"zoneConfigs",void 0),e([ge({attribute:!1})],ts.prototype,"hasPerspective",void 0),e([ge({attribute:!1})],ts.prototype,"localize",void 0),e([ue()],ts.prototype,"_expandedSensorInfo",void 0),customElements.get("epp-live-sidebar")||customElements.define("epp-live-sidebar",ts);const is={room_occupancy:!0,zone_presence:!0,room_target_presence:!1,room_static_presence:!1,room_motion_presence:!1,room_mmwave:!1,target_active:!1,target_xy:!1,target_signal:!1,target_zone:!1,zone_target_count:!1,target_count:!1,env_temperature:!1,env_humidity:!1,env_illuminance:!1,env_co2:!1},ss={temperature_offset:0,humidity_offset:0,illuminance_offset:0,motion_timeout:5,target_auto_distance:!0,target_max_distance:6,stuck_target_timeout:300,static_auto_distance:!0,static_min_distance:.3,static_max_distance:16,static_trigger_threshold:3,static_renew_threshold:3,static_timeout:30,static_on_delay:0,led_mode:"Manual Control",led_brightness:1,led_presence_color:"#CC33FF",relay_trigger_mode:"disabled",relay_contact_mode:"no",target_update_rate_ms:1e3,zone_update_rate_ms:1e3,entities:{...is},log_levels:{}};function rs(e){const t=ss[e];return"object"==typeof t&&null!==t?{...t}:t}function os(e,t){return"object"==typeof t&&null!==t?0===Object.keys(t).length&&("object"==typeof e&&null!==e&&0===Object.keys(e).length):e===t}Object.freeze(is),Object.freeze(ss.entities),Object.freeze(ss.log_levels),Object.freeze(ss);const ns=[["temperature_offset","_temperatureOffset"],["humidity_offset","_humidityOffset"],["illuminance_offset","_illuminanceOffset"],["motion_timeout","_motionTimeout"],["target_auto_distance","_targetAutoDistance"],["target_max_distance","_targetMaxDistance"],["stuck_target_timeout","_stuckTargetTimeout"],["static_auto_distance","_staticAutoDistance"],["static_min_distance","_staticMinDistance"],["static_max_distance","_staticMaxDistance"],["static_trigger_threshold","_staticTriggerThreshold"],["static_renew_threshold","_staticRenewThreshold"],["static_timeout","_staticTimeout"],["static_on_delay","_staticOnDelay"],["led_mode","_ledMode"],["led_brightness","_ledBrightness"],["led_presence_color","_ledPresenceColor"],["relay_trigger_mode","_relayTriggerMode"],["relay_contact_mode","_relayContactMode"],["target_update_rate_ms","_targetUpdateRateMs"],["zone_update_rate_ms","_zoneUpdateRateMs"],["entities","_entitiesConfig"],["log_levels","_logLevels"]];const as=[{type:"default"},null,null,null,null,null,null,null],ls={default:{trigger:5,renew:3,timeout:10,handoff_timeout:3},bed:{trigger:8,renew:2,timeout:600,handoff_timeout:10},seating:{trigger:7,renew:1,timeout:30,handoff_timeout:10},transit:{trigger:3,renew:2,timeout:3,handoff_timeout:1}},cs=["default","bed","seating","transit","custom"],hs=["#B8E7FF","#CFDB70","#FFC4CF","#F3E7AC","#7CCFB8","#A0C4E7","#F3AC94"];function ds(e){const t=ls[e.type]??ls.default,i="custom"===e.type;return{type:e.type,trigger:i?e.trigger??t.trigger:t.trigger,renew:i?e.renew??t.renew:t.renew,timeout:i?e.timeout??t.timeout:t.timeout,handoff_timeout:i?e.handoff_timeout??t.handoff_timeout:t.handoff_timeout}}function As(e){return Math.max(1,e)}function gs(e,t,i,s,r,o,n){if(0===e){const e=ls[i]||ls.default;return"custom"===i?{trigger:As(s),renew:As(r),timeout:o,handoffTimeout:n}:{trigger:As(e.trigger),renew:As(e.renew),timeout:e.timeout,handoffTimeout:e.handoff_timeout}}if(e>0&&e<=t.length){const i=t[e-1];if(i){const e=ls[i.type]||ls.default;return"custom"===i.type?{trigger:As(i.trigger??e.trigger),renew:As(i.renew??e.renew),timeout:i.timeout??e.timeout,handoffTimeout:i.handoff_timeout??e.handoff_timeout}:{trigger:As(e.trigger),renew:As(e.renew),timeout:e.timeout,handoffTimeout:e.handoff_timeout}}}throw new Error(`getZoneThresholds: zone ${e} is not configured`)}const us={rest:"bed",thoroughfare:"transit"};function _s(e){const t="string"==typeof e&&e in us?us[e]:e;return cs.includes(t)?t:"default"}const ps=/^#[0-9a-fA-F]{6}$/;function fs(e,t){const i="number"==typeof e?e:"string"==typeof e?Number(e):NaN;return Number.isFinite(i)?i:t}function ws(e,t){const i=fs(e,t);return i>0?i:t}function Es(e,t){return"string"==typeof e&&e.length>0?e:"number"==typeof e&&Number.isFinite(e)?String(e):t}function ms(e,t,i){const s=e||{},r=ss;return{temperatureOffset:s.temperature_offset??r.temperature_offset,humidityOffset:s.humidity_offset??r.humidity_offset,illuminanceOffset:s.illuminance_offset??r.illuminance_offset,motionTimeout:s.motion_timeout??r.motion_timeout,targetAutoDistance:s.target_auto_distance??r.target_auto_distance,targetMaxDistance:s.target_max_distance??r.target_max_distance,stuckTargetTimeout:s.stuck_target_timeout??r.stuck_target_timeout,staticAutoDistance:s.static_auto_distance??r.static_auto_distance,staticMinDistance:s.static_min_distance??r.static_min_distance,staticMaxDistance:s.static_max_distance??r.static_max_distance,staticTriggerThreshold:s.static_trigger_threshold??r.static_trigger_threshold,staticRenewThreshold:s.static_renew_threshold??r.static_renew_threshold,staticTimeout:s.static_timeout??r.static_timeout,staticOnDelay:Math.min(Math.max(s.static_on_delay??r.static_on_delay,0),2),entities:t||{},logLevels:i??{},ledMode:s.led_mode??r.led_mode,ledBrightness:s.led_brightness??r.led_brightness,ledPresenceColor:s.led_presence_color??r.led_presence_color,relayTriggerMode:s.relay_trigger_mode??r.relay_trigger_mode,relayContactMode:s.relay_contact_mode??r.relay_contact_mode,targetUpdateRateMs:s.target_update_rate_ms??r.target_update_rate_ms,zoneUpdateRateMs:s.zone_update_rate_ms??r.zone_update_rate_ms}}function bs(e){const t=function(e){const t=e?.calibration,i=t?.perspective,s=Array.isArray(i)&&8===i.length&&i.every(e=>"number"==typeof e&&Number.isFinite(e))&&i.some(e=>Math.abs(e)>1e-9);return s&&t.room_width>0?{perspective:i,roomWidth:t.room_width||0,roomDepth:t.room_depth||0}:{perspective:null,roomWidth:0,roomDepth:0}}(e),i=e?.room_layout||{},s=(r=i.furniture,(Array.isArray(r)?r:[]).map((e,t)=>{const i="svg"===Es(e?.type,"icon")?"svg":"icon";return{id:Es(e?.id,`f_load_${t}`),type:i,icon:Es(e?.icon,"mdi:help"),label:Es(e?.label,"Item"),x:fs(e?.x,0),y:fs(e?.y,0),width:ws(e?.width,600),height:ws(e?.height,600),rotation:fs(e?.rotation,0),lockAspect:"boolean"==typeof e?.lockAspect?e.lockAspect:"svg"!==i}}));var r;const o=function(e,t,i){if(e?.grid_bytes&&Array.isArray(e.grid_bytes)){const t=new Uint8Array(Ie),i=e.grid_bytes,s=Math.min(i.length,Ie);for(let e=0;e<s;e++)t[e]=i[e];return t}return t>0&&i>0?Le(t,i):new Uint8Array(Ie)}(i,t.roomWidth,t.roomDepth),{zone0:n,zones:a}=function(e){const t={zone0:{type:"default"},zones:Array(7).fill(null)},i=e?.zone_slots;if(!Array.isArray(i)||8!==i.length)return t;if(!i[0]||"object"!=typeof i[0])return t;const s={type:_s(i[0].type),trigger:i[0].trigger,renew:i[0].renew,timeout:i[0].timeout,handoff_timeout:i[0].handoff_timeout},r=Array.from({length:7},(e,t)=>{const s=i[t+1];return s&&"object"==typeof s?{...s,type:_s(s.type),color:(r=s.color,o=t+1,"string"==typeof r&&ps.test(r)?r:hs[(o-1)%hs.length])}:null;var r,o});return{zone0:s,zones:r}}(i);return{calibration:t,furniture:s,grid:o,zone0:n,zoneConfigs:a,settings:ms(e?.settings,e?.entities,e?.log_levels)}}function ys(e){const{saving:t,dirty:i,localize:s,onSave:r,onCancel:o}=e,n=s(t?"common.saving":"common.save"),a=t||!i;return customElements.get("ha-button")?Y`
      <div class="save-cancel-bar">
        <ha-button class="cancel-btn" @click=${o}>${s("common.cancel")}</ha-button>
        <ha-button class="save-btn" appearance="accent" .disabled=${a} @click=${r}>${n}</ha-button>
      </div>
    `:Y`
      <div class="save-cancel-bar">
        <button class="wizard-btn wizard-btn-back cancel-btn" @click=${o}>${s("common.cancel")}</button>
        <button class="wizard-btn wizard-btn-primary save-btn" ?disabled=${a} @click=${r}>${n}</button>
      </div>
    `}const Cs=["None","Error","Warning","Info","Debug"],vs=Object.fromEntries(ns.flatMap(([e,t])=>{const i=ss[e];return"number"==typeof i?[[t.slice(1),i]]:[]})),Bs=n`
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
`,Ss=n`
  .setting-info {
    position: relative;
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
`;class Is extends ce{constructor(){super(...arguments),this.sensorState={occupancy:!1,static_presence:!1,motion_presence:!1,target_presence:!1,illuminance:null,temperature:null,humidity:null,co2:null},this.targetAutoDistance=!0,this.targetMaxDistance=6,this.stuckTargetTimeout=300,this.staticAutoDistance=!0,this.staticMinDistance=.3,this.staticMaxDistance=16,this.openAccordions=new Set,this.perspective=null,this.roomWidth=0,this.roomDepth=0,this.grid=new Uint8Array(0),this.saving=!1,this.dirty=!1,this.temperatureOffset=0,this.humidityOffset=0,this.illuminanceOffset=0,this.motionTimeout=5,this.staticTimeout=30,this.staticTriggerThreshold=3,this.staticRenewThreshold=3,this.staticOnDelay=0,this.entitiesConfig={},this.logLevels={},this.bluetoothEnabled=!1,this.co2Enabled=!1,this.ledMode="Manual Control",this.ledBrightness=1,this.ledPresenceColor="#CC33FF",this.relayTriggerMode="disabled",this.relayContactMode="no",this.targetUpdateRateMs=1e3,this.zoneUpdateRateMs=1e3,this._overrides={},this._localDirty=!1,this.localize=Bi,this._stopClosed=e=>{e.stopPropagation()},this._optionCache=null,this._geomCache=null,this._tipIdCounter=0,this._openTooltip=null,this._openTooltipBtn=null,this._onTooltipKeydown=e=>{"Escape"===e.key&&this._closeOpenTooltip()},this._onTooltipViewportChange=()=>{this._closeOpenTooltip()},this._onTooltipPointerDown=e=>{const t=e.composedPath();this._openTooltipBtn&&t.includes(this._openTooltipBtn)||this._closeOpenTooltip()},this._tooltipListeners=new zi([{target:document,type:"keydown",listener:this._onTooltipKeydown},{target:document,type:"pointerdown",listener:this._onTooltipPointerDown,options:!0},{target:window,type:"scroll",listener:this._onTooltipViewportChange,options:!0},{target:window,type:"resize",listener:this._onTooltipViewportChange}])}_getOptions(){const e=this._optionCache;if(e&&e.localize===this.localize&&e.co2Enabled===this.co2Enabled)return e;const t=this.localize,i=[{value:"Manual Control",label:t("settings.manual_control")},{value:"Presence",label:t("settings.presence")}];return this.co2Enabled&&i.push({value:"Environmental",label:t("settings.environmental")},{value:"Environmental + Presence",label:t("settings.environmental_presence")}),this._optionCache={localize:t,co2Enabled:this.co2Enabled,rateOptions:[{value:"200",label:t("settings.frequency.5hz")},{value:"500",label:t("settings.frequency.2hz")},{value:"1000",label:t("settings.frequency.1hz")},{value:"2000",label:t("settings.frequency.0_5hz")}],logLevelOptions:Cs.map(e=>({value:e,label:t(`settings.log_level.${e.toLowerCase()}`)})),ledModes:i,relayTriggerModes:[{value:"disabled",label:t("settings.relay_disabled")},{value:"motion",label:t("settings.relay_motion")},{value:"presence",label:t("settings.relay_presence")},{value:"occupancy",label:t("settings.relay_occupancy")}],relayContactModes:[{value:"no",label:t("settings.relay_normally_open")},{value:"nc",label:t("settings.relay_normally_closed")}]},this._optionCache}_getGeometry(){const e=this._geomCache;return e&&e.grid===this.grid&&e.perspective===this.perspective&&e.roomWidth===this.roomWidth&&e.roomDepth===this.roomDepth?e:(this._geomCache={grid:this.grid,perspective:this.perspective,roomWidth:this.roomWidth,roomDepth:this.roomDepth,autoRange:lt(this.roomWidth,this.roomDepth,this.perspective,this.grid),metrics:dt(this.grid,this.roomWidth,this.perspective)},this._geomCache)}renderToggle(e){const{checked:t,disabled:i=!1,entityKey:s,onChange:r}=e;return customElements.get("ha-switch")?Y`<ha-switch data-entity-key=${s??J} .checked=${t} .disabled=${i} @change=${r}></ha-switch>`:Y`<label class="toggle-switch"><input type="checkbox" data-entity-key=${s??J} .checked=${t} .disabled=${i} @change=${r} /><span class="toggle-slider"></span></label>`}render(){this._tipIdCounter=0;return Y`
      <div class="settings-container">
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
        ${this.renderSaveCancelButtons()}
      </div>
    `}toggleAccordion(e){const t=this.openAccordions.has(e)?new Set:new Set([e]);this.openAccordions=t,this.dispatchEvent(new CustomEvent("accordion-toggle",{detail:t,bubbles:!0,composed:!0}))}renderSettingsSection(e){switch(e){case"detection":return this.renderDetectionRanges();case"sensitivity":return this.renderSensitivities();case"reporting":return this.renderEntities();case"led_relay":return Y`${this.renderLed()}${this.renderRelay()}`;case"logging":return this.renderLogging();default:return J}}renderEnvOffset(e,t,i,s,r,o,n,a,l,c=-1/0,h=1/0){const d=`${i}Offset`,A="function"==typeof t?t:()=>t,g=A(),u=this[d]??0,_=this._overrides[`${i}Offset`]??u,p=null!=g?g-u:null,f=e=>Math.max(c,Math.min(h,e)),w=null!=p?this.localize.formatNumber(f(p+_),a):"—";return Y`
      <div class="setting-row">
        <label>${e}</label>
        <span class="setting-input-unit"><input type="range" class="setting-range" data-offset-key=${i} data-precision=${a} data-display-min=${c} data-display-max=${h} min=${s} max=${r} step=${o} .value=${String(_)} @input=${e=>{const t=e.target,s=parseFloat(t.value),r=A(),o=this[d]??0,n=null!=r?r-o:null,l=null!=n?this.localize.formatNumber(f(n+s),a):"—";this._setSettingValue(t,l),this._overrides[`${i}Offset`]=s,this._fireDirty()}} /><span class="setting-value">${w}</span> ${n}</span>
        ${this.resetBtn(0)}${this.infoTip(l)}
      </div>
    `}_setText(e,t){const i=document.createTreeWalker(e,NodeFilter.SHOW_TEXT).nextNode();i?i.data=t:e.textContent=t}_setSettingValue(e,t){const i=e.parentElement?.querySelector(".setting-value");i instanceof HTMLElement&&this._setText(i,t)}_resetSlider(e,t,i){const s=e.querySelector(".setting-range");if(!s)return;s.value=String(t);const r=s.parentElement?.querySelector(".setting-value");if(r)if(s.dataset.offsetKey){const e=s.dataset.offsetKey,i=this.sensorState[e];if(null==i)this._setText(r,"—");else{const o=i-(this[`${e}Offset`]??0),n=parseInt(s.dataset.precision??"0",10),a=parseFloat(s.dataset.displayMin??"-Infinity"),l=parseFloat(s.dataset.displayMax??"Infinity"),c=Math.max(a,Math.min(l,o+t));this._setText(r,this.localize.formatNumber(c,n))}this._overrides[`${s.dataset.offsetKey}Offset`]=t}else this._setText(r,String(t));i&&(this._overrides[i]=t),this._localDirty=!0}resetBtn(e,t){return Y`<button
			type="button"
			class="setting-info"
			aria-label=${this.localize("settings.reset_to_default")}
			title=${this.localize("settings.reset_to_default")}
			@click=${i=>{i.stopPropagation();const s=i.currentTarget.closest(".setting-row");s&&this._resetSlider(s,e,t),t?this._fireChange(t,e):this._fireDirty()}}
		><ha-icon icon="mdi:restart"></ha-icon></button>`}_closeOpenTooltip(){this._openTooltip&&(this._openTooltip.style.display="none",this._openTooltip=null,this._openTooltipBtn=null),this._tooltipListeners.detach()}disconnectedCallback(){super.disconnectedCallback(),this._closeOpenTooltip()}infoTip(e){const t="epp-tip-"+ ++this._tipIdCounter;return Y`<button
			type="button"
			class="setting-info"
			aria-label=${this.localize("settings.show_info")}
			aria-describedby=${t}
			title=${this.localize("settings.show_info")}
			@click=${e=>{e.stopPropagation();const t=e.currentTarget,i=t.querySelector(".setting-info-tooltip");if(!i)return;const s="block"===i.style.display;if(this.shadowRoot.querySelectorAll(".setting-info-tooltip").forEach(e=>{e.style.display="none"}),s)return this._openTooltip=null,this._openTooltipBtn=null,void this._tooltipListeners.detach();const r=t.getBoundingClientRect();i.style.display="block",i.style.left=`${Math.max(8,Math.min(r.right-240,window.innerWidth-256))}px`,i.style.top=`${r.bottom+6}px`,this._openTooltip=i,this._openTooltipBtn=t,this._tooltipListeners.attach()}}
		><ha-icon icon="mdi:help-circle-outline"></ha-icon><span id=${t} class="setting-info-tooltip" role="tooltip">${e}</span></button>`}renderDetectionRanges(){const{autoRange:e,metrics:t}=this._getGeometry(),i=e>0?Math.min(e,6):6,s=e>0?Math.min(e,16):16,r=this.targetAutoDistance?i:this.targetMaxDistance,o=this.staticAutoDistance?s:this.staticMaxDistance,n="opacity: 0.5; pointer-events: none;";return Y`
      <div class="settings-section">
        ${t?Y`<p style="font-size: 13px; color: var(--secondary-text-color, #757575); margin: 0 0 12px;">${this.localize("settings.furthest_point")} <span style="font-weight: 700; color: var(--error-color, #db4437);">${this.localize.formatNumber(t.furthestM,1)}m</span></p>`:J}
        <div class="setting-group">
          <h4>${this.localize("settings.target_sensor")}</h4>
          <div class="setting-row">
            <label>${this.localize("settings.auto")}</label>
            ${this.renderToggle({checked:this.targetAutoDistance,onChange:e=>{const t=e.target.checked;t||(this._overrides.targetMaxDistance=r,this._fireChange("targetMaxDistance",r)),this._overrides.targetAutoDistance=t,this._fireChange("targetAutoDistance",t)}})}
            ${this.infoTip(this.localize("info.target_auto_range"))}
          </div>
          <div class="setting-row" style="${this.targetAutoDistance?n:""}">
            <label>${this.localize("settings.max_distance")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" .value=${String(r)} min="0.5" max="6" step="0.1"
              @input=${e=>{const t=e.target,i=Number(t.value);this._overrides.targetMaxDistance=i,this._fireChange("targetMaxDistance",i),this._setSettingValue(t,this.localize.formatNumber(i,1))}} /><span class="setting-value">${this.localize.formatNumber(r,1)}</span><span class="setting-unit">m</span></span>
            ${this.resetBtn(i,"targetMaxDistance")}${this.infoTip(this.localize("info.target_max_distance"))}
          </div>
        </div>
        <div class="setting-group">
          <h4>${this.localize("settings.static_sensor")}</h4>
          <div class="setting-row">
            <label>${this.localize("settings.auto")}</label>
            ${this.renderToggle({checked:this.staticAutoDistance,onChange:e=>{const t=e.target.checked;t||(this._overrides.staticMinDistance=.3,this._fireChange("staticMinDistance",.3),this._overrides.staticMaxDistance=o,this._fireChange("staticMaxDistance",o)),this._overrides.staticAutoDistance=t,this._fireChange("staticAutoDistance",t)}})}
            ${this.infoTip(this.localize("info.target_auto_range"))}
          </div>
          <div class="setting-row" style="${this.staticAutoDistance?n:""}">
            <label>${this.localize("settings.min_distance")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" .value=${String(this.staticAutoDistance?.3:this.staticMinDistance)} min="0.3" max="16" step="0.1"
              @input=${e=>{const t=e.target;let i=Number(t.value);const s=this._overrides.staticMaxDistance??this.staticMaxDistance;i>=s&&(i=Math.round(10*(s-.1))/10,t.value=String(i)),this._overrides.staticMinDistance=i,this._fireChange("staticMinDistance",i),this._setSettingValue(t,this.localize.formatNumber(i,1))}} /><span class="setting-value">${this.localize.formatNumber(this.staticAutoDistance?.3:this.staticMinDistance,1)}</span><span class="setting-unit">m</span></span>
            ${this.resetBtn(.3,"staticMinDistance")}${this.infoTip(this.localize("info.static_min_distance"))}
          </div>
          <div class="setting-row" style="${this.staticAutoDistance?n:""}">
            <label>${this.localize("settings.max_distance")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" .value=${String(o)} min="2.4" max="16" step="0.1"
              @input=${e=>{const t=e.target;let i=Number(t.value);const s=this._overrides.staticMinDistance??this.staticMinDistance;i<=s&&(i=Math.round(10*(s+.1))/10,t.value=String(i)),this._overrides.staticMaxDistance=i,this._fireChange("staticMaxDistance",i),this._setSettingValue(t,this.localize.formatNumber(i,1))}} /><span class="setting-value">${this.localize.formatNumber(o,1)}</span><span class="setting-unit">m</span></span>
            ${this.resetBtn(s,"staticMaxDistance")}${this.infoTip(this.localize("info.static_max_distance"))}
          </div>
        </div>
      </div>
    `}renderSliderRow(e){return Y`
      <div class="setting-row">
        <label>${this.localize(e.label)}</label>
        <span class="setting-input-unit"><input type="range" class="setting-range" .value=${String(e.value)} min=${e.min} max=${e.max} step=${e.step??1} @input=${t=>{const i=t.target,s=Number(i.value);this._overrides[e.key]=s,this._setSettingValue(i,i.value),this._fireChange(e.key,s)}} /><span class="setting-value">${e.value}</span><span class="setting-unit">${e.unit}</span></span>
        ${this.resetBtn(e.defaultValue,e.key)}${this.infoTip(this.localize(e.tip))}
      </div>
    `}renderSensitivities(){const e=[{title:"settings.motion_sensor",rows:[{label:"settings.presence_timeout",key:"motionTimeout",value:this.motionTimeout,min:0,max:120,unit:"s",defaultValue:vs.motionTimeout,tip:"info.motion_timeout"}]},{title:"settings.static_sensor",rows:[{label:"settings.presence_delay",key:"staticOnDelay",value:this.staticOnDelay,min:0,max:2,step:.1,unit:"s",defaultValue:vs.staticOnDelay,tip:"info.presence_delay"},{label:"settings.presence_timeout",key:"staticTimeout",value:this.staticTimeout,min:0,max:120,unit:"s",defaultValue:vs.staticTimeout,tip:"info.static_timeout"},{label:"settings.trigger_threshold",key:"staticTriggerThreshold",value:this.staticTriggerThreshold,min:1,max:9,unit:"",defaultValue:vs.staticTriggerThreshold,tip:"info.trigger_threshold"},{label:"settings.renew_threshold",key:"staticRenewThreshold",value:this.staticRenewThreshold,min:1,max:9,unit:"",defaultValue:vs.staticRenewThreshold,tip:"info.renew_threshold"}]},{title:"settings.target_sensor",rows:[{label:"settings.stuck_target_timeout",key:"stuckTargetTimeout",value:this.stuckTargetTimeout,min:0,max:600,unit:"s",defaultValue:vs.stuckTargetTimeout,tip:"info.stuck_target_timeout"}]}];return Y`
      <div class="settings-section">
        ${e.map(e=>Y`
        <div class="setting-group">
          <h4>${this.localize(e.title)}</h4>
          ${e.rows.map(e=>this.renderSliderRow(e))}
        </div>
        `)}
        <div class="setting-group">
          <h4>${this.localize("settings.environmental")}</h4>
          ${this.renderEnvOffset(this.localize("settings.illuminance_offset"),()=>this.sensorState.illuminance,"illuminance",-500,500,1,"lux",1,this.localize("info.illuminance_offset"),0)}
          ${this.renderEnvOffset(this.localize("settings.humidity_offset"),()=>this.sensorState.humidity,"humidity",-50,50,.1,"%",1,this.localize("info.humidity_offset"),0,100)}
          ${this.renderEnvOffset(this.localize("settings.temperature_offset"),()=>this.sensorState.temperature,"temperature",-20,20,.1,"°C",1,this.localize("info.temperature_offset"))}
        </div>
      </div>
    `}renderEntityToggleRow(e,t,i){return Y`
      <div class="setting-row">
        <label>${this.localize(e.label)}</label>
        ${this.renderToggle({checked:t(e.key,e.defaultValue),disabled:e.disabled,entityKey:e.key,onChange:i})}
        ${this.infoTip(this.localize(e.tip))}
      </div>
    `}renderEntities(){const e=this.entitiesConfig||{},t=this._overrides.entities||{},i=(i,s)=>t[i]??e[i]??s,s=e=>{const t=e.target,i=t.dataset.entityKey;this._overrides.entities||(this._overrides.entities={}),this._overrides.entities[i]=t.checked,this._fireChange("entitiesConfig",{...this.entitiesConfig||{},...this._overrides.entities})},r=this._overrides,o=i("zone_presence",!0)||i("zone_target_count",!1),n=i("target_xy",!1)||i("target_active",!1)||i("target_signal",!1)||i("target_zone",!1)||i("target_count",!1),a=!this.perspective,l=[{label:"entities.zone_presence",key:"zone_presence",defaultValue:!0,tip:"info.zone_presence",disabled:a},{label:"entities.zone_target_count",key:"zone_target_count",defaultValue:!1,tip:"info.zone_target_count",disabled:a}],c=[{label:"entities.xy",key:"target_xy",defaultValue:!1,tip:"info.xy",disabled:a},{label:"entities.active",key:"target_active",defaultValue:!1,tip:"info.active"},{label:"entities.target_signal",key:"target_signal",defaultValue:!1,tip:"info.target_signal"},{label:"entities.target_zone",key:"target_zone",defaultValue:!1,tip:"info.target_zone"}],h=e=>e.map(e=>this.renderEntityToggleRow(e,i,s)),d=this._getOptions().rateOptions;return Y`
      <div class="settings-section">
        <div class="setting-group">
          <h4>${this.localize("entities.room_level")}</h4>
          ${h([{label:"entities.occupancy",key:"room_occupancy",defaultValue:!0,tip:"info.room_occupancy"},{label:"entities.static_presence",key:"room_static_presence",defaultValue:!1,tip:"info.room_static"},{label:"entities.motion_presence",key:"room_motion_presence",defaultValue:!1,tip:"info.room_motion"},{label:"entities.target_presence",key:"room_target_presence",defaultValue:!1,tip:"info.room_target_presence"},{label:"entities.mmwave",key:"room_mmwave",defaultValue:!1,tip:"info.room_mmwave"},{label:"entities.target_count",key:"target_count",defaultValue:!1,tip:"info.room_target_count"}])}
        </div>
        <div class="setting-group">
          <h4>${this.localize("entities.zone_level")}</h4>
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
        </div>
        <div class="setting-group">
          <h4>${this.localize("entities.target_level")}</h4>
          ${h(c)}
          <div class="setting-row">
            <label>${this.localize("settings.update_rate")}</label>
            <ha-select
              .value=${String(r.targetUpdateRateMs??this.targetUpdateRateMs)}
              .options=${d}
              .disabled=${!n}
              @selected=${e=>{const t=e.detail.value;if(t){const e=Number(t);this._overrides.targetUpdateRateMs=e,this._fireChange("targetUpdateRateMs",e),this.requestUpdate()}}}
              @closed=${this._stopClosed}>
            </ha-select>
          </div>
        </div>
        <div class="setting-group">
          <h4>${this.localize("settings.environmental")}</h4>
          ${h([{label:"entities.illuminance",key:"env_illuminance",defaultValue:!1,tip:"info.illuminance"},{label:"entities.humidity",key:"env_humidity",defaultValue:!1,tip:"info.humidity"},{label:"entities.temperature",key:"env_temperature",defaultValue:!1,tip:"info.temperature"},{label:"entities.co2",key:"env_co2",defaultValue:!1,tip:"info.co2"}])}
        </div>
      </div>
    `}renderLogging(){const e=this._getOptions().logLevelOptions,t=[{key:"system",label:"settings.log_system",tip:"info.log_system",show:!0},{key:"epp",label:"settings.log_epp",tip:"info.log_epp",show:!0},{key:"led",label:"settings.log_led",tip:"info.log_led",show:!0},{key:"networking",label:"settings.log_networking",tip:"info.log_networking",show:!0},{key:"ble",label:"settings.log_ble",tip:"info.log_ble",show:this.bluetoothEnabled},{key:"co2",label:"settings.log_co2",tip:"info.log_co2",show:this.co2Enabled}];return Y`
      <div class="settings-section">
        <div class="setting-group">
          ${t.filter(e=>e.show).map(t=>{const i=(this._overrides.logLevels||{})[t.key]??this.logLevels[t.key]??"None";return Y`
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
        </div>
      </div>
    `}renderLed(){const e=this._overrides.ledMode??this.ledMode,t="Manual Control"!==e,i="Presence"===e||"Environmental + Presence"===e,s=this._getOptions().ledModes,r=this._overrides.ledBrightness??this.ledBrightness,o=this._overrides.ledPresenceColor??this.ledPresenceColor;return Y`
      <div class="settings-section">
        <div class="setting-group">
          <h4>${this.localize("settings.led")}</h4>
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
            ${this.resetBtn(vs.ledBrightness,"ledBrightness")}${this.infoTip(this.localize("info.led_brightness"))}
          </div>`:J}
          ${i?Y`
          <div class="setting-row">
            <label>${this.localize("settings.led_presence_color")}</label>
            <input type="color" .value=${o} @input=${e=>{const t=e.target.value;this._overrides.ledPresenceColor=t,this._fireChange("ledPresenceColor",t)}} />
            ${this.infoTip(this.localize("info.led_presence_color"))}
          </div>`:J}
        </div>
      </div>
    `}renderRelay(){const{relayTriggerModes:e,relayContactModes:t}=this._getOptions(),i=this._overrides.relayTriggerMode??this.relayTriggerMode,s=this._overrides.relayContactMode??this.relayContactMode,r="disabled"!==i;return Y`
      <div class="settings-section">
        <div class="setting-group">
          <h4>${this.localize("settings.relay")}</h4>
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
        </div>
      </div>
    `}renderSaveCancelButtons(){this.dirty||!this._localDirty||this.saving||(this._localDirty=!1);const e=this.dirty||this._localDirty;return ys({saving:this.saving,dirty:e,localize:this.localize,onSave:()=>this._emitSave(),onCancel:()=>{this.dispatchEvent(new CustomEvent("cancel",{bubbles:!0,composed:!0}))}})}_emitSave(){const e=this._overrides,t={...this.entitiesConfig,...e.entities||{}},i=e.targetAutoDistance??this.targetAutoDistance,s=e.staticAutoDistance??this.staticAutoDistance;let r=e.targetMaxDistance??this.targetMaxDistance,o=e.staticMinDistance??this.staticMinDistance,n=e.staticMaxDistance??this.staticMaxDistance;if(i||s){const{autoRange:e}=this._getGeometry();i&&(r=e>0?Math.min(e,6):6),s&&(o=.3,n=e>0?Math.min(e,16):16)}this.dispatchEvent(new CustomEvent("save",{detail:{target_auto_distance:i,target_max_distance:r,stuck_target_timeout:e.stuckTargetTimeout??this.stuckTargetTimeout,static_auto_distance:s,static_min_distance:o,static_max_distance:n,motion_timeout:e.motionTimeout??this.motionTimeout,static_timeout:e.staticTimeout??this.staticTimeout,static_trigger_threshold:e.staticTriggerThreshold??this.staticTriggerThreshold,static_renew_threshold:e.staticRenewThreshold??this.staticRenewThreshold,static_on_delay:e.staticOnDelay??this.staticOnDelay,temperature_offset:e.temperatureOffset??this.temperatureOffset,humidity_offset:e.humidityOffset??this.humidityOffset,illuminance_offset:e.illuminanceOffset??this.illuminanceOffset,entities:t,log_levels:{...this.logLevels,...e.logLevels||{}},led_mode:e.ledMode??this.ledMode,led_brightness:e.ledBrightness??this.ledBrightness,led_presence_color:e.ledPresenceColor??this.ledPresenceColor,relay_trigger_mode:e.relayTriggerMode??this.relayTriggerMode,relay_contact_mode:e.relayContactMode??this.relayContactMode,target_update_rate_ms:e.targetUpdateRateMs??this.targetUpdateRateMs,zone_update_rate_ms:e.zoneUpdateRateMs??this.zoneUpdateRateMs},bubbles:!0,composed:!0}))}_fireChange(e,t){this.dispatchEvent(new CustomEvent("setting-change",{detail:{key:e,value:t},bubbles:!0,composed:!0})),this._fireDirty()}_fireDirty(){this._localDirty=!0,this.dispatchEvent(new CustomEvent("dirty",{bubbles:!0,composed:!0}))}}Is.styles=[Bs,Di,xi,Ri,Ss,n`
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

      .setting-row ha-select {
        width: 140px;
        flex-shrink: 0;
      }

      .setting-row ha-select.wide-select {
        width: 220px;
      }

      .save-cancel-bar {
        display: flex;
        justify-content: space-between;
        padding: 12px;
        border-top: 1px solid var(--divider-color, #eee);
        margin-top: auto;
      }
    `],e([ge({attribute:!1})],Is.prototype,"sensorState",void 0),e([ge({type:Boolean})],Is.prototype,"targetAutoDistance",void 0),e([ge({type:Number})],Is.prototype,"targetMaxDistance",void 0),e([ge({type:Number})],Is.prototype,"stuckTargetTimeout",void 0),e([ge({type:Boolean})],Is.prototype,"staticAutoDistance",void 0),e([ge({type:Number})],Is.prototype,"staticMinDistance",void 0),e([ge({type:Number})],Is.prototype,"staticMaxDistance",void 0),e([ge({attribute:!1})],Is.prototype,"openAccordions",void 0),e([ge({attribute:!1})],Is.prototype,"perspective",void 0),e([ge({type:Number})],Is.prototype,"roomWidth",void 0),e([ge({type:Number})],Is.prototype,"roomDepth",void 0),e([ge({attribute:!1})],Is.prototype,"grid",void 0),e([ge({type:Boolean})],Is.prototype,"saving",void 0),e([ge({type:Boolean})],Is.prototype,"dirty",void 0),e([ge({type:Number})],Is.prototype,"temperatureOffset",void 0),e([ge({type:Number})],Is.prototype,"humidityOffset",void 0),e([ge({type:Number})],Is.prototype,"illuminanceOffset",void 0),e([ge({type:Number})],Is.prototype,"motionTimeout",void 0),e([ge({type:Number})],Is.prototype,"staticTimeout",void 0),e([ge({type:Number})],Is.prototype,"staticTriggerThreshold",void 0),e([ge({type:Number})],Is.prototype,"staticRenewThreshold",void 0),e([ge({type:Number})],Is.prototype,"staticOnDelay",void 0),e([ge({attribute:!1})],Is.prototype,"entitiesConfig",void 0),e([ge({attribute:!1})],Is.prototype,"logLevels",void 0),e([ge({type:Boolean})],Is.prototype,"bluetoothEnabled",void 0),e([ge({type:Boolean})],Is.prototype,"co2Enabled",void 0),e([ge({type:String})],Is.prototype,"ledMode",void 0),e([ge({type:Number})],Is.prototype,"ledBrightness",void 0),e([ge({type:String})],Is.prototype,"ledPresenceColor",void 0),e([ge({type:String})],Is.prototype,"relayTriggerMode",void 0),e([ge({type:String})],Is.prototype,"relayContactMode",void 0),e([ge({type:Number})],Is.prototype,"targetUpdateRateMs",void 0),e([ge({type:Number})],Is.prototype,"zoneUpdateRateMs",void 0),e([ge({attribute:!1})],Is.prototype,"localize",void 0),customElements.get("epp-settings-view")||customElements.define("epp-settings-view",Is);class Ds extends ce{constructor(){super(...arguments),this.rawTargets=[],this.sensorState={occupancy:!1},this.localize=Bi,this.initialRoomWidth=0,this.initialRoomDepth=0,this.initialStep=null,this.mode="wizard",this._setupStep="guide",this._wizardSaving=!1,this._wizardCornerIndex=0,this._wizardCorners=[null,null,null,null],this._wizardRoomWidth=0,this._wizardRoomDepth=0,this._wizardCapturing=!1,this._wizardCaptureProgress=0,this._wizardCapturePaused=!1,this._wizardOffsetSide="",this._wizardOffsetFb="",this._dismissTutorial=!1,this._saveError=null,this._wizardCaptureCancelled=!1,this._captureRafId=null,this._initializedFromProps=!1,this._perspective=null,this._onCaptureOverlayKeydown=e=>{const t=e.key;if("Escape"===t)e.preventDefault(),this._wizardCancelCapture();else if("Tab"===t){e.preventDefault();const t=this.shadowRoot?.querySelector(".capture-overlay .wizard-btn-back");t?.focus()}},this._captureOverlayListeners=new zi([{target:document,type:"keydown",listener:this._onCaptureOverlayKeydown}])}connectedCallback(){super.connectedCallback(),this._initializedFromProps||(this._initializedFromProps=!0,this._wizardRoomWidth=this.initialRoomWidth,this._wizardRoomDepth=this.initialRoomDepth,null!==this.initialStep&&(this._setupStep=this.initialStep))}updated(e){if(e.has("_wizardCapturing"))if(this._wizardCapturing){this._captureOverlayListeners.attach();const e=this.shadowRoot?.querySelector(".capture-overlay .wizard-btn-back");e?.focus()}else this._captureOverlayListeners.detach()}disconnectedCallback(){super.disconnectedCallback(),this._captureOverlayListeners.detach(),this._wizardCaptureCancelled=!0,this._wizardCapturing=!1,this._wizardCapturePaused=!1,null!==this._captureRafId&&(cancelAnimationFrame(this._captureRafId),this._captureRafId=null)}_syncCornerOffsets(){const e=this._wizardCorners[this._wizardCornerIndex];this._wizardOffsetSide=e?.offset_side?String(e.offset_side/10):"",this._wizardOffsetFb=e?.offset_fb?String(e.offset_fb/10):""}_wizardCancelCapture(){this._wizardCaptureCancelled=!0,this._wizardCapturing=!1,this._wizardCapturePaused=!1}_wizardStartCapture(){const e=this.rawTargets.find(e=>null!=e.raw_x&&null!=e.raw_y);if(!e)return;this._wizardCapturing=!0,this._wizardCaptureProgress=0,this._wizardCapturePaused=!1,this._wizardCaptureCancelled=!1;const t=[];let i=0,s=Date.now();const r=()=>{if(this._wizardCaptureCancelled)return;const e=Date.now(),o=e-s;s=e;const n=this.rawTargets.filter(e=>null!=e.raw_x&&null!=e.raw_y),a=1===n.length;if(this._wizardCapturePaused=!a,a&&(i+=o,t.push({x:n[0].raw_x,y:n[0].raw_y})),this._wizardCaptureProgress=Math.min(i/5e3,1),i<5e3)return void(this._captureRafId=requestAnimationFrame(r));if(this._captureRafId=null,this._wizardCapturing=!1,this._wizardCapturePaused=!1,0===t.length)return;const l=function(e){return 0===e.length?null:{x:ht(e.map(e=>e.x)),y:ht(e.map(e=>e.y))}}(t);if(!l)return;const c=this._wizardCornerIndex;this._wizardCorners=[...this._wizardCorners],this._wizardCorners[c]={raw_x:l.x,raw_y:l.y,offset_side:10*(parseFloat(this._wizardOffsetSide)||0),offset_fb:10*(parseFloat(this._wizardOffsetFb)||0)},c<3&&(this._wizardCornerIndex=c+1),this._syncCornerOffsets(),this._wizardCorners.every(e=>null!==e)&&this._autoComputeRoomDimensions()};this._captureRafId=requestAnimationFrame(r)}_autoComputeRoomDimensions(){const e=ct(this._wizardCorners);this._wizardRoomWidth=e.width,this._wizardRoomDepth=e.depth}_recomputeDimsIfAllMarked(){this._wizardCorners.every(e=>null!==e)&&this._autoComputeRoomDimensions()}_computeWizardPerspective(){const e=this._wizardCorners;if(!e.every(e=>null!==e))return;const t=this._wizardRoomWidth,i=this._wizardRoomDepth,s=e.map(e=>({x:e.raw_x,y:e.raw_y})),r=[{x:e[0].offset_side,y:e[0].offset_fb},{x:t-e[1].offset_side,y:e[1].offset_fb},{x:t-e[2].offset_side,y:i-e[2].offset_fb},{x:e[3].offset_side,y:i-e[3].offset_fb}];this._perspective=function(e,t){const i=Math.max(1,...e.map(e=>Math.abs(e.x))),s=Math.max(1,...e.map(e=>Math.abs(e.y))),r=[],o=[];for(let n=0;n<4;n++){const a=e[n].x/i,l=e[n].y/s,c=t[n].x,h=t[n].y;r.push([a,l,1,0,0,0,-a*c,-l*c]),o.push(c),r.push([0,0,0,a,l,1,-a*h,-l*h]),o.push(h)}const n=r.map((e,t)=>[...e,o[t]]);for(let e=0;e<8;e++){let t=Math.abs(n[e][e]),i=e;for(let s=e+1;s<8;s++)Math.abs(n[s][e])>t&&(t=Math.abs(n[s][e]),i=s);if(t<1e-12)return null;[n[e],n[i]]=[n[i],n[e]];for(let t=e+1;t<8;t++){const i=n[t][e]/n[e][e];for(let s=e;s<=8;s++)n[t][s]-=i*n[e][s]}}const a=new Array(8);for(let e=7;e>=0;e--){a[e]=n[e][8];for(let t=e+1;t<8;t++)a[e]-=n[e][t]*a[t];a[e]/=n[e][e]}return[a[0]/i,a[1]/s,a[2],a[3]/i,a[4]/s,a[5],a[6]/i,a[7]/s]}(s,r)}_wizardFinish(){this._computeWizardPerspective(),this._perspective?(this._saveError=null,this._wizardSaving=!0,this.dispatchEvent(new CustomEvent("wizard-save",{detail:{perspective:this._perspective,roomWidth:this._wizardRoomWidth,roomDepth:this._wizardRoomDepth},bubbles:!0,composed:!0}))):this._saveError="wizard.invalid_corners"}saveFailed(){this._wizardSaving=!1,this._saveError="wizard.save_failed"}_getWizardTargetStyle(e){const{xPct:t,yPct:i}=Zi(e.raw_x??0,e.raw_y??0);return`left: ${t}%; top: ${i}%;`}render(){return"uncalibrated-fov"===this.mode?this._renderUncalibratedFov():null===this._setupStep?J:this._renderWizard()}_renderWizard(){let e;switch(this._setupStep){case"guide":e=this._renderWizardGuide();break;case"corners":e=this._renderWizardCorners()}return Y`
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
            <p style="margin: 8px 0 0; font-size: 13px; color: ${this._wizardCapturePaused?"var(--error-color, #e53935)":"var(--secondary-text-color)"};">
              ${this._wizardCapturePaused?this.localize("wizard.paused"):this.localize("wizard.stand_still")}
            </p>
            <button
              class="wizard-btn wizard-btn-back"
              style="margin-top: 12px;"
              @click=${()=>this._wizardCancelCapture()}
            >${this.localize("common.cancel")}</button>
          </div>
        </div>
      `:J}
    `}_renderWizardGuide(){const e=(e,t,i=!1,s=0)=>$`
      <g transform="translate(${e}, ${t}) rotate(${s}) scale(${i?-.7:.7}, 0.7)">
        <circle cx="0" cy="-12" r="4" fill="var(--primary-color, #03a9f4)"/>
        <line x1="0" y1="-8" x2="0" y2="2" stroke="var(--primary-color, #03a9f4)" stroke-width="2" stroke-linecap="round"/>
        <line x1="0" y1="2" x2="-4" y2="10" stroke="var(--primary-color, #03a9f4)" stroke-width="2" stroke-linecap="round"/>
        <line x1="0" y1="2" x2="4" y2="10" stroke="var(--primary-color, #03a9f4)" stroke-width="2" stroke-linecap="round"/>
        <line x1="0" y1="-4" x2="-5" y2="2" stroke="var(--primary-color, #03a9f4)" stroke-width="2" stroke-linecap="round"/>
        <line x1="0" y1="-4" x2="5" y2="-1" stroke="var(--primary-color, #03a9f4)" stroke-width="2" stroke-linecap="round"/>
      </g>
    `,t=(e,t,i,s)=>{const r=i-e,o=s-t,n=Math.sqrt(r*r+o*o),a=r/n,l=o/n,c=i-40*a,h=s-40*l;return $`
        <line x1="${e+40*a}" y1="${t+40*l}" x2="${c}" y2="${h}" stroke="var(--primary-color, #03a9f4)" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
        <polygon points="${c},${h} ${c-8*a+4*l},${h-8*l-4*a} ${c-8*a-4*l},${h-8*l+4*a}" fill="var(--primary-color, #03a9f4)" opacity="0.5"/>
      `},i=50,s=55,r=290,o=55,n=290,a=225,l=50,c=235,h=98,d=225,A=$`
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
        ${t(r,o,n,a)}
        ${e(265,145,!1,90)}
        <!-- 3rd arrow flat from 3 to 4 badge, same gap as arrow 1 has from 2 -->
        ${t(n,a,h-15,a)}
        ${e(190,a-17,!0)}

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
        <circle cx="${n}" cy="${a}" r="14" fill="#4CAF50" opacity="0.15"/>
        <circle cx="${n}" cy="${a}" r="14" fill="none" stroke="#4CAF50" stroke-width="2.5"/>
        <text x="${n}" y="${a+5}" font-size="14" fill="#4CAF50" font-weight="bold" text-anchor="middle">3</text>

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
          <h4 style="text-align: center; margin-bottom: 16px;">${this.localize("wizard.how_calibration_works")}</h4>

          ${A}

          <div style="display: flex; flex-direction: column; gap: 14px; padding: 16px 4px 0;">
            <div style="display: flex; align-items: flex-start; gap: 10px;">
              <div style="min-width: 22px; height: 22px; border-radius: 50%; background: #4CAF50; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; color: white;">1</div>
              <div style="font-size: 13px;">
                ${Ee(this.localize("wizard.walk_instruction_full"))}
              </div>
            </div>

            <div style="display: flex; align-items: flex-start; gap: 10px;">
              <div style="min-width: 22px; height: 22px; border-radius: 50%; background: #FF9800; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; color: white;">!</div>
              <div style="font-size: 13px;">
                ${Ee(this.localize("wizard.cant_reach"))}
              </div>
            </div>

            <div style="display: flex; align-items: flex-start; gap: 10px;">
              <ha-icon icon="mdi:information-outline" style="--mdc-icon-size: 20px; color: var(--primary-color); flex-shrink: 0; margin-top: 1px;"></ha-icon>
              <div style="font-size: 13px; color: var(--secondary-text-color, #757575);">
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
          <button class="wizard-btn wizard-btn-back"
            @click=${()=>{this._fireCancel()}}
          >${this.localize("common.cancel")}</button>
          <button class="wizard-btn wizard-btn-primary"
            @click=${()=>this._onBeginMarking()}
          >${this.localize("wizard.begin_marking")}</button>
        </div>
      </div>
    `}_renderWizardCorners(){const e=this._wizardCornerIndex,t=this.rawTargets.filter(e=>null!=e.raw_x&&null!=e.raw_y),i=t.length>0,s=t.length>1,r=this._wizardCorners.every(e=>null!==e),o=$e[e]||"",[n,a]=Ke[e]||["",""];return Y`
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
          ${$e.map((t,i)=>{const s=!!this._wizardCorners[i],r=i<3,o=i<e;return Y`
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
          <input
            type="number"
            class="offset-input"
            min="0"
            step="1"
            placeholder="${this.localize("wizard.distance_from_side",{wall:this.localize(n)})}"
            .value=${this._wizardOffsetSide}
            @input=${t=>{this._wizardOffsetSide=t.target.value;const i=10*(parseFloat(this._wizardOffsetSide)||0),s=this._wizardCorners[e];s&&(s.offset_side=i,this._recomputeDimsIfAllMarked())}}
          />
          <input
            type="number"
            class="offset-input"
            min="0"
            step="1"
            placeholder="${this.localize("wizard.distance_from_side",{wall:this.localize(a)})}"
            .value=${this._wizardOffsetFb}
            @input=${t=>{this._wizardOffsetFb=t.target.value;const i=10*(parseFloat(this._wizardOffsetFb)||0),s=this._wizardCorners[e];s&&(s.offset_fb=i,this._recomputeDimsIfAllMarked())}}
          />
        </div>

        ${this._renderMiniSensorView()}

        ${r?Y`
          <p style="font-size: 13px; color: var(--secondary-text-color); margin: 12px 0 4px;">
            ${this.localize("wizard.save_prompt")}
          </p>
        `:Y`
          <p class="no-target-warning" style="visibility: ${!i||s?"visible":"hidden"};">
            ${i?this.localize("wizard.multiple_targets"):this.localize("wizard.no_target")}
          </p>
        `}

        ${null!==this._saveError?Y`<p class="save-error" role="alert">${this.localize(this._saveError)}</p>`:J}

        <div class="wizard-actions">
          <button
            class="wizard-btn wizard-btn-back"
            @click=${()=>{this._fireCancel()}}
          >${this.localize("common.cancel")}</button>
          ${r?Y`
            <button
              class="wizard-btn wizard-btn-primary"
              ?disabled=${this._wizardSaving}
              @click=${()=>this._wizardFinish()}
            >
              ${this._wizardSaving?this.localize("common.saving"):this.localize("common.save")}
            </button>
          `:Y`
            <button
              class="wizard-btn wizard-btn-primary"
              ?disabled=${!i||s||this._wizardCapturing}
              @click=${()=>this._wizardStartCapture()}
            >
              ${this.localize("wizard.mark_corner",{corner:this.localize(o)})}
            </button>
          `}
        </div>
      </div>
    `}_renderMiniSensorView(){const e=je,t=xe,i=200,s=-e,r=t*Math.cos(We),o=`M 0 0 L ${s} ${r} A 6000 6000 0 0 0 ${e} ${r} Z`,n=[2e3,4e3].map(e=>{const t=e*Math.sin(We),i=e*Math.cos(We);return`M ${-t} ${i} A ${e} ${e} 0 0 0 ${t} ${i}`});return Y`
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
            ${n.map(e=>$`
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
          ${this._wizardCorners.map((e,t)=>{if(null===e)return J;const{xPct:i,yPct:s}=Zi(e.raw_x,e.raw_y);return Y`
                <div
                  class="mini-grid-captured"
                  style="left: ${i}%; top: ${s}%;"
                  title="${this.localize($e[t])}"
                ></div>
              `})}
          <!-- Live targets (per-target colors) -->
          ${this.rawTargets.map((e,t)=>null!=e.raw_x&&null!=e.raw_y?Y`
              <div
                class="mini-grid-target"
                style="${this._getWizardTargetStyle(e)} background: ${Je[t]||Je[0]};"
              ></div>
            `:J)}
        </div>
      </div>
    `}_renderUncalibratedFov(){const e=this.sensorState.occupancy,t=e?"#4CAF50":"var(--primary-color, #03a9f4)",i=160,s=14,r=180,o=30*Math.PI/180,n=150*Math.PI/180,a=i+r*Math.cos(o),l=s+r*Math.sin(o),c=i+r*Math.cos(n),h=s+r*Math.sin(n);return Y`
      <div style="display: flex; flex-direction: column; align-items: center; padding: 24px;">
        <svg viewBox="0 0 320 210" width="320" height="210" style="display: block;">
          <!-- Sensor at top center -->
          <rect x="${154}" y="0" width="12" height="8" rx="3" fill="${t}"/>
          <circle cx="${i}" cy="0" r="4" fill="${t}" opacity="0.4"/>

          <!-- 120 deg FOV wedge with rounded arc end -->
          <path d="M ${i} ${s} L ${a} ${l} A ${r} ${r} 0 0 1 ${c} ${h} Z"
                fill="${t}" fill-opacity="${e?.15:.06}"
                stroke="${t}" stroke-width="1" stroke-opacity="0.2"/>

          <!-- Range arcs -->
          ${[60,120,180].map(e=>{const r=i+e*Math.cos(o),a=s+e*Math.sin(o),l=i+e*Math.cos(n),c=s+e*Math.sin(n);return $`
              <path d="M ${r} ${a} A ${e} ${e} 0 0 1 ${l} ${c}"
                    fill="none" stroke="${t}" stroke-width="1"
                    stroke-dasharray="4 3" opacity="0.2"/>
            `})}

          <!-- Edge lines -->
          <line x1="${i}" y1="${s}" x2="${a}" y2="${l}" stroke="${t}" stroke-width="0.5" opacity="0.2"/>
          <line x1="${i}" y1="${s}" x2="${c}" y2="${h}" stroke="${t}" stroke-width="0.5" opacity="0.2"/>

          <!-- Target dots -->
          ${this.rawTargets.map((e,t)=>{if(null==e.raw_x||null==e.raw_y)return J;const o=Math.sqrt(e.raw_x*e.raw_x+e.raw_y*e.raw_y),n=Math.atan2(e.raw_x,e.raw_y),a=Math.min(o/6e3,1)*r,l=Math.PI/2-n,c=i+a*Math.cos(l),h=s+a*Math.sin(l);return $`<circle cx="${c}" cy="${h}" r="5" fill="${Je[t]||Je[0]}"/>`})}

          ${e?$`
            <text x="${i}" y="120" font-size="13" fill="${t}" text-anchor="middle" font-weight="500">${this.localize("live.detected")}</text>
          `:$`
            <text x="${i}" y="120" font-size="13" fill="var(--secondary-text-color, #aaa)" text-anchor="middle">${this.localize("wizard.no_presence")}</text>
          `}
        </svg>

        <button
          class="wizard-btn wizard-btn-primary"
          style="margin-top: 16px; display: inline-flex; align-items: center; gap: 8px;"
          @click=${()=>{this._fireStartCalibration()}}
        >
          <ha-icon icon="mdi:target" style="--mdc-icon-size: 16px;"></ha-icon>
          ${this.localize("wizard.calibrate_room_size")}
        </button>
      </div>
    `}_fireStartCalibration(){this.dispatchEvent(new CustomEvent("start-calibration",{bubbles:!0,composed:!0}))}_fireDismissTutorial(){this.dispatchEvent(new CustomEvent("dismiss-tutorial",{bubbles:!0,composed:!0}))}_onBeginMarking(){this._dismissTutorial&&this._fireDismissTutorial(),this._setupStep="corners",this.dispatchEvent(new CustomEvent("begin-corners",{bubbles:!0,composed:!0}))}_fireCancel(){this._setupStep=null,this._wizardCorners=[null,null,null,null],this._wizardCornerIndex=0,this._wizardOffsetSide="",this._wizardOffsetFb="",this._perspective=null,this._saveError=null,this.dispatchEvent(new CustomEvent("wizard-cancel",{bubbles:!0,composed:!0}))}}Ds.styles=[Di,ki,xi,n`
      :host {
        display: block;
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
        font-size: 13px;
        text-align: center;
      }

      .save-error {
        color: var(--error-color, #f44336);
        font-size: 13px;
        text-align: center;
        margin: 0;
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

      .dont-show-again {
        margin-top: 16px;
      }
    `],e([ge({attribute:!1})],Ds.prototype,"rawTargets",void 0),e([ge({attribute:!1})],Ds.prototype,"sensorState",void 0),e([ge({attribute:!1})],Ds.prototype,"localize",void 0),e([ge({type:Number})],Ds.prototype,"initialRoomWidth",void 0),e([ge({type:Number})],Ds.prototype,"initialRoomDepth",void 0),e([ge({type:String})],Ds.prototype,"initialStep",void 0),e([ge({type:String})],Ds.prototype,"mode",void 0),e([ue()],Ds.prototype,"_setupStep",void 0),e([ue()],Ds.prototype,"_wizardSaving",void 0),e([ue()],Ds.prototype,"_wizardCornerIndex",void 0),e([ue()],Ds.prototype,"_wizardCorners",void 0),e([ue()],Ds.prototype,"_wizardRoomWidth",void 0),e([ue()],Ds.prototype,"_wizardRoomDepth",void 0),e([ue()],Ds.prototype,"_wizardCapturing",void 0),e([ue()],Ds.prototype,"_wizardCaptureProgress",void 0),e([ue()],Ds.prototype,"_wizardCapturePaused",void 0),e([ue()],Ds.prototype,"_wizardOffsetSide",void 0),e([ue()],Ds.prototype,"_wizardOffsetFb",void 0),e([ue()],Ds.prototype,"_dismissTutorial",void 0),e([ue()],Ds.prototype,"_saveError",void 0),customElements.get("epp-wizard")||customElements.define("epp-wizard",Ds);const xs=[{mode:"entry",labelKey:"overlays.entry_exit",dotCss:qe(1,4)},{mode:"interference",labelKey:"overlays.interference",dotCss:qe(2,4)},{mode:"suppress",labelKey:"overlays.suppress",dotCss:qe(3,4)}];class Rs extends ce{constructor(){super(...arguments),this.overlayMode=null,this.localize=Bi}render(){return Y`
			<div class="overlay-scroll-area">
				${xs.map(e=>Y`
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
		`}}Rs.styles=n`
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
			gap: 4px;
			padding: 6px 8px;
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
			border-color: var(--primary-color, #03a9f4);
		}

		.overlay-item-row {
			display: flex;
			align-items: center;
			gap: 8px;
		}

		.overlay-dot {
			width: 16px;
			height: 16px;
			border-radius: 50%;
			flex-shrink: 0;
			border: 1px solid #ccc;
		}

		.overlay-name {
			flex: 1;
			font-size: 14px;
		}

		.overlay-hint {
			font-size: 11px;
			color: var(--secondary-text-color, #757575);
		}

	`,e([ge({attribute:!1})],Rs.prototype,"overlayMode",void 0),e([ge({attribute:!1})],Rs.prototype,"localize",void 0),customElements.get("epp-overlay-sidebar")||customElements.define("epp-overlay-sidebar",Rs);class Ms extends ce{constructor(){super(...arguments),this.zoneConfigs=[],this.activeZone=null,this.zone0={type:"default"},this.localZoneState=new Map,this.localize=Bi,this._nameDebounceTimer=null,this._pendingNameUpdate=null,this._flushPendingName=()=>{this._nameDebounceTimer=null;const e=this._pendingNameUpdate;e&&(this._pendingNameUpdate=null,this.dispatchEvent(new CustomEvent("zone-config-change",{detail:{index:e.index,updates:{name:e.name}},bubbles:!0,composed:!0})))}}_onNameInput(e,t){this._pendingNameUpdate={index:e,name:t},null!==this._nameDebounceTimer&&clearTimeout(this._nameDebounceTimer),this._nameDebounceTimer=setTimeout(this._flushPendingName,Ms.NAME_DEBOUNCE_MS)}disconnectedCallback(){super.disconnectedCallback(),null!==this._nameDebounceTimer&&(clearTimeout(this._nameDebounceTimer),this._flushPendingName())}render(){return this._renderZoneSidebar()}updated(){for(const e of this.renderRoot.querySelectorAll(".sensitivity-select")){const t=e.dataset.value;null!=t&&e.value!==t&&(e.value=t)}}_renderZoneSidebar(){return Y`
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
											<input
												type="color"
												class="zone-color-picker"
												style="width: 16px; height: 16px; border-radius: 50%;${this.localZoneState.get(i)?.occupied?` box-shadow: 0 0 6px 2px ${e.color};`:""}"
												.value=${e.color}
												@input=${e=>{const i=e.target.value;this.dispatchEvent(new CustomEvent("zone-config-change",{detail:{index:t,updates:{color:i}},bubbles:!0,composed:!0}))}}
												@click=${e=>e.stopPropagation()}
											/>
										`:Y`
											<div
												class="zone-color-dot"
												style="background: ${e.color};${this.localZoneState.get(i)?.occupied?` box-shadow: 0 0 6px 2px ${e.color};`:""}"
											></div>
										`}
								<input
									class="zone-name-input"
									type="text"
									.value=${e.name}
									@input=${e=>{const i=e.target.value;this._onNameInput(t,i)}}
									@blur=${()=>{null!==this._nameDebounceTimer&&(clearTimeout(this._nameDebounceTimer),this._flushPendingName())}}
									@click=${e=>{e.stopPropagation(),this.dispatchEvent(new CustomEvent("zone-select",{detail:{zone:i},bubbles:!0,composed:!0}))}}
									@focus=${()=>{this.dispatchEvent(new CustomEvent("zone-select",{detail:{zone:i},bubbles:!0,composed:!0}))}}
								/>
								<button
									class="sidebar-remove-btn"
									type="button"
									aria-label=${this.localize("zones.remove_zone")}
									@click=${e=>{e.stopPropagation(),this.dispatchEvent(new CustomEvent("zone-remove",{detail:{slot:i},bubbles:!0,composed:!0}))}}
								>
									<ha-icon icon="mdi:close"></ha-icon>
								</button>
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
		`}_emitZone0Change(e){this.dispatchEvent(new CustomEvent("zone0-change",{detail:e,bubbles:!0,composed:!0}))}_renderBoundaryTypeControls(){return this._renderTypeControls(this.zone0,ds(this.zone0),e=>this._emitZone0Change(e))}_renderZoneTypeControls(e,t){return this._renderTypeControls(e,ds(e),e=>{this.dispatchEvent(new CustomEvent("zone-config-change",{detail:{index:t,updates:e},bubbles:!0,composed:!0}))})}_renderTypeControls(e,t,i){const s="custom"===e.type,r=`width: 100%; display: flex; align-items: center; gap: 4px; font-size: 12px; opacity: ${s?1:.5};`,o=(e,t,s)=>{const r=Number(t);r>0&&i({[e]:Math.min(Math.max(r,1),s)})};return Y`
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
						${cs.map(e=>Y`<option value=${e}>${this.localize(`zones.${e}`)}</option>`)}
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
		`}}function ks(e){if(e)try{e()}catch(e){console.debug("safeUnsub: callback threw (ignored):",e)}}Ms.NAME_DEBOUNCE_MS=150,Ms.styles=[Ri,Mi,n`
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
		`],e([ge({attribute:!1})],Ms.prototype,"zoneConfigs",void 0),e([ge({attribute:!1})],Ms.prototype,"activeZone",void 0),e([ge({attribute:!1})],Ms.prototype,"zone0",void 0),e([ge({attribute:!1})],Ms.prototype,"localZoneState",void 0),e([ge({attribute:!1})],Ms.prototype,"localize",void 0),customElements.get("epp-zone-sidebar")||customElements.define("epp-zone-sidebar",Ms);const Ts="epp_selected_mac";function Fs(){try{return localStorage.getItem(Ts)}catch{return null}}function Ps(e){try{""===e?localStorage.removeItem(Ts):localStorage.setItem(Ts,e)}catch{}}class Us{constructor(e){this.devices=[],this.selectedMac="",this.showRoomCalibrationTutorial=!0,this._hass=null,this._reconnecting=!1,this._connectionFailed=!1,this._lastSelectedOnline=null,this._targetsGen=0,this._displayGen=0,this._deviceListGen=0,this._sessionGen=0,this._wantDeviceListSub=!1,this._disposed=!1,this._host=e,e.addController(this)}_claimGen(e){const t=++this[e];return{stale:()=>this[e]!==t}}hostConnected(){this._disposed=!1}hostDisconnected(){this._disposed=!0,this.unsubscribeDeviceList(),this.closeDeviceSession()}get hass(){return this._hass}set hass(e){const t=this._hass?.connection;if(this._hass=e,e?.connection&&e.connection!==t&&t){const e=this._wantDeviceListSub;this._unsubDevice=void 0,this._unsubTargets=void 0,this._unsubDisplay=void 0,this._unsubDeviceList=void 0,this._targetRetryTimer&&(clearTimeout(this._targetRetryTimer),this._targetRetryTimer=void 0),this._displayRetryTimer&&(clearTimeout(this._displayRetryTimer),this._displayRetryTimer=void 0),this._targetsGen++,this._displayGen++,this._deviceListGen++,this._sessionGen++,e&&this.subscribeDeviceList().catch(()=>{})}}get hasDeviceSession(){return!!this._unsubDevice}get reconnecting(){return this._reconnecting}get connectionFailed(){return this._connectionFailed}setShowRoomCalibrationTutorial(e){this.showRoomCalibrationTutorial!==e&&(this.showRoomCalibrationTutorial=e,this._host.requestUpdate())}async loadDevices(){if(!this._hass)return;try{const e=await this._hass.callWS({type:"eppgrid/list_devices"});this.devices=[...e.devices].sort((e,t)=>(e.name||"").localeCompare(t.name||"")),this.setShowRoomCalibrationTutorial(e.show_room_calibration_tutorial??!0)}catch{return this.devices=[],void this._host.requestUpdate()}const e=this.selectedMac,t=Fs(),i=t&&this.devices.find(e=>e.mac===t);this.selectedMac=i?t:this.devices[0]?.mac??"",e!==this.selectedMac&&(this._lastSelectedOnline=null),this._host.requestUpdate()}async subscribeDeviceList(){if(this._wantDeviceListSub=!0,this._deviceListGen++,ks(this._unsubDeviceList),this._unsubDeviceList=void 0,!this._hass)return;const e=this._claimGen("_deviceListGen");try{const t=await this._hass.connection.subscribeMessage(e=>{this.setShowRoomCalibrationTutorial(e.show_room_calibration_tutorial??!0),this._applyDeviceList(e.devices??[])},{type:"eppgrid/subscribe_device_list"});if(e.stale())return void ks(t);this._unsubDeviceList=t}catch{await this.loadDevices()}}unsubscribeDeviceList(){this._wantDeviceListSub=!1,this._deviceListGen++,ks(this._unsubDeviceList),this._unsubDeviceList=void 0}_applyDeviceList(e){this.devices=[...e].sort((e,t)=>(e.name||"").localeCompare(t.name||""));const t=this.selectedMac,i=Fs();if(this.devices.length>0){const e=i&&this.devices.find(e=>e.mac===i),t=e?i:this.devices[0].mac,s=t!==this.selectedMac&&!!this.selectedMac&&!this.devices.some(e=>e.mac===this.selectedMac)&&(this.isHostDirty?.()??!1);s||(this.selectedMac=t)}else!this.selectedMac&&i&&(this.selectedMac=i);t!==this.selectedMac&&(this._lastSelectedOnline=null);const s=this.devices.find(e=>e.mac===this.selectedMac),r=(s?.available??!1)&&"unavailable"!==s?.firmware_status,o=this._lastSelectedOnline;this._lastSelectedOnline=r,!0!==o||r||(this.closeDeviceSession(),this.onSessionClosed?.()),!1===o&&r&&this.selectedMac&&this.onSelectedAvailable?.(this.selectedMac),this.onDeviceListChanged?.(),this._host.requestUpdate()}async loadDeviceConfig(e){const t=this._loadConfigInFlight;if(t){if(t.mac===e)return t.promise;if(await t.promise.catch(()=>{}),this._disposed)return null}const i={mac:e,promise:void 0};return i.promise=(async()=>{this._reconnecting=!0,this._host.requestUpdate();try{const t=this._sessionGen;let i=null;try{i=(await this._hass.callWS({type:"eppgrid/get_config",mac:e})).config}catch{}return this._sessionGen!==t||await this.reopenSession(e),i}finally{this._reconnecting=!1,this._loadConfigInFlight===i&&(this._loadConfigInFlight=void 0),this._host.requestUpdate()}})(),this._loadConfigInFlight=i,i.promise}async reopenSession(e){if(!this._hass||!e)return;const t=this._reopenInFlight;if(t){if(t.mac===e)return t.promise;if(await t.promise.catch(()=>{}),this._disposed)return}const i={mac:e,promise:void 0};return i.promise=(async()=>{try{await this.openDeviceSession(e),this._unsubDevice&&this.subscribeTargets(e)}finally{this._reopenInFlight===i&&(this._reopenInFlight=void 0)}})(),this._reopenInFlight=i,i.promise}async openDeviceSession(e){if(this.closeDeviceSession(),!this._hass||!e)return;const t=this._claimGen("_sessionGen");try{const i=await this._hass.connection.subscribeMessage(()=>{},{type:"eppgrid/subscribe_device",mac:e});if(t.stale())return void ks(i);this._unsubDevice=i,this._connectionFailed=!1,this._host.requestUpdate()}catch(e){if(t.stale())return;console.warn("Failed to open device session:",e);const i=e;this._connectionFailed="connection_failed"===i?.code||"not_found"===i?.code,this._host.requestUpdate()}}closeDeviceSession(){this._sessionGen++,this.unsubscribeTargets(),ks(this._unsubDevice),this._unsubDevice=void 0}subscribeTargets(e){if(this.unsubscribeTargets(),!this._hass||!e)return;const t=this._hass.connection;this._subscribeGridTargets(t,e),this.subscribeDisplay(e)}unsubscribeTargets(){this.unsubscribeDisplay(),this._targetsGen++,this._targetRetryTimer&&(clearTimeout(this._targetRetryTimer),this._targetRetryTimer=void 0),ks(this._unsubTargets),this._unsubTargets=void 0}_subscribeGridTargets(e,t){this._subscribeStream(e,t,{type:"eppgrid/subscribe_grid_targets",genField:"_targetsGen",timerField:"_targetRetryTimer",unsubField:"_unsubTargets",onEvent:e=>{const t=(e.targets||[]).map(e=>({x:e.x,y:e.y,status:e.status??"inactive",signal:e.signal??0})),i=e.sensors?{occupancy:e.sensors.occupancy??!1,static_presence:e.sensors.static_presence??!1,motion_presence:e.sensors.motion_presence??!1,target_presence:e.sensors.target_presence??!1,mmwave:e.sensors.mmwave??!1,static_state:e.sensors.static_state,motion_state:e.sensors.motion_state,occupancy_state:e.sensors.occupancy_state,illuminance:e.sensors.illuminance??null,temperature:e.sensors.temperature??null,humidity:e.sensors.humidity??null,co2:e.sensors.co2??null}:{occupancy:!1,static_presence:!1,motion_presence:!1,target_presence:!1,mmwave:!1,static_state:void 0,motion_state:void 0,occupancy_state:void 0,illuminance:null,temperature:null,humidity:null,co2:null},s=e.zones?{occupancy:e.zones.occupancy??{},target_counts:e.zones.target_counts??{},frame_count:e.zones.frame_count??0,debug_log:e.zones.debug_log}:null;this.onTargetData?.({targets:t,sensors:i,zones:s})}})}subscribeDisplay(e){this.unsubscribeDisplay(),this._hass&&e&&this._subscribeRawTargets(this._hass.connection,e)}_subscribeRawTargets(e,t){this._subscribeStream(e,t,{type:"eppgrid/subscribe_raw_targets",genField:"_displayGen",timerField:"_displayRetryTimer",unsubField:"_unsubDisplay",onEvent:e=>{const t=(e.targets||[]).map(e=>({raw_x:e.raw_x,raw_y:e.raw_y}));this.onRawTargetData?.(t)}})}_subscribeStream(e,t,i,s=1){const r=this._claimGen(i.genField);e.subscribeMessage(i.onEvent,{type:i.type,mac:t}).then(e=>{r.stale()?ks(e):(this[i.unsubField]=e,this._connectionFailed&&(this._connectionFailed=!1,this._host.requestUpdate()))}).catch(()=>{if(r.stale())return;if(s>=5)return this._connectionFailed=!0,void this._host.requestUpdate();const o=this[i.timerField];o&&clearTimeout(o),this[i.timerField]=setTimeout(()=>{this[i.timerField]=void 0,this._hass?.connection===e&&this._subscribeStream(e,t,i,s+1)},2e3)})}unsubscribeDisplay(){this._displayGen++,this._displayRetryTimer&&(clearTimeout(this._displayRetryTimer),this._displayRetryTimer=void 0),ks(this._unsubDisplay),this._unsubDisplay=void 0}selectDevice(e){this.selectedMac=e,this._lastSelectedOnline=null,this._connectionFailed=!1,Ps(e),this._host.requestUpdate()}}class Os extends Error{}
/*! pako 2.1.0 https://github.com/nodeca/pako @license (MIT AND Zlib) */function Qs(e){let t=e.length;for(;--t>=0;)e[t]=0}const zs=256,Hs=286,Gs=30,Ls=15,Ns=new Uint8Array([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0]),Ys=new Uint8Array([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13]),$s=new Uint8Array([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7]),Ks=new Uint8Array([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]),Js=new Array(576);Qs(Js);const Ws=new Array(60);Qs(Ws);const js=new Array(512);Qs(js);const Vs=new Array(256);Qs(Vs);const Zs=new Array(29);Qs(Zs);const Xs=new Array(Gs);function qs(e,t,i,s,r){this.static_tree=e,this.extra_bits=t,this.extra_base=i,this.elems=s,this.max_length=r,this.has_stree=e&&e.length}let er,tr,ir;function sr(e,t){this.dyn_tree=e,this.max_code=0,this.stat_desc=t}Qs(Xs);const rr=e=>e<256?js[e]:js[256+(e>>>7)],or=(e,t)=>{e.pending_buf[e.pending++]=255&t,e.pending_buf[e.pending++]=t>>>8&255},nr=(e,t,i)=>{e.bi_valid>16-i?(e.bi_buf|=t<<e.bi_valid&65535,or(e,e.bi_buf),e.bi_buf=t>>16-e.bi_valid,e.bi_valid+=i-16):(e.bi_buf|=t<<e.bi_valid&65535,e.bi_valid+=i)},ar=(e,t,i)=>{nr(e,i[2*t],i[2*t+1])},lr=(e,t)=>{let i=0;do{i|=1&e,e>>>=1,i<<=1}while(--t>0);return i>>>1},cr=(e,t,i)=>{const s=new Array(16);let r,o,n=0;for(r=1;r<=Ls;r++)n=n+i[r-1]<<1,s[r]=n;for(o=0;o<=t;o++){let t=e[2*o+1];0!==t&&(e[2*o]=lr(s[t]++,t))}},hr=e=>{let t;for(t=0;t<Hs;t++)e.dyn_ltree[2*t]=0;for(t=0;t<Gs;t++)e.dyn_dtree[2*t]=0;for(t=0;t<19;t++)e.bl_tree[2*t]=0;e.dyn_ltree[512]=1,e.opt_len=e.static_len=0,e.sym_next=e.matches=0},dr=e=>{e.bi_valid>8?or(e,e.bi_buf):e.bi_valid>0&&(e.pending_buf[e.pending++]=e.bi_buf),e.bi_buf=0,e.bi_valid=0},Ar=(e,t,i,s)=>{const r=2*t,o=2*i;return e[r]<e[o]||e[r]===e[o]&&s[t]<=s[i]},gr=(e,t,i)=>{const s=e.heap[i];let r=i<<1;for(;r<=e.heap_len&&(r<e.heap_len&&Ar(t,e.heap[r+1],e.heap[r],e.depth)&&r++,!Ar(t,s,e.heap[r],e.depth));)e.heap[i]=e.heap[r],i=r,r<<=1;e.heap[i]=s},ur=(e,t,i)=>{let s,r,o,n,a=0;if(0!==e.sym_next)do{s=255&e.pending_buf[e.sym_buf+a++],s+=(255&e.pending_buf[e.sym_buf+a++])<<8,r=e.pending_buf[e.sym_buf+a++],0===s?ar(e,r,t):(o=Vs[r],ar(e,o+zs+1,t),n=Ns[o],0!==n&&(r-=Zs[o],nr(e,r,n)),s--,o=rr(s),ar(e,o,i),n=Ys[o],0!==n&&(s-=Xs[o],nr(e,s,n)))}while(a<e.sym_next);ar(e,256,t)},_r=(e,t)=>{const i=t.dyn_tree,s=t.stat_desc.static_tree,r=t.stat_desc.has_stree,o=t.stat_desc.elems;let n,a,l,c=-1;for(e.heap_len=0,e.heap_max=573,n=0;n<o;n++)0!==i[2*n]?(e.heap[++e.heap_len]=c=n,e.depth[n]=0):i[2*n+1]=0;for(;e.heap_len<2;)l=e.heap[++e.heap_len]=c<2?++c:0,i[2*l]=1,e.depth[l]=0,e.opt_len--,r&&(e.static_len-=s[2*l+1]);for(t.max_code=c,n=e.heap_len>>1;n>=1;n--)gr(e,i,n);l=o;do{n=e.heap[1],e.heap[1]=e.heap[e.heap_len--],gr(e,i,1),a=e.heap[1],e.heap[--e.heap_max]=n,e.heap[--e.heap_max]=a,i[2*l]=i[2*n]+i[2*a],e.depth[l]=(e.depth[n]>=e.depth[a]?e.depth[n]:e.depth[a])+1,i[2*n+1]=i[2*a+1]=l,e.heap[1]=l++,gr(e,i,1)}while(e.heap_len>=2);e.heap[--e.heap_max]=e.heap[1],((e,t)=>{const i=t.dyn_tree,s=t.max_code,r=t.stat_desc.static_tree,o=t.stat_desc.has_stree,n=t.stat_desc.extra_bits,a=t.stat_desc.extra_base,l=t.stat_desc.max_length;let c,h,d,A,g,u,_=0;for(A=0;A<=Ls;A++)e.bl_count[A]=0;for(i[2*e.heap[e.heap_max]+1]=0,c=e.heap_max+1;c<573;c++)h=e.heap[c],A=i[2*i[2*h+1]+1]+1,A>l&&(A=l,_++),i[2*h+1]=A,h>s||(e.bl_count[A]++,g=0,h>=a&&(g=n[h-a]),u=i[2*h],e.opt_len+=u*(A+g),o&&(e.static_len+=u*(r[2*h+1]+g)));if(0!==_){do{for(A=l-1;0===e.bl_count[A];)A--;e.bl_count[A]--,e.bl_count[A+1]+=2,e.bl_count[l]--,_-=2}while(_>0);for(A=l;0!==A;A--)for(h=e.bl_count[A];0!==h;)d=e.heap[--c],d>s||(i[2*d+1]!==A&&(e.opt_len+=(A-i[2*d+1])*i[2*d],i[2*d+1]=A),h--)}})(e,t),cr(i,c,e.bl_count)},pr=(e,t,i)=>{let s,r,o=-1,n=t[1],a=0,l=7,c=4;for(0===n&&(l=138,c=3),t[2*(i+1)+1]=65535,s=0;s<=i;s++)r=n,n=t[2*(s+1)+1],++a<l&&r===n||(a<c?e.bl_tree[2*r]+=a:0!==r?(r!==o&&e.bl_tree[2*r]++,e.bl_tree[32]++):a<=10?e.bl_tree[34]++:e.bl_tree[36]++,a=0,o=r,0===n?(l=138,c=3):r===n?(l=6,c=3):(l=7,c=4))},fr=(e,t,i)=>{let s,r,o=-1,n=t[1],a=0,l=7,c=4;for(0===n&&(l=138,c=3),s=0;s<=i;s++)if(r=n,n=t[2*(s+1)+1],!(++a<l&&r===n)){if(a<c)do{ar(e,r,e.bl_tree)}while(0!==--a);else 0!==r?(r!==o&&(ar(e,r,e.bl_tree),a--),ar(e,16,e.bl_tree),nr(e,a-3,2)):a<=10?(ar(e,17,e.bl_tree),nr(e,a-3,3)):(ar(e,18,e.bl_tree),nr(e,a-11,7));a=0,o=r,0===n?(l=138,c=3):r===n?(l=6,c=3):(l=7,c=4)}};let wr=!1;const Er=(e,t,i,s)=>{nr(e,0+(s?1:0),3),dr(e),or(e,i),or(e,~i),i&&e.pending_buf.set(e.window.subarray(t,t+i),e.pending),e.pending+=i};var mr=e=>{wr||((()=>{let e,t,i,s,r;const o=new Array(16);for(i=0,s=0;s<28;s++)for(Zs[s]=i,e=0;e<1<<Ns[s];e++)Vs[i++]=s;for(Vs[i-1]=s,r=0,s=0;s<16;s++)for(Xs[s]=r,e=0;e<1<<Ys[s];e++)js[r++]=s;for(r>>=7;s<Gs;s++)for(Xs[s]=r<<7,e=0;e<1<<Ys[s]-7;e++)js[256+r++]=s;for(t=0;t<=Ls;t++)o[t]=0;for(e=0;e<=143;)Js[2*e+1]=8,e++,o[8]++;for(;e<=255;)Js[2*e+1]=9,e++,o[9]++;for(;e<=279;)Js[2*e+1]=7,e++,o[7]++;for(;e<=287;)Js[2*e+1]=8,e++,o[8]++;for(cr(Js,287,o),e=0;e<Gs;e++)Ws[2*e+1]=5,Ws[2*e]=lr(e,5);er=new qs(Js,Ns,257,Hs,Ls),tr=new qs(Ws,Ys,0,Gs,Ls),ir=new qs(new Array(0),$s,0,19,7)})(),wr=!0),e.l_desc=new sr(e.dyn_ltree,er),e.d_desc=new sr(e.dyn_dtree,tr),e.bl_desc=new sr(e.bl_tree,ir),e.bi_buf=0,e.bi_valid=0,hr(e)},br=(e,t,i,s)=>{let r,o,n=0;e.level>0?(2===e.strm.data_type&&(e.strm.data_type=(e=>{let t,i=4093624447;for(t=0;t<=31;t++,i>>>=1)if(1&i&&0!==e.dyn_ltree[2*t])return 0;if(0!==e.dyn_ltree[18]||0!==e.dyn_ltree[20]||0!==e.dyn_ltree[26])return 1;for(t=32;t<zs;t++)if(0!==e.dyn_ltree[2*t])return 1;return 0})(e)),_r(e,e.l_desc),_r(e,e.d_desc),n=(e=>{let t;for(pr(e,e.dyn_ltree,e.l_desc.max_code),pr(e,e.dyn_dtree,e.d_desc.max_code),_r(e,e.bl_desc),t=18;t>=3&&0===e.bl_tree[2*Ks[t]+1];t--);return e.opt_len+=3*(t+1)+5+5+4,t})(e),r=e.opt_len+3+7>>>3,o=e.static_len+3+7>>>3,o<=r&&(r=o)):r=o=i+5,i+4<=r&&-1!==t?Er(e,t,i,s):4===e.strategy||o===r?(nr(e,2+(s?1:0),3),ur(e,Js,Ws)):(nr(e,4+(s?1:0),3),((e,t,i,s)=>{let r;for(nr(e,t-257,5),nr(e,i-1,5),nr(e,s-4,4),r=0;r<s;r++)nr(e,e.bl_tree[2*Ks[r]+1],3);fr(e,e.dyn_ltree,t-1),fr(e,e.dyn_dtree,i-1)})(e,e.l_desc.max_code+1,e.d_desc.max_code+1,n+1),ur(e,e.dyn_ltree,e.dyn_dtree)),hr(e),s&&dr(e)},yr=(e,t,i)=>(e.pending_buf[e.sym_buf+e.sym_next++]=t,e.pending_buf[e.sym_buf+e.sym_next++]=t>>8,e.pending_buf[e.sym_buf+e.sym_next++]=i,0===t?e.dyn_ltree[2*i]++:(e.matches++,t--,e.dyn_ltree[2*(Vs[i]+zs+1)]++,e.dyn_dtree[2*rr(t)]++),e.sym_next===e.sym_end),Cr=e=>{nr(e,2,3),ar(e,256,Js),(e=>{16===e.bi_valid?(or(e,e.bi_buf),e.bi_buf=0,e.bi_valid=0):e.bi_valid>=8&&(e.pending_buf[e.pending++]=255&e.bi_buf,e.bi_buf>>=8,e.bi_valid-=8)})(e)},vr={_tr_init:mr,_tr_stored_block:Er,_tr_flush_block:br,_tr_tally:yr,_tr_align:Cr};var Br=(e,t,i,s)=>{let r=65535&e,o=e>>>16&65535,n=0;for(;0!==i;){n=i>2e3?2e3:i,i-=n;do{r=r+t[s++]|0,o=o+r|0}while(--n);r%=65521,o%=65521}return r|o<<16};const Sr=new Uint32Array((()=>{let e,t=[];for(var i=0;i<256;i++){e=i;for(var s=0;s<8;s++)e=1&e?3988292384^e>>>1:e>>>1;t[i]=e}return t})());var Ir=(e,t,i,s)=>{const r=Sr,o=s+i;e^=-1;for(let i=s;i<o;i++)e=e>>>8^r[255&(e^t[i])];return-1^e},Dr={2:"need dictionary",1:"stream end",0:"","-1":"file error","-2":"stream error","-3":"data error","-4":"insufficient memory","-5":"buffer error","-6":"incompatible version"},xr={Z_NO_FLUSH:0,Z_PARTIAL_FLUSH:1,Z_SYNC_FLUSH:2,Z_FULL_FLUSH:3,Z_FINISH:4,Z_BLOCK:5,Z_TREES:6,Z_OK:0,Z_STREAM_END:1,Z_NEED_DICT:2,Z_STREAM_ERROR:-2,Z_DATA_ERROR:-3,Z_MEM_ERROR:-4,Z_BUF_ERROR:-5,Z_DEFAULT_COMPRESSION:-1,Z_FILTERED:1,Z_HUFFMAN_ONLY:2,Z_RLE:3,Z_FIXED:4,Z_DEFAULT_STRATEGY:0,Z_UNKNOWN:2,Z_DEFLATED:8};const{_tr_init:Rr,_tr_stored_block:Mr,_tr_flush_block:kr,_tr_tally:Tr,_tr_align:Fr}=vr,{Z_NO_FLUSH:Pr,Z_PARTIAL_FLUSH:Ur,Z_FULL_FLUSH:Or,Z_FINISH:Qr,Z_BLOCK:zr,Z_OK:Hr,Z_STREAM_END:Gr,Z_STREAM_ERROR:Lr,Z_DATA_ERROR:Nr,Z_BUF_ERROR:Yr,Z_DEFAULT_COMPRESSION:$r,Z_FILTERED:Kr,Z_HUFFMAN_ONLY:Jr,Z_RLE:Wr,Z_FIXED:jr,Z_DEFAULT_STRATEGY:Vr,Z_UNKNOWN:Zr,Z_DEFLATED:Xr}=xr,qr=258,eo=262,to=42,io=113,so=666,ro=(e,t)=>(e.msg=Dr[t],t),oo=e=>2*e-(e>4?9:0),no=e=>{let t=e.length;for(;--t>=0;)e[t]=0},ao=e=>{let t,i,s,r=e.w_size;t=e.hash_size,s=t;do{i=e.head[--s],e.head[s]=i>=r?i-r:0}while(--t);t=r,s=t;do{i=e.prev[--s],e.prev[s]=i>=r?i-r:0}while(--t)};let lo=(e,t,i)=>(t<<e.hash_shift^i)&e.hash_mask;const co=e=>{const t=e.state;let i=t.pending;i>e.avail_out&&(i=e.avail_out),0!==i&&(e.output.set(t.pending_buf.subarray(t.pending_out,t.pending_out+i),e.next_out),e.next_out+=i,t.pending_out+=i,e.total_out+=i,e.avail_out-=i,t.pending-=i,0===t.pending&&(t.pending_out=0))},ho=(e,t)=>{kr(e,e.block_start>=0?e.block_start:-1,e.strstart-e.block_start,t),e.block_start=e.strstart,co(e.strm)},Ao=(e,t)=>{e.pending_buf[e.pending++]=t},go=(e,t)=>{e.pending_buf[e.pending++]=t>>>8&255,e.pending_buf[e.pending++]=255&t},uo=(e,t,i,s)=>{let r=e.avail_in;return r>s&&(r=s),0===r?0:(e.avail_in-=r,t.set(e.input.subarray(e.next_in,e.next_in+r),i),1===e.state.wrap?e.adler=Br(e.adler,t,r,i):2===e.state.wrap&&(e.adler=Ir(e.adler,t,r,i)),e.next_in+=r,e.total_in+=r,r)},_o=(e,t)=>{let i,s,r=e.max_chain_length,o=e.strstart,n=e.prev_length,a=e.nice_match;const l=e.strstart>e.w_size-eo?e.strstart-(e.w_size-eo):0,c=e.window,h=e.w_mask,d=e.prev,A=e.strstart+qr;let g=c[o+n-1],u=c[o+n];e.prev_length>=e.good_match&&(r>>=2),a>e.lookahead&&(a=e.lookahead);do{if(i=t,c[i+n]===u&&c[i+n-1]===g&&c[i]===c[o]&&c[++i]===c[o+1]){o+=2,i++;do{}while(c[++o]===c[++i]&&c[++o]===c[++i]&&c[++o]===c[++i]&&c[++o]===c[++i]&&c[++o]===c[++i]&&c[++o]===c[++i]&&c[++o]===c[++i]&&c[++o]===c[++i]&&o<A);if(s=qr-(A-o),o=A-qr,s>n){if(e.match_start=t,n=s,s>=a)break;g=c[o+n-1],u=c[o+n]}}}while((t=d[t&h])>l&&0!==--r);return n<=e.lookahead?n:e.lookahead},po=e=>{const t=e.w_size;let i,s,r;do{if(s=e.window_size-e.lookahead-e.strstart,e.strstart>=t+(t-eo)&&(e.window.set(e.window.subarray(t,t+t-s),0),e.match_start-=t,e.strstart-=t,e.block_start-=t,e.insert>e.strstart&&(e.insert=e.strstart),ao(e),s+=t),0===e.strm.avail_in)break;if(i=uo(e.strm,e.window,e.strstart+e.lookahead,s),e.lookahead+=i,e.lookahead+e.insert>=3)for(r=e.strstart-e.insert,e.ins_h=e.window[r],e.ins_h=lo(e,e.ins_h,e.window[r+1]);e.insert&&(e.ins_h=lo(e,e.ins_h,e.window[r+3-1]),e.prev[r&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=r,r++,e.insert--,!(e.lookahead+e.insert<3)););}while(e.lookahead<eo&&0!==e.strm.avail_in)},fo=(e,t)=>{let i,s,r,o=e.pending_buf_size-5>e.w_size?e.w_size:e.pending_buf_size-5,n=0,a=e.strm.avail_in;do{if(i=65535,r=e.bi_valid+42>>3,e.strm.avail_out<r)break;if(r=e.strm.avail_out-r,s=e.strstart-e.block_start,i>s+e.strm.avail_in&&(i=s+e.strm.avail_in),i>r&&(i=r),i<o&&(0===i&&t!==Qr||t===Pr||i!==s+e.strm.avail_in))break;n=t===Qr&&i===s+e.strm.avail_in?1:0,Mr(e,0,0,n),e.pending_buf[e.pending-4]=i,e.pending_buf[e.pending-3]=i>>8,e.pending_buf[e.pending-2]=~i,e.pending_buf[e.pending-1]=~i>>8,co(e.strm),s&&(s>i&&(s=i),e.strm.output.set(e.window.subarray(e.block_start,e.block_start+s),e.strm.next_out),e.strm.next_out+=s,e.strm.avail_out-=s,e.strm.total_out+=s,e.block_start+=s,i-=s),i&&(uo(e.strm,e.strm.output,e.strm.next_out,i),e.strm.next_out+=i,e.strm.avail_out-=i,e.strm.total_out+=i)}while(0===n);return a-=e.strm.avail_in,a&&(a>=e.w_size?(e.matches=2,e.window.set(e.strm.input.subarray(e.strm.next_in-e.w_size,e.strm.next_in),0),e.strstart=e.w_size,e.insert=e.strstart):(e.window_size-e.strstart<=a&&(e.strstart-=e.w_size,e.window.set(e.window.subarray(e.w_size,e.w_size+e.strstart),0),e.matches<2&&e.matches++,e.insert>e.strstart&&(e.insert=e.strstart)),e.window.set(e.strm.input.subarray(e.strm.next_in-a,e.strm.next_in),e.strstart),e.strstart+=a,e.insert+=a>e.w_size-e.insert?e.w_size-e.insert:a),e.block_start=e.strstart),e.high_water<e.strstart&&(e.high_water=e.strstart),n?4:t!==Pr&&t!==Qr&&0===e.strm.avail_in&&e.strstart===e.block_start?2:(r=e.window_size-e.strstart,e.strm.avail_in>r&&e.block_start>=e.w_size&&(e.block_start-=e.w_size,e.strstart-=e.w_size,e.window.set(e.window.subarray(e.w_size,e.w_size+e.strstart),0),e.matches<2&&e.matches++,r+=e.w_size,e.insert>e.strstart&&(e.insert=e.strstart)),r>e.strm.avail_in&&(r=e.strm.avail_in),r&&(uo(e.strm,e.window,e.strstart,r),e.strstart+=r,e.insert+=r>e.w_size-e.insert?e.w_size-e.insert:r),e.high_water<e.strstart&&(e.high_water=e.strstart),r=e.bi_valid+42>>3,r=e.pending_buf_size-r>65535?65535:e.pending_buf_size-r,o=r>e.w_size?e.w_size:r,s=e.strstart-e.block_start,(s>=o||(s||t===Qr)&&t!==Pr&&0===e.strm.avail_in&&s<=r)&&(i=s>r?r:s,n=t===Qr&&0===e.strm.avail_in&&i===s?1:0,Mr(e,e.block_start,i,n),e.block_start+=i,co(e.strm)),n?3:1)},wo=(e,t)=>{let i,s;for(;;){if(e.lookahead<eo){if(po(e),e.lookahead<eo&&t===Pr)return 1;if(0===e.lookahead)break}if(i=0,e.lookahead>=3&&(e.ins_h=lo(e,e.ins_h,e.window[e.strstart+3-1]),i=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart),0!==i&&e.strstart-i<=e.w_size-eo&&(e.match_length=_o(e,i)),e.match_length>=3)if(s=Tr(e,e.strstart-e.match_start,e.match_length-3),e.lookahead-=e.match_length,e.match_length<=e.max_lazy_match&&e.lookahead>=3){e.match_length--;do{e.strstart++,e.ins_h=lo(e,e.ins_h,e.window[e.strstart+3-1]),i=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart}while(0!==--e.match_length);e.strstart++}else e.strstart+=e.match_length,e.match_length=0,e.ins_h=e.window[e.strstart],e.ins_h=lo(e,e.ins_h,e.window[e.strstart+1]);else s=Tr(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++;if(s&&(ho(e,!1),0===e.strm.avail_out))return 1}return e.insert=e.strstart<2?e.strstart:2,t===Qr?(ho(e,!0),0===e.strm.avail_out?3:4):e.sym_next&&(ho(e,!1),0===e.strm.avail_out)?1:2},Eo=(e,t)=>{let i,s,r;for(;;){if(e.lookahead<eo){if(po(e),e.lookahead<eo&&t===Pr)return 1;if(0===e.lookahead)break}if(i=0,e.lookahead>=3&&(e.ins_h=lo(e,e.ins_h,e.window[e.strstart+3-1]),i=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart),e.prev_length=e.match_length,e.prev_match=e.match_start,e.match_length=2,0!==i&&e.prev_length<e.max_lazy_match&&e.strstart-i<=e.w_size-eo&&(e.match_length=_o(e,i),e.match_length<=5&&(e.strategy===Kr||3===e.match_length&&e.strstart-e.match_start>4096)&&(e.match_length=2)),e.prev_length>=3&&e.match_length<=e.prev_length){r=e.strstart+e.lookahead-3,s=Tr(e,e.strstart-1-e.prev_match,e.prev_length-3),e.lookahead-=e.prev_length-1,e.prev_length-=2;do{++e.strstart<=r&&(e.ins_h=lo(e,e.ins_h,e.window[e.strstart+3-1]),i=e.prev[e.strstart&e.w_mask]=e.head[e.ins_h],e.head[e.ins_h]=e.strstart)}while(0!==--e.prev_length);if(e.match_available=0,e.match_length=2,e.strstart++,s&&(ho(e,!1),0===e.strm.avail_out))return 1}else if(e.match_available){if(s=Tr(e,0,e.window[e.strstart-1]),s&&ho(e,!1),e.strstart++,e.lookahead--,0===e.strm.avail_out)return 1}else e.match_available=1,e.strstart++,e.lookahead--}return e.match_available&&(s=Tr(e,0,e.window[e.strstart-1]),e.match_available=0),e.insert=e.strstart<2?e.strstart:2,t===Qr?(ho(e,!0),0===e.strm.avail_out?3:4):e.sym_next&&(ho(e,!1),0===e.strm.avail_out)?1:2};function mo(e,t,i,s,r){this.good_length=e,this.max_lazy=t,this.nice_length=i,this.max_chain=s,this.func=r}const bo=[new mo(0,0,0,0,fo),new mo(4,4,8,4,wo),new mo(4,5,16,8,wo),new mo(4,6,32,32,wo),new mo(4,4,16,16,Eo),new mo(8,16,32,32,Eo),new mo(8,16,128,128,Eo),new mo(8,32,128,256,Eo),new mo(32,128,258,1024,Eo),new mo(32,258,258,4096,Eo)];function yo(){this.strm=null,this.status=0,this.pending_buf=null,this.pending_buf_size=0,this.pending_out=0,this.pending=0,this.wrap=0,this.gzhead=null,this.gzindex=0,this.method=Xr,this.last_flush=-1,this.w_size=0,this.w_bits=0,this.w_mask=0,this.window=null,this.window_size=0,this.prev=null,this.head=null,this.ins_h=0,this.hash_size=0,this.hash_bits=0,this.hash_mask=0,this.hash_shift=0,this.block_start=0,this.match_length=0,this.prev_match=0,this.match_available=0,this.strstart=0,this.match_start=0,this.lookahead=0,this.prev_length=0,this.max_chain_length=0,this.max_lazy_match=0,this.level=0,this.strategy=0,this.good_match=0,this.nice_match=0,this.dyn_ltree=new Uint16Array(1146),this.dyn_dtree=new Uint16Array(122),this.bl_tree=new Uint16Array(78),no(this.dyn_ltree),no(this.dyn_dtree),no(this.bl_tree),this.l_desc=null,this.d_desc=null,this.bl_desc=null,this.bl_count=new Uint16Array(16),this.heap=new Uint16Array(573),no(this.heap),this.heap_len=0,this.heap_max=0,this.depth=new Uint16Array(573),no(this.depth),this.sym_buf=0,this.lit_bufsize=0,this.sym_next=0,this.sym_end=0,this.opt_len=0,this.static_len=0,this.matches=0,this.insert=0,this.bi_buf=0,this.bi_valid=0}const Co=e=>{if(!e)return 1;const t=e.state;return!t||t.strm!==e||t.status!==to&&57!==t.status&&69!==t.status&&73!==t.status&&91!==t.status&&103!==t.status&&t.status!==io&&t.status!==so?1:0},vo=e=>{if(Co(e))return ro(e,Lr);e.total_in=e.total_out=0,e.data_type=Zr;const t=e.state;return t.pending=0,t.pending_out=0,t.wrap<0&&(t.wrap=-t.wrap),t.status=2===t.wrap?57:t.wrap?to:io,e.adler=2===t.wrap?0:1,t.last_flush=-2,Rr(t),Hr},Bo=e=>{const t=vo(e);return t===Hr&&(e=>{e.window_size=2*e.w_size,no(e.head),e.max_lazy_match=bo[e.level].max_lazy,e.good_match=bo[e.level].good_length,e.nice_match=bo[e.level].nice_length,e.max_chain_length=bo[e.level].max_chain,e.strstart=0,e.block_start=0,e.lookahead=0,e.insert=0,e.match_length=e.prev_length=2,e.match_available=0,e.ins_h=0})(e.state),t},So=(e,t,i,s,r,o)=>{if(!e)return Lr;let n=1;if(t===$r&&(t=6),s<0?(n=0,s=-s):s>15&&(n=2,s-=16),r<1||r>9||i!==Xr||s<8||s>15||t<0||t>9||o<0||o>jr||8===s&&1!==n)return ro(e,Lr);8===s&&(s=9);const a=new yo;return e.state=a,a.strm=e,a.status=to,a.wrap=n,a.gzhead=null,a.w_bits=s,a.w_size=1<<a.w_bits,a.w_mask=a.w_size-1,a.hash_bits=r+7,a.hash_size=1<<a.hash_bits,a.hash_mask=a.hash_size-1,a.hash_shift=~~((a.hash_bits+3-1)/3),a.window=new Uint8Array(2*a.w_size),a.head=new Uint16Array(a.hash_size),a.prev=new Uint16Array(a.w_size),a.lit_bufsize=1<<r+6,a.pending_buf_size=4*a.lit_bufsize,a.pending_buf=new Uint8Array(a.pending_buf_size),a.sym_buf=a.lit_bufsize,a.sym_end=3*(a.lit_bufsize-1),a.level=t,a.strategy=o,a.method=i,Bo(e)};var Io=(e,t)=>{if(Co(e)||t>zr||t<0)return e?ro(e,Lr):Lr;const i=e.state;if(!e.output||0!==e.avail_in&&!e.input||i.status===so&&t!==Qr)return ro(e,0===e.avail_out?Yr:Lr);const s=i.last_flush;if(i.last_flush=t,0!==i.pending){if(co(e),0===e.avail_out)return i.last_flush=-1,Hr}else if(0===e.avail_in&&oo(t)<=oo(s)&&t!==Qr)return ro(e,Yr);if(i.status===so&&0!==e.avail_in)return ro(e,Yr);if(i.status===to&&0===i.wrap&&(i.status=io),i.status===to){let t=Xr+(i.w_bits-8<<4)<<8,s=-1;if(s=i.strategy>=Jr||i.level<2?0:i.level<6?1:6===i.level?2:3,t|=s<<6,0!==i.strstart&&(t|=32),t+=31-t%31,go(i,t),0!==i.strstart&&(go(i,e.adler>>>16),go(i,65535&e.adler)),e.adler=1,i.status=io,co(e),0!==i.pending)return i.last_flush=-1,Hr}if(57===i.status)if(e.adler=0,Ao(i,31),Ao(i,139),Ao(i,8),i.gzhead)Ao(i,(i.gzhead.text?1:0)+(i.gzhead.hcrc?2:0)+(i.gzhead.extra?4:0)+(i.gzhead.name?8:0)+(i.gzhead.comment?16:0)),Ao(i,255&i.gzhead.time),Ao(i,i.gzhead.time>>8&255),Ao(i,i.gzhead.time>>16&255),Ao(i,i.gzhead.time>>24&255),Ao(i,9===i.level?2:i.strategy>=Jr||i.level<2?4:0),Ao(i,255&i.gzhead.os),i.gzhead.extra&&i.gzhead.extra.length&&(Ao(i,255&i.gzhead.extra.length),Ao(i,i.gzhead.extra.length>>8&255)),i.gzhead.hcrc&&(e.adler=Ir(e.adler,i.pending_buf,i.pending,0)),i.gzindex=0,i.status=69;else if(Ao(i,0),Ao(i,0),Ao(i,0),Ao(i,0),Ao(i,0),Ao(i,9===i.level?2:i.strategy>=Jr||i.level<2?4:0),Ao(i,3),i.status=io,co(e),0!==i.pending)return i.last_flush=-1,Hr;if(69===i.status){if(i.gzhead.extra){let t=i.pending,s=(65535&i.gzhead.extra.length)-i.gzindex;for(;i.pending+s>i.pending_buf_size;){let r=i.pending_buf_size-i.pending;if(i.pending_buf.set(i.gzhead.extra.subarray(i.gzindex,i.gzindex+r),i.pending),i.pending=i.pending_buf_size,i.gzhead.hcrc&&i.pending>t&&(e.adler=Ir(e.adler,i.pending_buf,i.pending-t,t)),i.gzindex+=r,co(e),0!==i.pending)return i.last_flush=-1,Hr;t=0,s-=r}let r=new Uint8Array(i.gzhead.extra);i.pending_buf.set(r.subarray(i.gzindex,i.gzindex+s),i.pending),i.pending+=s,i.gzhead.hcrc&&i.pending>t&&(e.adler=Ir(e.adler,i.pending_buf,i.pending-t,t)),i.gzindex=0}i.status=73}if(73===i.status){if(i.gzhead.name){let t,s=i.pending;do{if(i.pending===i.pending_buf_size){if(i.gzhead.hcrc&&i.pending>s&&(e.adler=Ir(e.adler,i.pending_buf,i.pending-s,s)),co(e),0!==i.pending)return i.last_flush=-1,Hr;s=0}t=i.gzindex<i.gzhead.name.length?255&i.gzhead.name.charCodeAt(i.gzindex++):0,Ao(i,t)}while(0!==t);i.gzhead.hcrc&&i.pending>s&&(e.adler=Ir(e.adler,i.pending_buf,i.pending-s,s)),i.gzindex=0}i.status=91}if(91===i.status){if(i.gzhead.comment){let t,s=i.pending;do{if(i.pending===i.pending_buf_size){if(i.gzhead.hcrc&&i.pending>s&&(e.adler=Ir(e.adler,i.pending_buf,i.pending-s,s)),co(e),0!==i.pending)return i.last_flush=-1,Hr;s=0}t=i.gzindex<i.gzhead.comment.length?255&i.gzhead.comment.charCodeAt(i.gzindex++):0,Ao(i,t)}while(0!==t);i.gzhead.hcrc&&i.pending>s&&(e.adler=Ir(e.adler,i.pending_buf,i.pending-s,s))}i.status=103}if(103===i.status){if(i.gzhead.hcrc){if(i.pending+2>i.pending_buf_size&&(co(e),0!==i.pending))return i.last_flush=-1,Hr;Ao(i,255&e.adler),Ao(i,e.adler>>8&255),e.adler=0}if(i.status=io,co(e),0!==i.pending)return i.last_flush=-1,Hr}if(0!==e.avail_in||0!==i.lookahead||t!==Pr&&i.status!==so){let s=0===i.level?fo(i,t):i.strategy===Jr?((e,t)=>{let i;for(;;){if(0===e.lookahead&&(po(e),0===e.lookahead)){if(t===Pr)return 1;break}if(e.match_length=0,i=Tr(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++,i&&(ho(e,!1),0===e.strm.avail_out))return 1}return e.insert=0,t===Qr?(ho(e,!0),0===e.strm.avail_out?3:4):e.sym_next&&(ho(e,!1),0===e.strm.avail_out)?1:2})(i,t):i.strategy===Wr?((e,t)=>{let i,s,r,o;const n=e.window;for(;;){if(e.lookahead<=qr){if(po(e),e.lookahead<=qr&&t===Pr)return 1;if(0===e.lookahead)break}if(e.match_length=0,e.lookahead>=3&&e.strstart>0&&(r=e.strstart-1,s=n[r],s===n[++r]&&s===n[++r]&&s===n[++r])){o=e.strstart+qr;do{}while(s===n[++r]&&s===n[++r]&&s===n[++r]&&s===n[++r]&&s===n[++r]&&s===n[++r]&&s===n[++r]&&s===n[++r]&&r<o);e.match_length=qr-(o-r),e.match_length>e.lookahead&&(e.match_length=e.lookahead)}if(e.match_length>=3?(i=Tr(e,1,e.match_length-3),e.lookahead-=e.match_length,e.strstart+=e.match_length,e.match_length=0):(i=Tr(e,0,e.window[e.strstart]),e.lookahead--,e.strstart++),i&&(ho(e,!1),0===e.strm.avail_out))return 1}return e.insert=0,t===Qr?(ho(e,!0),0===e.strm.avail_out?3:4):e.sym_next&&(ho(e,!1),0===e.strm.avail_out)?1:2})(i,t):bo[i.level].func(i,t);if(3!==s&&4!==s||(i.status=so),1===s||3===s)return 0===e.avail_out&&(i.last_flush=-1),Hr;if(2===s&&(t===Ur?Fr(i):t!==zr&&(Mr(i,0,0,!1),t===Or&&(no(i.head),0===i.lookahead&&(i.strstart=0,i.block_start=0,i.insert=0))),co(e),0===e.avail_out))return i.last_flush=-1,Hr}return t!==Qr?Hr:i.wrap<=0?Gr:(2===i.wrap?(Ao(i,255&e.adler),Ao(i,e.adler>>8&255),Ao(i,e.adler>>16&255),Ao(i,e.adler>>24&255),Ao(i,255&e.total_in),Ao(i,e.total_in>>8&255),Ao(i,e.total_in>>16&255),Ao(i,e.total_in>>24&255)):(go(i,e.adler>>>16),go(i,65535&e.adler)),co(e),i.wrap>0&&(i.wrap=-i.wrap),0!==i.pending?Hr:Gr)},Do=(e,t)=>{let i=t.length;if(Co(e))return Lr;const s=e.state,r=s.wrap;if(2===r||1===r&&s.status!==to||s.lookahead)return Lr;if(1===r&&(e.adler=Br(e.adler,t,i,0)),s.wrap=0,i>=s.w_size){0===r&&(no(s.head),s.strstart=0,s.block_start=0,s.insert=0);let e=new Uint8Array(s.w_size);e.set(t.subarray(i-s.w_size,i),0),t=e,i=s.w_size}const o=e.avail_in,n=e.next_in,a=e.input;for(e.avail_in=i,e.next_in=0,e.input=t,po(s);s.lookahead>=3;){let e=s.strstart,t=s.lookahead-2;do{s.ins_h=lo(s,s.ins_h,s.window[e+3-1]),s.prev[e&s.w_mask]=s.head[s.ins_h],s.head[s.ins_h]=e,e++}while(--t);s.strstart=e,s.lookahead=2,po(s)}return s.strstart+=s.lookahead,s.block_start=s.strstart,s.insert=s.lookahead,s.lookahead=0,s.match_length=s.prev_length=2,s.match_available=0,e.next_in=n,e.input=a,e.avail_in=o,s.wrap=r,Hr},xo={deflateInit:(e,t)=>So(e,t,Xr,15,8,Vr),deflateInit2:So,deflateReset:Bo,deflateResetKeep:vo,deflateSetHeader:(e,t)=>Co(e)||2!==e.state.wrap?Lr:(e.state.gzhead=t,Hr),deflate:Io,deflateEnd:e=>{if(Co(e))return Lr;const t=e.state.status;return e.state=null,t===io?ro(e,Nr):Hr},deflateSetDictionary:Do,deflateInfo:"pako deflate (from Nodeca project)"};const Ro=(e,t)=>Object.prototype.hasOwnProperty.call(e,t);var Mo=function(e){const t=Array.prototype.slice.call(arguments,1);for(;t.length;){const i=t.shift();if(i){if("object"!=typeof i)throw new TypeError(i+"must be non-object");for(const t in i)Ro(i,t)&&(e[t]=i[t])}}return e},ko=e=>{let t=0;for(let i=0,s=e.length;i<s;i++)t+=e[i].length;const i=new Uint8Array(t);for(let t=0,s=0,r=e.length;t<r;t++){let r=e[t];i.set(r,s),s+=r.length}return i};let To=!0;try{String.fromCharCode.apply(null,new Uint8Array(1))}catch(e){To=!1}const Fo=new Uint8Array(256);for(let e=0;e<256;e++)Fo[e]=e>=252?6:e>=248?5:e>=240?4:e>=224?3:e>=192?2:1;Fo[254]=Fo[254]=1;var Po=e=>{if("function"==typeof TextEncoder&&TextEncoder.prototype.encode)return(new TextEncoder).encode(e);let t,i,s,r,o,n=e.length,a=0;for(r=0;r<n;r++)i=e.charCodeAt(r),55296==(64512&i)&&r+1<n&&(s=e.charCodeAt(r+1),56320==(64512&s)&&(i=65536+(i-55296<<10)+(s-56320),r++)),a+=i<128?1:i<2048?2:i<65536?3:4;for(t=new Uint8Array(a),o=0,r=0;o<a;r++)i=e.charCodeAt(r),55296==(64512&i)&&r+1<n&&(s=e.charCodeAt(r+1),56320==(64512&s)&&(i=65536+(i-55296<<10)+(s-56320),r++)),i<128?t[o++]=i:i<2048?(t[o++]=192|i>>>6,t[o++]=128|63&i):i<65536?(t[o++]=224|i>>>12,t[o++]=128|i>>>6&63,t[o++]=128|63&i):(t[o++]=240|i>>>18,t[o++]=128|i>>>12&63,t[o++]=128|i>>>6&63,t[o++]=128|63&i);return t},Uo=(e,t)=>{const i=t||e.length;if("function"==typeof TextDecoder&&TextDecoder.prototype.decode)return(new TextDecoder).decode(e.subarray(0,t));let s,r;const o=new Array(2*i);for(r=0,s=0;s<i;){let t=e[s++];if(t<128){o[r++]=t;continue}let n=Fo[t];if(n>4)o[r++]=65533,s+=n-1;else{for(t&=2===n?31:3===n?15:7;n>1&&s<i;)t=t<<6|63&e[s++],n--;n>1?o[r++]=65533:t<65536?o[r++]=t:(t-=65536,o[r++]=55296|t>>10&1023,o[r++]=56320|1023&t)}}return((e,t)=>{if(t<65534&&e.subarray&&To)return String.fromCharCode.apply(null,e.length===t?e:e.subarray(0,t));let i="";for(let s=0;s<t;s++)i+=String.fromCharCode(e[s]);return i})(o,r)},Oo=(e,t)=>{(t=t||e.length)>e.length&&(t=e.length);let i=t-1;for(;i>=0&&128==(192&e[i]);)i--;return i<0||0===i?t:i+Fo[e[i]]>t?i:t};var Qo=function(){this.input=null,this.next_in=0,this.avail_in=0,this.total_in=0,this.output=null,this.next_out=0,this.avail_out=0,this.total_out=0,this.msg="",this.state=null,this.data_type=2,this.adler=0};const zo=Object.prototype.toString,{Z_NO_FLUSH:Ho,Z_SYNC_FLUSH:Go,Z_FULL_FLUSH:Lo,Z_FINISH:No,Z_OK:Yo,Z_STREAM_END:$o,Z_DEFAULT_COMPRESSION:Ko,Z_DEFAULT_STRATEGY:Jo,Z_DEFLATED:Wo}=xr;function jo(e){this.options=Mo({level:Ko,method:Wo,chunkSize:16384,windowBits:15,memLevel:8,strategy:Jo},e||{});let t=this.options;t.raw&&t.windowBits>0?t.windowBits=-t.windowBits:t.gzip&&t.windowBits>0&&t.windowBits<16&&(t.windowBits+=16),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new Qo,this.strm.avail_out=0;let i=xo.deflateInit2(this.strm,t.level,t.method,t.windowBits,t.memLevel,t.strategy);if(i!==Yo)throw new Error(Dr[i]);if(t.header&&xo.deflateSetHeader(this.strm,t.header),t.dictionary){let e;if(e="string"==typeof t.dictionary?Po(t.dictionary):"[object ArrayBuffer]"===zo.call(t.dictionary)?new Uint8Array(t.dictionary):t.dictionary,i=xo.deflateSetDictionary(this.strm,e),i!==Yo)throw new Error(Dr[i]);this._dict_set=!0}}jo.prototype.push=function(e,t){const i=this.strm,s=this.options.chunkSize;let r,o;if(this.ended)return!1;for(o=t===~~t?t:!0===t?No:Ho,"string"==typeof e?i.input=Po(e):"[object ArrayBuffer]"===zo.call(e)?i.input=new Uint8Array(e):i.input=e,i.next_in=0,i.avail_in=i.input.length;;)if(0===i.avail_out&&(i.output=new Uint8Array(s),i.next_out=0,i.avail_out=s),(o===Go||o===Lo)&&i.avail_out<=6)this.onData(i.output.subarray(0,i.next_out)),i.avail_out=0;else{if(r=xo.deflate(i,o),r===$o)return i.next_out>0&&this.onData(i.output.subarray(0,i.next_out)),r=xo.deflateEnd(this.strm),this.onEnd(r),this.ended=!0,r===Yo;if(0!==i.avail_out){if(o>0&&i.next_out>0)this.onData(i.output.subarray(0,i.next_out)),i.avail_out=0;else if(0===i.avail_in)break}else this.onData(i.output)}return!0},jo.prototype.onData=function(e){this.chunks.push(e)},jo.prototype.onEnd=function(e){e===Yo&&(this.result=ko(this.chunks)),this.chunks=[],this.err=e,this.msg=this.strm.msg};var Vo={deflate:function(e,t){const i=new jo(t);if(i.push(e,!0),i.err)throw i.msg||Dr[i.err];return i.result}};const Zo=16209;var Xo=function(e,t){let i,s,r,o,n,a,l,c,h,d,A,g,u,_,p,f,w,E,m,b,y,C,v,B;const S=e.state;i=e.next_in,v=e.input,s=i+(e.avail_in-5),r=e.next_out,B=e.output,o=r-(t-e.avail_out),n=r+(e.avail_out-257),a=S.dmax,l=S.wsize,c=S.whave,h=S.wnext,d=S.window,A=S.hold,g=S.bits,u=S.lencode,_=S.distcode,p=(1<<S.lenbits)-1,f=(1<<S.distbits)-1;e:do{g<15&&(A+=v[i++]<<g,g+=8,A+=v[i++]<<g,g+=8),w=u[A&p];t:for(;;){if(E=w>>>24,A>>>=E,g-=E,E=w>>>16&255,0===E)B[r++]=65535&w;else{if(!(16&E)){if(64&E){if(32&E){S.mode=16191;break e}e.msg="invalid literal/length code",S.mode=Zo;break e}w=u[(65535&w)+(A&(1<<E)-1)];continue t}for(m=65535&w,E&=15,E&&(g<E&&(A+=v[i++]<<g,g+=8),m+=A&(1<<E)-1,A>>>=E,g-=E),g<15&&(A+=v[i++]<<g,g+=8,A+=v[i++]<<g,g+=8),w=_[A&f];;){if(E=w>>>24,A>>>=E,g-=E,E=w>>>16&255,16&E){if(b=65535&w,E&=15,g<E&&(A+=v[i++]<<g,g+=8,g<E&&(A+=v[i++]<<g,g+=8)),b+=A&(1<<E)-1,b>a){e.msg="invalid distance too far back",S.mode=Zo;break e}if(A>>>=E,g-=E,E=r-o,b>E){if(E=b-E,E>c&&S.sane){e.msg="invalid distance too far back",S.mode=Zo;break e}if(y=0,C=d,0===h){if(y+=l-E,E<m){m-=E;do{B[r++]=d[y++]}while(--E);y=r-b,C=B}}else if(h<E){if(y+=l+h-E,E-=h,E<m){m-=E;do{B[r++]=d[y++]}while(--E);if(y=0,h<m){E=h,m-=E;do{B[r++]=d[y++]}while(--E);y=r-b,C=B}}}else if(y+=h-E,E<m){m-=E;do{B[r++]=d[y++]}while(--E);y=r-b,C=B}for(;m>2;)B[r++]=C[y++],B[r++]=C[y++],B[r++]=C[y++],m-=3;m&&(B[r++]=C[y++],m>1&&(B[r++]=C[y++]))}else{y=r-b;do{B[r++]=B[y++],B[r++]=B[y++],B[r++]=B[y++],m-=3}while(m>2);m&&(B[r++]=B[y++],m>1&&(B[r++]=B[y++]))}break}if(64&E){e.msg="invalid distance code",S.mode=Zo;break e}w=_[(65535&w)+(A&(1<<E)-1)]}}break}}while(i<s&&r<n);m=g>>3,i-=m,g-=m<<3,A&=(1<<g)-1,e.next_in=i,e.next_out=r,e.avail_in=i<s?s-i+5:5-(i-s),e.avail_out=r<n?n-r+257:257-(r-n),S.hold=A,S.bits=g};const qo=15,en=new Uint16Array([3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0]),tn=new Uint8Array([16,16,16,16,16,16,16,16,17,17,17,17,18,18,18,18,19,19,19,19,20,20,20,20,21,21,21,21,16,72,78]),sn=new Uint16Array([1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577,0,0]),rn=new Uint8Array([16,16,16,16,17,17,18,18,19,19,20,20,21,21,22,22,23,23,24,24,25,25,26,26,27,27,28,28,29,29,64,64]);var on=(e,t,i,s,r,o,n,a)=>{const l=a.bits;let c,h,d,A,g,u,_=0,p=0,f=0,w=0,E=0,m=0,b=0,y=0,C=0,v=0,B=null;const S=new Uint16Array(16),I=new Uint16Array(16);let D,x,R,M=null;for(_=0;_<=qo;_++)S[_]=0;for(p=0;p<s;p++)S[t[i+p]]++;for(E=l,w=qo;w>=1&&0===S[w];w--);if(E>w&&(E=w),0===w)return r[o++]=20971520,r[o++]=20971520,a.bits=1,0;for(f=1;f<w&&0===S[f];f++);for(E<f&&(E=f),y=1,_=1;_<=qo;_++)if(y<<=1,y-=S[_],y<0)return-1;if(y>0&&(0===e||1!==w))return-1;for(I[1]=0,_=1;_<qo;_++)I[_+1]=I[_]+S[_];for(p=0;p<s;p++)0!==t[i+p]&&(n[I[t[i+p]]++]=p);if(0===e?(B=M=n,u=20):1===e?(B=en,M=tn,u=257):(B=sn,M=rn,u=0),v=0,p=0,_=f,g=o,m=E,b=0,d=-1,C=1<<E,A=C-1,1===e&&C>852||2===e&&C>592)return 1;for(;;){D=_-b,n[p]+1<u?(x=0,R=n[p]):n[p]>=u?(x=M[n[p]-u],R=B[n[p]-u]):(x=96,R=0),c=1<<_-b,h=1<<m,f=h;do{h-=c,r[g+(v>>b)+h]=D<<24|x<<16|R}while(0!==h);for(c=1<<_-1;v&c;)c>>=1;if(0!==c?(v&=c-1,v+=c):v=0,p++,0===--S[_]){if(_===w)break;_=t[i+n[p]]}if(_>E&&(v&A)!==d){for(0===b&&(b=E),g+=f,m=_-b,y=1<<m;m+b<w&&(y-=S[m+b],!(y<=0));)m++,y<<=1;if(C+=1<<m,1===e&&C>852||2===e&&C>592)return 1;d=v&A,r[d]=E<<24|m<<16|g-o}}return 0!==v&&(r[g+v]=_-b<<24|64<<16),a.bits=E,0};const{Z_FINISH:nn,Z_BLOCK:an,Z_TREES:ln,Z_OK:cn,Z_STREAM_END:hn,Z_NEED_DICT:dn,Z_STREAM_ERROR:An,Z_DATA_ERROR:gn,Z_MEM_ERROR:un,Z_BUF_ERROR:_n,Z_DEFLATED:pn}=xr,fn=16180,wn=16190,En=16191,mn=16192,bn=16194,yn=16199,Cn=16200,vn=16206,Bn=16209,Sn=e=>(e>>>24&255)+(e>>>8&65280)+((65280&e)<<8)+((255&e)<<24);function In(){this.strm=null,this.mode=0,this.last=!1,this.wrap=0,this.havedict=!1,this.flags=0,this.dmax=0,this.check=0,this.total=0,this.head=null,this.wbits=0,this.wsize=0,this.whave=0,this.wnext=0,this.window=null,this.hold=0,this.bits=0,this.length=0,this.offset=0,this.extra=0,this.lencode=null,this.distcode=null,this.lenbits=0,this.distbits=0,this.ncode=0,this.nlen=0,this.ndist=0,this.have=0,this.next=null,this.lens=new Uint16Array(320),this.work=new Uint16Array(288),this.lendyn=null,this.distdyn=null,this.sane=0,this.back=0,this.was=0}const Dn=e=>{if(!e)return 1;const t=e.state;return!t||t.strm!==e||t.mode<fn||t.mode>16211?1:0},xn=e=>{if(Dn(e))return An;const t=e.state;return e.total_in=e.total_out=t.total=0,e.msg="",t.wrap&&(e.adler=1&t.wrap),t.mode=fn,t.last=0,t.havedict=0,t.flags=-1,t.dmax=32768,t.head=null,t.hold=0,t.bits=0,t.lencode=t.lendyn=new Int32Array(852),t.distcode=t.distdyn=new Int32Array(592),t.sane=1,t.back=-1,cn},Rn=e=>{if(Dn(e))return An;const t=e.state;return t.wsize=0,t.whave=0,t.wnext=0,xn(e)},Mn=(e,t)=>{let i;if(Dn(e))return An;const s=e.state;return t<0?(i=0,t=-t):(i=5+(t>>4),t<48&&(t&=15)),t&&(t<8||t>15)?An:(null!==s.window&&s.wbits!==t&&(s.window=null),s.wrap=i,s.wbits=t,Rn(e))},kn=(e,t)=>{if(!e)return An;const i=new In;e.state=i,i.strm=e,i.window=null,i.mode=fn;const s=Mn(e,t);return s!==cn&&(e.state=null),s};let Tn,Fn,Pn=!0;const Un=e=>{if(Pn){Tn=new Int32Array(512),Fn=new Int32Array(32);let t=0;for(;t<144;)e.lens[t++]=8;for(;t<256;)e.lens[t++]=9;for(;t<280;)e.lens[t++]=7;for(;t<288;)e.lens[t++]=8;for(on(1,e.lens,0,288,Tn,0,e.work,{bits:9}),t=0;t<32;)e.lens[t++]=5;on(2,e.lens,0,32,Fn,0,e.work,{bits:5}),Pn=!1}e.lencode=Tn,e.lenbits=9,e.distcode=Fn,e.distbits=5},On=(e,t,i,s)=>{let r;const o=e.state;return null===o.window&&(o.wsize=1<<o.wbits,o.wnext=0,o.whave=0,o.window=new Uint8Array(o.wsize)),s>=o.wsize?(o.window.set(t.subarray(i-o.wsize,i),0),o.wnext=0,o.whave=o.wsize):(r=o.wsize-o.wnext,r>s&&(r=s),o.window.set(t.subarray(i-s,i-s+r),o.wnext),(s-=r)?(o.window.set(t.subarray(i-s,i),0),o.wnext=s,o.whave=o.wsize):(o.wnext+=r,o.wnext===o.wsize&&(o.wnext=0),o.whave<o.wsize&&(o.whave+=r))),0};var Qn=(e,t)=>{let i,s,r,o,n,a,l,c,h,d,A,g,u,_,p,f,w,E,m,b,y,C,v=0;const B=new Uint8Array(4);let S,I;const D=new Uint8Array([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]);if(Dn(e)||!e.output||!e.input&&0!==e.avail_in)return An;i=e.state,i.mode===En&&(i.mode=mn),n=e.next_out,r=e.output,l=e.avail_out,o=e.next_in,s=e.input,a=e.avail_in,c=i.hold,h=i.bits,d=a,A=l,C=cn;e:for(;;)switch(i.mode){case fn:if(0===i.wrap){i.mode=mn;break}for(;h<16;){if(0===a)break e;a--,c+=s[o++]<<h,h+=8}if(2&i.wrap&&35615===c){0===i.wbits&&(i.wbits=15),i.check=0,B[0]=255&c,B[1]=c>>>8&255,i.check=Ir(i.check,B,2,0),c=0,h=0,i.mode=16181;break}if(i.head&&(i.head.done=!1),!(1&i.wrap)||(((255&c)<<8)+(c>>8))%31){e.msg="incorrect header check",i.mode=Bn;break}if((15&c)!==pn){e.msg="unknown compression method",i.mode=Bn;break}if(c>>>=4,h-=4,y=8+(15&c),0===i.wbits&&(i.wbits=y),y>15||y>i.wbits){e.msg="invalid window size",i.mode=Bn;break}i.dmax=1<<i.wbits,i.flags=0,e.adler=i.check=1,i.mode=512&c?16189:En,c=0,h=0;break;case 16181:for(;h<16;){if(0===a)break e;a--,c+=s[o++]<<h,h+=8}if(i.flags=c,(255&i.flags)!==pn){e.msg="unknown compression method",i.mode=Bn;break}if(57344&i.flags){e.msg="unknown header flags set",i.mode=Bn;break}i.head&&(i.head.text=c>>8&1),512&i.flags&&4&i.wrap&&(B[0]=255&c,B[1]=c>>>8&255,i.check=Ir(i.check,B,2,0)),c=0,h=0,i.mode=16182;case 16182:for(;h<32;){if(0===a)break e;a--,c+=s[o++]<<h,h+=8}i.head&&(i.head.time=c),512&i.flags&&4&i.wrap&&(B[0]=255&c,B[1]=c>>>8&255,B[2]=c>>>16&255,B[3]=c>>>24&255,i.check=Ir(i.check,B,4,0)),c=0,h=0,i.mode=16183;case 16183:for(;h<16;){if(0===a)break e;a--,c+=s[o++]<<h,h+=8}i.head&&(i.head.xflags=255&c,i.head.os=c>>8),512&i.flags&&4&i.wrap&&(B[0]=255&c,B[1]=c>>>8&255,i.check=Ir(i.check,B,2,0)),c=0,h=0,i.mode=16184;case 16184:if(1024&i.flags){for(;h<16;){if(0===a)break e;a--,c+=s[o++]<<h,h+=8}i.length=c,i.head&&(i.head.extra_len=c),512&i.flags&&4&i.wrap&&(B[0]=255&c,B[1]=c>>>8&255,i.check=Ir(i.check,B,2,0)),c=0,h=0}else i.head&&(i.head.extra=null);i.mode=16185;case 16185:if(1024&i.flags&&(g=i.length,g>a&&(g=a),g&&(i.head&&(y=i.head.extra_len-i.length,i.head.extra||(i.head.extra=new Uint8Array(i.head.extra_len)),i.head.extra.set(s.subarray(o,o+g),y)),512&i.flags&&4&i.wrap&&(i.check=Ir(i.check,s,g,o)),a-=g,o+=g,i.length-=g),i.length))break e;i.length=0,i.mode=16186;case 16186:if(2048&i.flags){if(0===a)break e;g=0;do{y=s[o+g++],i.head&&y&&i.length<65536&&(i.head.name+=String.fromCharCode(y))}while(y&&g<a);if(512&i.flags&&4&i.wrap&&(i.check=Ir(i.check,s,g,o)),a-=g,o+=g,y)break e}else i.head&&(i.head.name=null);i.length=0,i.mode=16187;case 16187:if(4096&i.flags){if(0===a)break e;g=0;do{y=s[o+g++],i.head&&y&&i.length<65536&&(i.head.comment+=String.fromCharCode(y))}while(y&&g<a);if(512&i.flags&&4&i.wrap&&(i.check=Ir(i.check,s,g,o)),a-=g,o+=g,y)break e}else i.head&&(i.head.comment=null);i.mode=16188;case 16188:if(512&i.flags){for(;h<16;){if(0===a)break e;a--,c+=s[o++]<<h,h+=8}if(4&i.wrap&&c!==(65535&i.check)){e.msg="header crc mismatch",i.mode=Bn;break}c=0,h=0}i.head&&(i.head.hcrc=i.flags>>9&1,i.head.done=!0),e.adler=i.check=0,i.mode=En;break;case 16189:for(;h<32;){if(0===a)break e;a--,c+=s[o++]<<h,h+=8}e.adler=i.check=Sn(c),c=0,h=0,i.mode=wn;case wn:if(0===i.havedict)return e.next_out=n,e.avail_out=l,e.next_in=o,e.avail_in=a,i.hold=c,i.bits=h,dn;e.adler=i.check=1,i.mode=En;case En:if(t===an||t===ln)break e;case mn:if(i.last){c>>>=7&h,h-=7&h,i.mode=vn;break}for(;h<3;){if(0===a)break e;a--,c+=s[o++]<<h,h+=8}switch(i.last=1&c,c>>>=1,h-=1,3&c){case 0:i.mode=16193;break;case 1:if(Un(i),i.mode=yn,t===ln){c>>>=2,h-=2;break e}break;case 2:i.mode=16196;break;case 3:e.msg="invalid block type",i.mode=Bn}c>>>=2,h-=2;break;case 16193:for(c>>>=7&h,h-=7&h;h<32;){if(0===a)break e;a--,c+=s[o++]<<h,h+=8}if((65535&c)!=(c>>>16^65535)){e.msg="invalid stored block lengths",i.mode=Bn;break}if(i.length=65535&c,c=0,h=0,i.mode=bn,t===ln)break e;case bn:i.mode=16195;case 16195:if(g=i.length,g){if(g>a&&(g=a),g>l&&(g=l),0===g)break e;r.set(s.subarray(o,o+g),n),a-=g,o+=g,l-=g,n+=g,i.length-=g;break}i.mode=En;break;case 16196:for(;h<14;){if(0===a)break e;a--,c+=s[o++]<<h,h+=8}if(i.nlen=257+(31&c),c>>>=5,h-=5,i.ndist=1+(31&c),c>>>=5,h-=5,i.ncode=4+(15&c),c>>>=4,h-=4,i.nlen>286||i.ndist>30){e.msg="too many length or distance symbols",i.mode=Bn;break}i.have=0,i.mode=16197;case 16197:for(;i.have<i.ncode;){for(;h<3;){if(0===a)break e;a--,c+=s[o++]<<h,h+=8}i.lens[D[i.have++]]=7&c,c>>>=3,h-=3}for(;i.have<19;)i.lens[D[i.have++]]=0;if(i.lencode=i.lendyn,i.lenbits=7,S={bits:i.lenbits},C=on(0,i.lens,0,19,i.lencode,0,i.work,S),i.lenbits=S.bits,C){e.msg="invalid code lengths set",i.mode=Bn;break}i.have=0,i.mode=16198;case 16198:for(;i.have<i.nlen+i.ndist;){for(;v=i.lencode[c&(1<<i.lenbits)-1],p=v>>>24,f=v>>>16&255,w=65535&v,!(p<=h);){if(0===a)break e;a--,c+=s[o++]<<h,h+=8}if(w<16)c>>>=p,h-=p,i.lens[i.have++]=w;else{if(16===w){for(I=p+2;h<I;){if(0===a)break e;a--,c+=s[o++]<<h,h+=8}if(c>>>=p,h-=p,0===i.have){e.msg="invalid bit length repeat",i.mode=Bn;break}y=i.lens[i.have-1],g=3+(3&c),c>>>=2,h-=2}else if(17===w){for(I=p+3;h<I;){if(0===a)break e;a--,c+=s[o++]<<h,h+=8}c>>>=p,h-=p,y=0,g=3+(7&c),c>>>=3,h-=3}else{for(I=p+7;h<I;){if(0===a)break e;a--,c+=s[o++]<<h,h+=8}c>>>=p,h-=p,y=0,g=11+(127&c),c>>>=7,h-=7}if(i.have+g>i.nlen+i.ndist){e.msg="invalid bit length repeat",i.mode=Bn;break}for(;g--;)i.lens[i.have++]=y}}if(i.mode===Bn)break;if(0===i.lens[256]){e.msg="invalid code -- missing end-of-block",i.mode=Bn;break}if(i.lenbits=9,S={bits:i.lenbits},C=on(1,i.lens,0,i.nlen,i.lencode,0,i.work,S),i.lenbits=S.bits,C){e.msg="invalid literal/lengths set",i.mode=Bn;break}if(i.distbits=6,i.distcode=i.distdyn,S={bits:i.distbits},C=on(2,i.lens,i.nlen,i.ndist,i.distcode,0,i.work,S),i.distbits=S.bits,C){e.msg="invalid distances set",i.mode=Bn;break}if(i.mode=yn,t===ln)break e;case yn:i.mode=Cn;case Cn:if(a>=6&&l>=258){e.next_out=n,e.avail_out=l,e.next_in=o,e.avail_in=a,i.hold=c,i.bits=h,Xo(e,A),n=e.next_out,r=e.output,l=e.avail_out,o=e.next_in,s=e.input,a=e.avail_in,c=i.hold,h=i.bits,i.mode===En&&(i.back=-1);break}for(i.back=0;v=i.lencode[c&(1<<i.lenbits)-1],p=v>>>24,f=v>>>16&255,w=65535&v,!(p<=h);){if(0===a)break e;a--,c+=s[o++]<<h,h+=8}if(f&&!(240&f)){for(E=p,m=f,b=w;v=i.lencode[b+((c&(1<<E+m)-1)>>E)],p=v>>>24,f=v>>>16&255,w=65535&v,!(E+p<=h);){if(0===a)break e;a--,c+=s[o++]<<h,h+=8}c>>>=E,h-=E,i.back+=E}if(c>>>=p,h-=p,i.back+=p,i.length=w,0===f){i.mode=16205;break}if(32&f){i.back=-1,i.mode=En;break}if(64&f){e.msg="invalid literal/length code",i.mode=Bn;break}i.extra=15&f,i.mode=16201;case 16201:if(i.extra){for(I=i.extra;h<I;){if(0===a)break e;a--,c+=s[o++]<<h,h+=8}i.length+=c&(1<<i.extra)-1,c>>>=i.extra,h-=i.extra,i.back+=i.extra}i.was=i.length,i.mode=16202;case 16202:for(;v=i.distcode[c&(1<<i.distbits)-1],p=v>>>24,f=v>>>16&255,w=65535&v,!(p<=h);){if(0===a)break e;a--,c+=s[o++]<<h,h+=8}if(!(240&f)){for(E=p,m=f,b=w;v=i.distcode[b+((c&(1<<E+m)-1)>>E)],p=v>>>24,f=v>>>16&255,w=65535&v,!(E+p<=h);){if(0===a)break e;a--,c+=s[o++]<<h,h+=8}c>>>=E,h-=E,i.back+=E}if(c>>>=p,h-=p,i.back+=p,64&f){e.msg="invalid distance code",i.mode=Bn;break}i.offset=w,i.extra=15&f,i.mode=16203;case 16203:if(i.extra){for(I=i.extra;h<I;){if(0===a)break e;a--,c+=s[o++]<<h,h+=8}i.offset+=c&(1<<i.extra)-1,c>>>=i.extra,h-=i.extra,i.back+=i.extra}if(i.offset>i.dmax){e.msg="invalid distance too far back",i.mode=Bn;break}i.mode=16204;case 16204:if(0===l)break e;if(g=A-l,i.offset>g){if(g=i.offset-g,g>i.whave&&i.sane){e.msg="invalid distance too far back",i.mode=Bn;break}g>i.wnext?(g-=i.wnext,u=i.wsize-g):u=i.wnext-g,g>i.length&&(g=i.length),_=i.window}else _=r,u=n-i.offset,g=i.length;g>l&&(g=l),l-=g,i.length-=g;do{r[n++]=_[u++]}while(--g);0===i.length&&(i.mode=Cn);break;case 16205:if(0===l)break e;r[n++]=i.length,l--,i.mode=Cn;break;case vn:if(i.wrap){for(;h<32;){if(0===a)break e;a--,c|=s[o++]<<h,h+=8}if(A-=l,e.total_out+=A,i.total+=A,4&i.wrap&&A&&(e.adler=i.check=i.flags?Ir(i.check,r,A,n-A):Br(i.check,r,A,n-A)),A=l,4&i.wrap&&(i.flags?c:Sn(c))!==i.check){e.msg="incorrect data check",i.mode=Bn;break}c=0,h=0}i.mode=16207;case 16207:if(i.wrap&&i.flags){for(;h<32;){if(0===a)break e;a--,c+=s[o++]<<h,h+=8}if(4&i.wrap&&c!==(4294967295&i.total)){e.msg="incorrect length check",i.mode=Bn;break}c=0,h=0}i.mode=16208;case 16208:C=hn;break e;case Bn:C=gn;break e;case 16210:return un;default:return An}return e.next_out=n,e.avail_out=l,e.next_in=o,e.avail_in=a,i.hold=c,i.bits=h,(i.wsize||A!==e.avail_out&&i.mode<Bn&&(i.mode<vn||t!==nn))&&On(e,e.output,e.next_out,A-e.avail_out),d-=e.avail_in,A-=e.avail_out,e.total_in+=d,e.total_out+=A,i.total+=A,4&i.wrap&&A&&(e.adler=i.check=i.flags?Ir(i.check,r,A,e.next_out-A):Br(i.check,r,A,e.next_out-A)),e.data_type=i.bits+(i.last?64:0)+(i.mode===En?128:0)+(i.mode===yn||i.mode===bn?256:0),(0===d&&0===A||t===nn)&&C===cn&&(C=_n),C},zn={inflateReset:Rn,inflateReset2:Mn,inflateResetKeep:xn,inflateInit:e=>kn(e,15),inflateInit2:kn,inflate:Qn,inflateEnd:e=>{if(Dn(e))return An;let t=e.state;return t.window&&(t.window=null),e.state=null,cn},inflateGetHeader:(e,t)=>{if(Dn(e))return An;const i=e.state;return 2&i.wrap?(i.head=t,t.done=!1,cn):An},inflateSetDictionary:(e,t)=>{const i=t.length;let s,r,o;return Dn(e)?An:(s=e.state,0!==s.wrap&&s.mode!==wn?An:s.mode===wn&&(r=1,r=Br(r,t,i,0),r!==s.check)?gn:(o=On(e,t,i,i),o?(s.mode=16210,un):(s.havedict=1,cn)))},inflateInfo:"pako inflate (from Nodeca project)"};var Hn=function(){this.text=0,this.time=0,this.xflags=0,this.os=0,this.extra=null,this.extra_len=0,this.name="",this.comment="",this.hcrc=0,this.done=!1};const Gn=Object.prototype.toString,{Z_NO_FLUSH:Ln,Z_FINISH:Nn,Z_OK:Yn,Z_STREAM_END:$n,Z_NEED_DICT:Kn,Z_STREAM_ERROR:Jn,Z_DATA_ERROR:Wn,Z_MEM_ERROR:jn}=xr;function Vn(e){this.options=Mo({chunkSize:65536,windowBits:15,to:""},e||{});const t=this.options;t.raw&&t.windowBits>=0&&t.windowBits<16&&(t.windowBits=-t.windowBits,0===t.windowBits&&(t.windowBits=-15)),!(t.windowBits>=0&&t.windowBits<16)||e&&e.windowBits||(t.windowBits+=32),t.windowBits>15&&t.windowBits<48&&(15&t.windowBits||(t.windowBits|=15)),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new Qo,this.strm.avail_out=0;let i=zn.inflateInit2(this.strm,t.windowBits);if(i!==Yn)throw new Error(Dr[i]);if(this.header=new Hn,zn.inflateGetHeader(this.strm,this.header),t.dictionary&&("string"==typeof t.dictionary?t.dictionary=Po(t.dictionary):"[object ArrayBuffer]"===Gn.call(t.dictionary)&&(t.dictionary=new Uint8Array(t.dictionary)),t.raw&&(i=zn.inflateSetDictionary(this.strm,t.dictionary),i!==Yn)))throw new Error(Dr[i])}Vn.prototype.push=function(e,t){const i=this.strm,s=this.options.chunkSize,r=this.options.dictionary;let o,n,a;if(this.ended)return!1;for(n=t===~~t?t:!0===t?Nn:Ln,"[object ArrayBuffer]"===Gn.call(e)?i.input=new Uint8Array(e):i.input=e,i.next_in=0,i.avail_in=i.input.length;;){for(0===i.avail_out&&(i.output=new Uint8Array(s),i.next_out=0,i.avail_out=s),o=zn.inflate(i,n),o===Kn&&r&&(o=zn.inflateSetDictionary(i,r),o===Yn?o=zn.inflate(i,n):o===Wn&&(o=Kn));i.avail_in>0&&o===$n&&i.state.wrap>0&&0!==e[i.next_in];)zn.inflateReset(i),o=zn.inflate(i,n);switch(o){case Jn:case Wn:case Kn:case jn:return this.onEnd(o),this.ended=!0,!1}if(a=i.avail_out,i.next_out&&(0===i.avail_out||o===$n))if("string"===this.options.to){let e=Oo(i.output,i.next_out),t=i.next_out-e,r=Uo(i.output,e);i.next_out=t,i.avail_out=s-t,t&&i.output.set(i.output.subarray(e,e+t),0),this.onData(r)}else this.onData(i.output.length===i.next_out?i.output:i.output.subarray(0,i.next_out));if(o!==Yn||0!==a){if(o===$n)return o=zn.inflateEnd(this.strm),this.onEnd(o),this.ended=!0,!0;if(0===i.avail_in)break}}return!0},Vn.prototype.onData=function(e){this.chunks.push(e)},Vn.prototype.onEnd=function(e){e===Yn&&("string"===this.options.to?this.result=this.chunks.join(""):this.result=ko(this.chunks)),this.chunks=[],this.err=e,this.msg=this.strm.msg};var Zn={Inflate:Vn};const{deflate:Xn}=Vo,{Inflate:qn}=Zn;var ea=Xn,ta=qn;function ia(e,t,i=255){const s=e.length%t;if(0!==s){const r=new Uint8Array(t-s).fill(i),o=new Uint8Array(e.length+r.length);return o.set(e),o.set(r,e.length),o}return e}function sa(e,t=239){for(let i=0;i<e.length;i++)t^=e[i];return t}function ra(e){const t=new Uint8Array(e.length);for(let i=0;i<e.length;i++)t[i]=e.charCodeAt(i);return t}function oa(e){return new Promise(t=>setTimeout(t,e))}class na{constructor(e,t=!1,i=!0){this.device=e,this.tracing=t,this.slipReaderEnabled=!1,this.baudrate=0,this.traceLog="",this.lastTraceTime=Date.now(),this.buffer=new Uint8Array(0),this.onDeviceLostCallback=null,this.SLIP_END=192,this.SLIP_ESC=219,this.SLIP_ESC_END=220,this.SLIP_ESC_ESC=221,this._DTR_state=!1,this.slipReaderEnabled=i}setDeviceLostCallback(e){this.onDeviceLostCallback=e}updateDevice(e){this.device=e,this.trace("Device reference updated")}getInfo(){const e=this.device.getInfo();return e.usbVendorId&&e.usbProductId?`WebSerial VendorID 0x${e.usbVendorId.toString(16)} ProductID 0x${e.usbProductId.toString(16)}`:""}getPid(){return this.device.getInfo().usbProductId}trace(e){const t=`${`TRACE ${(Date.now()-this.lastTraceTime).toFixed(3)}`} ${e}`;console.log(t),this.traceLog+=t+"\n"}async returnTrace(){try{await navigator.clipboard.writeText(this.traceLog),console.log("Text copied to clipboard!")}catch(e){console.error("Failed to copy text:",e)}}hexify(e){return Array.from(e).map(e=>e.toString(16).padStart(2,"0")).join("").padEnd(16," ")}hexConvert(e,t=!0){if(t&&e.length>16){let t="",i=e;for(;i.length>0;){const e=i.slice(0,16),s=String.fromCharCode(...e).split("").map(e=>" "===e||e>=" "&&e<="~"&&"  "!==e?e:".").join("");i=i.slice(16),t+=`\n    ${this.hexify(e.slice(0,8))} ${this.hexify(e.slice(8))} | ${s}`}return t}return this.hexify(e)}slipWriter(e){const t=[];t.push(192);for(let i=0;i<e.length;i++)219===e[i]?t.push(219,221):192===e[i]?t.push(219,220):t.push(e[i]);return t.push(192),new Uint8Array(t)}async write(e){const t=this.slipWriter(e);if(this.device.writable){const e=this.device.writable.getWriter();this.tracing&&this.trace(`Write ${t.length} bytes: ${this.hexConvert(t)}`),await e.write(t),e.releaseLock()}}appendArray(e,t){const i=new Uint8Array(e.length+t.length);return i.set(e),i.set(t,e.length),i}async readLoop(){for(var e;this.device.readable;){this.reader=null===(e=this.device.readable)||void 0===e?void 0:e.getReader();try{const{value:e,done:t}=await this.reader.read();if(t){this.trace("Serial port done");break}if(e&&e.length){const t=Uint8Array.from(e);this.buffer=this.appendArray(this.buffer,t)}}catch(e){if(e instanceof Error){if(["BufferOverrunError","FramingError","BreakError","ParityError"].includes(e.name)){this.trace(`Recoverable serial port error: ${e.message}`);continue}this.trace(`Unrecoverable serial port error: ${e.message}`);break}if(e instanceof DOMException){this.onDeviceLostCallback?this.onDeviceLostCallback():this.trace(`Unrecoverable serial port error: ${e.message}`);break}this.trace(`Unrecoverable serial port error: ${e}`);break}finally{this.reader.releaseLock()}}this.trace("readLoop exited")}flushInput(){this.buffer=new Uint8Array(0)}async flushOutput(){try{if(this.device.writable){const e=this.device.writable.getWriter();await e.close(),e.releaseLock()}}catch(e){this.trace(`Error while flushing output: ${e}`)}}inWaiting(){return this.buffer.length}peek(){return this.buffer}detectPanicHandler(e){const t=new TextDecoder("utf-8").decode(e),i=t.match(/G?uru Meditation Error: (?:Core \d panic'ed \(([a-zA-Z ]*)\))?/)||t.match(/F?atal exception \(\d+\): (?:([a-zA-Z ]*)?.*epc)?/);if(i){const e=i[1]||i[2];throw new Error("Guru Meditation Error detected"+(e?` (${e})`:""))}}async read(e){let t=null,i=!1,s=null;for(;;){const r=Date.now();for(s=new Uint8Array(0);Date.now()-r<e;){if(this.buffer.length>0){s=this.buffer,this.buffer=new Uint8Array(0);break}await oa(1)}if(!s||0===s.length){const e=null===t?"Serial data stream stopped: Possible serial noise or corruption.":"No serial data received.";throw this.tracing&&this.trace(e),new Error(e)}this.tracing&&this.trace(`Read ${s.length} bytes: ${this.hexConvert(s)}`);for(let e=0;e<s.length;e++){const r=s[e];if(null===t){if(r!==this.SLIP_END){this.tracing&&this.trace(`Read invalid data: ${this.hexConvert(s)}`);const e=this.buffer;throw this.tracing&&this.trace(`Remaining data in serial buffer: ${this.hexConvert(e)}`),this.detectPanicHandler(new Uint8Array([...s,...e||[]])),new Error(`Invalid head of packet (0x${r.toString(16)}): Possible serial noise or corruption.`)}t=new Uint8Array(0)}else if(i)if(i=!1,r===this.SLIP_ESC_END)t=this.appendArray(t,new Uint8Array([this.SLIP_END]));else{if(r!==this.SLIP_ESC_ESC){this.tracing&&this.trace(`Read invalid data: ${this.hexConvert(s)}`);const e=this.buffer;throw this.tracing&&this.trace(`Remaining data in serial buffer: ${this.hexConvert(e)}`),this.detectPanicHandler(new Uint8Array([...s,...e||[]])),new Error(`Invalid SLIP escape (0xdb, 0x${r.toString(16)})`)}t=this.appendArray(t,new Uint8Array([this.SLIP_ESC]))}else if(r===this.SLIP_ESC)i=!0;else{if(r===this.SLIP_END){if(this.tracing&&this.trace(`Received full packet: ${this.hexConvert(t)}`),e+1<s.length){const t=s.slice(e+1);this.buffer=this.appendArray(t,this.buffer)}return t}t=this.appendArray(t,new Uint8Array([r]))}}}}async rawRead(e,t){let i;try{if(!this.device.readable)return;for(i=this.device.readable.getReader();!t();){const{value:t,done:s}=await i.read();if(s||!t)break;this.tracing&&this.trace(`Read ${t.length} bytes: ${this.hexConvert(t)}`),e(t)}}catch(e){this.trace(`Error reading from serial port: ${e}`),e instanceof Error&&"NetworkError"===e.name&&e.message.includes("device has been lost")&&(this.trace("Device lost detected (NetworkError)"),this.onDeviceLostCallback&&this.onDeviceLostCallback())}finally{null==i||i.releaseLock()}}async setRTS(e){await this.device.setSignals({requestToSend:e}),await this.setDTR(this._DTR_state)}async setDTR(e){this._DTR_state=e,await this.device.setSignals({dataTerminalReady:e})}async connect(e=115200,t={}){await this.device.open({baudRate:e,dataBits:null==t?void 0:t.dataBits,stopBits:null==t?void 0:t.stopBits,bufferSize:null==t?void 0:t.bufferSize,parity:null==t?void 0:t.parity,flowControl:null==t?void 0:t.flowControl}),this.baudrate=e}async waitForUnlock(e){for(;this.device.readable&&this.device.readable.locked||this.device.writable&&this.device.writable.locked;)await oa(e)}async disconnect(){var e,t;(null===(e=this.device.readable)||void 0===e?void 0:e.locked)&&await(null===(t=this.reader)||void 0===t?void 0:t.cancel()),await this.waitForUnlock(400),await this.device.close(),this.reader=void 0}}function aa(e){return new Promise(t=>setTimeout(t,e))}class la{constructor(e,t){this.resetDelay=t,this.transport=e}async reset(){await this.transport.setDTR(!1),await this.transport.setRTS(!0),await aa(100),await this.transport.setDTR(!0),await this.transport.setRTS(!1),await aa(this.resetDelay),await this.transport.setDTR(!1)}}class ca{constructor(e){this.transport=e}async reset(){await this.transport.setRTS(!1),await this.transport.setDTR(!1),await aa(100),await this.transport.setDTR(!0),await this.transport.setRTS(!1),await aa(100),await this.transport.setRTS(!0),await this.transport.setDTR(!1),await this.transport.setRTS(!0),await aa(100),await this.transport.setRTS(!1),await this.transport.setDTR(!1)}}class ha{constructor(e,t=!1){this.transport=e,this.usingUsbOtg=t,this.transport=e}async reset(){this.usingUsbOtg?(await aa(200),await this.transport.setRTS(!1),await aa(200)):(await aa(100),await this.transport.setRTS(!1))}}class da{constructor(e,t){this.transport=e,this.sequenceString=t,this.transport=e}async reset(){const e={D:async e=>await this.transport.setDTR(e),R:async e=>await this.transport.setRTS(e),W:async e=>await aa(e)};try{if(!function(e){const t=["D","R","W"],i=e.split("|");for(const e of i){const i=e[0],s=e.slice(1);if(!t.includes(i))return!1;if("D"===i||"R"===i){if("0"!==s&&"1"!==s)return!1}else if("W"===i){const e=parseInt(s);if(isNaN(e)||e<=0)return!1}}return!0}(this.sequenceString))return;const t=this.sequenceString.split("|");for(const i of t){const t=i[0],s=i.slice(1);"W"===t?await e.W(Number(s)):"D"!==t&&"R"!==t||await e[t]("1"===s)}}catch(e){throw new Error("Invalid custom reset sequence")}}}function Aa(e){return e&&e.__esModule&&Object.prototype.hasOwnProperty.call(e,"default")?e.default:e}var ga,ua;var _a=Aa(ua?ga:(ua=1,ga=function(e){return atob(e)}));async function pa(e,t){let i;switch(e){case"ESP32":i=await Promise.resolve().then(function(){return tc});break;case"ESP32-C2":i=await Promise.resolve().then(function(){return cc});break;case"ESP32-C3":i=await Promise.resolve().then(function(){return fc});break;case"ESP32-C5":i=await Promise.resolve().then(function(){return Bc});break;case"ESP32-C6":i=await Promise.resolve().then(function(){return Tc});break;case"ESP32-C61":i=await Promise.resolve().then(function(){return Gc});break;case"ESP32-H2":i=await Promise.resolve().then(function(){return jc});break;case"ESP32-P4":i=t&&t<300?await Promise.resolve().then(function(){return sh}):await Promise.resolve().then(function(){return dh});break;case"ESP32-S2":i=await Promise.resolve().then(function(){return Eh});break;case"ESP32-S3":i=await Promise.resolve().then(function(){return Ih});break;case"ESP8266":i=await Promise.resolve().then(function(){return Ph})}if(i)return{bss_start:i.bss_start,data:i.data,data_start:i.data_start,entry:i.entry,text:i.text,text_start:i.text_start,decodedData:fa(i.data),decodedText:fa(i.text)}}function fa(e){const t=_a(e).split("").map(function(e){return e.charCodeAt(0)});return new Uint8Array(t)}class wa{constructor(){this.FLASH_SIZES={"1MB":0,"2MB":16,"4MB":32,"8MB":48,"16MB":64,"32MB":80,"64MB":96,"128MB":112},this.FLASH_FREQUENCY={"80m":15,"40m":0,"26m":1,"20m":2}}getEraseSize(e,t){return t}}class Ea extends wa{constructor(){super(...arguments),this.CHIP_NAME="ESP8266",this.CHIP_DETECT_MAGIC_VALUE=[4293968129],this.EFUSE_RD_REG_BASE=1072693328,this.UART_CLKDIV_REG=1610612756,this.UART_CLKDIV_MASK=1048575,this.XTAL_CLK_DIVIDER=2,this.FLASH_WRITE_SIZE=16384,this.BOOTLOADER_FLASH_OFFSET=0,this.UART_DATE_REG_ADDR=0,this.FLASH_SIZES={"512KB":0,"256KB":16,"1MB":32,"2MB":48,"4MB":64,"2MB-c1":80,"4MB-c1":96,"8MB":128,"16MB":144},this.FLASH_FREQUENCY={"80m":15,"40m":0,"26m":1,"20m":2},this.MEMORY_MAP=[[1072693248,1072693264,"DPORT"],[1073643520,1073741824,"DRAM"],[1074790400,1074823168,"IRAM"],[1075843088,1076760592,"IROM"]],this.SPI_REG_BASE=1610613248,this.SPI_USR_OFFS=28,this.SPI_USR1_OFFS=32,this.SPI_USR2_OFFS=36,this.SPI_MOSI_DLEN_OFFS=0,this.SPI_MISO_DLEN_OFFS=0,this.SPI_W0_OFFS=64,this.getChipFeatures=async e=>{const t=["WiFi"];return"ESP8285"==await this.getChipDescription(e)&&t.push("Embedded Flash"),t}}async readEfuse(e,t){const i=this.EFUSE_RD_REG_BASE+4*t;return e.debug("Read efuse "+i),await e.readReg(i)}async getChipDescription(e){const t=await this.readEfuse(e,2);return!!(16&await this.readEfuse(e,0)|65536&t)?"ESP8285":"ESP8266EX"}async getCrystalFreq(e){const t=await e.readReg(this.UART_CLKDIV_REG)&this.UART_CLKDIV_MASK,i=e.transport.baudrate*t/1e6/this.XTAL_CLK_DIVIDER;let s;return s=i>33?40:26,Math.abs(s-i)>1&&e.info("WARNING: Detected crystal freq "+i+"MHz is quite different to normalized freq "+s+"MHz. Unsupported crystal in use?"),s}_d2h(e){const t=(+e).toString(16);return 1===t.length?"0"+t:t}async readMac(e){let t=await this.readEfuse(e,0);t>>>=0;let i=await this.readEfuse(e,1);i>>>=0;let s=await this.readEfuse(e,3);s>>>=0;const r=new Uint8Array(6);return 0!=s?(r[0]=s>>16&255,r[1]=s>>8&255,r[2]=255&s):i>>16&255?1==(i>>16&255)?(r[0]=172,r[1]=208,r[2]=116):e.error("Unknown OUI"):(r[0]=24,r[1]=254,r[2]=52),r[3]=i>>8&255,r[4]=255&i,r[5]=t>>24&255,this._d2h(r[0])+":"+this._d2h(r[1])+":"+this._d2h(r[2])+":"+this._d2h(r[3])+":"+this._d2h(r[4])+":"+this._d2h(r[5])}getEraseSize(e,t){return t}}Ea.IROM_MAP_START=1075838976,Ea.IROM_MAP_END=1076887552;var ma=Object.freeze({__proto__:null,ESP8266ROM:Ea});const ba=233;function ya(e,t){return e+(t-1-e%t)}function Ca(e,t){return e[t]|e[t+1]<<8|e[t+2]<<16|e[t+3]<<24}class va{constructor(e,t,i=null,s=0){this.addr=e,this.data=t,this.fileOffs=i,this.flags=s,this.includeInChecksum=!0,0!==this.addr&&this.padToAlignment(4)}copyWithNewAddr(e){return new va(e,this.data,0)}splitImage(e){const t=new va(this.addr,this.data.slice(0,e),0);return this.data=this.data.slice(e),this.addr+=e,this.fileOffs=null,t}toString(){let e=`len 0x${this.data.length.toString(16).padStart(5,"0")} load 0x${this.addr.toString(16).padStart(8,"0")}`;return null!==this.fileOffs&&(e+=` file_offs 0x${this.fileOffs.toString(16).padStart(8,"0")}`),e}getMemoryType(e){return e.ROM_LOADER.MEMORY_MAP.filter(e=>e[0]<=this.addr&&this.addr<e[1]).map(e=>e[2])}padToAlignment(e){this.data=ia(this.data,e,0)}}class Ba extends va{constructor(e,t,i,s){super(t,i,null,s),this.name=e}toString(){return`${this.name} ${super.toString()}`}}class Sa{constructor(e){this.SEG_HEADER_LEN=8,this.SHA256_DIGEST_LEN=32,this.ELF_FLAG_WRITE=1,this.ELF_FLAG_READ=2,this.ELF_FLAG_EXEC=4,this.segments=[],this.entrypoint=0,this.elfSha256=null,this.elfSha256Offset=0,this.padToSize=0,this.flashMode=0,this.flashSizeFreq=0,this.checksum=0,this.datalength=0,this.IROM_ALIGN=0,this.MMU_PAGE_SIZE_CONF=[],this.ROM_LOADER=e}loadCommonHeader(e,t,i){const s=e[t],r=e[t+1];if(this.flashMode=e[t+2],this.flashSizeFreq=e[t+3],this.entrypoint=Ca(e,t+4),s!==i)throw new Os(`Invalid firmware image magic=0x${s.toString(16)}`);return r}verify(){if(this.segments.length>16)throw new Os(`Invalid segment count ${this.segments.length} (max 16). Usually this indicates a linker script problem.`)}loadSegment(e,t,i=!1){const s=t,r=Ca(e,t),o=Ca(e,t+4);this.warnIfUnusualSegment(r,o,i);const n=e.slice(t+8,t+8+o);if(n.length<o)throw new Os(`End of file reading segment 0x${r.toString(16)}, length ${o} (actual length ${n.length})`);const a=new va(r,n,s);return this.segments.push(a),a}warnIfUnusualSegment(e,t,i){i||(e>1075838976||e<1073610752||t>65536)&&console.warn(`WARNING: Suspicious segment 0x${e.toString(16)}, length ${t}`)}maybePatchSegmentData(e,t){const i=e.length;if(this.elfSha256Offset>=t&&this.elfSha256Offset<t+i){const s=this.elfSha256Offset-t;if(s<this.SEG_HEADER_LEN||s+this.SHA256_DIGEST_LEN>i)throw new Os(`Cannot place SHA256 digest on segment boundary(elf_sha256_offset=${this.elfSha256Offset}, file_pos=${t}, segment_size=${i})`);const r=s-this.SEG_HEADER_LEN;if(!e.slice(r,r+this.SHA256_DIGEST_LEN).every(e=>0===e))throw new Os(`Contents of segment at SHA256 digest offset 0x${this.elfSha256Offset.toString(16)} are not all zero. Refusing to overwrite.`);if(!this.elfSha256||this.elfSha256.length!==this.SHA256_DIGEST_LEN)throw new Os("ELF SHA256 digest is not properly initialized");const o=e.slice(0,r),n=e.slice(r+this.SHA256_DIGEST_LEN),a=o.length+this.elfSha256.length+n.length,l=new Uint8Array(a);return l.set(o,0),l.set(this.elfSha256,o.length),l.set(n,o.length+this.elfSha256.length),l}return e}saveSegment(e,t,i,s=null){const r=this.maybePatchSegmentData(i.data,t),o=new DataView(e.buffer,t);return o.setUint32(0,i.addr,!0),o.setUint32(4,r.length,!0),e.set(r,t+8),null!==s?sa(r,s):0}saveFlashSegment(e,t,i,s=null){if("ESP32"===this.ROM_LOADER.CHIP_NAME){const e=(t+i.data.length+this.SEG_HEADER_LEN)%this.IROM_ALIGN;if(e<36){const t=new Uint8Array(i.data.length+(36-e));t.set(i.data),t.fill(0,i.data.length),i.data=t}}return this.saveSegment(e,t,i,s)}readChecksum(e,t){return e[ya(t,16)]}calculateChecksum(){let e=239;for(const t of this.segments)t.includeInChecksum&&(e=sa(t.data,e));return e}appendChecksum(e,t,i){e[ya(t,16)]=i}writeCommonHeader(e,t,i){e[t]=ba,e[t+1]=i,e[t+2]=this.flashMode,e[t+3]=this.flashSizeFreq;new DataView(e.buffer,t+4).setUint32(0,this.entrypoint,!0)}isIromAddr(e){return Ea.IROM_MAP_START<=e&&e<Ea.IROM_MAP_END}getIromSegment(){const e=this.segments.filter(e=>this.isIromAddr(e.addr));if(e.length>0){if(1!==e.length)throw new Os(`Found ${e.length} segments that could be irom0. Bad ELF file?`);return e[0]}return null}getNonIromSegments(){const e=this.getIromSegment();return this.segments.filter(t=>t!==e)}sortSegments(){this.segments.length&&this.segments.sort((e,t)=>e.addr-t.addr)}mergeAdjacentSegments(){if(!this.segments.length)return;const e=[];for(let t=this.segments.length-1;t>0;t--){const i=this.segments[t-1],s=this.segments[t];if(i.getMemoryType(this).join(",")===s.getMemoryType(this).join(",")&&i.includeInChecksum===s.includeInChecksum&&s.addr===i.addr+i.data.length&&(s.flags&this.ELF_FLAG_EXEC)===(i.flags&this.ELF_FLAG_EXEC)){const e=new Uint8Array(i.data.length+s.data.length);e.set(i.data),e.set(s.data,i.data.length),i.data=e}else e.unshift(s)}e.unshift(this.segments[0]),this.segments=e}setMmuPageSize(e){if(this.MMU_PAGE_SIZE_CONF||e===this.IROM_ALIGN){if(this.MMU_PAGE_SIZE_CONF&&!this.MMU_PAGE_SIZE_CONF.includes(e)){const t=this.MMU_PAGE_SIZE_CONF.map(e=>e/1024+"KB").join(", ");throw new Os(`${e} bytes is not a valid ${this.ROM_LOADER.CHIP_NAME} page size, select from ${t}.`)}this.IROM_ALIGN=e}else console.warn(`WARNING: Changing MMU page size is not supported on ${this.ROM_LOADER.CHIP_NAME}! `+(0!==this.IROM_ALIGN?`Defaulting to ${this.IROM_ALIGN/1024}KB.`:""))}}class Ia extends Sa{constructor(e,t=null,i=!0,s=!1){super(e),this.securePad=null,this.flashMode=0,this.flashSizeFreq=0,this.version=1,this.WP_PIN_DISABLED=238,this.wpPin=this.WP_PIN_DISABLED,this.clkDrv=0,this.qDrv=0,this.dDrv=0,this.csDrv=0,this.hdDrv=0,this.wpDrv=0,this.chipId=0,this.minRev=0,this.minRevFull=0,this.maxRevFull=0,this.storedDigest=null,this.calcDigest=null,this.dataLength=0,this.IROM_ALIGN=65536,this.ROM_LOADER=e,this.appendDigest=i,this.ramOnlyHeader=s,null!==t&&this.loadFromFile(t)}async loadFromFile(e){const t=e instanceof Uint8Array?e:ra(e);let i=0;const s=this.loadCommonHeader(t,i,ba);i+=8,this.loadExtendedHeader(t,i),i+=16;for(let e=0;e<s;e++){i+=8+this.loadSegment(t,i).data.length}if(this.checksum=this.readChecksum(t,i),i=ya(i,16),this.appendDigest){const e=i;this.storedDigest=t.slice(i,i+this.SHA256_DIGEST_LEN);const s=await crypto.subtle.digest("SHA-256",t.slice(0,e));this.calcDigest=new Uint8Array(s),this.dataLength=e-0}this.verify()}isFlashAddr(e){return this.ROM_LOADER.IROM_MAP_START<=e&&e<this.ROM_LOADER.IROM_MAP_END||this.ROM_LOADER.DROM_MAP_START<=e&&e<this.ROM_LOADER.DROM_MAP_END}async save(){let e=0;const t=new Uint8Array(1048576);let i=0;this.writeCommonHeader(t,i,this.segments.length),i+=8,this.saveExtendedHeader(t,i),i+=16;let s=239;const r=this.segments.filter(e=>this.isFlashAddr(e.addr)).sort((e,t)=>e.addr-t.addr),o=this.segments.filter(e=>!this.isFlashAddr(e.addr)).sort((e,t)=>e.addr-t.addr);for(let e=0;e<r.length;e++){const t=r[e];if(t instanceof Ba&&".flash.appdesc"===t.name){r.splice(e,1),r.unshift(t);break}}for(let e=0;e<o.length;e++){const t=o[e];if(t instanceof Ba&&".dram0.bootdesc"===t.name){o.splice(e,1),o.unshift(t);break}}if(r.length>0){let e=r[0].addr;for(const t of r.slice(1)){if(Math.floor(t.addr/this.IROM_ALIGN)===Math.floor(e/this.IROM_ALIGN))throw new Os(`Segment loaded at 0x${t.addr.toString(16)} lands in same 64KB flash mapping as segment loaded at 0x${e.toString(16)}. Can't generate binary. Suggest changing linker script or ELF to merge sections.`);e=t.addr}}if(this.ramOnlyHeader){for(const r of o)s=this.saveSegment(t,i,r,s),i+=8+r.data.length,e++;this.appendChecksum(t,i,s),i=ya(i,16);for(const o of r.reverse()){let r=this.getAlignmentDataNeeded(o,i);if(r>0){r<this.ROM_LOADER.BOOTLOADER_FLASH_OFFSET-this.SEG_HEADER_LEN&&(r+=this.IROM_ALIGN),r-=this.ROM_LOADER.BOOTLOADER_FLASH_OFFSET;const o=new va(0,new Uint8Array(r).fill(0),i);s=this.saveSegment(t,i,o,s),i+=8+r,e++}this.saveFlashSegment(t,i,o),i+=8+o.data.length,e++}}else{for(;r.length>0;){const n=r[0],a=this.getAlignmentDataNeeded(n,i);if(a>0){if(o.length>0&&a>this.SEG_HEADER_LEN){const e=o[0].splitImage(a);0===o[0].data.length&&o.shift(),s=this.saveSegment(t,i,e,s)}else{const e=new va(0,new Uint8Array(a).fill(0),i);s=this.saveSegment(t,i,e,s)}i+=8+a,e++}else{if((i+8)%this.IROM_ALIGN!==n.addr%this.IROM_ALIGN)throw new Error("Flash segment alignment mismatch");s=this.saveFlashSegment(t,i,n,s),r.shift(),i+=8+n.data.length,e++}}for(const r of o)s=this.saveSegment(t,i,r,s),i+=8+r.data.length,e++}if(this.securePad){if(!this.appendDigest)throw new Error("secure_pad only applies if a SHA-256 digest is also appended to the image");const r=(i+this.SEG_HEADER_LEN)%this.IROM_ALIGN,o=16;let n=0;"1"===this.securePad?n=112:"2"===this.securePad&&(n=32);const a=(this.IROM_ALIGN-r-o-n)%this.IROM_ALIGN,l=new va(0,new Uint8Array(a).fill(0),i);s=this.saveSegment(t,i,l,s),i+=8+a,e++}this.ramOnlyHeader||(this.appendChecksum(t,i,s),i=ya(i,16));const n=i;if(this.ramOnlyHeader?t[1]=o.length:t[1]=e,this.appendDigest){const e=await crypto.subtle.digest("SHA-256",t.slice(0,n)),s=new Uint8Array(e);t.set(s,n),i+=32}if(this.padToSize&&i%this.padToSize!==0){const e=this.padToSize-i%this.padToSize,s=new Uint8Array(e);s.fill(255),t.set(s,i),i+=e}return t}loadExtendedHeader(e,t){const i=new DataView(e.buffer,t);this.wpPin=i.getUint8(0);const s=i.getUint8(1);[this.clkDrv,this.qDrv]=this.splitByte(s);const r=i.getUint8(2);[this.dDrv,this.csDrv]=this.splitByte(r);const o=i.getUint8(3);[this.hdDrv,this.wpDrv]=this.splitByte(o),this.chipId=i.getUint8(4),this.chipId!==this.ROM_LOADER.IMAGE_CHIP_ID&&console.warn(`Unexpected chip id in image. Expected ${this.ROM_LOADER.IMAGE_CHIP_ID} but value was ${this.chipId}. Is this image for a different chip model?`),this.minRev=i.getUint8(5),this.minRevFull=i.getUint16(6,!0),this.maxRevFull=i.getUint16(8,!0);const n=i.getUint8(15);if(0!==n&&1!==n)throw new Error(`Invalid value for append_digest field (0x${n.toString(16)}). Should be 0 or 1.`);this.appendDigest=1===n}saveExtendedHeader(e,t){const i=new ArrayBuffer(16),s=new DataView(i);s.setUint8(0,this.wpPin),s.setUint8(1,this.joinByte(this.clkDrv,this.qDrv)),s.setUint8(2,this.joinByte(this.dDrv,this.csDrv)),s.setUint8(3,this.joinByte(this.hdDrv,this.wpDrv)),s.setUint8(4,this.ROM_LOADER.IMAGE_CHIP_ID),s.setUint8(5,this.minRev),s.setUint16(6,this.minRevFull,!0),s.setUint16(8,this.maxRevFull,!0);for(let e=9;e<15;e++)s.setUint8(e,0);s.setUint8(15,this.appendDigest?1:0),e.set(new Uint8Array(i),t)}splitByte(e){return[15&e,e>>4&15]}joinByte(e,t){return 15&e|(15&t)<<4}getAlignmentDataNeeded(e,t){const i=e.addr%this.IROM_ALIGN-this.SEG_HEADER_LEN;let s=this.IROM_ALIGN-t%this.IROM_ALIGN+i;return 0===s||s===this.IROM_ALIGN?0:(s-=this.SEG_HEADER_LEN,s<0&&(s+=this.IROM_ALIGN),s)}}class Da extends Sa{constructor(e,t=null){super(e),this.version=1,this.ROM_LOADER=e,this.flashMode=0,this.flashSizeFreq=0,null!==t&&this.loadFromFile(t)}loadFromFile(e){const t=e instanceof Uint8Array?e:ra(e);let i=0;const s=this.loadCommonHeader(t,i,ba);i+=8;for(let e=0;e<s;e++){i+=8+this.loadSegment(t,i).data.length}this.checksum=this.readChecksum(t,i),this.verify()}defaultOutputName(e){return e+"-"}}class xa extends Sa{constructor(e,t=null){super(e),this.version=2,this.ROM_LOADER=e,this.flashMode=0,this.flashSizeFreq=0,null!==t&&this.loadFromFile(t)}async loadFromFile(e){const t=e instanceof Uint8Array?e:ra(e);let i=0;const s=this.loadCommonHeader(t,i,xa.IMAGE_V2_MAGIC);i+=8,s!==xa.IMAGE_V2_SEGMENT&&console.warn(`Warning: V2 header has unexpected "segment" count ${s} (usually 4)`);const r=this.flashMode,o=this.flashSizeFreq,n=this.entrypoint,a=this.loadSegment(t,i,!0);a.addr=0,a.includeInChecksum=!1,i+=8+a.data.length;const l=this.loadCommonHeader(t,i,ba);i+=8,r!==this.flashMode&&console.warn(`WARNING: Flash mode value in first header (0x${r.toString(16)}) disagrees with second (0x${this.flashMode.toString(16)}). Using second value.`),o!==this.flashSizeFreq&&console.warn(`WARNING: Flash size/freq value in first header (0x${o.toString(16)}) disagrees with second (0x${this.flashSizeFreq.toString(16)}). Using second value.`),n!==this.entrypoint&&console.warn(`WARNING: Entrypoint address in first header (0x${n.toString(16)}) disagrees with second header (0x${this.entrypoint.toString(16)}). Using second value.`);for(let e=0;e<l;e++){i+=8+this.loadSegment(t,i).data.length}this.checksum=this.readChecksum(t,i),this.verify()}defaultOutputName(e){const t=this.getIromSegment();let i=0;null!==t&&(i=t.addr-Ea.IROM_MAP_START);return`${e.replace(/\.[^/.]+$/,"")}-0x${(-4096&i).toString(16).padStart(5,"0")}.bin`}}xa.IMAGE_V2_MAGIC=234,xa.IMAGE_V2_SEGMENT=4;class Ra extends Ia{constructor(e,t=null,i=!0,s=!1){super(e,t,i,s),this.ROM_LOADER=e}}class Ma extends Ia{constructor(e,t=null,i=!0,s=!1){super(e,t,i,s),this.ROM_LOADER=e}}class ka extends Ia{constructor(e,t=null,i=!0,s=!1){super(e,t,i,s),this.ROM_LOADER=e}}class Ta extends Ia{constructor(e,t=null,i=!0,s=!1){super(e,t,i,s),this.MMU_PAGE_SIZE_CONF=[16384,32768,65536],this.ROM_LOADER=e}}class Fa extends Ia{constructor(e,t=null,i=!0,s=!1){super(e,t,i,s),this.MMU_PAGE_SIZE_CONF=[8192,16384,32768,65536],this.ROM_LOADER=e}}class Pa extends Fa{constructor(e,t=null,i=!0,s=!1){super(e,t,i,s),this.ROM_LOADER=e}}class Ua extends Ia{constructor(e,t=null,i=!0,s=!1){super(e,t,i,s),this.ROM_LOADER=e}}class Oa extends Ia{constructor(e,t=null,i=!0,s=!1){super(e,t,i,s),this.ROM_LOADER=e}}class Qa extends Fa{constructor(e,t=null,i=!0,s=!1){super(e,t,i,s),this.ROM_LOADER=e}}async function za(e,t){const i=t instanceof Uint8Array?t:ra(t),s=e.CHIP_NAME.toLowerCase().replace(/[-()]/g,"");let r;if("esp8266"!==s)switch(s){case"esp32":r=Ia;break;case"esp32s2":r=Ra;break;case"esp32s3":r=Ma;break;case"esp32c3":r=ka;break;case"esp32c2":r=Ta;break;case"esp32c6":r=Fa;break;case"esp32c61":r=Pa;break;case"esp32c5":r=Ua;break;case"esp32h2":r=Qa;break;case"esp32p4":r=Oa;break;default:throw new Os(`Unsupported chip name: ${s}`)}else{const e=i[0];if(e===ba)r=Da;else{if(e!==xa.IMAGE_V2_MAGIC)throw new Os(`Invalid image magic number: ${e}`);r=xa}}const o=new r(e),n=o;if("function"==typeof n.loadFromFile){const e=n.loadFromFile(i);e instanceof Promise&&await e}return o}class Ha{constructor(e){var t,i,s,r,o,n,a,l;this.ESP_RAM_BLOCK=6144,this.ESP_FLASH_BEGIN=2,this.ESP_FLASH_DATA=3,this.ESP_FLASH_END=4,this.ESP_MEM_BEGIN=5,this.ESP_MEM_END=6,this.ESP_MEM_DATA=7,this.ESP_WRITE_REG=9,this.ESP_READ_REG=10,this.ESP_SPI_ATTACH=13,this.ESP_CHANGE_BAUDRATE=15,this.ESP_FLASH_DEFL_BEGIN=16,this.ESP_FLASH_DEFL_DATA=17,this.ESP_FLASH_DEFL_END=18,this.ESP_SPI_FLASH_MD5=19,this.ESP_ERASE_FLASH=208,this.ESP_ERASE_REGION=209,this.ESP_READ_FLASH=210,this.ESP_RUN_USER_CODE=211,this.ESP_IMAGE_MAGIC=233,this.ESP_CHECKSUM_MAGIC=239,this.ROM_INVALID_RECV_MSG=5,this.DEFAULT_TIMEOUT=3e3,this.ERASE_REGION_TIMEOUT_PER_MB=3e4,this.ERASE_WRITE_TIMEOUT_PER_MB=4e4,this.MD5_TIMEOUT_PER_MB=8e3,this.CHIP_ERASE_TIMEOUT=12e4,this.FLASH_READ_TIMEOUT=1e5,this.MAX_TIMEOUT=2*this.CHIP_ERASE_TIMEOUT,this.SPI_ADDR_REG_MSB=!0,this.CHIP_DETECT_MAGIC_REG_ADDR=1073745920,this.DETECTED_FLASH_SIZES={18:"256KB",19:"512KB",20:"1MB",21:"2MB",22:"4MB",23:"8MB",24:"16MB",25:"32MB",26:"64MB",27:"128MB",28:"256MB",32:"64MB",33:"128MB",34:"256MB",50:"256KB",51:"512KB",52:"1MB",53:"2MB",54:"4MB",55:"8MB",56:"16MB",57:"32MB",58:"64MB"},this.USB_JTAG_SERIAL_PID=4097,this.romBaudrate=115200,this.debugLogging=!1,this.syncStubDetected=!1,this.IS_STUB=!1,this.FLASH_WRITE_SIZE=16384,this.transport=e.transport,this.baudrate=e.baudrate,this.resetConstructors={classicReset:(e,t)=>new la(e,t),customReset:(e,t)=>new da(e,t),hardReset:(e,t)=>new ha(e,t),usbJTAGSerialReset:e=>new ca(e)},e.serialOptions&&(this.serialOptions=e.serialOptions),e.terminal&&(this.terminal=e.terminal,this.terminal.clean()),void 0!==e.debugLogging&&(this.debugLogging=e.debugLogging),e.port&&(this.transport=new na(e.port)),void 0!==e.enableTracing&&(this.transport.tracing=e.enableTracing),(null===(t=e.resetConstructors)||void 0===t?void 0:t.classicReset)&&(this.resetConstructors.classicReset=null===(i=e.resetConstructors)||void 0===i?void 0:i.classicReset),(null===(s=e.resetConstructors)||void 0===s?void 0:s.customReset)&&(this.resetConstructors.customReset=null===(r=e.resetConstructors)||void 0===r?void 0:r.customReset),(null===(o=e.resetConstructors)||void 0===o?void 0:o.hardReset)&&(this.resetConstructors.hardReset=null===(n=e.resetConstructors)||void 0===n?void 0:n.hardReset),(null===(a=e.resetConstructors)||void 0===a?void 0:a.usbJTAGSerialReset)&&(this.resetConstructors.usbJTAGSerialReset=null===(l=e.resetConstructors)||void 0===l?void 0:l.usbJTAGSerialReset),this.info("esptool.js"),this.info("Serial port "+this.transport.getInfo())}write(e,t=!0){this.terminal?t?this.terminal.writeLine(e):this.terminal.write(e):console.log(e)}error(e,t=!0){this.write(`Error: ${e}`,t)}info(e,t=!0){this.write(e,t)}debug(e,t=!0){this.debugLogging&&this.write(`Debug: ${e}`,t)}_shortToBytearray(e){return new Uint8Array([255&e,e>>8&255])}_intToByteArray(e){return new Uint8Array([255&e,e>>8&255,e>>16&255,e>>24&255])}_byteArrayToShort(e,t){return e|t>>8}_byteArrayToInt(e,t,i,s){return e|t<<8|i<<16|s<<24}_appendBuffer(e,t){const i=new Uint8Array(e.byteLength+t.byteLength);return i.set(new Uint8Array(e),0),i.set(new Uint8Array(t),e.byteLength),i.buffer}_appendArray(e,t){const i=new Uint8Array(e.length+t.length);return i.set(e,0),i.set(t,e.length),i}ui8ToBstr(e){let t="";for(let i=0;i<e.length;i++)t+=String.fromCharCode(e[i]);return t}bstrToUi8(e){const t=new Uint8Array(e.length);for(let i=0;i<e.length;i++)t[i]=e.charCodeAt(i);return t}async readPacket(e=null,t=this.DEFAULT_TIMEOUT){for(let i=0;i<100;i++){const i=await this.transport.read(t);if(!i||i.length<8)continue;const s=i[0];if(1!==s)continue;const r=i[1],o=this._byteArrayToInt(i[4],i[5],i[6],i[7]),n=i.slice(8);if(1==s){if(null==e||r==e)return[o,n];if(0!=n[0]&&n[1]==this.ROM_INVALID_RECV_MSG)throw this.transport.flushInput(),new Os("unsupported command error")}}throw new Os("invalid response")}async command(e=null,t=new Uint8Array(0),i=0,s=!0,r=this.DEFAULT_TIMEOUT){if(null!=e){this.transport.tracing&&this.transport.trace(`command op:0x${e.toString(16).padStart(2,"0")} data len=${t.length} wait_response=${s?1:0} timeout=${(r/1e3).toFixed(3)} data=${this.transport.hexConvert(t)}`);const o=new Uint8Array(8+t.length);let n;for(o[0]=0,o[1]=e,o[2]=this._shortToBytearray(t.length)[0],o[3]=this._shortToBytearray(t.length)[1],o[4]=this._intToByteArray(i)[0],o[5]=this._intToByteArray(i)[1],o[6]=this._intToByteArray(i)[2],o[7]=this._intToByteArray(i)[3],n=0;n<t.length;n++)o[8+n]=t[n];await this.transport.write(o)}return s?this.readPacket(e,r):[0,new Uint8Array(0)]}async readReg(e,t=this.DEFAULT_TIMEOUT){this.debug(`Read Register:${this.toHex(e)}`);const i=this._intToByteArray(e),s=await this.command(this.ESP_READ_REG,i,void 0,void 0,t);return this.debug(`Read Register Value:${s[0]}`),s[0]}async writeReg(e,t,i=4294967295,s=0,r=0){let o=this._appendArray(this._intToByteArray(e),this._intToByteArray(t));o=this._appendArray(o,this._intToByteArray(i)),o=this._appendArray(o,this._intToByteArray(s)),r>0&&(o=this._appendArray(o,this._intToByteArray(this.chip.UART_DATE_REG_ADDR)),o=this._appendArray(o,this._intToByteArray(0)),o=this._appendArray(o,this._intToByteArray(0)),o=this._appendArray(o,this._intToByteArray(r))),await this.checkCommand("write target memory",this.ESP_WRITE_REG,o)}async sync(){this.debug("Sync");const e=new Uint8Array(36);let t;for(e[0]=7,e[1]=7,e[2]=18,e[3]=32,t=0;t<32;t++)e[4+t]=85;try{let t=await this.command(8,e,void 0,void 0,100);this.syncStubDetected=0===t[0];for(let e=0;e<7;e++)t=await this.readPacket(8,100),this.syncStubDetected=this.syncStubDetected&&0===t[0];return t}catch(e){throw this.debug("Sync err "+e),e}}async _connectAttempt(e="default_reset",t){this.debug("_connect_attempt "+e),t&&await t.reset();const i=this.transport.peek(),s=Array.from(i,e=>String.fromCharCode(e)).join("").match(/boot:(0x[0-9a-fA-F]+)([\s\S]*?waiting for download)?/);let r=!1,o="",n=!1;s&&(r=!0,o=s[1],n=!!s[2]),this.debug(`bootMode:${o} downloadMode:${n}`);let a="";for(let e=0;e<5;e++)try{this.debug(`Sync connect attempt ${e}`),this.transport.flushInput();const t=await this.sync();return this.debug(t[0].toString()),"success"}catch(e){this.debug(`Error at sync ${e}`),a=e instanceof Error?e.message:"string"==typeof e?e:JSON.stringify(e)}return r&&(a=`Wrong boot mode detected (${o}).\n        This chip needs to be in download mode.`,n&&(a="Download mode successfully detected, but getting no sync reply:\n           The serial TX path seems to be down.")),a}constructResetSequence(e){if("no_reset"!==e)if("usb_reset"===e||this.transport.getPid()===this.USB_JTAG_SERIAL_PID){if(this.resetConstructors.usbJTAGSerialReset)return this.debug("using USB JTAG Serial Reset"),[this.resetConstructors.usbJTAGSerialReset(this.transport)]}else{const e=50,t=e+500;if(this.resetConstructors.classicReset)return this.debug("using Classic Serial Reset"),[this.resetConstructors.classicReset(this.transport,e),this.resetConstructors.classicReset(this.transport,t)]}return[]}async connect(e="default_reset",t=7,i=!0){let s;this.info("Connecting...",!1),await this.transport.connect(this.romBaudrate,this.serialOptions),this.transport.readLoop();const r=this.constructResetSequence(e);for(let i=0;i<t;i++){const t=r.length>0?r[i%r.length]:null;if(s=await this._connectAttempt(e,t),"success"===s)break}if("success"!==s)throw new Os("Failed to connect with the device");if(this.debug("Connect attempt successful."),this.info("\n\r",!1),i){const e=await this.readReg(this.CHIP_DETECT_MAGIC_REG_ADDR)>>>0;this.debug("Chip Magic "+e.toString(16));const t=await async function(e){switch(e){case 15736195:{const{ESP32ROM:e}=await Promise.resolve().then(function(){return Oh});return new e}case 203546735:case 1867591791:case 2084675695:{const{ESP32C2ROM:e}=await Promise.resolve().then(function(){return Hh});return new e}case 1763790959:case 456216687:case 1216438383:case 1130455151:{const{ESP32C3ROM:e}=await Promise.resolve().then(function(){return zh});return new e}case 752910447:{const{ESP32C6ROM:e}=await Promise.resolve().then(function(){return Lh});return new e}case 606167151:case 871374959:case 1333878895:{const{ESP32C61ROM:e}=await Promise.resolve().then(function(){return Nh});return new e}case 285294703:case 1675706479:case 1607549039:{const{ESP32C5ROM:e}=await Promise.resolve().then(function(){return Yh});return new e}case 3619110528:case 2548236392:{const{ESP32H2ROM:e}=await Promise.resolve().then(function(){return $h});return new e}case 9:{const{ESP32S3ROM:e}=await Promise.resolve().then(function(){return Kh});return new e}case 1990:{const{ESP32S2ROM:e}=await Promise.resolve().then(function(){return Jh});return new e}case 4293968129:{const{ESP8266ROM:e}=await Promise.resolve().then(function(){return ma});return new e}case 0:case 182303440:case 117676761:{const{ESP32P4ROM:e}=await Promise.resolve().then(function(){return Wh});return new e}default:return null}}(e);if(null===typeof this.chip)throw new Os(`Unexpected CHIP magic value ${e}. Failed to autodetect chip type.`);this.chip=t}}async detectChip(e="default_reset"){await this.connect(e),this.info("Detecting chip type... ",!1),null!=this.chip?this.info(this.chip.CHIP_NAME):this.info("unknown!")}async checkCommand(e="",t=null,i=new Uint8Array(0),s=0,r=0,o=this.DEFAULT_TIMEOUT){this.debug("check_command "+e);const n=await this.command(t,i,s,void 0,o);if(n&&n[1]&&n[1].length<r+2){const t=n[1].slice(0,2);throw 0!==t[0]?new Os(`Failed to ${e} failed with status ${t}`):new Os(`Failed to ${e}.\n Only got ${n[1].length} bytes of data.`)}const a=n[1].slice(r,r+2);if(0!==a[0])throw new Os(`Failed to ${e} failed with status ${a}`);return r>0?n[1].slice(0,r):n[0]}async memBegin(e,t,i,s){if(this.IS_STUB){const t=s,i=s+e,r=this.chip.getChipRevision?await this.chip.getChipRevision(this):void 0,o=await pa(this.chip.CHIP_NAME,r);if(o){const e=[[o.bss_start||o.data_start,o.data_start+o.decodedData.length],[o.text_start,o.text_start+o.decodedText.length]];for(const[s,r]of e)if(t<r&&i>s)throw new Os(`Software loader is resident at 0x${s.toString(16).padStart(8,"0")}-0x${r.toString(16).padStart(8,"0")}.\n            Can't load binary at overlapping address range 0x${t.toString(16).padStart(8,"0")}-0x${i.toString(16).padStart(8,"0")}.\n            Either change binary loading address, or use the no-stub option to disable the software loader.`)}}this.debug("mem_begin "+e+" "+t+" "+i+" "+s.toString(16));let r=this._appendArray(this._intToByteArray(e),this._intToByteArray(t));r=this._appendArray(r,this._intToByteArray(i)),r=this._appendArray(r,this._intToByteArray(s)),await this.checkCommand("enter RAM download mode",this.ESP_MEM_BEGIN,r)}checksum(e,t=this.ESP_CHECKSUM_MAGIC){for(let i=0;i<e.length;i++)t^=e[i];return t}async memBlock(e,t){let i=this._appendArray(this._intToByteArray(e.length),this._intToByteArray(t));i=this._appendArray(i,this._intToByteArray(0)),i=this._appendArray(i,this._intToByteArray(0)),i=this._appendArray(i,e);const s=this.checksum(e);await this.checkCommand("write to target RAM",this.ESP_MEM_DATA,i,s)}async memFinish(e){const t=0===e?1:0,i=this._appendArray(this._intToByteArray(t),this._intToByteArray(e));await this.checkCommand("leave RAM download mode",this.ESP_MEM_END,i,void 0,void 0,200)}async flashSpiAttach(e){const t=this._intToByteArray(e);await this.checkCommand("configure SPI flash pins",this.ESP_SPI_ATTACH,t)}timeoutPerMb(e,t){const i=e*(t/1e6);return i<3e3?3e3:i}async flashBegin(e,t){const i=Math.floor((e+this.FLASH_WRITE_SIZE-1)/this.FLASH_WRITE_SIZE),s=this.chip.getEraseSize(t,e),r=new Date,o=r.getTime();let n=3e3;0==this.IS_STUB&&(n=this.timeoutPerMb(this.ERASE_REGION_TIMEOUT_PER_MB,e)),this.debug("flash begin "+s+" "+i+" "+this.FLASH_WRITE_SIZE+" "+t+" "+e);let a=this._appendArray(this._intToByteArray(s),this._intToByteArray(i));a=this._appendArray(a,this._intToByteArray(this.FLASH_WRITE_SIZE)),a=this._appendArray(a,this._intToByteArray(t)),0==this.IS_STUB&&(a=this._appendArray(a,this._intToByteArray(0))),await this.checkCommand("enter Flash download mode",this.ESP_FLASH_BEGIN,a,void 0,void 0,n);const l=r.getTime();return 0!=e&&0==this.IS_STUB&&this.info("Took "+(l-o)/1e3+"."+(l-o)%1e3+"s to erase flash block"),i}async flashDeflBegin(e,t,i){const s=Math.floor((t+this.FLASH_WRITE_SIZE-1)/this.FLASH_WRITE_SIZE),r=Math.floor((e+this.FLASH_WRITE_SIZE-1)/this.FLASH_WRITE_SIZE),o=new Date,n=o.getTime();let a,l;this.IS_STUB?(a=e,l=this.DEFAULT_TIMEOUT):(a=r*this.FLASH_WRITE_SIZE,l=this.timeoutPerMb(this.ERASE_REGION_TIMEOUT_PER_MB,a)),this.info("Compressed "+e+" bytes to "+t+"...");let c=this._appendArray(this._intToByteArray(a),this._intToByteArray(s));c=this._appendArray(c,this._intToByteArray(this.FLASH_WRITE_SIZE)),c=this._appendArray(c,this._intToByteArray(i)),"ESP32-S2"!==this.chip.CHIP_NAME&&"ESP32-S3"!==this.chip.CHIP_NAME&&"ESP32-C3"!==this.chip.CHIP_NAME&&"ESP32-C2"!==this.chip.CHIP_NAME||!1!==this.IS_STUB||(c=this._appendArray(c,this._intToByteArray(0))),await this.checkCommand("enter compressed flash mode",this.ESP_FLASH_DEFL_BEGIN,c,void 0,void 0,l);const h=o.getTime();return 0!=e&&!1===this.IS_STUB&&this.info("Took "+(h-n)/1e3+"."+(h-n)%1e3+"s to erase flash block"),s}async flashBlock(e,t,i){let s=this._appendArray(this._intToByteArray(e.length),this._intToByteArray(t));s=this._appendArray(s,this._intToByteArray(0)),s=this._appendArray(s,this._intToByteArray(0)),s=this._appendArray(s,e);const r=this.checksum(e);await this.checkCommand("write to target Flash after seq "+t,this.ESP_FLASH_DATA,s,r,void 0,i)}async flashDeflBlock(e,t,i){let s=this._appendArray(this._intToByteArray(e.length),this._intToByteArray(t));s=this._appendArray(s,this._intToByteArray(0)),s=this._appendArray(s,this._intToByteArray(0)),s=this._appendArray(s,e);const r=this.checksum(e);this.debug("flash_defl_block "+e[0].toString(16)+" "+e[1].toString(16)),await this.checkCommand("write compressed data to flash after seq "+t,this.ESP_FLASH_DEFL_DATA,s,r,void 0,i)}async flashFinish(e=!1,t=this.DEFAULT_TIMEOUT){const i=e?0:1,s=this._intToByteArray(i);await this.checkCommand("leave Flash mode",this.ESP_FLASH_END,s,void 0,void 0,t)}async flashDeflFinish(e=!1,t=this.DEFAULT_TIMEOUT){const i=e?0:1,s=this._intToByteArray(i);await this.checkCommand("leave compressed flash mode",this.ESP_FLASH_DEFL_END,s,void 0,void 0,t)}async runSpiflashCommand(e,t,i,s=null,r=0,o=0){const n=1<<30,a=this.chip.SPI_REG_BASE,l=a+0,c=a+4,h=a+this.chip.SPI_USR_OFFS,d=a+this.chip.SPI_USR1_OFFS,A=a+this.chip.SPI_USR2_OFFS,g=a+this.chip.SPI_W0_OFFS;let u;u=null!=this.chip.SPI_MOSI_DLEN_OFFS?async(e,t)=>{const i=a+this.chip.SPI_MOSI_DLEN_OFFS,s=a+this.chip.SPI_MISO_DLEN_OFFS;e>0&&await this.writeReg(i,e-1),t>0&&await this.writeReg(s,t-1);let n=0;o>0&&(n|=o-1),r>0&&(n|=r-1<<p),n&&await this.writeReg(d,n)}:async(e,t)=>{const i=d;let s=(0===t?0:t-1)<<8|(0===e?0:e-1)<<17;o>0&&(s|=o-1),r>0&&(s|=r-1<<p),await this.writeReg(i,s)};const _=1<<18,p=26;if(i>32)throw new Os("Reading more than 32 bits back from a SPI flash operation is unsupported");if(t.length>64)throw new Os("Writing more than 64 bytes of data with one SPI command is unsupported");const f=8*t.length,w=await this.readReg(h),E=await this.readReg(A);let m=1<<31;i>0&&(m|=268435456),f>0&&(m|=134217728),r>0&&(m|=n),o>0&&(m|=536870912),await u(f,i),await this.writeReg(h,m);let b,y=7<<28|e;if(await this.writeReg(A,y),s&&r>0&&(this.SPI_ADDR_REG_MSB&&(s<<=32-r),await this.writeReg(c,s)),0==f)await this.writeReg(g,0);else{t=ia(t,4,0);const e=[];for(let i=0;i<t.length;i+=4)e.push((t[i]|t[i+1]<<8|t[i+2]<<16|t[i+3]<<24)>>>0);let i=g;for(const t of e)await this.writeReg(i,t),i+=4}for(await this.writeReg(l,_),b=0;b<10&&(y=await this.readReg(l)&_,0!=y);b++);if(10===b)throw new Os("SPI command did not complete in time");const C=await this.readReg(g);return await this.writeReg(h,w),await this.writeReg(A,E),C}async readFlashId(){const e=new Uint8Array(0);return await this.runSpiflashCommand(159,e,24)}async eraseFlash(){this.info("Erasing flash (this may take a while)...");let e=new Date;const t=e.getTime(),i=await this.checkCommand("erase flash",this.ESP_ERASE_FLASH,void 0,void 0,void 0,this.CHIP_ERASE_TIMEOUT);e=new Date;const s=e.getTime();return this.info("Chip erase completed successfully in "+(s-t)/1e3+"s"),i}toHex(e){return Array.prototype.map.call(e,e=>("00"+e.toString(16)).slice(-2)).join("")}async flashMd5sum(e,t){const i=this.timeoutPerMb(this.MD5_TIMEOUT_PER_MB,t);let s=this._appendArray(this._intToByteArray(e),this._intToByteArray(t));s=this._appendArray(s,this._intToByteArray(0)),s=this._appendArray(s,this._intToByteArray(0));const r=this.IS_STUB?16:32,o=await this.checkCommand("calculate md5sum",this.ESP_SPI_FLASH_MD5,s,void 0,r,i);return this.toHex(o)}async readFlash(e,t,i=null){let s=this._appendArray(this._intToByteArray(e),this._intToByteArray(t));s=this._appendArray(s,this._intToByteArray(4096)),s=this._appendArray(s,this._intToByteArray(1024));const r=await this.checkCommand("read flash",this.ESP_READ_FLASH,s);if(0!=r)throw new Os("Failed to read memory: "+r);let o=new Uint8Array(0);for(;o.length<t;){const e=await this.transport.read(this.FLASH_READ_TIMEOUT);if(!(e instanceof Uint8Array))throw new Os("Failed to read memory: "+e);e.length>0&&(o=this._appendArray(o,e),await this.transport.write(this._intToByteArray(o.length)),i&&i(e,o.length,t))}return o}async runStub(){if(this.syncStubDetected)return this.info("Stub is already running. No upload is necessary."),this.chip;this.info("Uploading stub...");const e=this.chip.getChipRevision?await this.chip.getChipRevision(this):void 0,t=await pa(this.chip.CHIP_NAME,e);if(void 0===t)throw this.debug("Error loading Stub json"),new Error("Error loading Stub json");const i=[t.decodedText,t.decodedData];for(let e=0;e<i.length;e++)if(i[e]){const s=0===e?t.text_start:t.data_start,r=i[e].length,o=Math.floor((r+this.ESP_RAM_BLOCK-1)/this.ESP_RAM_BLOCK);await this.memBegin(r,o,this.ESP_RAM_BLOCK,s);for(let t=0;t<o;t++){const s=t*this.ESP_RAM_BLOCK,r=s+this.ESP_RAM_BLOCK;await this.memBlock(i[e].slice(s,r),t)}}this.info("Running stub..."),await this.memFinish(t.entry);const s=await this.transport.read(this.DEFAULT_TIMEOUT),r=String.fromCharCode(...s);if("OHAI"!==r)throw new Os(`Failed to start stub. Unexpected response ${r}`);return this.info("Stub running..."),this.IS_STUB=!0,this.chip}async changeBaud(){this.info("Changing baudrate to "+this.baudrate);const e=this.IS_STUB?this.romBaudrate:0,t=this._appendArray(this._intToByteArray(this.baudrate),this._intToByteArray(e));await this.command(this.ESP_CHANGE_BAUDRATE,t),this.info("Changed"),this.info("If the chip does not respond to any further commands, consider using a lower baud rate."),await oa(50),await this.transport.disconnect(),await oa(50),await this.transport.connect(this.baudrate,this.serialOptions),await oa(50),this.transport.readLoop()}async main(e="default_reset"){await this.detectChip(e);const t=await this.chip.getChipDescription(this);if(this.chip.getChipRevision){const e=await this.chip.getChipRevision(this);this.info("Chip Revision: "+e)}this.info("Chip is "+t),this.info("Features: "+await this.chip.getChipFeatures(this)),this.info("Crystal is "+await this.chip.getCrystalFreq(this)+"MHz"),this.info("MAC: "+await this.chip.readMac(this)),await this.chip.readMac(this),void 0!==this.chip.postConnect&&await this.chip.postConnect(this),await this.runStub(),this.romBaudrate!==this.baudrate&&await this.changeBaud();try{const e=await this.readFlashId();this.info("Flash ID: "+e.toString(16)),16777215!==e&&0!==e||this.info("WARNING: Failed to communicate with the flash chip,\nread/write operations will fail.\nTry checking the chip connections or removing\nany other hardware connected to IOs.")}catch(e){throw new Os("Unable to verify flash chip connection "+e)}return t}flashSizeBytes(e){let t=-1;return this.transport.trace(`Flash size string ${e}`),-1!==e.toString().indexOf("KB")?t=1024*parseInt(e.toString().slice(0,e.toString().indexOf("KB"))):-1!==e.toString().indexOf("MB")&&(t=1024*parseInt(e.toString().slice(0,e.toString().indexOf("MB")))*1024),this.transport.trace(`Flash size in bytes ${t}`),t}parseFlashSizeArg(e){if(void 0===this.chip.FLASH_SIZES[e])throw new Os("Flash size "+e+" is not supported by this chip type. Supported sizes: "+this.chip.FLASH_SIZES);return this.chip.FLASH_SIZES[e]}async _updateImageFlashParams(e,t,i="keep",s="keep",r="keep"){if(this.debug(`_update_image_flash_params ${r} ${i} ${s}`),e.length<8)return e;if(t!=this.chip.BOOTLOADER_FLASH_OFFSET)return e;if("keep"===r&&"keep"===i&&"keep"===s)return this.info("Not changing the image"),e;const o=e[0];let n=e[2];const a=e[3];if(o!==this.ESP_IMAGE_MAGIC)return this.info("Warning: Image file at 0x"+t.toString(16)+" doesn't look like an image file, so not changing any flash settings."),e;try{(await za(this.chip,e)).verify()}catch(i){return this.debug(`Warning: Image file at 0x${t.toString(16)} is not a valid ${this.chip.CHIP_NAME} image, so not changing any flash settings.`),e}const l="ESP8266"!==this.chip.CHIP_NAME&&49===e[23];if("keep"!==i){n={qio:0,qout:1,dio:2,dout:3}[i]}let c=15&a;if("keep"!==s){c={"40m":0,"26m":1,"20m":2,"80m":15}[s]}let h=240&a;if("keep"!==r)if("detect"===r){this.info("Configuring flash size...");const e=await this.detectFlashSize();this.info("Detected flash size set to "+e),h=this.parseFlashSizeArg(e)}else h=this.parseFlashSizeArg(r);const d=n<<8|c+h;this.info("Flash params set to "+d.toString(16));const A=new Uint8Array(e);if(e[2]!==n&&(A[2]=n),e[3]!==c+h&&(A[3]=c+h),l){const e=await za(this.chip,A),t=A.slice(0,e.datalength),i=A.slice(e.datalength+e.SHA256_DIGEST_LEN),s=await crypto.subtle.digest("SHA-256",i),r=new Uint8Array(s),o=new Uint8Array(t.length+r.length+i.length);o.set(t,0),o.set(r,t.length),o.set(i,t.length+r.length);const n=o.slice(e.datalength,e.datalength+e.SHA256_DIGEST_LEN);return this.transport.hexify(r)===this.transport.hexify(n)?this.info("SHA digest in image updated"):this.info(`WARNING: SHA recalculation for binary failed!\n\tExpected calculated SHA: ${this.transport.hexify(r)}\n\tSHA stored in binary:    ${this.transport.hexify(n)}`),o}return A}async writeFlash(e){if(this.debug("EspLoader program"),"keep"!==e.flashSize){const t=this.flashSizeBytes(e.flashSize);for(let i=0;i<e.fileArray.length;i++)if(e.fileArray[i].data.length+e.fileArray[i].address>t)throw new Os(`File ${i+1} doesn't fit in the available flash`)}let t,i;!0===this.IS_STUB&&!0===e.eraseAll&&await this.eraseFlash();for(let s=0;s<e.fileArray.length;s++){if(this.debug("Data Length "+e.fileArray[s].data.length),t=e.fileArray[s].data,this.debug("Image Length "+t.length),0===t.length){this.debug("Warning: File is empty");continue}t=ia(t,4),i=e.fileArray[s].address,t=await this._updateImageFlashParams(t,i,e.flashMode,e.flashFreq,e.flashSize);let r=null;e.calculateMD5Hash&&(r=e.calculateMD5Hash(t),this.debug("Image MD5 "+r));const o=t.length;let n;if(e.compress){t=ea(t,{level:9}),n=await this.flashDeflBegin(o,t.length,i)}else n=await this.flashBegin(o,i);let a=0,l=0;const c=t.length;e.reportProgress&&e.reportProgress(s,0,c);let h=new Date;const d=h.getTime();let A=5e3;const g=new ta({chunkSize:1});let u=0;g.onData=function(e){u+=e.byteLength};let _=0;for(;_<t.length;){this.debug("Write loop "+i+" "+a+" "+n),this.info("Writing at 0x"+(i+u).toString(16)+"... ("+Math.floor(100*(a+1)/n)+"%)");const r=Math.min(this.FLASH_WRITE_SIZE,t.length-_),o=t.slice(_,_+r),h=_+r>=t.length;if(!e.compress)throw new Os("Yet to handle Non Compressed writes");{const e=u;g.push(o,h);const t=u-e;let i=3e3;this.timeoutPerMb(this.ERASE_WRITE_TIMEOUT_PER_MB,t)>3e3&&(i=this.timeoutPerMb(this.ERASE_WRITE_TIMEOUT_PER_MB,t)),!1===this.IS_STUB&&(A=i),await this.flashDeflBlock(o,a,A),this.IS_STUB&&(A=i)}l+=o.length,_+=r,a++,e.reportProgress&&e.reportProgress(s,l,c)}this.IS_STUB&&(e.compress?await this.flashDeflFinish(!1,A):await this.flashFinish(!1,A)),h=new Date;const p=h.getTime()-d;if(e.compress&&this.info("Wrote "+o+" bytes ("+l+" compressed) at 0x"+i.toString(16)+" in "+p/1e3+" seconds."),r){this.info("File  md5: "+r);const e=await this.flashMd5sum(i,o);if(this.info("Flash md5: "+e),new String(e).valueOf()!=new String(r).valueOf())throw new Os("MD5 of file does not match data in flash!");this.info("Hash of data verified.")}}this.info("Leaving...")}async flashId(){this.debug("flash_id");const e=await this.readFlashId();this.info("Manufacturer: "+(255&e).toString(16));const t=e>>16&255;this.info("Device: "+(e>>8&255).toString(16)+t.toString(16)),this.info("Detected flash size: "+this.DETECTED_FLASH_SIZES[t])}async detectFlashSize(){this.debug("detectFlashSize");const e=await this.readFlashId()>>16&255;let t=this.DETECTED_FLASH_SIZES[e];return t?this.info("Auto-detected Flash size: "+t):(t="4MB",this.info("Could not auto-detect Flash size. defaulting to 4MB")),t}async softReset(e){if(this.IS_STUB){if("ESP8266"!=this.chip.CHIP_NAME)throw new Os("Soft resetting is currently only supported on ESP8266");e?(await this.flashBegin(0,0),await this.flashFinish(!0)):await this.command(this.ESP_RUN_USER_CODE,void 0,void 0,!1)}else{if(e)return;await this.flashBegin(0,0),await this.flashFinish(!1)}}async after(e="hard_reset",t,i){switch(e){case"hard_reset":if(this.resetConstructors.hardReset){this.info("Hard resetting via RTS pin...");const e=this.resetConstructors.hardReset(this.transport,t);await e.reset()}break;case"soft_reset":this.info("Soft resetting..."),await this.softReset(!1);break;case"no_reset_stub":this.info("Staying in flasher stub.");break;case"custom_reset":if(i||this.info("Custom reset sequence not provided, doing nothing."),this.resetConstructors.customReset||this.info("Custom reset constructor not available, doing nothing."),this.resetConstructors.customReset&&i){this.info("Custom resetting using sequence "+i);const e=this.resetConstructors.customReset(this.transport,i);await e.reset()}break;default:this.info("Staying in bootloader."),this.IS_STUB&&this.softReset(!0)}}}const Ga=[73,77,80,82,79,86],La=Ga.length+3+255+1;new TextDecoder("utf-8",{fatal:!1});const Na=new WeakMap;function Ya(e){Na.delete(e);try{e.releaseLock()}catch{}}function $a(e,t){const i=Ga.length+1+1+1+t.length+1+1,s=new Uint8Array(i);let r=0;for(const e of Ga)s[r++]=e;s[r++]=1,s[r++]=e,s[r++]=t.length;for(const e of t)s[r++]=e;let o=0;for(let e=0;e<r;e++)o=o+s[e]&255;return s[r++]=o,s[r]=10,s}function Ka(){return $a(3,[4,0])}function Ja(){return $a(3,[2,0])}function Wa(e){switch(e.type){case 1:{const t=e.data[0];return`CURRENT_STATE ${2===t?"AUTHORIZED":4===t?"PROVISIONED":`state=0x${t?.toString(16).padStart(2,"0")}`}`}case 2:{const t=e.data[0];return`ERROR_STATE 0x${t?.toString(16).padStart(2,"0")}`}case 3:{const t=e.data[0];return`RPC_COMMAND 0x${t?.toString(16).padStart(2,"0")}`}case 4:{const t=e.data[0],i=2===t?"GET_CURRENT_STATE":3===t?"GET_DEVICE_INFO":4===t?"WIFI_SCAN":1===t?"WIFI_SETTINGS":`cmd=0x${t?.toString(16).padStart(2,"0")}`;if((2===t||1===t)&&e.data.length>=3){const t=e.data[2];if(e.data.length>=3+t){return`RPC_RESULT ${i} url="${(new TextDecoder).decode(e.data.slice(3,3+t))}"`}}return`RPC_RESULT ${i} (${e.data.length} bytes)`}default:return`type=0x${e.type.toString(16).padStart(2,"0")} (${e.data.length} bytes)`}}function ja(e){const t=[],i=Ga.length,s=Ga[0];let r=e.indexOf(s);if(r<0)return{packets:t,consumed:0};let o=0;for(;r>=0&&r<=e.length-i;){let n=!0;for(let t=0;t<i;t++)if(e[r+t]!==Ga[t]){n=!1;break}if(!n){r=e.indexOf(s,r+1);continue}const a=r+i;if(a+3>=e.length)break;const l=e[a+1],c=e[a+2],h=a+3+c+1;if(h>e.length)break;let d=0;for(let t=r;t<h-1;t++)d=d+e[t]&255;if(d!==e[h-1]){r=e.indexOf(s,r+1);continue}const A=e.slice(a+3,a+3+c);t.push({type:l,data:A}),r=h,r<e.length&&10===e[r]&&r++,o=r,r=e.indexOf(s,r)}return{packets:t,consumed:o}}async function Va(e,t){await e.write(t)}async function Za(e,t,i){const s=i??[],r=Date.now()+t,o=Symbol();for(;Date.now()<r;){const t=r-Date.now();if(t<=0)break;let i,n,a=Na.get(e);a||(a=e.read(),Na.set(e,a));try{n=await Promise.race([a,new Promise(e=>{i=setTimeout(()=>e(o),t)})])}catch(t){throw Na.delete(e),t}finally{clearTimeout(i)}if(n===o)break;Na.delete(e);const l=n;if(l.value){for(let e=0;e<l.value.length;e++)s.push(l.value[e]);const{packets:e,consumed:t}=ja(new Uint8Array(s));if(e.length>0){for(const t of e)console.debug(`[improv] ${Wa(t)}`);return s.splice(0,t),{packets:e,buffer:s}}Xa(s)}if(l.done)throw Object.assign(new Error("serial port closed"),{errorKey:"flasher.errors.port_closed"})}throw Object.assign(new Error("timeout"),{errorKey:"flasher.errors.timeout"})}function Xa(e){if(e.length<=La)return;const t=e.length-La;let i=e.length;for(let s=t;s<e.length;s++){if(e[s]!==Ga[0])continue;let t=!0;for(let i=1;i<Ga.length&&s+i<e.length;i++)if(e[s+i]!==Ga[i]){t=!1;break}if(t){i=s;break}}e.splice(0,i)}function qa(e){if(0===e.length)return null;const t=new TextDecoder;let i=0;const s=(s=Number.POSITIVE_INFINITY)=>{if(i>=e.length)return null;const r=e[i++];if(i+r>e.length)return null;const o=Math.min(r,s),n=t.decode(e.slice(i,i+o));return i+=r,n},r=s(32);if(null===r)return null;const o=s();if(null===o)return null;const n=s();if(null===n)return null;const a=Number.parseInt(o,10);if(Number.isNaN(a))return null;return{ssid:r.replace(/[\x00-\x1f\x7f]/g,""),rssi:a,authRequired:"YES"===n}}const el=/MAC:\s*([0-9A-Fa-f:]{17})/;async function tl(e,t){if(!e.readable)try{await e.open({baudRate:115200})}catch{throw Object.assign(new Error("Could not open serial port. Unplug the device, plug it back in, and try again."),{errorKey:"usb.errors.port_open_failed"})}try{await e.setSignals({dataTerminalReady:!1,requestToSend:!0}),await new Promise(e=>setTimeout(e,200)),await e.setSignals({dataTerminalReady:!1,requestToSend:!1})}catch{}const i=t?.drainDelay??200,s=e.readable.getReader();await async function(e,t){const i=Date.now()+t;for(;Date.now()<i;){const t=i-Date.now();if(t<=0)break;await Promise.race([e.read(),new Promise(e=>setTimeout(e,t))])}}(s,i),Ya(s);const r=e.writable.getWriter(),o=t?.handshakeRetryDelay??2e3,n=t?.handshakeDelay??3e3;let a=!1;for(let t=0;t<5;t++){t>0&&await new Promise(e=>setTimeout(e,o));try{await Va(r,Ja());const t=e.readable.getReader();try{await Za(t,n),a=!0}finally{Ya(t)}}catch{}if(a)break}if(!a)throw r.releaseLock(),Object.assign(new Error("No response from device — it may be flashed with ethernet firmware which does not support WiFi configuration."),{errorKey:"usb.errors.no_device_response"});return r}async function il(e,t){const i=await tl(e,t);try{const s=$a(3,[3,0]);await Va(i,s),await new Promise(e=>setTimeout(e,500));for(let s=0;s<3;s++){s>0&&await new Promise(e=>setTimeout(e,t?.retryDelay??3e3));const r=Ka();await Va(i,r);const o=e.readable.getReader(),n=[],a=Date.now()+5e3,l=[];let c=!1;for(;Date.now()<a&&!c;)try{const e=await Za(o,a-Date.now(),l);for(const t of e.packets)if(4===t.type&&4===t.data[0]){const e=qa(t.data.slice(2,2+t.data[1]));if(null===e){if(c=!0,n.length>0)return{writer:i,reader:o,networks:n};break}n.push(e)}}catch{break}if(n.length>0)return{writer:i,reader:o,networks:n};Ya(o)}return{writer:i,reader:e.readable.getReader(),networks:[]}}catch(e){try{i.releaseLock()}catch{}throw e}}async function sl(e,t,i){await Va(e,function(e,t){const i=new TextEncoder,s=i.encode(e),r=i.encode(t);if(s.length>32)throw Object.assign(new Error(`SSID is too long: ${s.length} bytes (max 32)`),{errorKey:"wifi.errors.ssid_too_long"});if(r.length>64)throw Object.assign(new Error(`Password is too long: ${r.length} bytes (max 64)`),{errorKey:"wifi.errors.password_too_long"});return $a(3,[1,1+s.length+1+r.length,s.length,...s,r.length,...r])}(t,i))}const rl=1e3;async function ol(e,t,i,s){const r=new TextDecoder,o=/(\d+\.\d+\.\d+\.\d+)/,n=Date.now()+i,a=s?.initialBuffer??[];let l=0,c=s?.startPolling??!1;const h=s?.signal;for(console.debug(`[detectIpAddress] enter timeout=${i}ms initialBuffer=${a.length}B startPolling=${c}`);Date.now()<n;){if(h?.aborted)throw console.debug("[detectIpAddress] aborted via signal"),Object.assign(new Error("aborted"),{errorKey:"flasher.errors.aborted"});c&&Date.now()-l>=rl&&(console.debug("[detectIpAddress] polling GET_CURRENT_STATE"),await Va(t,Ja()),l=Date.now());try{const t=Math.min(rl,n-Date.now()),i=await Za(e,t,a);for(const e of i.packets){if(2===e.type){const t=e.data[0],i={1:"Invalid command — device may need to be power-cycled",2:"Unknown command",3:"WiFi connection failed — check SSID/password and try again",4:"Not authorized"},s={1:"wifi.errors.invalid_command",2:"wifi.errors.unknown_command",3:"wifi.errors.connection_failed",4:"wifi.errors.not_authorized"}[t]??"wifi.errors.error_code";throw console.debug(`[detectIpAddress] ERROR_STATE code=${t} → ${s}`),Object.assign(new Error(i[t]??`WiFi error (code ${t})`),{errorKey:s,errorParams:"wifi.errors.error_code"===s?{code:t}:void 0})}if(4===e.type&&e.data.length>=3&&(1===e.data[0]||2===e.data[0])){const t=e.data[2];if(e.data.length<3+t){console.debug(`[detectIpAddress] truncated RPC_RESULT cmd=0x${e.data[0]?.toString(16)} urlLen=${t} dataLen=${e.data.length} — skipped`);continue}const i=r.decode(e.data.slice(3,3+t)),s=o.exec(i);if(s&&"0.0.0.0"!==s[1])return console.debug(`[detectIpAddress] exit: IP=${s[1]}`),s[1];s&&"0.0.0.0"===s[1]&&(c=!0)}}}catch(e){if(e instanceof Error&&"flasher.errors.timeout"!==e.errorKey)throw console.debug(`[detectIpAddress] exit: error "${e.message}"`),e}}throw console.debug("[detectIpAddress] exit: deadline exhausted, no IP received"),Object.assign(new Error("WiFi connection failed — check SSID/password and try again"),{errorKey:"wifi.errors.connection_failed"})}class nl{constructor(e){this._serialPort=null,this._serialReader=null,this._serialWriter=null,this._wifiCheckAbort=null,this._wifiCheckPromise=null,this._host=e}get serialPort(){return this._serialPort}set serialPort(e){this._serialPort=e}tearDownSerialPort(){try{this._serialReader?.releaseLock()}catch{}try{this._serialWriter?.releaseLock()}catch{}this._serialReader=null,this._serialWriter=null;const e=this._serialPort?.close().catch(()=>{})??Promise.resolve();return this._serialPort=null,e}async cancelAndTearDown(){const e=this._wifiCheckAbort,t=this._wifiCheckPromise;if(this._wifiCheckAbort=null,this._wifiCheckPromise=null,e?.abort(),t)try{await t}catch{}await this.tearDownSerialPort()}async handleUsbWifiConfig(){const e=this._host;if(e.opRunning)return void e.updateUsbState({step:"error",errorKey:"usb.errors.serial_port_busy",fatal:!0});const t=e.opId;e.opRunning=!0;try{if(this._serialPort||(e.updateUsbState({step:"connecting"}),this._serialPort=await navigator.serial.requestPort()),e.opId!==t)return void(e.opRunning=!1);e.updateUsbState({step:"wifi_scan"});const{writer:i,reader:s,networks:r}=await il(this._serialPort);if(e.opId!==t)return void(e.opRunning=!1);e.wifiNetworks=r,e.updateUsbState({step:"wifi_provision"}),this._serialWriter=i,this._serialReader=s,e.opRunning=!1}catch(i){if(e.opRunning=!1,e.opId!==t)return;if("NotFoundError"===i?.name)return void e.resetUsbState();const s=e.usbFlashState?.step,r=i;e.updateUsbState({step:"error",lastStep:s,errorKey:r.errorKey??"wifi.errors.scan_failed",errorParams:r.errorParams})}}async handleUsbFlash(e){const t=this._host;if(t.opRunning)return void t.updateUsbState({step:"error",errorKey:"usb.errors.serial_port_busy",fatal:!0});const i=t.opId;t.opRunning=!0;try{t.updateUsbState({step:"connecting"});const s=await navigator.serial.requestPort();if(t.opId!==i)return void(t.opRunning=!1);if(this._serialPort=s,t.updateUsbState({step:"flashing",progress:0}),await async function(e,t,i,s){const r=s?.accessToken?{headers:{Authorization:`Bearer ${s.accessToken}`}}:void 0,o=e.close.bind(e);e.close=async()=>{};const n=new na(e);try{let e;const o={clean:()=>{},writeLine:t=>{const i=el.exec(t);i&&(e=i[1].toUpperCase(),s?.onMac?.(e))},write:e=>{}},a=new Ha({transport:n,baudrate:115200,terminal:o});if(await a.main("default_reset"),s?.beforeFlash&&await s.beforeFlash(e),!s?.baseUrl)throw Object.assign(new Error("baseUrl is required for firmware download"),{errorKey:"usb.errors.base_url_required"});const l=`${s.baseUrl}/everything-presence-pro-${t}-manifest.json`,c=await fetch(l,r);if(!c.ok)throw Object.assign(new Error("Failed to download firmware manifest"),{errorKey:"usb.errors.manifest_download_failed"});const h=await c.json(),d=l.substring(0,l.lastIndexOf("/")+1),A=h.builds[0].parts,g=[];for(const e of A){const t=await fetch(`${d}${e.path}`,r);if(!t.ok)throw Object.assign(new Error(`Failed to download firmware file: ${e.path}`),{errorKey:"usb.errors.file_download_failed",errorParams:{file:e.path}});const i=new Uint8Array(await t.arrayBuffer());g.push({data:i,address:e.offset})}const u=new Uint8Array(8192);u.fill(255),g.push({data:u,address:36864});const _=g.reduce((e,t)=>e+t.data.length,0),p=[];{let e=0;for(const t of g)p.push(e),e+=t.data.length}await a.writeFlash({fileArray:g,flashSize:"keep",flashMode:"keep",flashFreq:"keep",eraseAll:!1,compress:!0,reportProgress:(e,t,s)=>{const r=s>0?t/s:1,o=(p[e]+r*g[e].data.length)/_;i(Math.round(100*o))}}),await a.after("hard_reset")}finally{try{await n.disconnect()}finally{e.close=o}}}(s,e,e=>{t.updateUsbState({step:"flashing",progress:e})},{baseUrl:t.firmwareBaseUrl,accessToken:t.hass?.auth?.accessToken,beforeFlash:async e=>{if(!e)return;const i=t.flashableDevices.find(t=>t.mac.toUpperCase()===e);if("original"===i?.firmware_type&&i?.esphome_config_entry_id){if(!(await(t.confirmDeleteOriginalFirmware?.())??!1))throw Object.assign(new Error("Flash cancelled"),{errorKey:"flasher.errors.flash_cancelled"});await t.deleteEsphomeDevice(i.esphome_config_entry_id)}}}),t.opId!==i)return void(t.opRunning=!1);if(e.startsWith("ethernet"))return await s.close().catch(()=>{}),this._serialPort=null,t.opRunning=!1,void t.updateUsbState({step:"complete",variant:e});t.updateUsbState({step:"wifi_check"});let r=null,o=null,n=null;try{const e=new AbortController;this._wifiCheckAbort=e;const t=async function(e,t,i){const s=await tl(e,t),r=e.readable.getReader(),o=i?.signal;try{console.debug("[queryImprovState] sending GET_CURRENT_STATE"),await Va(s,Ja());const e=t?.readDelay??3e3,i=Date.now(),n=[];let a;const l=i+Math.min(e,3e3);for(;Date.now()<l&&void 0===a&&!o?.aborted;){const e=l-Date.now();if(e<=0)break;try{const t=await Za(r,Math.min(e,500),n);for(const e of t.packets)1===e.type&&e.data.length>=1&&(a=e.data[0])}catch{}}if(o?.aborted)throw Object.assign(new Error("aborted"),{errorKey:"flasher.errors.aborted"});if(void 0===a)throw Object.assign(new Error("No Improv state received"),{errorKey:"usb.errors.no_device_response"});let c;if(4===a){const t=Math.max(0,i+e-Date.now());if(t>0){console.debug(`[queryImprovState] PROVISIONED — delegating to detectIpAddress (budget=${t}ms)`);try{c=await ol(r,s,t,{initialBuffer:n,startPolling:!0,signal:o})}catch(e){console.debug(`[queryImprovState] detectIpAddress gave up: ${e.message}`)}}}return console.debug(`[queryImprovState] exit: elapsed=${Date.now()-i}ms, stateByte=${a}, ip=${c}`),{state:4===a?"PROVISIONED":"AUTHORIZED",ip:c,writer:s,reader:r}}catch(e){try{s.releaseLock()}catch{}throw Ya(r),e}}(s,{readDelay:3e4},{signal:e.signal});this._wifiCheckPromise=t;const i=await t;if(this._wifiCheckAbort=null,this._wifiCheckPromise=null,"PROVISIONED"===i.state&&i.ip)r=i.ip,o=i.writer,n=i.reader;else{try{i.writer.releaseLock()}catch{}try{i.reader.releaseLock()}catch{}}}catch{}if(t.opId!==i)return void(t.opRunning=!1);if(r&&o&&n){try{n.releaseLock()}catch{}try{o.releaseLock()}catch{}return t.updateUsbState({step:"wifi_configured",ip:r,autoSkipped:!0}),t.opRunning=!1,void await this._addToHa(r)}t.updateUsbState({step:"wifi_scan"});const{writer:a,reader:l,networks:c}=await il(s);if(t.opId!==i)return void(t.opRunning=!1);t.wifiNetworks=c,t.updateUsbState({step:"wifi_provision"}),this._serialWriter=a,this._serialReader=l,t.opRunning=!1}catch(s){if(t.opId!==i)return void(t.opRunning=!1);if("NotFoundError"===s?.name)return void t.resetUsbState();const r=s;if("flasher.errors.flash_cancelled"===r.errorKey){if(this._serialPort){try{await this._serialPort.close().catch(()=>{})}catch{}this._serialPort=null}return t.opRunning=!1,void t.resetUsbState()}const o=t.usbFlashState?.step;if(this._serialPort){try{await this._serialPort.close().catch(()=>{})}catch{}this._serialPort=null}const n=r.message??"Unknown error",a=/already open|already closed/i.test(n),l=/stream stopped|NetworkError|disconnected|break|lost|No response from device/i.test(n),c=a?"usb.errors.serial_port_busy":l?"usb.errors.device_disconnected":"usb.errors.flash_failed";t.opRunning=!1,t.updateUsbState({step:"error",lastStep:o,variant:e,errorKey:r.errorKey??c,errorParams:r.errorParams,fatal:a||"usb.errors.serial_port_busy"===r.errorKey})}}async handleWifiProvision(e,t){const i=this._host,s=i.opId,r=this._serialPort;if(!r?.writable||!r?.readable)return void i.updateUsbState({step:"error",errorKey:"usb.errors.serial_port_unavailable"});try{this._serialReader?.releaseLock()}catch{}try{this._serialWriter?.releaseLock()}catch{}const o=r.writable.getWriter(),n=r.readable.getReader();this._serialWriter=o,this._serialReader=n;try{if(i.updateUsbState({step:"wifi_connecting"}),console.debug(`[wifi-provision] sending WIFI_SETTINGS ssid="${e}"`),await sl(o,e,t),i.opId!==s)return;i.updateUsbState({step:"reading_ip"});const a=await ol(n,o,6e4);if(i.opId!==s)return;n.releaseLock(),o.releaseLock(),this._serialReader=null,this._serialWriter=null,await r.close().catch(()=>{}),this._serialPort=null,i.updateUsbState({step:"wifi_configured",ip:a}),await this._addToHa(a)}catch(e){try{this._serialReader?.releaseLock()}catch{}try{this._serialWriter?.releaseLock()}catch{}if(this._serialReader=null,this._serialWriter=null,i.opId!==s)return;const t=i.usbFlashState?.step,r=e;i.updateUsbState({step:"error",lastStep:t,errorKey:r.errorKey??"wifi.errors.provisioning_failed",errorParams:r.errorParams})}}async _addToHaWithRetry(e){const t=this._host,i=t.opId;for(let s=1;s<=6;s++){if(s>1){t.updateUsbState({step:"wifi_configured",ip:e,haAddAttempt:s,haAddMaxAttempts:6});if(await this._sleepUntilOpChanges(1e4,i))return{type:"cannot_connect"}}let r;try{r=await t.addEsphomeDevice(e)}catch(e){const t=e?.message;return{type:"failed",reason:t??"unknown"}}if(t.opId!==i)return r;if("cannot_connect"!==r.type)return r}return{type:"cannot_connect"}}async _sleepUntilOpChanges(e,t){const i=this._host;let s=e;for(;s>0;){if(i.opId!==t)return!0;const e=Math.min(s,250);await new Promise(t=>setTimeout(t,e)),s-=e}return i.opId!==t}async _addToHa(e){const t=this._host,i=t.opId,s=await this._addToHaWithRetry(e);t.opId===i&&t.updateUsbState({step:"complete",ip:e,haAdd:s})}async handleRetryHaAdd(){const e=this._host,t=e.usbFlashState;if("complete"!==t?.step||!t.ip)return;const i=t.ip,s=e.opId;e.updateUsbState({step:"wifi_configured",ip:i});const r=await this._addToHaWithRetry(i);e.opId===s&&e.updateUsbState({step:"complete",ip:i,haAdd:r})}handleUsbRetry(){const e=this._host.usbFlashState,t=e?.lastStep,i=e?.variant;try{this._serialReader?.releaseLock()}catch{}try{this._serialWriter?.releaseLock()}catch{}this._serialReader=null,this._serialWriter=null;("connecting"===t||"flashing"===t||"wifi_check"===t)&&i?this.handleUsbFlash(i):this.handleUsbWifiConfig()}async handleFlasherCancel(){const e=this._host,t=e.usbFlashState;"wifi_configured"===t?.step&&t.ip&&e.setCancelledDeviceIpHint(t.ip),e.opRunning=!1,await e.resetUsbState()}async handleWifiScan(){const e=this._host;if(!this._serialPort)return;e.bumpOpId();const t=e.opId;try{e.updateUsbState({step:"wifi_scan"});try{this._serialReader?.releaseLock()}catch{}try{this._serialWriter?.releaseLock()}catch{}const i=await il(this._serialPort);if(e.opId!==t){try{i.reader.releaseLock()}catch{}try{i.writer.releaseLock()}catch{}return}this._serialWriter=i.writer,this._serialReader=i.reader,e.wifiNetworks=i.networks,e.updateUsbState({step:"wifi_provision"})}catch(i){if(e.opId!==t)return;console.error("WiFi scan failed:",i);const s=e.usbFlashState?.step,r=i;e.updateUsbState({step:"error",lastStep:s,errorKey:r.errorKey??"wifi.errors.scan_failed",errorParams:r.errorParams})}}}function al(e){if("string"!=typeof e||""===e)return"";if(e.startsWith("/")&&!e.startsWith("//"))return e;try{const t=new URL(e);return"https:"===t.protocol||"http:"===t.protocol?e:""}catch{return""}}class ll{constructor(e){this.flashableDevices=[],this.firmwareBaseUrl="",this.firmwareVersion="",this.integrationVersion="",this.loading=!0,this.usbConnected=!1,this.usbDeviceMac=null,this.usbExistingDevice=null,this.usbFlashState=null,this.wifiNetworks=[],this.otaStates={},this.cancelledDeviceIpHint=null,this._cancelledIpTimeout=null,this._hass=null,this._flow=new nl(this),this._opId=0,this._opRunning=!1,this._otaUnsubs={},this._otaTimeouts={},this._otaGen=0,this._deviceListGen=0,this._wantDeviceListSub=!1,this._host=e,e.addController(this)}hostConnected(){}hostDisconnected(){this._wantDeviceListSub=!1,this.unsubscribeDeviceList(),this._flow.tearDownSerialPort(),this._otaGen++;for(const e of Object.keys(this._otaUnsubs))this._unsubOta(e);for(const e of Object.keys(this._otaTimeouts))this._resetOtaTimeout(e);this.otaStates={},this._cancelledIpTimeout&&(clearTimeout(this._cancelledIpTimeout),this._cancelledIpTimeout=null)}_setOtaState(e,t){this.otaStates={...this.otaStates,[e]:t}}_deleteOtaState(e){if(!(e in this.otaStates))return;const{[e]:t,...i}=this.otaStates;this.otaStates=i}async startOta(e){if("updating"===this.otaStates[e]?.state)return;const t=this._otaGen;this._setOtaState(e,{state:"updating",progress:0,errorKey:null}),this._host.requestUpdate();try{await this._hass.callWS({type:"eppgrid/update_firmware",mac:e})}catch{if(this._otaGen!==t)return;return this._setOtaState(e,{state:"error",progress:null,errorKey:"flasher.errors.start_failed"}),void this._host.requestUpdate()}if(this._otaGen===t)try{const i=await this._hass.connection.subscribeMessage(t=>{this._handleOtaEvent(e,t)},{type:"eppgrid/subscribe_ota_progress",mac:e});if(this._otaGen!==t){try{i()}catch{}return}this._unsubOta(e),this._otaUnsubs[e]=i,this._startOtaTimeout(e,15e3)}catch{if(this._otaGen!==t)return;this._setOtaState(e,{state:"error",progress:null,errorKey:"flasher.errors.connect_failed"}),this._host.requestUpdate()}}_handleOtaEvent(e,t){switch(t.state){case"updating":{const i=t.progress??null;null!=i&&i>=100?this._otaSuccess(e):(this._setOtaState(e,{state:"updating",progress:i,errorKey:null}),this._startOtaTimeout(e,null!=i&&i>0?1e4:15e3));break}case"success":this._otaSuccess(e);break;case"error":{const i=t.error_key??"flasher.errors.update_failed_generic";this._setOtaState(e,{state:"error",progress:null,errorKey:i,...null!=t.message?{errorParams:{message:t.message}}:{}}),this._resetOtaTimeout(e),this._unsubOta(e);break}}this._host.requestUpdate()}_otaSuccess(e){this._setOtaState(e,{state:"success",progress:null,errorKey:null}),this._unsubOta(e),this._resetOtaTimeout(e),this._otaTimeouts[e]=setTimeout(()=>{delete this._otaTimeouts[e],"success"===this.otaStates[e]?.state&&(this._deleteOtaState(e),this._host.requestUpdate())},5e3)}_startOtaTimeout(e,t){this._resetOtaTimeout(e),this._otaTimeouts[e]=setTimeout(()=>{const t=this.otaStates[e];t&&"updating"===t.state&&(null!=t.progress&&t.progress>0?this._setOtaState(e,{state:"error",progress:null,errorKey:"flasher.errors.connection_lost"}):this._setOtaState(e,{state:"error",progress:null,errorKey:"flasher.errors.update_timeout"}),this._unsubOta(e),this._host.requestUpdate())},t)}_resetOtaTimeout(e){const t=this._otaTimeouts[e];t&&(clearTimeout(t),delete this._otaTimeouts[e])}dismissOtaError(e){this._unsubOta(e),this._resetOtaTimeout(e),this._deleteOtaState(e),this._host.requestUpdate()}_unsubOta(e){const t=this._otaUnsubs[e];if(t){try{t()}catch{}delete this._otaUnsubs[e]}}get hass(){return this._hass}set hass(e){const t=this._hass?.connection;if(this._hass=e,e?.connection&&e.connection!==t&&t){const e=this._wantDeviceListSub;this._unsubDeviceList=void 0,this._deviceListGen++,this._otaGen++;for(const e of Object.keys(this._otaUnsubs))delete this._otaUnsubs[e];for(const e of Object.keys(this._otaTimeouts))this._resetOtaTimeout(e);this.otaStates={},this._host.requestUpdate(),e&&this.subscribeDeviceList().catch(()=>{})}}async loadDevices(){if(!this._hass)return this.loading=!1,void this._host.requestUpdate();try{const e=await this._hass.callWS({type:"eppgrid/list_flashable_devices"});this.flashableDevices=e.devices,this.firmwareBaseUrl=al(e.firmware_base_url),this.firmwareVersion=e.latest_firmware_version??""}catch{this.flashableDevices=[]}this.loading=!1,this._host.requestUpdate()}async subscribeDeviceList(){if(this._wantDeviceListSub=!0,this._deviceListGen++,ks(this._unsubDeviceList),this._unsubDeviceList=void 0,!this._hass)return;const e=++this._deviceListGen;try{const t=await this._hass.connection.subscribeMessage(e=>{this._applyDeviceList(e)},{type:"eppgrid/subscribe_flashable_devices"});if(this._deviceListGen!==e){try{t()}catch{}return}this._unsubDeviceList=t}catch{await this.loadDevices()}}unsubscribeDeviceList(){this._wantDeviceListSub=!1,this._deviceListGen++,ks(this._unsubDeviceList),this._unsubDeviceList=void 0}_applyDeviceList(e){this.flashableDevices=e.devices??[],this.firmwareBaseUrl=al(e.firmware_base_url),this.firmwareVersion=e.latest_firmware_version??"",this.integrationVersion=e.integration_version??"",this.loading=!1,this.onDeviceListChanged?.(),this._host.requestUpdate(),this._checkOtaDevicesOffline()}_checkOtaDevicesOffline(){for(const[e,t]of Object.entries(this.otaStates)){if("updating"!==t.state)continue;const i=this.flashableDevices.find(t=>t.mac===e);i&&!i.available&&(this._setOtaState(e,{state:"error",progress:null,errorKey:"flasher.errors.device_offline"}),this._unsubOta(e),this._resetOtaTimeout(e),this._host.requestUpdate())}}async deleteEsphomeDevice(e){this._hass&&await this._hass.callWS({type:"eppgrid/delete_esphome_device",config_entry_id:e})}async addEsphomeDevice(e){return this._hass?await this._hass.callWS({type:"eppgrid/add_esphome_device",host:e}):{type:"failed",reason:"no_hass"}}updateUsbState(e){this.usbFlashState=e,this._host.requestUpdate()}get opId(){return this._opId}get opRunning(){return this._opRunning}set opRunning(e){this._opRunning=e}async resetUsbState(){this._opId++,await this._flow.cancelAndTearDown(),this.usbFlashState=null,this.wifiNetworks=[],this._host.requestUpdate()}setCancelledDeviceIpHint(e){this.cancelledDeviceIpHint=e,this._cancelledIpTimeout&&(clearTimeout(this._cancelledIpTimeout),this._cancelledIpTimeout=null),e&&(this._cancelledIpTimeout=setTimeout(()=>{this.cancelledDeviceIpHint=null,this._cancelledIpTimeout=null,this._host.requestUpdate()},8e3)),this._host.requestUpdate()}bumpOpId(){this._opId++}set serialPort(e){this._flow.serialPort=e}get serialPort(){return this._flow.serialPort}handleUsbFlash(e){return this._flow.handleUsbFlash(e)}handleUsbWifiConfig(){return this._flow.handleUsbWifiConfig()}handleWifiProvision(e,t){return this._flow.handleWifiProvision(e,t)}handleWifiScan(){return this._flow.handleWifiScan()}handleUsbRetry(){this._flow.handleUsbRetry()}handleFlasherCancel(){return this._flow.handleFlasherCancel()}handleRetryHaAdd(){return this._flow.handleRetryHaAdd()}}function cl(e){return null===e?null:Pe[e]}function hl(e,t){if(null===e)return null;if(0===t){const t=e,i={type:t.type};return"custom"===t.type&&(i.trigger=t.trigger,i.renew=t.renew,i.timeout=t.timeout,i.handoff_timeout=t.handoff_timeout),i}const i=e,s={name:i.name,color:i.color,type:i.type};return"custom"===i.type&&(s.trigger=i.trigger,s.renew=i.renew,s.timeout=i.timeout,s.handoff_timeout=i.handoff_timeout),s}function dl(e){return{type:e.type,icon:e.icon,label:e.label,x:e.x,y:e.y,width:e.width,height:e.height,rotation:e.rotation,lockAspect:e.lockAspect}}class Al{constructor(e){this.configurations=[],this.host=e,e.addController(this)}hostConnected(){}hostDisconnected(){}onCellMouseDown(e){if("furniture"===this.host._sidebarTab)return void(this.host._selectedFurnitureId=null);const t=cl(this.host._overlayMode);if(null!==t)this.host._paintAction=(i=this.host._grid[e],s=t,Te(i)===s?"clear":"set");else{if("zones"!==this.host._sidebarTab||null===this.host._activeZone)return;this.host._paintAction=function(e,t){if(0===t)return Re(e)&&0===Me(e)?"clear":"set";return Me(e)===t?"clear":"set"}(this.host._grid[e],this.host._activeZone)}var i,s;this.host._isPainting=!0,this.host._frozenBounds=this.host._getVisibleRoomBounds(),this.applyPaintToCell(e);const r=()=>{this.onCellMouseUp(),window.removeEventListener("pointerup",r),window.removeEventListener("pointercancel",r)};window.addEventListener("pointerup",r),window.addEventListener("pointercancel",r)}onCellMouseEnter(e){this.host._isPainting&&this.applyPaintToCell(e)}onCellMouseUp(){this.host._isPainting&&(this.host._justPainted=!0,requestAnimationFrame(()=>{this.host._justPainted=!1})),this.host._isPainting=!1,this.host._frozenBounds=null}applyPaintToCell(e){let t;const i=cl(this.host._overlayMode);if(null!==i)s=this.host._grid[e],r=i,o=this.host._paintAction,t=Re(s)?Fe(s,"set"===o?r:0):null;else{if(null===this.host._activeZone)return;t=function(e,t,i){return 0===t?"set"===i?1:0:Re(e)?"set"===i?ke(1|e,t):ke(e,0):null}(this.host._grid[e],this.host._activeZone,this.host._paintAction)}var s,r,o;null!==t&&t!==this.host._grid[e]&&(this.host._grid=new Uint8Array(this.host._grid),this.host._grid[e]=t,this.host._dirty=!0,this.host._zoneEngineGridChanged())}initGridFromRoom(){this.host._grid=Le(this.host._roomWidth,this.host._roomDepth),this.host._zoneEngineGridChanged()}addZone(){const e=[...this.host._zoneConfigs],t=e.findIndex((e,t)=>t>0&&null===e);if(-1===t)return;const i=new Set(e.filter((e,t)=>t>0&&null!==e).map(e=>e.color)),s=hs.find(e=>!i.has(e)),r=this.host._localize?.("live.debug.zone_n",{n:t})??`Zone ${t}`;e[t]={name:r,color:s,type:"default"},this.host._zoneConfigs=e,this.host._activeZone=t,this.host._dirty=!0,this.host._zoneEngineZoneConfigChanged()}removeZone(e){if(e<1||e>7||null===this.host._zoneConfigs[e])return;const t=function(e,t){if(t<1||t>7)return null;let i=-1;for(let s=0;s<Ie;s++)if(Me(e[s])===t){i=s;break}if(-1===i)return null;const s=new Uint8Array(e);for(let e=i;e<Ie;e++)Me(s[e])===t&&(s[e]=ke(s[e],0));return s}(this.host._grid,e);t&&(this.host._grid=t);const i=[...this.host._zoneConfigs];i[e]=null,this.host._zoneConfigs=i,this.host._activeZone===e&&(this.host._activeZone=null),this.host._dirty=!0,this.host._zoneEngineZoneConfigChanged()}addFurniture(e){const t=`f_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,i=function(e,t,i,s){return{id:s,type:e.type,icon:e.icon,label:e.label,x:Math.max(0,(t-e.defaultWidth)/2),y:Math.max(0,(i-e.defaultHeight)/2),width:e.defaultWidth,height:e.defaultHeight,rotation:0,lockAspect:e.lockAspect??"icon"===e.type}}(e,this.host._roomWidth,this.host._roomDepth,t);this.host._furniture=[...this.host._furniture,i],this.host._selectedFurnitureId=i.id,this.host._dirty=!0}addCustomFurniture(e){this.addFurniture({type:"icon",icon:e,label:"furniture.custom",defaultWidth:600,defaultHeight:600,lockAspect:!1})}removeFurniture(e){this.host._furniture=function(e,t){return e.filter(e=>e.id!==t)}(this.host._furniture,e),this.host._selectedFurnitureId===e&&(this.host._selectedFurnitureId=null),this.host._dirty=!0}updateFurniture(e,t){this.host._furniture=function(e,t,i){return e.map(e=>e.id===t?{...e,...i}:e)}(this.host._furniture,e,t),this.host._dirty=!0}onFurniturePointerDown(e,t,i,s,r){e.preventDefault(),e.stopPropagation(),this.host._selectedFurnitureId=t;const o=this.host._furniture.find(e=>e.id===t);if(!o)return;const n=r??o.rotation;let a=0,l=0,c=0;if("rotate"===i){const i=this.host.shadowRoot?.querySelector("epp-grid")?.shadowRoot?.querySelector("epp-furniture-overlay")?.shadowRoot;let s=null;if(i)for(const e of i.querySelectorAll(".furniture-item"))if(e.dataset.id===t){s=e;break}if(s){const t=s.getBoundingClientRect();a=t.left+t.width/2,l=t.top+t.height/2,c=Math.atan2(e.clientY-l,e.clientX-a)*(180/Math.PI)}}this.host._dragState={type:i,id:t,startX:e.clientX,startY:e.clientY,origX:o.x,origY:o.y,origW:o.width,origH:o.height,origRot:n,handle:s,centerX:a,centerY:l,startAngle:c};const h=e=>this.onFurnitureDrag(e),d=()=>{this.host._dragState=null,window.removeEventListener("pointermove",h),window.removeEventListener("pointerup",d),window.removeEventListener("pointercancel",d)};window.addEventListener("pointermove",h),window.addEventListener("pointerup",d),window.addEventListener("pointercancel",d)}onFurnitureDrag(e){if(!this.host._dragState)return;const t=this.host._dragState,i=this.host.shadowRoot?.querySelector("epp-grid")?.shadowRoot?.querySelector(".grid");if(!i)return;const s=i.firstElementChild?i.firstElementChild.offsetWidth:28,r=e.clientX-t.startX,o=e.clientY-t.startY;if("move"===t.type){const e=this.host._furniture.find(e=>e.id===t.id),i=at(this.host._getVisibleRoomBounds(),this.host._roomWidth),n=function(e,t,i,s,r,o,n,a,l,c,h,d){const A=$i(i,r),g=$i(s,r),{dxBox:u,dyBox:_}=Ki(o,n,d);return{x:Math.max(a+u,Math.min(l-o-u,e+A)),y:Math.max(c+_,Math.min(h-n-_,t+g))}}(t.origX,t.origY,r,o,s,e?.width??0,e?.height??0,i.minX,i.maxX,i.minY,i.maxY,t.origRot);this.updateFurniture(t.id,n)}else if("resize"===t.type&&t.handle){const e=this.host._furniture.find(e=>e.id===t.id),i=function(e,t,i,s,r,o,n,a,l,c){const h=c*Math.PI/180,d=Math.cos(h),A=Math.sin(h),g=-t*A+i*d,u=$i(t*d+i*A,s),_=$i(g,s),p=e.includes("e")?1:e.includes("w")?-1:0,f=e.includes("s")?1:e.includes("n")?-1:0;let w=n,E=a;if(l){const e=0!==p&&(0===f||Math.abs(u)>Math.abs(_))?p*u:f*_,t=n/a;w=Math.max(100,n+e),E=Math.max(100,w/t),w=E*t}else 0!==p&&(w=Math.max(100,n+p*u)),0!==f&&(E=Math.max(100,a+f*_));const m=w-n,b=E-a,y=p*m/2,C=f*b/2;return{x:r-m/2+(y*d-C*A),y:o-b/2+(y*A+C*d),width:w,height:E}}(t.handle,r,o,s,t.origX,t.origY,t.origW,t.origH,e?.lockAspect??!1,t.origRot);this.updateFurniture(t.id,i)}else if("rotate"===t.type){const i=Math.atan2(e.clientY-(t.centerY??0),e.clientX-(t.centerX??0))*(180/Math.PI);this.updateFurniture(t.id,{rotation:Ji(t.origRot,t.startAngle??0,i)})}}async fetchConfigurations(){try{const e=(await this.host.hass.callWS({type:"eppgrid/list_configurations"})).configurations||{};this.configurations=Object.entries(e).map(([e,t])=>({...t,name:e}))}catch{this.configurations=[]}}async saveConfiguration(){const e=this.host._configurationName.trim();if(!e)return;const t=this.host._zoneConfigs.map((e,t)=>hl(e,t)),i={grid:Array.from(this.host._grid),zones:t,roomWidth:this.host._roomWidth,roomDepth:this.host._roomDepth,furniture:this.host._furniture.map(e=>({...e})),settings:this.host._buildSparseSettings()};try{await this.host.hass.callWS({type:"eppgrid/save_configuration",name:e,configuration:i})}catch(e){throw this.onError?.("save_configuration",e),e}this.host._showConfigurationBackup=!1,this.host._configurationName="",await this.fetchConfigurations()}async loadConfiguration(e){try{await this._loadConfiguration(e)}catch(e){throw this.onError?.("load_configuration",e),e}}async _loadConfiguration(e){const t=this.configurations.find(t=>t.name===e);if(!t)return;const i=t.zones||[],s=e=>null===e||null!=e&&"object"==typeof e&&"string"==typeof e.name&&"string"==typeof e.color&&"string"==typeof e.type,r=new Error(`Configuration "${e}" is in an old format — please re-save it`);if(8!==i.length)throw r;if(!(e=>null!=e&&"object"==typeof e&&"string"==typeof e.type)(i[0]))throw r;for(let e=1;e<8;e++)if(!s(i[e]))throw r;if(!Array.isArray(t.grid)||t.grid.length!==Ie||!t.grid.every(e=>"number"==typeof e&&Number.isFinite(e)))throw r;const o={grid:this.host._grid,zoneConfigs:this.host._zoneConfigs,roomWidth:this.host._roomWidth,roomDepth:this.host._roomDepth,furniture:this.host._furniture,showConfigurationRestore:this.host._showConfigurationRestore,dirty:this.host._dirty,settings:new Map},n=new Uint8Array(t.grid),a=Qe(this.host._grid),l=Qe(n);if(this.host._grid=function(e,t){const i=Qe(e),s=Qe(t);if(!s)return console.warn("[eppgrid] alignTemplateGrid: current grid has no inside-room cells; falling back to verbatim template copy"),new Uint8Array(e);const r=new Uint8Array(Ie);for(let e=0;e<Ie;e++)r[e]=1&t[e];i||console.warn("[eppgrid] alignTemplateGrid: template has no inside-room cells; falling back to offset (0,0)");const{dr:o,dc:n}=ze(e,t,i,s);for(let t=0;t<Se;t++)for(let s=0;s<Be;s++){const a=e[t*Be+s];if(i&&!(1&a))continue;const l=62&a;if(0===l)continue;const c=t+o,h=s+n;if(c<0||c>=Se||h<0||h>=Be)continue;const d=c*Be+h;1&r[d]&&(r[d]|=l)}return r}(n,this.host._grid),this.host._zoneConfigs=Array.from({length:8},(e,t)=>i[t]??null),a){const{dr:e,dc:i}=ze(n,this.host._grid,l,a),s=(i+He(t.roomWidth)-He(this.host._roomWidth))*De,r=e*De;this.host._furniture=(t.furniture||[]).map(e=>({...e,x:e.x+s,y:e.y+r}))}else this.host._roomWidth=t.roomWidth,this.host._roomDepth=t.roomDepth,this.host._furniture=(t.furniture||[]).map(e=>({...e}));const c=t.settings,h=null!=c&&"object"==typeof c;if(h)for(const[e,t]of ns)if(o.settings.set(t,this.host[t]),"entities"===e){const e="entities"in c?c.entities:void 0;this.host[t]={...is,...e||{}}}else this.host[t]=e in c?c[e]:rs(e);if(this.host._showConfigurationRestore=!1,this.host._zoneEngineZoneConfigChanged(),this.host._dirty=!0,h)try{await this.host.hass.callWS({type:"eppgrid/set_settings",mac:this.host._selectedMac,...this.host._buildSettingsPayload()})}catch(e){this.host._grid=o.grid,this.host._zoneConfigs=o.zoneConfigs,this.host._roomWidth=o.roomWidth,this.host._roomDepth=o.roomDepth,this.host._furniture=o.furniture,this.host._showConfigurationRestore=o.showConfigurationRestore,this.host._dirty=o.dirty;for(const[e,t]of o.settings)this.host[e]=t;throw e}await this.applyLayout()}async deleteConfiguration(e){await this.host.hass.callWS({type:"eppgrid/delete_configuration",name:e}),await this.fetchConfigurations(),this.host.requestUpdate()}async applyLayout(){const e=new Map;for(let t=0;t<this.host._grid.length;t++)if(Re(this.host._grid[t])){const i=Me(this.host._grid[t]);i>0&&e.set(i,(e.get(i)??0)+1)}const t=this.host._zoneConfigs.map((t,i)=>0===i?t:null!==t&&0===(e.get(i)??0)?null:t),i=Oe(this.host._grid);let s=this.host._furniture;if(i.minCol<=i.maxCol&&i.minRow<=i.maxRow){const e=at(i,this.host._roomWidth);s=s.filter(t=>!function(e,t,i,s,r){const{dxBox:o,dyBox:n}=Ki(e.width,e.height,e.rotation??0);return e.x+e.width+o<=t||e.x-o>=i||e.y+e.height+n<=s||e.y-n>=r}(t,e.minX,e.maxX,e.minY,e.maxY))}const r=this.host._grid,o=this.host._zoneConfigs,n=this.host._furniture;this.host._saving=!0;try{if(await this.host.hass.callWS({type:"eppgrid/set_room_layout",mac:this.host._selectedMac,grid_bytes:Array.from(r),zone_slots:t.map((e,t)=>hl(e,t)),furniture:s.map(dl)}),this.host._targetAutoDistance||this.host._staticAutoDistance){const e=lt(this.host._roomWidth,this.host._roomDepth,this.host._perspective,this.host._grid),t=ss.target_max_distance,i=ss.static_max_distance,s=this.host._targetAutoDistance?e>0?Math.min(e,t):t:this.host._targetMaxDistance,r=this.host._staticAutoDistance?ss.static_min_distance:this.host._staticMinDistance,o=this.host._staticAutoDistance?e>0?Math.min(e,i):i:this.host._staticMaxDistance;await this.host.hass.callWS({type:"eppgrid/set_settings",mac:this.host._selectedMac,...this.host._buildSettingsPayload(),target_max_distance:s,static_min_distance:r,static_max_distance:o})}this.host._grid!==r||this.host._zoneConfigs!==o||this.host._furniture!==n||(this.host._zoneConfigs=t,this.host._furniture=s,this.host._dirty=!1,this.host._selectedFurnitureId=null,this.host._overlayMode=null,this.host._view="live"),this.host._zoneEngineZoneConfigChanged()}catch(e){throw this.onError?.("apply_layout",e),e}finally{this.host._saving=!1}}async saveSettings(e){this.host._saving=!0;try{const t={};for(const[i]of ns)i in e&&(t[i]=e[i]);await this.host.hass.callWS({type:"eppgrid/set_settings",mac:this.host._selectedMac,...t});for(const[e,i]of ns)e in t&&null!=t[e]&&(this.host[i]=t[e]);this.host._dirty=!1,this.host._view="live"}catch(e){console.error("Failed to save settings:",e),this.onError?.("save_settings",e)}finally{this.host._saving=!1}}}const gl="zones",ul={"":{view:"live",sidebarTab:gl},settings:{view:"settings",sidebarTab:gl},tutorial:{view:"tutorial",sidebarTab:gl},calibrate:{view:"calibrate",sidebarTab:gl},zones:{view:"editor",sidebarTab:"zones"},overlays:{view:"editor",sidebarTab:"overlays"},furniture:{view:"editor",sidebarTab:"furniture"}};function _l(e){const t=e.startsWith("#")?e.slice(1):e;return ul[t]??ul[""]}function pl(e){return"live"===e.view?"":"editor"===e.view?`#${e.sidebarTab}`:`#${e.view}`}const fl=new Set;let wl=null,El=null,ml=null,bl=null;function yl(e){return(t,i,s)=>{for(const r of fl)try{if(r.intercept(e,[t,i,s]))return}catch(e){console.error("eppgrid: history interceptor failed",e)}const r=location.hash;if(e(t,i,s),location.hash!==r)for(const e of fl)try{e.hashMoved()}catch(e){console.error("eppgrid: history interceptor failed",e)}}}class Cl{constructor(e){this._originalReplaceState=null,this._historyInterceptor=null,this._pendingNavigation=null,this._beforeUnloadHandler=e=>{this._host._dirty&&(e.preventDefault(),e.returnValue="")},this._interceptNavigation=()=>!!this._host._dirty&&(this._host._showUnsavedDialog=!0,this._pendingNavigation=null,!0),this._onHashChange=()=>{const e=this._host,t=_l(location.hash);t.view===e._view&&t.sidebarTab===e._sidebarTab||(e._dirty&&this._replaceHash(pl({view:e._view,sidebarTab:e._sidebarTab})),this.guardNavigation(()=>e._applyView(t)))},this._host=e,e.addController(this)}hostConnected(){window.addEventListener("beforeunload",this._beforeUnloadHandler),window.addEventListener("hashchange",this._onHashChange),this._historyInterceptor??={intercept:(e,t)=>!!this._interceptNavigation()&&(this._pendingNavigation=()=>{e(...t),window.dispatchEvent(new PopStateEvent("popstate")),this._onHashChange()},!0),hashMoved:()=>this._onHashChange()},function(e){if(fl.add(e),wl&&history.pushState===wl&&El&&history.replaceState===El)return;const t=window;t.__eppOriginalPushState||(t.__eppOriginalPushState=history.pushState.bind(history)),t.__eppOriginalReplaceState||(t.__eppOriginalReplaceState=history.replaceState.bind(history)),ml=t.__eppOriginalPushState,bl=t.__eppOriginalReplaceState,wl=yl(ml),El=yl(bl),history.pushState=wl,history.replaceState=El}(this._historyInterceptor);const e=window;this._originalReplaceState=e.__eppOriginalReplaceState}hostDisconnected(){var e;window.removeEventListener("beforeunload",this._beforeUnloadHandler),window.removeEventListener("hashchange",this._onHashChange),this._historyInterceptor&&(e=this._historyInterceptor,fl.delete(e),fl.size>0||(ml&&history.pushState===wl&&(history.pushState=ml),bl&&history.replaceState===El&&(history.replaceState=bl),wl=null,El=null,ml=null,bl=null))}_replaceHash(e){if("undefined"==typeof location)return;if(e===location.hash)return;const t=`${location.pathname}${location.search}${e}`;(this._originalReplaceState??history.replaceState.bind(history))(history.state,"",t)}syncHashFromState(){this._replaceHash(pl({view:this._host._view,sidebarTab:this._host._sidebarTab}))}guardNavigation(e){this._host._dirty?(this._pendingNavigation=e,this._host._showUnsavedDialog=!0):e()}discardAndNavigate(){this._host._dirty=!1,this._host._showUnsavedDialog=!1,this._pendingNavigation&&(this._pendingNavigation(),this._pendingNavigation=null)}cancelPendingNavigation(){this._host._showUnsavedDialog=!1,this._pendingNavigation=null}}function vl(){return{localZoneState:new Map,targetPrev:[null,null,null],targetGateCount:[0,0,0],targetPrevXY:[null,null,null],lastZone:[null,null,null],lastOnOverlay:[!1,!1,!1],dismissedCells:[-1,-1,-1],stuckRef:[null,null,null],staticState:"inactive",motionState:"inactive",staticPendingSince:null,motionPendingSince:null,sensorsEverActive:!1}}function Bl(e,t,i,s){if(!(t<0||t>=3)){if(e.dismissedCells[t]=i,i>=0&&i<Ie&&Re(s[i])){const r=Me(s[i]),o=e.localZoneState.get(r);o&&(o.confirmedTargets.delete(t),0===o.confirmedTargets.size&&(o.occupied=!1,o.pendingSince=null))}e.targetPrev[t]=null,e.targetGateCount[t]=0,e.lastOnOverlay[t]=!1,e.lastZone[t]=null,e.stuckRef[t]=null}}function Sl(e){for(let t=0;t<3;t++)e.targetPrev[t]=null,e.targetPrevXY[t]=null,e.targetGateCount[t]=0,e.lastOnOverlay[t]=!1,e.lastZone[t]=null,e.dismissedCells[t]=-1,e.stuckRef[t]=null}function Il(e,t,i,s){for(let r=-1;r<=1;r++)for(let o=-1;o<=1;o++){const n=t+r,a=i+o;if(n<0||n>=Se||a<0||a>=Be)continue;const l=e[n*Be+a];if(1===Te(l)&&Me(l)===s)return!0}return!1}function Dl(e,t){return 0===e||e>=1&&e<=t.length&&null!=t[e-1]}function xl(e,t){let i=e.localZoneState.get(t);return i||(i={occupied:!1,pendingSince:null,confirmedTargets:new Set},e.localZoneState.set(t,i)),i}class Rl{constructor(e){this._zoneEngineState=vl(),this._editorEngineResult=null,this._allZoneIdsCache=null,this._allZoneIdsCacheGrid=null,this.host=e,e.addController(this)}hostConnected(){}hostDisconnected(){}get zoneEngineState(){return this._zoneEngineState}set zoneEngineState(e){this._zoneEngineState=e}get editorEngineResult(){return this._editorEngineResult}resetZoneEngineState(){this._zoneEngineState=vl(),this._editorEngineResult=null}resetEngineForGridChange(){Sl(this._zoneEngineState)}resetEngineForZoneConfigChange(){var e;Sl(e=this._zoneEngineState),e.localZoneState.clear(),e.staticState="inactive",e.motionState="inactive",e.staticPendingSince=null,e.motionPendingSince=null,e.sensorsEverActive=!1}dismissTarget(e,t){Bl(this._zoneEngineState,e,t,this.host._grid)}handleTargetData(e){if("settings"===this.host._view){const t=this.host._sensorState,i=e.sensors,s={};return null==t.temperature&&null!=i.temperature&&(s.temperature=i.temperature),null==t.humidity&&null!=i.humidity&&(s.humidity=i.humidity),null==t.illuminance&&null!=i.illuminance&&(s.illuminance=i.illuminance),null==t.co2&&null!=i.co2&&(s.co2=i.co2),void(Object.keys(s).length>0&&(this.host._sensorState={...t,...s}))}if(this.host._targets=e.targets,this.host._sensorState=e.sensors,e.zones&&(this.host._zoneState={occupancy:e.zones.occupancy,target_counts:e.zones.target_counts,frame_count:e.zones.frame_count},this.host._showBackendDebugLog&&e.zones.debug_log&&this.appendBackendDebugLog(e.zones.debug_log)),"live"===this.host._view){const t=this._zoneEngineState.targetPrevXY;for(let i=0;i<e.targets.length&&i<t.length;i++){const s=e.targets[i];null!=s.x&&null!=s.y&&"active"===s.status&&(t[i]={x:s.x,y:s.y})}}else"editor"===this.host._view&&this.runLocalZoneEngine()}handleRawTargetData(e){"settings"!==this.host._view&&(this.host._rawTargets=e)}runLocalZoneEngine(){const e=this.host._sensorState,t=this.host._zoneConfigs,i=ds(t[0]),s=function(e,t){const i=t.now??Date.now()/1e3,s=new Map,r=new Map,o=[null,null,null],n=[null,null,null],a=[!1,!1,!1];for(let l=0;l<3;l++){const c=l<t.targets.length?t.targets[l]:null;if(!c||null==c.x||null==c.y||c.signal<=0){e.targetPrev[l]=null,e.targetGateCount[l]=0,e.stuckRef[l]=null;continue}a[l]=!0;const h=c.signal;r.set(l,h);const d=ji(c.x,c.y,t.roomWidth,t.roomDepth);if(!d){e.targetPrev[l]=null,e.targetGateCount[l]=0,e.stuckRef[l]=null;continue}const A=Math.floor(d.col),g=Math.floor(d.row);if(A<0||A>=Be||g<0||g>=Se){e.targetPrev[l]=null,e.targetGateCount[l]=0,e.stuckRef[l]=null;continue}const u=g*Be+A,_=t.grid[u];if(!Re(_)){e.targetPrev[l]=null,e.targetGateCount[l]=0,e.stuckRef[l]=null;continue}if(e.dismissedCells[l]===u){e.targetPrev[l]=null,e.targetGateCount[l]=0;continue}e.dismissedCells[l]>=0&&(e.dismissedCells[l]=-1);const p=t.stuckTargetTimeout??0;if(p>0){const s=e.stuckRef[l];if(null!==s&&c.x===s.x&&c.y===s.y){if(i-s.since>=p){Bl(e,l,u,t.grid);continue}}else e.stuckRef[l]={x:c.x,y:c.y,since:i}}const f=Te(_);if(3===f){e.targetPrev[l]=null,e.targetGateCount[l]=0;continue}const w=2===f,E=Me(_);n[l]=E,e.lastZone[l]=E,e.lastOnOverlay[l]=1===f||Il(t.grid,g,A,E);const m=e.targetPrev[l];if(null!==m){const e=m.row*Be+m.col;e>=0&&e<Ie&&Re(t.grid[e])&&(o[l]=Me(t.grid[e]))}e.targetPrevXY[l]={x:c.x,y:c.y};let b=!1;if(null!==m&&(b=Math.max(Math.abs(A-m.col),Math.abs(g-m.row))<=5),!Dl(E,t.zoneConfigs)){e.targetPrev[l]={col:A,row:g};continue}const y=gs(E,t.zoneConfigs,t.roomType,t.roomTrigger,t.roomRenew,t.roomTimeout,t.roomHandoffTimeout),{trigger:C,renew:v}=y,B=xl(e,E),S=!B.occupied;if(w&&!b&&S){e.targetPrev[l]=null,e.targetGateCount[l]=0;continue}let I=S?C:w?9:v;const D=1===f||Il(t.grid,g,A,E);D&&S&&!w&&(I=1),D||b||!S?h>=I?(s.set(E,!0),B.confirmedTargets.add(l),e.targetPrev[l]={col:A,row:g},e.targetGateCount[l]=0):e.targetPrev[l]={col:A,row:g}:h>=Math.min(I+2,8)?(e.targetGateCount[l]++,e.targetGateCount[l]>=2?(s.set(E,!0),B.confirmedTargets.add(l),e.targetPrev[l]={col:A,row:g},e.targetGateCount[l]=0):e.targetPrev[l]={col:A,row:g}):(e.targetPrev[l]=null,e.targetGateCount[l]=0)}for(let s=0;s<3;s++){const r=o[s],a=n[s];if(null===r||null===a||r===a)continue;if(!Dl(r,t.zoneConfigs))continue;const l=e.localZoneState.get(r);if(l&&(l.confirmedTargets.delete(s),0===l.confirmedTargets.size&&l.occupied&&null===l.pendingSince)){const e=gs(r,t.zoneConfigs,t.roomType,t.roomTrigger,t.roomRenew,t.roomTimeout,t.roomHandoffTimeout),{timeout:s,handoffTimeout:o}=e;l.pendingSince=i-(s-o)}}for(let s=0;s<3;s++){const r=s<t.targets.length?t.targets[s]:null,o=!r||null==r.x||null==r.y,a=!o&&null===n[s],l=e.lastZone[s];if((o||a)&&e.lastOnOverlay[s]&&null!==l&&Dl(l,t.zoneConfigs)){const r=e.localZoneState.get(l);if(r?.occupied){let e=0;for(const t of r.confirmedTargets)t!==s&&e++;if(0===e){const e=gs(l,t.zoneConfigs,t.roomType,t.roomTrigger,t.roomRenew,t.roomTimeout,t.roomHandoffTimeout),s=i-(e.timeout-e.handoffTimeout);(null===r.pendingSince||r.pendingSince>s)&&(r.pendingSince=s)}}e.lastZone[s]=null,e.lastOnOverlay[s]=!1}}const l={},c=new Set;for(let e=0;e<t.grid.length;e++)Re(t.grid[e])&&c.add(Me(t.grid[e]));for(const r of c){if(!Dl(r,t.zoneConfigs)){l[r]=!1;continue}const o=xl(e,r),n=gs(r,t.zoneConfigs,t.roomType,t.roomTrigger,t.roomRenew,t.roomTimeout,t.roomHandoffTimeout),{timeout:a}=n,c=s.get(r)??!1;o.occupied?null===o.pendingSince?c||(o.pendingSince=i):c?o.pendingSince=null:i-o.pendingSince>=a&&(o.occupied=!1,o.pendingSince=null,o.confirmedTargets.clear()):c&&(o.occupied=!0,o.pendingSince=null),l[r]=o.occupied}for(const i of e.localZoneState.keys())c.has(i)&&Dl(i,t.zoneConfigs)||e.localZoneState.delete(i);const h=[];for(let i=0;i<3&&i<t.targets.length;i++){const t=r.get(i)??0,s=null!==n[i];if(a[i]&&t>0&&s)h.push({status:"active"});else{let t=!1;if(!a[i]||!s)for(const[,s]of e.localZoneState)if(s.occupied&&null!==s.pendingSince&&s.confirmedTargets.has(i)){t=!0;break}h.push({status:t?"pending":"inactive"})}}for(let t=0;t<3;t++)if(!a[t])for(const i of e.localZoneState.values())null===i.pendingSince&&i.confirmedTargets.delete(t);const d=t.staticPresence??!1,A=t.motionPresence??!1,g=t.staticTimeout??10,u=t.motionTimeout??10;if(d?(e.staticState="active",e.staticPendingSince=null,e.sensorsEverActive=!0):"active"===e.staticState?(e.staticState="pending",e.staticPendingSince=i):"pending"===e.staticState&&null!==e.staticPendingSince&&i-e.staticPendingSince>=g&&(e.staticState="inactive",e.staticPendingSince=null),A?(e.motionState="active",e.motionPendingSince=null,e.sensorsEverActive=!0):"active"===e.motionState?(e.motionState="pending",e.motionPendingSince=i):"pending"===e.motionState&&null!==e.motionPendingSince&&i-e.motionPendingSince>=u&&(e.motionState="inactive",e.motionPendingSince=null),e.sensorsEverActive&&"inactive"===e.staticState&&"inactive"===e.motionState){let t=!1;for(const[,i]of e.localZoneState)if(i.occupied&&null===i.pendingSince){t=!0;break}if(!t)for(const[t,i]of e.localZoneState)i.occupied&&null!==i.pendingSince&&(i.occupied=!1,i.pendingSince=null,i.confirmedTargets.clear(),l[t]=!1)}const _="inactive"!==e.staticState||"inactive"!==e.motionState||Object.values(l).some(e=>e);let p="inactive"!==e.staticState;if(!p)for(const[,t]of e.localZoneState)if(t.occupied&&null===t.pendingSince){p=!0;break}return{occupancy:l,targets:h,staticState:e.staticState,motionState:e.motionState,sensorOccupancy:_,mmwave:p}}(this._zoneEngineState,{targets:this.host._targets,grid:this.host._grid,roomWidth:this.host._roomWidth,roomDepth:this.host._roomDepth,zoneConfigs:t.slice(1),roomType:i.type,roomTrigger:i.trigger,roomRenew:i.renew,roomTimeout:i.timeout,roomHandoffTimeout:i.handoff_timeout,staticPresence:e?.static_presence??!1,motionPresence:e?.motion_presence??!1,staticTimeout:this.host._staticTimeout,motionTimeout:this.host._motionTimeout,stuckTargetTimeout:this.host._stuckTargetTimeout});return this._zoneEngineState={...this._zoneEngineState,localZoneState:new Map(this._zoneEngineState.localZoneState)},this.host._showDebugLog&&this._buildFrontendDebugLog(s),this._editorEngineResult=s,s}enrichDebugLog(e){const t=this.host._localize,i=e=>{if(0===e)return t("live.debug.room");const i=this.host._zoneConfigs[e];return i&&"name"in i?i.name:t("live.debug.zone_n",{n:e})},s={A:t("live.debug.active"),P:t("live.debug.pending"),I:t("live.debug.inactive"),O:t("live.debug.occupied")},r=t("live.debug.static"),o=t("live.debug.motion"),n=t("live.debug.occ"),a=t("live.debug.on"),l=t("live.debug.off"),c=e.split("|");let h,d,A;c.length>=3?(h=c[0],d=c[1],A=c[2]):(h="",d=c[0]||"",A=c[1]||"");let g="";if(h.trim()){const e=h.trim().split(/\s+/),t=[];for(const i of e){const[e,c]=i.split(":");"S"===e?t.push(`${r}: ${s[c]??c}`):"M"===e?t.push(`${o}: ${s[c]??c}`):"Occ"===e&&t.push(`${n}: ${"1"===c?a:l}`)}g=t.join(", ")}const u=(d||"").trim().split(/\s+/).filter(Boolean).map(e=>{const[t,r,o,n]=e.split(":"),a=parseInt(r?.replace("Z","")??"0",10),l=Number.isFinite(a)?a:0;return`${t}→${i(l)}(${s[o]??o},${n})`}),_=(A||"").trim().split(/\s+/).filter(Boolean).map(e=>{const[t,r,o]=e.split(":"),n=parseInt(t?.replace("Z","")??"0",10),a=Number.isFinite(n)?n:0;return`${i(a)}: ${s[r]??r}(${o})`}),p=u.length?u.join(" "):t("live.debug.no_targets"),f=_.length?_.join(", "):t("live.debug.all_clear");return g?`${g} | ${p} | ${f}`:`${p} | ${f}`}_appendLog(e,t,i,s){if(e===this.host[t])return;this.host[t]=e;const r=this.host.shadowRoot?.getElementById(s);r&&!r.querySelector(".debug-log-line")&&this.host[i].length>0&&(this.host[i]=[]);const o=`${(new Date).toLocaleTimeString(this.host._localize?.lang??"en-GB",{hour12:!1,hour:"2-digit",minute:"2-digit",second:"2-digit",fractionalSecondDigits:1})} ${e}`;this.host[i].push(o),this.host[i].length>100&&(this.host[i]=this.host[i].slice(-100)),this._appendToLogContainer(s,o)}appendBackendDebugLog(e){let t=e;if(e.split("|").length<3){const i=this.host._sensorState;t=`S:${i?.static_presence?"A":"I"} M:${i?.motion_presence?"A":"I"} Occ:${i?.occupancy?"1":"0"}|${e}`}const i=this.enrichDebugLog(t);this._appendLog(i,"_backendDebugLogPrev","_backendDebugLogLines","backend-debug-log-scroll")}_appendFrontendDebugLog(e){this._appendLog(e,"_debugLogPrev","_debugLogLines","debug-log-scroll")}_appendToLogContainer(e,t){const i=this.host.shadowRoot?.getElementById(e);if(!i)return;1!==i.children.length||i.children[0].classList.contains("debug-log-line")||(i.innerHTML="");const s=document.createElement("div");for(s.className="debug-log-line",s.textContent=t,i.appendChild(s);i.children.length>100;)i.firstChild?.remove();i.scrollTop=i.scrollHeight}_computeAllZoneIds(e){const t=new Set;for(let i=0;i<e.length;i++)Re(e[i])&&t.add(Me(e[i]));return t}_getAllZoneIds(){const e=this.host._grid;if(null!==this._allZoneIdsCache&&this._allZoneIdsCacheGrid===e)return this._allZoneIdsCache;const t=this._computeAllZoneIds(e);return this._allZoneIdsCache=t,this._allZoneIdsCacheGrid=e,t}_buildFrontendDebugLog(e){const t=[null,null,null];for(let e=0;e<3&&e<this.host._targets.length;e++){const i=this.host._targets[e];if(null==i.x||null==i.y||i.signal<=0)continue;const s=ji(i.x,i.y,this.host._roomWidth,this.host._roomDepth);if(!s)continue;const r=Math.floor(s.col),o=Math.floor(s.row);if(r<0||r>=Be||o<0||o>=Se)continue;const n=o*Be+r;Re(this.host._grid[n])&&(t[e]=Me(this.host._grid[n]))}const i=new Map;for(let e=0;e<3&&e<this.host._targets.length;e++){const s=this.host._targets[e];if(null==s.x||null==s.y||s.signal<=0)continue;const r=t[e];null!==r&&i.set(r,Math.max(i.get(r)??0,s.signal))}const s=[];for(let i=0;i<3&&i<this.host._targets.length;i++){const r=this.host._targets[i];if(null==r.x||null==r.y)continue;const o=r.signal;if(o<=0)continue;const n=t[i],a="pending"===e.targets[i]?.status?"P":"A";s.push(`T${i}:Z${n??0}:${a}:${o}`)}const r=this._getAllZoneIds(),o=[];for(const e of r){const t=this._zoneEngineState.localZoneState.get(e);if(t?.occupied){const s=null!==t.pendingSince?"P":"O";o.push(`Z${e}:${s}:${i.get(e)??0}`)}}const n=`${`S:${"active"===e.staticState?"A":"pending"===e.staticState?"P":"I"} M:${"active"===e.motionState?"A":"pending"===e.motionState?"P":"I"} Occ:${e.sensorOccupancy?"1":"0"}`}|${s.join(" ")}|${o.join(" ")}`,a=this.enrichDebugLog(n);this._appendFrontendDebugLog(a)}}const Ml="https://clintongormley.github.io/everything-presence-pro-grid/",kl={live:"user-guide/live-overview/",settings:"user-guide/settings/",tutorial:"user-guide/calibration/",calibrate:"user-guide/calibration/"},Tl={zones:"user-guide/detection-zones/",overlays:"user-guide/overlays/",furniture:"user-guide/furniture/"};function Fl(){return document.querySelector("home-assistant")?.shadowRoot?.querySelector("home-assistant-main")?.shadowRoot?.querySelector("partial-panel-resolver")??null}function Pl(){const e=Fl()?.querySelector("ha-panel-custom")??null;e&&"eppgrid-panel"===e.panel?.config?._panel_custom?.name&&(function(e){const t=e.panel?.config?._panel_custom?.name;return"eppgrid-panel"===t&&0===e.children.length}(e)?function(e){const t=document.querySelector("home-assistant"),i=t?.hass;if(!i)return;const s=document.createElement("eppgrid-panel");s.hass=i,s.panel=e.panel,e.appendChild(s)}(e):function(e){const t=Array.from(e.children).filter(e=>"eppgrid-panel"===e.tagName.toLowerCase());for(let e=1;e<t.length;e++)t[e].remove()}(e))}const Ul=()=>{"visible"===document.visibilityState&&Pl()};let Ol=null,Ql=null;function zl(e,t,i){if(e?.node===t)return e;e?.observer.disconnect();const s=new MutationObserver(i);return s.observe(t,{childList:!0}),{node:t,observer:s}}function Hl(e){Ol=zl(Ol,e,()=>Pl())}function Gl(){const e=Fl();if(!e)return;var t;Ql=zl(Ql,t=e,()=>{const e=t.querySelector("ha-panel-custom");e&&Hl(e),Pl()});const i=e.querySelector("ha-panel-custom");i&&Hl(i)}const Ll=n`
  :host {
    display: flex;
    height: 100%;
    background: var(--primary-background-color, #fafafa);
    color: var(--primary-text-color, #212121);
    font-family: var(--ha-font-family-body, "Roboto", sans-serif);
  }
`,Nl=n`
  .panel {
    padding: 24px;
    max-width: 1100px;
    margin: 0 auto;
    font-size: 14px;
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
`,Yl=n`
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
`,$l=n`
  .editor-layout {
    display: flex;
    gap: 24px;
    align-items: flex-start;
  }

  .grid-column {
    min-width: 0;
    max-width: min-content;
  }

  .grid-container {
    position: relative;
    max-width: 100%;
    overflow: visible;
  }

  .sidebar-scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  .zone-sidebar {
    width: 240px;
    flex-shrink: 0;
    background: var(--card-background-color, #fff);
    border-left: 1px solid var(--divider-color, #e0e0e0);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    overflow: visible;
  }

  .zone-sidebar.scrollable {
    max-height: 70vh;
  }

  .sidebar-title {
    font-size: 15px;
    font-weight: 600;
    padding: 10px 12px 8px;
    color: var(--primary-text-color, #212121);
  }
`,Kl=n`
  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 4px 4px 12px;
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
`;class Jl extends ce{constructor(){super(...arguments),this._deviceCtrl=new Us(this),this._gridCtrl=(()=>{const e=new Al(this);return e.onError=e=>{this._controllerError=e},e})(),this._targetCtrl=new Rl(this),this._flasherCtrl=(()=>{const e=new ll(this);return e.confirmDeleteOriginalFirmware=()=>this._requestFlasherDeleteConfirm(),e})(),this._navGuard=new Cl(this),this._localize=Object.assign(e=>e,{formatNumber:(e,t=1)=>e.toFixed(t),lang:"en"}),this._currentLang="",this._grid=new Uint8Array(Ie),this._zoneConfigs=as,this._activeZone=null,this._targetAutoDistance=!0,this._targetMaxDistance=6,this._stuckTargetTimeout=300,this._staticAutoDistance=!0,this._staticMinDistance=.3,this._staticMaxDistance=16,this._temperatureOffset=0,this._humidityOffset=0,this._illuminanceOffset=0,this._motionTimeout=5,this._staticTimeout=30,this._staticTriggerThreshold=3,this._staticRenewThreshold=3,this._staticOnDelay=0,this._logLevels={},this._bluetoothEnabled=!1,this._co2Enabled=!1,this._ledMode="Manual Control",this._ledBrightness=1,this._ledPresenceColor="#CC33FF",this._relayTriggerMode="disabled",this._relayContactMode="no",this._targetUpdateRateMs=1e3,this._zoneUpdateRateMs=1e3,this._entitiesConfig={},this._sidebarTab=_l("undefined"!=typeof location?location.hash:"").sidebarTab,this._panelTab="config",this._showDeleteCalibrationDialog=!1,this._showFlasherDeleteConfirm=!1,this._flasherDeleteConfirmResolve=null,this._showLiveMenu=!1,this._showCustomIconPicker=!1,this._customIconValue="",this._furniture=[],this._selectedFurnitureId=null,this._furnitureClipboard=null,this._dragState=null,this._targets=[],this._rawTargets=[],this._sensorState={occupancy:!1,static_presence:!1,motion_presence:!1,target_presence:!1,mmwave:!1,illuminance:null,temperature:null,humidity:null,co2:null},this._zoneState={occupancy:{},target_counts:{},frame_count:0},this._showDebugLog=!1,this._debugLogLines=[],this._debugLogPrev=null,this._showBackendDebugLog=!1,this._backendDebugLogLines=[],this._backendDebugLogPrev=null,this._overlayMode=null,this._targetMenu=null,this._dismissedTargets=new Map,this._isPainting=!1,this._justPainted=!1,this._paintAction="set",this._frozenBounds=null,this._saving=!1,this._dirty=!1,this._controllerError=null,this._showUnsavedDialog=!1,this._showConfigurationBackup=!1,this._showConfigurationRestore=!1,this._configurationName="",this._devices=[],this._selectedMac="",this._loading=!0,this._loadedConfigMac=null,this._initRetryCount=0,this._haConnected=!0,this._listeningConnection=null,this._onHaReady=()=>{const e=!this._haConnected;this._haConnected=!0,e&&this._initialize().catch(()=>{})},this._onHaDisconnected=()=>{this._haConnected=!1},this._view=_l("undefined"!=typeof location?location.hash:"").view,this._openAccordions=new Set,this._perspective=null,this._roomWidth=0,this._roomDepth=0,this._onKeyDown=e=>{if("editor"!==this._view||"furniture"!==this._sidebarTab)return;if(!this._selectedFurnitureId)return;if(!e.composedPath().some(e=>{if(!(e instanceof HTMLElement))return!1;const t=e.tagName;return"INPUT"===t||"TEXTAREA"===t||"SELECT"===t||e.isContentEditable}))if("Backspace"===e.key||"Delete"===e.key)e.preventDefault(),this._removeFurniture(this._selectedFurnitureId);else if("Escape"===e.key)e.preventDefault(),this._selectedFurnitureId=null;else if("c"===e.key&&(e.ctrlKey||e.metaKey)){const e=this._furniture.find(e=>e.id===this._selectedFurnitureId);e&&(this._furnitureClipboard={...e})}else if("x"===e.key&&(e.ctrlKey||e.metaKey)){const e=this._furniture.find(e=>e.id===this._selectedFurnitureId);e&&(this._furnitureClipboard={...e},this._removeFurniture(e.id))}else if("v"===e.key&&(e.ctrlKey||e.metaKey)){if(!this._furnitureClipboard)return;e.preventDefault();const t=`f_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,i=this._furnitureClipboard,s=at(this._getRoomBounds(),this._roomWidth),r=300,o={...i,id:t,x:Math.max(s.minX,Math.min(s.maxX-i.width,i.x+r)),y:Math.max(s.minY,Math.min(s.maxY-i.height,i.y+r))};this._furniture=[...this._furniture,o],this._selectedFurnitureId=o.id,this._dirty=!0}},this._initializeInFlight=null,this._namedZonesCache=null,this._namedZonesCacheConfigs=null,this._wizardSensorStateCache=null,this._fovCache=null,this._fovPerspective=Jl._FOV_UNCACHED,this._maxRangeCache=null,this._maxRangeCacheGrid=null,this._maxRangeCacheAuto=null,this._maxRangeCacheMax=null}get _zoneEngineState(){return this._targetCtrl.zoneEngineState}set _zoneEngineState(e){this._targetCtrl.zoneEngineState=e}connectedCallback(){super.connectedCallback(),Gl(),this._initialize().catch(()=>{}),window.addEventListener("keydown",this._onKeyDown)}disconnectedCallback(){super.disconnectedCallback(),this._initRetryTimer&&(clearTimeout(this._initRetryTimer),this._initRetryTimer=void 0),this._closeDeviceSession(),this._detachConnectionListeners(),window.removeEventListener("keydown",this._onKeyDown)}_attachConnectionListeners(e){e&&this._listeningConnection!==e&&(this._detachConnectionListeners(),"function"==typeof e.addEventListener&&(e.addEventListener("ready",this._onHaReady),e.addEventListener("disconnected",this._onHaDisconnected),this._listeningConnection=e))}_detachConnectionListeners(){const e=this._listeningConnection;e&&"function"==typeof e.removeEventListener&&(e.removeEventListener("ready",this._onHaReady),e.removeEventListener("disconnected",this._onHaDisconnected)),this._listeningConnection=null}willUpdate(e){if(e.has("hass")){const e=this.hass?.locale?.language??this.hass?.language;e!==this._currentLang&&(this._currentLang=e,this._localize=function(e){const t=e?.locale?.language??e?.language??"en",i=t.split("-")[0],s=vi[t]?t:vi[i]?i:"en",r=vi[s],o=vi.en,n=new Map,a=new Map,l=(e,t)=>{if(n.size>=256&&!n.has(e)){const e=n.keys().next().value;void 0!==e&&n.delete(e)}n.set(e,t)},c=(e,t)=>{const i=Si(r,e)??Si(o,e)??e;if(!t)return i;let a;if(n.has(i)){if(a=n.get(i),null===a)return i}else{try{a=new Ci(i,s)}catch{return l(i,null),i}l(i,a)}try{return a.format(t)}catch{return i}};return c.formatNumber=(e,t=1)=>{let i=a.get(t);return i||(i=new Intl.NumberFormat(s,{minimumFractionDigits:t,maximumFractionDigits:t}),a.set(t,i)),i.format(e)},c.lang=s,c}(this.hass))}e.has("_view")&&"editor"!==this._view&&(this._sidebarTab=gl),(e.has("_view")||e.has("_sidebarTab"))&&this._navGuard.syncHashFromState()}_applyView(e){this._view=e.view,this._sidebarTab=e.sidebarTab,"editor"===e.view&&"overlays"!==e.sidebarTab&&(this._overlayMode=null),"editor"!==e.view&&"tutorial"!==e.view&&"calibrate"!==e.view||this._pushWidenedDistanceOverride()}updated(e){if(e.has("hass")&&this.hass){this._deviceCtrl.hass=this.hass,this._flasherCtrl.hass=this.hass;const e=this.hass.connection;if(e&&(this.isConnected&&this._attachConnectionListeners(e),"boolean"==typeof e.connected&&(this._haConnected=e.connected)),!this._haConnected)return;this._loading&&!this._devices.length?this._initialize().catch(()=>{}):this._selectedMac&&this._isSelectedDeviceAvailable()&&!this._deviceCtrl.hasDeviceSession&&!this._deviceCtrl.reconnecting&&this._ensureSession(this._selectedMac)}}_ensureSession(e){this.isConnected&&(this._loadedConfigMac===e?this._deviceCtrl.reopenSession(e).catch(()=>{}):this._loadDeviceConfig(e).catch(()=>{}))}async _initialize(){if(this._initializeInFlight)return this._initializeInFlight;const e=this._runInitialize();this._initializeInFlight=e;try{await e}finally{this._initializeInFlight===e&&(this._initializeInFlight=null)}}async _runInitialize(){if(!this.hass)return;if(!this.isConnected)return;const e=void 0!==this._initRetryTimer;if(this._initRetryTimer&&(clearTimeout(this._initRetryTimer),this._initRetryTimer=void 0),e||0!==this._devices.length||(this._loading=!0),this._deviceCtrl.hass=this.hass,await this._subscribeDevices(),this.isConnected){if(0===this._devices.length)return this._initRetryCount+=1,this._loading=!1,void(this._initRetryTimer=setTimeout(()=>{this.isConnected&&this._initialize().catch(()=>{})},2e3));this._initRetryCount=0,this._selectedMac&&this._isSelectedDeviceAvailable()&&this._ensureSession(this._selectedMac),this._loading=!1}}async _subscribeDevices(){this._deviceCtrl.hass=this.hass,this._deviceCtrl.isHostDirty=()=>this._dirty,this._deviceCtrl.onDeviceListChanged=()=>{const e=this._selectedMac;this._devices=this._deviceCtrl.devices,this._selectedMac=this._deviceCtrl.selectedMac,this._devices.length>0&&(this._initRetryCount=0),""!==e&&""!==this._selectedMac&&e!==this._selectedMac&&(Ps(this._selectedMac),this._furnitureClipboard=null,this._isSelectedDeviceAvailable()&&this._loadDeviceConfig(this._selectedMac).catch(()=>{}))},this._deviceCtrl.onSelectedAvailable=e=>{this._ensureSession(e)},this._deviceCtrl.onSessionClosed=()=>{const e=this._sensorState;this._targets=[],this._rawTargets=[],this._sensorState={occupancy:!1,static_presence:!1,motion_presence:!1,target_presence:!1,mmwave:!1,illuminance:null,temperature:null,humidity:null,co2:null,temperature:e.temperature,humidity:e.humidity,illuminance:e.illuminance,co2:e.co2},this._zoneState={occupancy:{},target_counts:{},frame_count:0},this._targetCtrl.resetZoneEngineState()},await this._deviceCtrl.subscribeDeviceList(),this._devices=this._deviceCtrl.devices,this._selectedMac=this._deviceCtrl.selectedMac}_isSelectedDeviceAvailable(){const e=this._devices.find(e=>e.mac===this._selectedMac);return!!e?.available}async _loadDevices(){this._deviceCtrl.hass=this.hass,await this._deviceCtrl.loadDevices(),this._devices=this._deviceCtrl.devices,this._selectedMac=this._deviceCtrl.selectedMac}async _loadDeviceConfig(e){this._deviceCtrl.hass=this.hass,this._deviceCtrl.onTargetData=e=>{this._targetCtrl.handleTargetData(e)},this._deviceCtrl.onRawTargetData=e=>{this._targetCtrl.handleRawTargetData(e)};const t=await this._deviceCtrl.loadDeviceConfig(e);if(!this.isConnected)return void this._deviceCtrl.closeDeviceSession();if(this._selectedMac!==e)return void this._deviceCtrl.closeDeviceSession();t&&this._applyConfig(t);const i=this._devices.find(t=>t.mac===e);i&&(this._bluetoothEnabled=i.bluetooth_enabled??!1,this._co2Enabled=i.co2_enabled??!1)}_applyConfig(e){const t=bs(e);this._perspective=t.calibration.perspective,this._roomWidth=t.calibration.roomWidth,this._roomDepth=t.calibration.roomDepth,this._furniture=t.furniture,this._grid=t.grid,this._zoneConfigs=[t.zone0,...t.zoneConfigs];const i=t.settings;this._temperatureOffset=i.temperatureOffset,this._humidityOffset=i.humidityOffset,this._illuminanceOffset=i.illuminanceOffset,this._motionTimeout=i.motionTimeout,this._targetAutoDistance=i.targetAutoDistance,this._targetMaxDistance=i.targetMaxDistance,this._stuckTargetTimeout=i.stuckTargetTimeout,this._staticAutoDistance=i.staticAutoDistance,this._staticMinDistance=i.staticMinDistance,this._staticMaxDistance=i.staticMaxDistance,this._staticTriggerThreshold=i.staticTriggerThreshold,this._staticRenewThreshold=i.staticRenewThreshold,this._staticTimeout=i.staticTimeout,this._staticOnDelay=i.staticOnDelay,this._relayTriggerMode=i.relayTriggerMode,this._relayContactMode=i.relayContactMode,this._targetUpdateRateMs=i.targetUpdateRateMs,this._zoneUpdateRateMs=i.zoneUpdateRateMs,this._entitiesConfig=i.entities,this._logLevels=t.settings.logLevels,this._ledMode=t.settings.ledMode,this._ledBrightness=t.settings.ledBrightness,this._ledPresenceColor=t.settings.ledPresenceColor,this._loadedConfigMac=this._selectedMac}_closeDeviceSession(){this._deviceCtrl.closeDeviceSession(),this._targets=[],this._rawTargets=[],this._sensorState={occupancy:!1,static_presence:!1,motion_presence:!1,target_presence:!1,mmwave:!1,illuminance:null,temperature:null,humidity:null,co2:null},this._zoneState={occupancy:{},target_counts:{},frame_count:0},this._targetCtrl.resetZoneEngineState()}_onCellMouseDown(e){this._gridCtrl.onCellMouseDown(e)}_onCellMouseEnter(e){this._gridCtrl.onCellMouseEnter(e)}_onCellMouseUp(){this._gridCtrl.onCellMouseUp()}_addZone(){this._gridCtrl.addZone()}_removeZone(e){this._gridCtrl.removeZone(e)}_addFurniture(e){this._gridCtrl.addFurniture(e)}_addCustomFurniture(e){this._gridCtrl.addCustomFurniture(e)}_removeFurniture(e){this._gridCtrl.removeFurniture(e)}_updateFurniture(e,t){this._gridCtrl.updateFurniture(e,t)}_onFurniturePointerDown(e,t,i,s,r){this._gridCtrl.onFurniturePointerDown(e,t,i,s,r)}_onFurnitureDrag(e){this._gridCtrl.onFurnitureDrag(e)}_namedZones(){return null!==this._namedZonesCache&&this._namedZonesCacheConfigs===this._zoneConfigs||(this._namedZonesCache=this._zoneConfigs.slice(1),this._namedZonesCacheConfigs=this._zoneConfigs),this._namedZonesCache}_getWizardSensorState(){const e=this._sensorState.occupancy;return null!==this._wizardSensorStateCache&&this._wizardSensorStateCache.occupancy===e||(this._wizardSensorStateCache={occupancy:e}),this._wizardSensorStateCache}_getRoomBounds(){return Oe(this._grid)}_getVisibleRoomBounds(){return nt(this._grid,this._getSensorFov(),this._roomWidth,this._editorMaxRangeMm())}async _applyLayout(){return this._controllerError=null,this._gridCtrl.applyLayout()}_buildSettingsPayload(){const e={};for(const[t,i]of ns){const s=this[i];e[t]=s??ss[t]}return e}_buildSparseSettings(){const e=this._buildSettingsPayload(),t={};for(const[i,s]of Object.entries(e)){if("entities"===i)continue;os(s,ss[i])||(t[i]=s)}"target_auto_distance"in t||delete t.target_max_distance,"static_auto_distance"in t||(delete t.static_min_distance,delete t.static_max_distance),"relay_trigger_mode"in t||delete t.relay_contact_mode;const i=function(e){if(!e)return{};const t={};for(const[i,s]of Object.entries(e))s!==(is[i]??!1)&&(t[i]=s);return t}(e.entities);return Object.keys(i).length>0&&(t.entities=i),t}async _saveSettings(e){return this._controllerError=null,this._gridCtrl.saveSettings(e||{})}async _cancelSettings(){this._dirty=!1,this._view="live",await this._loadDeviceConfig(this._selectedMac)}async _cancelEditor(){const e=this._targetAutoDistance||this._staticAutoDistance;this._dirty=!1,this._selectedFurnitureId=null,this._overlayMode=null,await this._loadDeviceConfig(this._selectedMac),this._view="live",e&&await(this.hass?.callWS({type:"eppgrid/set_distance_override",mac:this._selectedMac,target_max_distance:this._targetMaxDistance,static_min_distance:this._staticMinDistance,static_max_distance:this._staticMaxDistance})?.catch(()=>{}))}_pushWidenedDistanceOverride(){(this._targetAutoDistance||this._staticAutoDistance)&&this.hass?.callWS({type:"eppgrid/set_distance_override",mac:this._selectedMac,target_max_distance:this._targetAutoDistance?ss.target_max_distance:this._targetMaxDistance,static_min_distance:this._staticAutoDistance?ss.static_min_distance:this._staticMinDistance,static_max_distance:this._staticAutoDistance?ss.static_max_distance:this._staticMaxDistance})?.catch(()=>{})}_enterEditor(e){this._navGuard.guardNavigation(()=>this._applyView({view:"editor",sidebarTab:e}))}_getConfigurations(){return this._gridCtrl.configurations}async _saveConfiguration(){this._controllerError=null;try{await this._gridCtrl.saveConfiguration()}catch(e){console.error("Failed to save configuration",e)}}async _loadConfiguration(e){this._controllerError=null;try{await this._gridCtrl.loadConfiguration(e)}catch(t){console.error(`Failed to load configuration "${e}"`,t)}}async _deleteConfiguration(e){try{await this._gridCtrl.deleteConfiguration(e)}catch(t){console.error(`Failed to delete configuration "${e}"`,t)}}_initGridFromRoom(){this._grid=Le(this._roomWidth,this._roomDepth)}_getSensorFov(){return this._perspective?(this._fovPerspective===this._perspective||(this._fovCache=it(this._perspective),this._fovPerspective=this._perspective),this._fovCache):null}_computeMaxRangeMm(){if(null!==this._maxRangeCache&&this._maxRangeCacheGrid===this._grid&&this._maxRangeCacheAuto===this._targetAutoDistance&&this._maxRangeCacheMax===this._targetMaxDistance)return this._maxRangeCache;const e=(t=this._targetAutoDistance,i=this._targetAutoDistance?this._autoDetectionRange():0,s=this._targetMaxDistance,1e3*(t?i>0?Math.min(i,6):6:s));var t,i,s;return this._maxRangeCacheGrid=this._grid,this._maxRangeCacheAuto=this._targetAutoDistance,this._maxRangeCacheMax=this._targetMaxDistance,this._maxRangeCache=e,e}_editorMaxRangeMm(){return this._targetAutoDistance?xe:1e3*this._targetMaxDistance}_renderGlobalDialogs(){return Y`
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
      ${this._showUnsavedDialog?Y`
          <div class="template-dialog">
            <div class="template-dialog-card">
              <h3>${this._localize("dialogs.unsaved_changes")}</h3>
              <p class="overlay-help">${this._localize("dialogs.unsaved_changes_body")}</p>
              <div class="template-dialog-actions">
                <button class="wizard-btn wizard-btn-back"
                  @click=${()=>this._navGuard.cancelPendingNavigation()}
                >${this._localize("common.cancel")}</button>
                <button class="wizard-btn wizard-btn-primary" style="background: var(--error-color, #f44336);"
                  @click=${()=>this._navGuard.discardAndNavigate()}
                >${this._localize("common.discard")}</button>
              </div>
            </div>
          </div>
        `:J}
      ${this._showDeleteCalibrationDialog?Y`
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
        `:J}
    `}_requestFlasherDeleteConfirm(){return this._flasherDeleteConfirmResolve?.(!1),this._showFlasherDeleteConfirm=!0,new Promise(e=>{this._flasherDeleteConfirmResolve=e})}_resolveFlasherDeleteConfirm(e){this._showFlasherDeleteConfirm=!1,this._flasherDeleteConfirmResolve?.(e),this._flasherDeleteConfirmResolve=null}_renderFlasherDeleteConfirmDialog(){return this._showFlasherDeleteConfirm?Y`
			<div class="template-dialog">
				<div class="template-dialog-card">
					<h3>${this._localize("flasher.confirm_delete_title")}</h3>
					<p class="overlay-help">${this._localize("flasher.confirm_delete_message")}</p>
					<div class="template-dialog-actions">
						<button class="wizard-btn wizard-btn-back"
							@click=${()=>this._resolveFlasherDeleteConfirm(!1)}
						>${this._localize("common.cancel")}</button>
						<button class="wizard-btn wizard-btn-primary" style="background: var(--error-color, #f44336);"
							@click=${()=>this._resolveFlasherDeleteConfirm(!0)}
						>${this._localize("common.delete")}</button>
					</div>
				</div>
			</div>
		`:J}_renderTabBar(){return Y`
			<div class="tab-bar">
				<button class="tab ${"config"===this._panelTab?"active":""}"
					@click=${()=>{this._flasherCtrl.resetUsbState(),this._panelTab="config",this._loadDevices()}}>${this._localize("tabs.device_configuration")}</button>
				<button class="tab ${"flasher"===this._panelTab?"active":""}"
					@click=${()=>{this._flasherCtrl.resetUsbState(),this._panelTab="flasher",this._flasherCtrl.loading&&(this._flasherCtrl.hass=this.hass,this._flasherCtrl.subscribeDeviceList())}}>${this._localize("tabs.flash_firmware")}</button>
				<a class="tab-help"
					href=${function(e){if("flasher"===e.panelTab)return`${Ml}user-guide/flashing-firmware/`;const t="editor"===e.view?Tl[e.sidebarTab]:kl[e.view];return`${Ml}${t}`}({panelTab:this._panelTab,view:this._view,sidebarTab:this._sidebarTab})}
					target="_blank"
					rel="noopener noreferrer"
					aria-label=${this._localize("tabs.help")}
				>
					<ha-icon icon="mdi:help-circle-outline"></ha-icon>
				</a>
			</div>
		`}render(){if("flasher"===this._panelTab)return Y`<div class="tab-layout">
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
					<button class="primary-btn" @click=${()=>{this._panelTab="flasher",this._flasherCtrl.hass=this.hass,this._flasherCtrl.subscribeDeviceList()}}>
							${this._localize("flasher.flash_from_tab")}
					</button>
				</div>
			</div>`;if("tutorial"===this._view||"calibrate"===this._view)return Y`<div class="tab-layout">
        ${this._renderTabBar()}
        <div class="panel">
          ${this._renderHeader()}
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
      </div>`;const s=this._devices.find(e=>e.mac===this._selectedMac),r=!(!this._selectedMac||s&&"unavailable"!==s.firmware_status),o=!s||"compatible"===s.firmware_status;let n=J;if(e&&(t?n=Y`
					<div class="protocol-fullpage protocol-fullpage-info">
						<ha-icon icon="mdi:connection"></ha-icon>
						<p>${this._localize("connection.ha_reconnecting")}</p>
					</div>
				`:this._deviceCtrl.reconnecting?n=Y`
					<div class="protocol-fullpage protocol-fullpage-info">
						<ha-icon icon="mdi:connection"></ha-icon>
						<p>${this._localize("connection.connecting")}</p>
					</div>
				`:this._deviceCtrl.connectionFailed||r?n=this._renderConnectionBanner():o||(n=this._renderProtocolBanner())),this._deviceCtrl.reconnecting&&!e)return Y`<div class="tab-layout">
				${this._renderTabBar()}
				<div class="panel">
					${this._renderHeader()}
					<div class="protocol-fullpage protocol-fullpage-info">
						<ha-icon icon="mdi:connection"></ha-icon>
						<p>${this._localize("connection.connecting")}</p>
					</div>
				</div>
				${this._renderGlobalDialogs()}
			</div>`;if((this._deviceCtrl.connectionFailed||r)&&!e)return Y`<div class="tab-layout">
				${this._renderTabBar()}
				<div class="panel">
					${this._renderHeader()}
					${this._renderConnectionBanner()}
				</div>
				${this._renderGlobalDialogs()}
			</div>`;if(!o&&!e)return Y`<div class="tab-layout">
				${this._renderTabBar()}
				<div class="panel">
					${this._renderHeader()}
					${this._renderProtocolBanner()}
				</div>
				${this._renderGlobalDialogs()}
			</div>`;const a="settings"===this._view?this._renderSettings(n):"editor"===this._view&&this._perspective?this._renderEditor():this._renderLiveOverview();return Y`<div class="tab-layout">${this._renderTabBar()}${this._renderControllerErrorBanner()}${a}${this._renderGlobalDialogs()}</div>`}async _onWizardSave(e){const t=e.currentTarget,{perspective:i,roomWidth:s,roomDepth:r}=e.detail;try{await this.hass.callWS({type:"eppgrid/set_setup",mac:this._selectedMac,perspective:i,room_width:s,room_depth:r})}catch(e){return console.error("Failed to save calibration",e),void t.saveFailed()}this._perspective=i,this._roomWidth=s,this._roomDepth=r,this._initGridFromRoom(),this._furniture=[],this._view="live",this._entitiesConfig={...this._entitiesConfig,zone_presence:!0},await this._gridCtrl.applyLayout().catch(e=>{console.error("Failed to apply layout after calibration",e)})}async _deleteCalibration(){this._showDeleteCalibrationDialog=!1,this._perspective=null,this._roomWidth=0,this._roomDepth=0,this._grid=new Uint8Array(Ie),this._zoneConfigs=as,this._furniture=[],this._entitiesConfig={...this._entitiesConfig,zone_presence:!1,target_xy:!1},this._targetAutoDistance&&(this._targetMaxDistance=ss.target_max_distance),this._staticAutoDistance&&(this._staticMinDistance=ss.static_min_distance,this._staticMaxDistance=ss.static_max_distance);try{(this._targetAutoDistance||this._staticAutoDistance)&&await this.hass.callWS({type:"eppgrid/set_settings",mac:this._selectedMac,...this._buildSettingsPayload()}),await this.hass.callWS({type:"eppgrid/set_setup",mac:this._selectedMac,perspective:[0,0,0,0,0,0,0,0],room_width:0,room_depth:0}),await this.hass.callWS({type:"eppgrid/set_room_layout",mac:this._selectedMac,grid_bytes:Array.from(this._grid),zone_slots:this._zoneConfigs.map((e,t)=>0===t?hl(e,0):null),furniture:[]})}catch(e){console.error("Failed to delete calibration",e)}this._dirty=!1,this._view="live"}_changePlacement(){this._navGuard.guardNavigation(()=>this._applyView({view:this._deviceCtrl.showRoomCalibrationTutorial?"tutorial":"calibrate",sidebarTab:this._sidebarTab}))}async _onDismissTutorial(){const e=this._deviceCtrl.showRoomCalibrationTutorial;this._deviceCtrl.setShowRoomCalibrationTutorial(!1);try{await this.hass.callWS({type:"eppgrid/set_show_room_calibration_tutorial",value:!1})}catch(t){console.error("Failed to persist show_room_calibration_tutorial",t),this._deviceCtrl.setShowRoomCalibrationTutorial(e)}}_renderHeader(){return this._devices.length?Y`
      <div class="panel-header">
        <ha-select
          .value=${this._selectedMac}
          .options=${this._devices.map(e=>({value:e.mac,label:e.area?`${e.name} (${e.area})`:e.name}))}
          @selected=${e=>{const t=e.detail.value;t&&t!==this._selectedMac&&this._navGuard.guardNavigation(async()=>{this._closeDeviceSession(),this._selectedMac=t,Ps(t),this._furnitureClipboard=null,await this._loadDeviceConfig(t)})}}
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
		`:J}_renderProtocolBanner(){const e=this._devices.find(e=>e.mac===this._selectedMac);if(!e||"compatible"===e.firmware_status)return J;const t=e.firmware_status,i="firmware_behind"===t,s="unavailable"===t?this._localize("protocol.unavailable"):i?this._localize("protocol.firmware_behind"):this._localize("protocol.firmware_ahead"),r="firmware_ahead"===t;return Y`
			<div class="protocol-fullpage protocol-fullpage-${i?"warning":"info"}">
				<ha-icon icon=${i?"mdi:alert-circle-outline":"mdi:information-outline"}></ha-icon>
				<p>${s}</p>
				${i?Y`<button class="wizard-btn wizard-btn-primary"
						@click=${()=>{this._panelTab="flasher",this._flasherCtrl.loading&&(this._flasherCtrl.hass=this.hass,this._flasherCtrl.subscribeDeviceList())}}
					>${this._localize("protocol.update_firmware")}</button>`:J}
				${r?Y`<a href="/hacs/repository/1172848595" class="protocol-link"
					>${this._localize("protocol.open_hacs")}</a>`:J}
			</div>
		`}_renderConnectionBanner(){const e=this._devices.find(e=>e.mac===this._selectedMac),t=!(!this._selectedMac||e&&"unavailable"!==e.firmware_status);if(!this._deviceCtrl.connectionFailed&&!t)return J;if(t)return Y`
				<div class="protocol-fullpage protocol-fullpage-info">
					<ha-icon icon="mdi:access-point-off"></ha-icon>
					<p>${this._localize("connection.offline")}</p>
					<button class="wizard-btn wizard-btn-primary"
						@click=${()=>this._retryConnection()}
					>${this._localize("connection.retry")}</button>
				</div>
			`;const i=e?.current_connection_count;return Y`
			<div class="protocol-fullpage protocol-fullpage-warning">
				<ha-icon icon="mdi:connection"></ha-icon>
				<p>${this._localize("connection.failed")}</p>
				${null!=i?Y`<p>${this._localize("connection.client_count",{count:i})}</p>`:J}
				<p style="opacity: 0.7; font-size: 0.9em">${this._localize("connection.check_connections")}</p>
				<button class="wizard-btn wizard-btn-primary"
					@click=${()=>this._retryConnection()}
				>${this._localize("connection.retry")}</button>
			</div>
		`}_retryConnection(){this._selectedMac&&this._ensureSession(this._selectedMac)}_renderLiveGrid(){return Y`
			<epp-grid
				.grid=${this._grid}
				.zoneConfigs=${this._namedZones()}
				.targets=${this._targets}
				.roomWidth=${this._roomWidth}
				.roomDepth=${this._roomDepth}
				.perspective=${this._perspective}
				.furniture=${this._furniture}
				.selectedFurnitureId=${this._selectedFurnitureId}
				.sidebarTab=${this._sidebarTab}
				.occupancy=${this._zoneState.occupancy}
				.targetPrevXY=${this._zoneEngineState.targetPrevXY}
				.localize=${this._localize}
				.maxGridPx=${480}
				.maxRangeMm=${this._computeMaxRangeMm()}
				@furniture-select=${e=>{this._selectedFurnitureId=e.detail}}
				@furniture-pointer-down=${e=>{const{e:t,id:i,type:s,handle:r,rotation:o}=e.detail;this._onFurniturePointerDown(t,i,s,r,o)}}
				@furniture-delete=${e=>{this._removeFurniture(e.detail)}}
				.dismissedTargets=${this._dismissedTargets}
				@target-click=${e=>{this._showTargetMenu(e.detail)}}
				@target-undismissed=${e=>{this._handleTargetUndismissed(e.detail.targetIndex)}}
			></epp-grid>
		`}_showTargetMenu(e){this._targetMenu=e}_closeTargetMenu(){this._targetMenu=null}_targetCellIndex(e,t){const i=ji(e,t,this._roomWidth,this._roomDepth);return i?Vi(i)??-1:-1}_handleTargetUndismissed(e){this._dismissedTargets.has(e)&&(this._dismissedTargets=new Map(this._dismissedTargets),this._dismissedTargets.delete(e))}async _dismissTarget(){if(!this._targetMenu)return;const{targetIndex:e,x:t,y:i}=this._targetMenu,s=this._targetCellIndex(t,i);if(s>=0){this._dismissedTargets=new Map(this._dismissedTargets),this._dismissedTargets.set(e,s),this._targetCtrl.dismissTarget(e,s);try{await this.hass.callWS({type:"eppgrid/dismiss_target",mac:this._selectedMac,target_index:e,cell_index:s})}catch(e){console.error("Failed to dismiss target:",e)}}this._closeTargetMenu()}async _setOverlay(e){if(!this._targetMenu)return;const t=this._targetCellIndex(this._targetMenu.x,this._targetMenu.y);if(t<0||!Re(this._grid[t]))return void this._closeTargetMenu();const i=this._grid[t],s=Fe(this._grid[t],e),r=new Uint8Array(this._grid);r[t]=s,this._grid=r,this._zoneEngineGridChanged(),this._closeTargetMenu();try{await this.hass.callWS({type:"eppgrid/set_room_layout",mac:this._selectedMac,grid_bytes:Array.from(this._grid),zone_slots:this._zoneConfigs.map((e,t)=>hl(e,t)),furniture:this._furniture.map(dl)})}catch(e){if(this._grid[t]===s){const e=new Uint8Array(this._grid);e[t]=i,this._grid=e}console.warn("[eppgrid] set overlay cell failed",e)}}_renderTargetMenu(){if(!this._targetMenu)return J;const{pctX:e,pctY:t}=this._targetMenu;return Y`
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
		`}_renderSaveCancelButtons(){return ys({saving:this._saving,dirty:this._dirty,localize:this._localize,onSave:()=>{this._applyLayout().catch(()=>{})},onCancel:()=>{this._cancelEditor()}})}_renderLiveOverview(){const e=this._perspective?this._renderLiveGrid():Y`<epp-wizard
            mode="uncalibrated-fov"
            .rawTargets=${this._rawTargets}
            .sensorState=${this._getWizardSensorState()}
            .localize=${this._localize}
            @start-calibration=${()=>this._changePlacement()}
          ></epp-wizard>`;return Y`
      <div class="panel" @click=${e=>{e.target instanceof Element&&(this._showLiveMenu&&!e.target.closest(".sidebar-menu-wrapper")&&(this._showLiveMenu=!1),this._targetMenu&&!e.target.closest(".target-menu")&&this._closeTargetMenu())}}>
        ${this._renderHeader()}
        <div class="editor-layout">
          <div class="grid-column">
            <div class="grid-container" style="position: relative;">
              ${e}
              ${this._targetMenu?this._renderTargetMenu():J}
            </div>
            ${this._perspective?this._renderBackendDebugLog():J}
          </div>
          <div class="zone-sidebar">
            <div class="sidebar-header">
              <span class="sidebar-title" style="margin-right: auto;">${this._localize("sidebar.live_overview")}</span>
              <div class="sidebar-menu-wrapper">
                <button class="sidebar-menu-btn" @click=${()=>{this._showLiveMenu=!this._showLiveMenu}}>
                  <ha-icon icon="mdi:dots-vertical" style="--mdc-icon-size: 20px;"></ha-icon>
                </button>
                ${this._showLiveMenu?Y`
                  <div class="sidebar-menu" @click=${()=>{this._showLiveMenu=!1}}>
                    ${this._perspective?Y`
                      <button class="sidebar-menu-item" @click=${()=>{this._enterEditor("zones")}}>
                        <ha-icon icon="mdi:vector-square" style="--mdc-icon-size: 18px;"></ha-icon> ${this._localize("menu.detection_zones")}
                      </button>
                      <button class="sidebar-menu-item" @click=${()=>{this._enterEditor("overlays")}}>
                        <ha-icon icon="mdi:blur" style="--mdc-icon-size: 18px;"></ha-icon> ${this._localize("menu.overlays")}
                      </button>
                      <button class="sidebar-menu-item" @click=${()=>{this._enterEditor("furniture")}}>
                        <ha-icon icon="mdi:sofa" style="--mdc-icon-size: 18px;"></ha-icon> ${this._localize("menu.furniture")}
                      </button>
                    `:J}
                    <button class="sidebar-menu-item" @click=${()=>{this._navGuard.guardNavigation(()=>this._applyView({view:"settings",sidebarTab:this._sidebarTab}))}}>
                      <ha-icon icon="mdi:cog" style="--mdc-icon-size: 18px;"></ha-icon> ${this._localize("menu.settings")}
                    </button>
                    <hr style="border: none; border-top: 1px solid var(--divider-color, #eee); margin: 4px 0;"/>
                    <button class="sidebar-menu-item" @click=${()=>this._changePlacement()}>
                      <ha-icon icon="mdi:target" style="--mdc-icon-size: 18px;"></ha-icon> ${this._localize("menu.room_calibration")}
                    </button>
                    ${this._perspective?Y`
                      <button class="sidebar-menu-item" style="color: var(--error-color, #f44336);" @click=${()=>{this._showDeleteCalibrationDialog=!0}}>
                        <ha-icon icon="mdi:delete" style="--mdc-icon-size: 18px;"></ha-icon> ${this._localize("menu.delete_calibration")}
                      </button>
                    `:J}
                    <hr style="border: none; border-top: 1px solid var(--divider-color, #eee); margin: 4px 0;"/>
                    <button class="sidebar-menu-item" @click=${()=>{this._showConfigurationBackup=!0}}>
                      <ha-icon icon="mdi:content-save" style="--mdc-icon-size: 18px;"></ha-icon> ${this._localize("dialogs.backup_configuration")}
                    </button>
                    <button class="sidebar-menu-item" @click=${async()=>{await this._gridCtrl.fetchConfigurations(),this._showConfigurationRestore=!0}}>
                      <ha-icon icon="mdi:folder-open" style="--mdc-icon-size: 18px;"></ha-icon> ${this._localize("dialogs.restore_configuration")}
                    </button>
                  </div>
                `:J}
              </div>
            </div>
            <div class="sidebar-scroll">
              <epp-live-sidebar
                .sensorState=${this._sensorState}
                .zoneState=${this._zoneState}
                .zoneConfigs=${this._namedZones()}
                .hasPerspective=${null!=this._perspective}
                .localize=${this._localize}
                @view-change=${e=>{this._navGuard.guardNavigation(()=>this._applyView({view:e.detail.view,sidebarTab:e.detail.sidebarTab??this._sidebarTab}))}}
              ></epp-live-sidebar>
            </div>
          </div>
        </div>
      </div>
    `}_autoDetectionRange(){return lt(this._roomWidth,this._roomDepth,this._perspective,this._grid)}_renderSettings(e=J){return Y`
      <div class="panel">
        ${this._renderHeader()}
        ${e}
        <epp-settings-view
          .sensorState=${this._sensorState}
          .targetAutoDistance=${this._targetAutoDistance}
          .targetMaxDistance=${this._targetMaxDistance}
          .stuckTargetTimeout=${this._stuckTargetTimeout}
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
          .bluetoothEnabled=${this._bluetoothEnabled}
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
      </div>
    `}_renderEditor(){const e=this._targetCtrl.editorEngineResult??this._runLocalZoneEngine(),t=e.occupancy,i=this._targets.map((t,i)=>({...t,status:e.targets[i]?.status??t.status}));return Y`
      <div class="panel" @click=${e=>{const t=e.target;t.closest(".grid")||t.closest(".zone-sidebar")||this._justPainted||(this._activeZone=null)}}>
        ${this._renderHeader()}
        <div class="editor-layout">
          <div class="grid-column">
            <div class="grid-container" @click=${e=>{e.composedPath().some(e=>e instanceof HTMLElement&&e.classList.contains("furniture-item"))||(this._selectedFurnitureId=null)}}>
              <epp-grid
                .grid=${this._grid}
                .zoneConfigs=${this._namedZones()}
                .targets=${i}
                .roomWidth=${this._roomWidth}
                .roomDepth=${this._roomDepth}
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
                .maxRangeMm=${this._editorMaxRangeMm()}
                .frozenBounds=${this._frozenBounds}
                .dismissedTargets=${this._dismissedTargets}
                @cell-paint=${e=>{const{index:t,action:i}=e.detail;"down"===i?this._onCellMouseDown(t):"enter"===i?this._onCellMouseEnter(t):"up"===i&&this._onCellMouseUp()}}
                @furniture-select=${e=>{this._selectedFurnitureId=e.detail}}
                @furniture-pointer-down=${e=>{const{e:t,id:i,type:s,handle:r,rotation:o}=e.detail;this._onFurniturePointerDown(t,i,s,r,o)}}
                @furniture-delete=${e=>{this._removeFurniture(e.detail)}}
                @target-undismissed=${e=>{this._handleTargetUndismissed(e.detail.targetIndex)}}
              ></epp-grid>
            </div>
            ${"zones"===this._sidebarTab||"overlays"===this._sidebarTab?this._renderDebugLog():J}
          </div>
          <div class="zone-sidebar scrollable">
            <div class="sidebar-title">${"furniture"===this._sidebarTab?this._localize("sidebar.furniture"):"overlays"===this._sidebarTab?this._localize("sidebar.overlays"):this._localize("sidebar.detection_zones")}</div>
            <div class="sidebar-scroll">
            ${"zones"===this._sidebarTab?Y`<epp-zone-sidebar
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
                    @furniture-remove=${e=>{this._removeFurniture(e.detail)}}
                    @furniture-update=${e=>{this._updateFurniture(e.detail.id,e.detail.updates)}}
                    @furniture-select=${e=>{this._selectedFurnitureId=e.detail}}
                    @custom-icon-toggle=${()=>{this._showCustomIconPicker=!this._showCustomIconPicker}}
                    @custom-icon-change=${e=>{this._customIconValue=e.detail}}
                    @dirty=${()=>{this._dirty=!0}}
                  ></epp-furniture-sidebar>`}
            </div>
            ${this._renderSaveCancelButtons()}
          </div>
        </div>
      </div>
    `}_runLocalZoneEngine(){return this._targetCtrl.runLocalZoneEngine()}_zoneEngineGridChanged(){this._targetCtrl.resetEngineForGridChange()}_zoneEngineZoneConfigChanged(){this._targetCtrl.resetEngineForZoneConfigChange()}_renderDebugLogSection(e,t,i,s){const r=this[e];return Y`
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
    `}_renderBackendDebugLog(){return this._renderDebugLogSection("_showBackendDebugLog","_backendDebugLogLines","_backendDebugLogPrev","backend-debug-log-scroll")}_renderDebugLog(){return this._renderDebugLogSection("_showDebugLog","_debugLogLines","_debugLogPrev","debug-log-scroll")}}Jl._FOV_UNCACHED={},Jl.styles=[Ll,Nl,Ii,Di,ki,Yl,$l,Kl,n`
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

    .debug-log-container {
      margin-top: 4px;
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

    .tab-bar {
      display: flex;
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
      background: var(--app-header-background-color, var(--primary-color));
      padding: 0 16px;
      flex-shrink: 0;
    }

    .tab {
      padding: 12px 20px;
      border: none;
      background: none;
      color: var(--app-header-text-color, white);
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      opacity: 0.7;
      border-bottom: 3px solid transparent;
    }

    .tab.active {
      opacity: 1;
      border-bottom-color: var(--app-header-text-color, white);
    }

    .tab-help {
      margin-left: auto;
      display: inline-flex;
      align-items: center;
      padding: 12px 16px;
      color: var(--app-header-text-color, white);
      opacity: 0.7;
      text-decoration: none;
      cursor: pointer;
      --mdc-icon-size: 24px;
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

  `],e([ge({attribute:!1})],Jl.prototype,"hass",void 0),e([ue()],Jl.prototype,"_grid",void 0),e([ue()],Jl.prototype,"_zoneConfigs",void 0),e([ue()],Jl.prototype,"_activeZone",void 0),e([ue()],Jl.prototype,"_targetAutoDistance",void 0),e([ue()],Jl.prototype,"_targetMaxDistance",void 0),e([ue()],Jl.prototype,"_stuckTargetTimeout",void 0),e([ue()],Jl.prototype,"_staticAutoDistance",void 0),e([ue()],Jl.prototype,"_staticMinDistance",void 0),e([ue()],Jl.prototype,"_staticMaxDistance",void 0),e([ue()],Jl.prototype,"_temperatureOffset",void 0),e([ue()],Jl.prototype,"_humidityOffset",void 0),e([ue()],Jl.prototype,"_illuminanceOffset",void 0),e([ue()],Jl.prototype,"_motionTimeout",void 0),e([ue()],Jl.prototype,"_staticTimeout",void 0),e([ue()],Jl.prototype,"_staticTriggerThreshold",void 0),e([ue()],Jl.prototype,"_staticRenewThreshold",void 0),e([ue()],Jl.prototype,"_staticOnDelay",void 0),e([ue()],Jl.prototype,"_logLevels",void 0),e([ue()],Jl.prototype,"_bluetoothEnabled",void 0),e([ue()],Jl.prototype,"_co2Enabled",void 0),e([ue()],Jl.prototype,"_ledMode",void 0),e([ue()],Jl.prototype,"_ledBrightness",void 0),e([ue()],Jl.prototype,"_ledPresenceColor",void 0),e([ue()],Jl.prototype,"_relayTriggerMode",void 0),e([ue()],Jl.prototype,"_relayContactMode",void 0),e([ue()],Jl.prototype,"_targetUpdateRateMs",void 0),e([ue()],Jl.prototype,"_zoneUpdateRateMs",void 0),e([ue()],Jl.prototype,"_entitiesConfig",void 0),e([ue()],Jl.prototype,"_sidebarTab",void 0),e([ue()],Jl.prototype,"_panelTab",void 0),e([ue()],Jl.prototype,"_showDeleteCalibrationDialog",void 0),e([ue()],Jl.prototype,"_showFlasherDeleteConfirm",void 0),e([ue()],Jl.prototype,"_showLiveMenu",void 0),e([ue()],Jl.prototype,"_showCustomIconPicker",void 0),e([ue()],Jl.prototype,"_customIconValue",void 0),e([ue()],Jl.prototype,"_furniture",void 0),e([ue()],Jl.prototype,"_selectedFurnitureId",void 0),e([ue()],Jl.prototype,"_targets",void 0),e([ue()],Jl.prototype,"_rawTargets",void 0),e([ue()],Jl.prototype,"_sensorState",void 0),e([ue()],Jl.prototype,"_zoneState",void 0),e([ue()],Jl.prototype,"_showDebugLog",void 0),e([ue()],Jl.prototype,"_showBackendDebugLog",void 0),e([ue()],Jl.prototype,"_overlayMode",void 0),e([ue()],Jl.prototype,"_targetMenu",void 0),e([ue()],Jl.prototype,"_dismissedTargets",void 0),e([ue()],Jl.prototype,"_isPainting",void 0),e([ue()],Jl.prototype,"_paintAction",void 0),e([ue()],Jl.prototype,"_saving",void 0),e([ue()],Jl.prototype,"_dirty",void 0),e([ue()],Jl.prototype,"_controllerError",void 0),e([ue()],Jl.prototype,"_showUnsavedDialog",void 0),e([ue()],Jl.prototype,"_showConfigurationBackup",void 0),e([ue()],Jl.prototype,"_showConfigurationRestore",void 0),e([ue()],Jl.prototype,"_configurationName",void 0),e([ue()],Jl.prototype,"_devices",void 0),e([ue()],Jl.prototype,"_selectedMac",void 0),e([ue()],Jl.prototype,"_loading",void 0),e([ue()],Jl.prototype,"_initRetryCount",void 0),e([ue()],Jl.prototype,"_haConnected",void 0),e([ue()],Jl.prototype,"_view",void 0),e([ue()],Jl.prototype,"_openAccordions",void 0),e([ue()],Jl.prototype,"_perspective",void 0),e([ue()],Jl.prototype,"_roomWidth",void 0),e([ue()],Jl.prototype,"_roomDepth",void 0),customElements.get("eppgrid-panel")||customElements.define("eppgrid-panel",Jl),function(){const e=window;if(e.__eppGridMountGuardTeardown)try{e.__eppGridMountGuardTeardown()}catch{}e.__eppGridMountGuardInstalled=!0,document.addEventListener("visibilitychange",Ul),Gl(),e.__eppGridMountGuardTeardown=()=>{document.removeEventListener("visibilitychange",Ul),Ol?.observer.disconnect(),Ql?.observer.disconnect(),Ol=null,Ql=null}}();var Wl=1074521580,jl="CAD0PxwA9D8AAPQ/AMD8PxAA9D82QQAh+v/AIAA4AkH5/8AgACgEICB0nOIGBQAAAEH1/4H2/8AgAKgEiAigoHTgCAALImYC54b0/yHx/8AgADkCHfAAAKDr/T8Ya/0/hIAAAEBAAABYq/0/pOv9PzZBALH5/yCgdBARIOXOAJYaBoH2/5KhAZCZEZqYwCAAuAmR8/+goHSaiMAgAJIYAJCQ9BvJwMD0wCAAwlgAmpvAIACiSQDAIACSGACB6v+QkPSAgPSHmUeB5f+SoQGQmRGamMAgAMgJoeX/seP/h5wXxgEAfOiHGt7GCADAIACJCsAgALkJRgIAwCAAuQrAIACJCZHX/5qIDAnAIACSWAAd8AAA+CD0P/gw9D82QQCR/f/AIACICYCAJFZI/5H6/8AgAIgJgIAkVkj/HfAAAAAQIPQ/ACD0PwAAAAg2QQAQESCl/P8h+v8MCMAgAIJiAJH6/4H4/8AgAJJoAMAgAJgIVnn/wCAAiAJ88oAiMCAgBB3wAAAAAEA2QQAQESDl+/8Wav+B7P+R+//AIACSaADAIACYCFZ5/x3wAAAMQP0/////AAQg9D82QQAh/P84QhaDBhARIGX4/xb6BQz4DAQ3qA2YIoCZEIKgAZBIg0BAdBARICX6/xARICXz/4giDBtAmBGQqwHMFICrAbHt/7CZELHs/8AgAJJrAJHO/8AgAKJpAMAgAKgJVnr/HAkMGkCag5AzwJqIOUKJIh3wAAAskgBANkEAoqDAgf3/4AgAHfAAADZBAIKgwK0Ch5IRoqDbgff/4AgAoqDcRgQAAAAAgqDbh5IIgfL/4AgAoqDdgfD/4AgAHfA2QQA6MsYCAACiAgAbIhARIKX7/zeS8R3wAAAAfNoFQNguBkCc2gVAHNsFQDYhIaLREIH6/+AIAEYLAAAADBRARBFAQ2PNBL0BrQKB9f/gCACgoHT8Ws0EELEgotEQgfH/4AgASiJAM8BWA/0iogsQIrAgoiCy0RCB7P/gCACtAhwLEBEgpff/LQOGAAAioGMd8AAA/GcAQNCSAEAIaABANkEhYqEHwGYRGmZZBiwKYtEQDAVSZhqB9//gCAAMGECIEUe4AkZFAK0GgdT/4AgAhjQAAJKkHVBzwOCZERqZQHdjiQnNB70BIKIggc3/4AgAkqQd4JkRGpmgoHSICYyqDAiCZhZ9CIYWAAAAkqQd4JkREJmAgmkAEBEgJer/vQetARARIKXt/xARICXp/80HELEgYKYggbv/4AgAkqQd4JkRGpmICXAigHBVgDe1sJKhB8CZERqZmAmAdcCXtwJG3P+G5v8MCIJGbKKkGxCqoIHK/+AIAFYK/7KiC6IGbBC7sBARIOWWAPfqEvZHD7KiDRC7sHq7oksAG3eG8f9867eawWZHCIImGje4Aoe1nCKiCxAisGC2IK0CgZv/4AgAEBEgpd//rQIcCxARICXj/xARIKXe/ywKgbH/4AgAHfAIIPQ/cOL6P0gkBkDwIgZANmEAEBEg5cr/EKEggfv/4AgAPQoMEvwqiAGSogCQiBCJARARIKXP/5Hy/6CiAcAgAIIpAKCIIMAgAIJpALIhAKHt/4Hu/+AIAKAjgx3wAAD/DwAANkEAgTv/DBmSSAAwnEGZKJH7/zkYKTgwMLSaIiozMDxBDAIpWDlIEBEgJfj/LQqMGiKgxR3wAABQLQZANkEAQSz/WDRQM2MWYwRYFFpTUFxBRgEAEBEgZcr/iESmGASIJIel7xARIKXC/xZq/6gUzQO9AoHx/+AIAKCgdIxKUqDEUmQFWBQ6VVkUWDQwVcBZNB3wAADA/D9PSEFJqOv9P3DgC0AU4AtADAD0PzhA9D///wAAjIAAABBAAACs6/0/vOv9P2CQ9D//j///ZJD0P2iQ9D9ckPQ/BMD8PwjA/D8E7P0/FAD0P/D//wCo6/0/DMD8PyRA/T98aABA7GcAQFiGAEBsKgZAODIGQBQsBkDMLAZATCwGQDSFAEDMkABAeC4GQDDvBUBYkgBATIIAQDbBACHZ/wwKImEIQqAAge7/4AgAIdT/MdX/xgAASQJLIjcy+BARICXC/wxLosEgEBEgpcX/IqEBEBEg5cD/QYz+kCIRKiQxyv+xyv/AIABJAiFz/gwMDFoyYgCB3P/gCAAxxf9SoQHAIAAoAywKUCIgwCAAKQOBLP/gCACB1f/gCAAhvv/AIAAoAsy6HMMwIhAiwvgMEyCjgwwLgc7/4AgA8bf/DB3CoAGyoAHioQBA3REAzBGAuwGioACBx//gCAAhsP9Rv/4qRGLVK8AgACgEFnL/wCAAOAQMBwwSwCAAeQQiQRAiAwEMKCJBEYJRCXlRJpIHHDd3Eh3GBwAiAwNyAwKAIhFwIiBmQhAoI8AgACgCKVEGAQAcIiJRCRARIGWy/wyLosEQEBEgJbb/ggMDIgMCgIgRIIggIZP/ICD0h7IcoqDAEBEg5bD/oqDuEBEgZbD/EBEg5a7/Rtv/AAAiAwEcNyc3NPYiGEbvAAAAIsIvICB09kJwcYT/cCKgKAKgAgAiwv4gIHQcFye3AkbmAHF//3AioCgCoAIAcsIwcHB0tlfJhuAALEkMByKgwJcYAobeAHlRDHKtBxARIKWp/60HEBEgJan/EBEgpaf/EBEgZaf/DIuiwRAiwv8QESClqv9WIv1GKAAMElZoM4JhD4F6/+AIAIjxoCiDRskAJogFDBJGxwAAeCMoMyCHIICAtFbI/hARICXG/yp3nBrG9/8AoKxBgW7/4AgAVir9ItLwIKfAzCIGnAAAoID0Vhj+hgQAoKD1ifGBZv/gCACI8Vba+oAiwAwYAIgRIKfAJzjhBgQAAACgrEGBXf/gCABW6vgi0vAgp8BWov7GigAADAcioMAmiAIGqQAMBy0HRqcAJrj1Bn0ADBImuAIGoQC4M6gjDAcQESDloP+gJ4OGnAAMGWa4XIhDIKkRDAcioMKHugIGmgC4U6IjApJhDhARIOW//5jhoJeDhg0ADBlmuDGIQyCpEQwHIqDCh7oCRo8AKDO4U6gjIHiCmeEQESDlvP8hL/4MCJjhiWIi0it5IqCYgy0JxoIAkSn+DAeiCQAioMZ3mgJGgQB4I4LI8CKgwIeXAShZDAeSoO9GAgB6o6IKGBt3oJkwhyfyggMFcgMEgIgRcIggcgMGAHcRgHcgggMHgIgBcIgggJnAgqDBDAeQKJPGbQCBEf4ioMaSCAB9CRaZGpg4DAcioMh3GQIGZwAoWJJIAEZiAByJDAcMEpcYAgZiAPhz6GPYU8hDuDOoI4EJ/+AIAAwIfQqgKIMGWwAMEiZIAkZWAJHy/oHy/sAgAHgJMCIRgHcQIHcgqCPAIAB5CZHt/gwLwCAAeAmAdxAgdyDAIAB5CZHp/sAgAHgJgHcQIHcgwCAAeQmR5f7AIAB4CYB3ECAnIMAgACkJgez+4AgABiAAAAAAgJA0DAcioMB3GQIGPQCAhEGLs3z8xg4AqDuJ8ZnhucHJ0YHm/uAIALjBiPEoK3gbqAuY4cjRcHIQJgINwCAA2AogLDDQIhAgdyDAIAB5ChuZsssQhznAxoD/ZkgCRn//DAcioMCGJgAMEia4AsYhACHC/ohTeCOJAiHB/nkCDAIGHQCxvf4MB9gLDBqCyPCdBy0HgCqT0JqDIJkQIqDGd5lgwbf+fQnoDCKgyYc+U4DwFCKgwFavBC0JhgIAACqTmGlLIpkHnQog/sAqfYcy7Rap2PkMeQvGYP8MEmaIGCGn/oIiAIwYgqDIDAd5AiGj/nkCDBKAJ4MMB0YBAAAMByKg/yCgdBARICVy/3CgdBARIGVx/xARICVw/1bytyIDARwnJzcf9jICRtz+IsL9ICB0DPcntwLG2P5xkv5wIqAoAqACAAByoNJ3Ek9yoNR3EncG0v6IM6KiccCqEXgjifGBlv7gCAAhh/6RiP7AIAAoAojxIDQ1wCIRkCIQICMggCKCDApwssKBjf7gCACio+iBiv7gCADGwP4AANhTyEO4M6gjEBEgZXX/Brz+ALIDAyIDAoC7ESC7ILLL8KLDGBARIKWR/wa1/gAiAwNyAwKAIhFwIiBxb/0iwvCIN4AiYxaSq4gXioKAjEFGAgCJ8RARIKVa/4jxmEemGQSYJ5eo6xARIOVS/xZq/6gXzQKywxiBbP7gCACMOjKgxDlXOBcqMzkXODcgI8ApN4ab/iIDA4IDAnLDGIAiETg1gCIgIsLwVsMJ9lIChiUAIqDJRioAMU/+gU/96AMpceCIwIlhiCatCYeyAQw6meGp0enBEBEgpVL/qNGBRv6pAejBoUX+3Qi9B8LBHPLBGInxgU7+4AgAuCbNCqhxmOGgu8C5JqAiwLgDqneoYYjxqrsMCrkDwKmDgLvAoNB0zJri24CtDeCpgxbqAa0IifGZ4cnREBEgpYD/iPGY4cjRiQNGAQAAAAwcnQyMsjg1jHPAPzHAM8CWs/XWfAAioMcpVQZn/lacmSg1FkKZIqDIBvv/qCNWmpiBLf7gCACionHAqhGBJv7gCACBKv7gCACGW/4AACgzFnKWDAqBJP7gCACio+iBHv7gCADgAgAGVP4d8AAAADZBAJ0CgqDAKAOHmQ/MMgwShgcADAIpA3zihg8AJhIHJiIYhgMAAACCoNuAKSOHmSoMIikDfPJGCAAAACKg3CeZCgwSKQMtCAYEAAAAgqDdfPKHmQYMEikDIqDbHfAAAA==",Vl=1074520064,Zl="DMD8P+znC0B/6AtAZ+0LQAbpC0Cf6AtABukLQGXpC0CC6gtA9OoLQJ3qC0CV5wtAGuoLQHTqC0CI6QtAGOsLQLDpC0AY6wtAbegLQMroC0AG6QtAZekLQIXoC0DI6wtAKe0LQLjmC0BL7QtAuOYLQLjmC0C45gtAuOYLQLjmC0C45gtAuOYLQLjmC0Bv6wtAuOYLQEnsC0Ap7QtA",Xl=1073605544,ql=1073528832,ec={entry:Wl,text:jl,text_start:Vl,data:Zl,data_start:Xl,bss_start:ql},tc=Object.freeze({__proto__:null,bss_start:ql,data:Zl,data_start:Xl,default:ec,entry:Wl,text:jl,text_start:Vl}),ic=1077413304,sc="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",rc=1077411840,oc="DEDKP+AIOEAsCThAhAk4QFIKOEC+CjhAbAo4QKgHOEAOCjhATgo4QJgJOEBYBzhAzAk4QFgHOEC6CDhA/gg4QCwJOECECThAzAg4QBIIOEBCCDhAyAg4QBYNOEAsCThA1gs4QMoMOECkBjhA9Aw4QKQGOECkBjhApAY4QKQGOECkBjhApAY4QKQGOECkBjhAcgs4QKQGOEDyCzhAygw4QA==",nc=1070295976,ac=1070219264,lc={entry:ic,text:sc,text_start:rc,data:oc,data_start:nc,bss_start:ac},cc=Object.freeze({__proto__:null,bss_start:ac,data:oc,data_start:nc,default:lc,entry:ic,text:sc,text_start:rc}),hc=1077413584,dc="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",Ac=1077411840,gc="GEDIP8AKOEAQCzhAaAs4QDYMOECiDDhAUAw4QHIJOEDyCzhAMgw4QHwLOEAiCThAsAs4QCIJOECaCjhA4Ao4QBALOEBoCzhArAo4QNYJOEAgCjhAqAo4QPoOOEAQCzhAug04QLIOOEBiCDhA2g44QGIIOEBiCDhAYgg4QGIIOEBiCDhAYgg4QGIIOEBiCDhAVg04QGIIOEDYDThAsg44QA==",uc=1070164916,_c=1070088192,pc={entry:hc,text:dc,text_start:Ac,data:gc,data_start:uc,bss_start:_c},fc=Object.freeze({__proto__:null,bss_start:_c,data:gc,data_start:uc,default:pc,entry:hc,text:dc,text_start:Ac}),wc=1082133128,Ec="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",mc=1082130432,bc="GACEQOYOgEBQD4BA5A+AQLgQgEAgEYBAzhCAQEINgEB0EIBAtBCAQAAQgEDyDIBAKBCAQPIMgEDEDoBADg+AQFAPgEDkD4BA1g6AQGoNgECYDYBA0g6AQBoTgEBQD4BA3BGAQNYSgEAwDIBA/BKAQDAMgEAwDIBAMAyAQDAMgEAwDIBAMAyAQDAMgEAwDIBAghGAQDAMgED0EYBA1hKAQA==",yc=1082469304,Cc=1082392576,vc={entry:wc,text:Ec,text_start:mc,data:bc,data_start:yc,bss_start:Cc},Bc=Object.freeze({__proto__:null,bss_start:Cc,data:bc,data_start:yc,default:vc,entry:wc,text:Ec,text_start:mc}),Sc=1082132164,Ic="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",Dc=1082130432,xc="FACEQHIKgEDCCoBAGguAQOgLgEBUDIBAAgyAQD4JgECkC4BA5AuAQC4LgEDuCIBAYguAQO4IgEBMCoBAkgqAQMIKgEAaC4BAXgqAQKIJgEDSCYBAWgqAQKwOgEDCCoBAbA2AQGQOgEAuCIBAjA6AQC4IgEAuCIBALgiAQC4IgEAuCIBALgiAQC4IgEAuCIBACA2AQC4IgECKDYBAZA6AQA==",Rc=1082469296,Mc=1082392576,kc={entry:Sc,text:Ic,text_start:Dc,data:xc,data_start:Rc,bss_start:Mc},Tc=Object.freeze({__proto__:null,bss_start:Mc,data:xc,data_start:Rc,default:kc,entry:Sc,text:Ic,text_start:Dc}),Fc=1082132164,Pc="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",Uc=1082130432,Oc="FECAQHQKgEDECoBAHAuAQOoLgEBWDIBABAyAQEAJgECmC4BA5guAQDALgEDwCIBAZAuAQPAIgEBOCoBAlAqAQMQKgEAcC4BAYAqAQKQJgEDUCYBAXAqAQK4OgEDECoBAbg2AQGYOgEAwCIBAjg6AQDAIgEAwCIBAMAiAQDAIgEAwCIBAMAiAQDAIgEAwCIBACg2AQDAIgECMDYBAZg6AQA==",Qc=1082223536,zc=1082146816,Hc={entry:Fc,text:Pc,text_start:Uc,data:Oc,data_start:Qc,bss_start:zc},Gc=Object.freeze({__proto__:null,bss_start:zc,data:Oc,data_start:Qc,default:Hc,entry:Fc,text:Pc,text_start:Uc}),Lc=1082132164,Nc="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",Yc=1082130432,$c="FACDQHIKgEDCCoBAGguAQOgLgEBUDIBAAgyAQD4JgECkC4BA5AuAQC4LgEDuCIBAYguAQO4IgEBMCoBAkgqAQMIKgEAaC4BAXgqAQKIJgEDSCYBAWgqAQKwOgEDCCoBAbA2AQGQOgEAuCIBAjA6AQC4IgEAuCIBALgiAQC4IgEAuCIBALgiAQC4IgEAuCIBACA2AQC4IgECKDYBAZA6AQA==",Kc=1082403760,Jc=1082327040,Wc={entry:Lc,text:Nc,text_start:Yc,data:$c,data_start:Kc,bss_start:Jc},jc=Object.freeze({__proto__:null,bss_start:Jc,data:$c,data_start:Kc,default:Wc,entry:Lc,text:Nc,text_start:Yc}),Vc=1341196642,Zc="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",Xc=1341194240,qc="YAD1T3gO8U/GDvFPZA/xT0oQ8U+kEPFPXBDxT8oM8U/+D/FPRhDxT4IP8U96DPFPqg/xT3oM8U9UDvFPkg7xT8YO8U9kD/FPZg7xT/QM8U8oDfFPYg7xT3YU8U/GDvFPGBLxTzYU8U8eC/FPWhTxTx4L8U8eC/FPHgvxTx4L8U8eC/FPHgvxTx4L8U8eC/FPthHxTx4L8U9SE/FPNhTxTw==",eh=1341533180,th=1341456384,ih={entry:Vc,text:Zc,text_start:Xc,data:qc,data_start:eh,bss_start:th},sh=Object.freeze({__proto__:null,bss_start:th,data:qc,data_start:eh,default:ih,entry:Vc,text:Zc,text_start:Xc}),rh=1341459344,oh="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",nh=1341456384,ah="YAD2T8oQ9U80EfVP0BH1T6wS9U8UE/VPwhL1TwQP9U9oEvVPqBL1T+wR9U+0DvVPFBL1T7QO9U+mEPVP8hD1TzQR9U/QEfVPuBD1TywP9U9gD/VPtBD1TxIV9U80EfVP2BP1T9IU9U9YDfVP9hT1T1gN9U9YDfVPWA31T1gN9U9YDfVPWA31T1gN9U9YDfVPdhP1T1gN9U/wE/VP0hT1Tw==",lh=1341598720,ch=1341521920,hh={entry:rh,text:oh,text_start:nh,data:ah,data_start:lh,bss_start:ch},dh=Object.freeze({__proto__:null,bss_start:ch,data:ah,data_start:lh,default:hh,entry:rh,text:oh,text_start:nh}),Ah=1073907716,gh="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",uh=1073905664,_h="WAD9P0uLAkDdiwJA8pACQGaMAkD+iwJAZowCQMWMAkDejQJAUY4CQPmNAkDVigJAd40CQNCNAkDojAJAdI4CQBCNAkB0jgJAy4sCQCqMAkBmjAJAxYwCQOOLAkAXiwJAN48CQKqQAkDqiQJA0ZACQOqJAkDqiQJA6okCQOqJAkDqiQJA6okCQOqJAkDqiQJA1I4CQOqJAkDJjwJAqpACQA==",ph=1073622012,fh=1073545216,wh={entry:Ah,text:gh,text_start:uh,data:_h,data_start:ph,bss_start:fh},Eh=Object.freeze({__proto__:null,bss_start:fh,data:_h,data_start:ph,default:wh,entry:Ah,text:gh,text_start:uh}),mh=1077381760,bh="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",yh=1077379072,Ch="XADKP16ON0AzjzdAR5Q3QL2PN0BTjzdAvY83QB2QN0A6kTdArJE3QFWRN0DpjTdA0JA3QCyRN0BAkDdA0JE3QGiQN0DQkTdAIY83QH6PN0C9jzdAHZA3QDmPN0AqjjdAkJI3QA2UN0AAjTdALZQ3QACNN0AAjTdAAI03QACNN0AAjTdAAI03QACNN0AAjTdAKpI3QACNN0AlkzdADZQ3QAQInwAAAAAAAAAYAQQIBQAAAAAAAAAIAQQIBgAAAAAAAAAAAQQIIQAAAAAAIAAAEQQI3AAAAAAAIAAAEQQIDAAAAAAAIAAAAQQIEgAAAAAAIAAAESAoDAAQAQAA",vh=1070279676,Bh=1070202880,Sh={entry:mh,text:bh,text_start:yh,data:Ch,data_start:vh,bss_start:Bh},Ih=Object.freeze({__proto__:null,bss_start:Bh,data:Ch,data_start:vh,default:Sh,entry:mh,text:bh,text_start:yh}),Dh=1074843652,xh="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",Rh=1074843648,Mh="CIH+PwUFBAACAwcAAwMLANTXEEAL2BBAOdgQQNbYEECF5xBAOtkQQJDZEEDc2RBAhecQQKLaEEAf2xBA4NsQQIXnEECF5xBAeNwQQIXnEEBV3xBAHOAQQFfgEECF5xBAhecQQPPgEECF5xBA2+EQQIHiEEDA4xBAf+QQQFDlEECF5xBAhecQQIXnEECF5xBAfuYQQIXnEEB05xBAsN0QQKnYEEDC5RBAydoQQBvaEECF5xBACOcQQE/nEECF5xBAhecQQIXnEECF5xBAhecQQIXnEECF5xBAhecQQELaEEB/2hBA2uUQQAEAAAACAAAAAwAAAAQAAAAFAAAABwAAAAkAAAANAAAAEQAAABkAAAAhAAAAMQAAAEEAAABhAAAAgQAAAMEAAAABAQAAgQEAAAECAAABAwAAAQQAAAEGAAABCAAAAQwAAAEQAAABGAAAASAAAAEwAAABQAAAAWAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAABAAAAAgAAAAIAAAADAAAAAwAAAAQAAAAEAAAABQAAAAUAAAAGAAAABgAAAAcAAAAHAAAACAAAAAgAAAAJAAAACQAAAAoAAAAKAAAACwAAAAsAAAAMAAAADAAAAA0AAAANAAAAAAAAAAAAAAADAAAABAAAAAUAAAAGAAAABwAAAAgAAAAJAAAACgAAAAsAAAANAAAADwAAABEAAAATAAAAFwAAABsAAAAfAAAAIwAAACsAAAAzAAAAOwAAAEMAAABTAAAAYwAAAHMAAACDAAAAowAAAMMAAADjAAAAAgEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAQAAAAEAAAABAAAAAgAAAAIAAAACAAAAAgAAAAMAAAADAAAAAwAAAAMAAAAEAAAABAAAAAQAAAAEAAAABQAAAAUAAAAFAAAABQAAAAAAAAAAAAAAAAAAABAREgAIBwkGCgULBAwDDQIOAQ8AAQEAAAEAAAAEAAAA",kh=1073720488,Th=1073643776,Fh={entry:Dh,text:xh,text_start:Rh,data:Mh,data_start:kh,bss_start:Th},Ph=Object.freeze({__proto__:null,bss_start:Th,data:Mh,data_start:kh,default:Fh,entry:Dh,text:xh,text_start:Rh});class Uh extends wa{constructor(){super(...arguments),this.CHIP_NAME="ESP32",this.IMAGE_CHIP_ID=0,this.EFUSE_RD_REG_BASE=1073061888,this.DR_REG_SYSCON_BASE=1073111040,this.UART_CLKDIV_REG=1072955412,this.UART_CLKDIV_MASK=1048575,this.UART_DATE_REG_ADDR=1610612856,this.XTAL_CLK_DIVIDER=1,this.IROM_MAP_START=1074593792,this.IROM_MAP_END=1077936128,this.DROM_MAP_START=1061158912,this.DROM_MAP_END=1065353216,this.MEMORY_MAP=[[0,65536,"PADDING"],[1061158912,1065353216,"DROM"],[1065353216,1069547520,"EXTRAM_DATA"],[1073217536,1073225728,"RTC_DRAM"],[1073283072,1073741824,"BYTE_ACCESSIBLE"],[1073405952,1073741824,"DRAM"],[1073610752,1073741820,"DIRAM_DRAM"],[1073741824,1074200576,"IROM"],[1074200576,1074233344,"CACHE_PRO"],[1074233344,1074266112,"CACHE_APP"],[1074266112,1074397184,"IRAM"],[1074397184,1074528252,"DIRAM_IRAM"],[1074528256,1074536448,"RTC_IRAM"],[1074593792,1077936128,"IROM"],[1342177280,1342185472,"RTC_DATA"]],this.FLASH_SIZES={"1MB":0,"2MB":16,"4MB":32,"8MB":48,"16MB":64,"32MB":80,"64MB":96,"128MB":112},this.FLASH_FREQUENCY={"80m":15,"40m":0,"26m":1,"20m":2},this.FLASH_WRITE_SIZE=1024,this.BOOTLOADER_FLASH_OFFSET=4096,this.SPI_REG_BASE=1072963584,this.SPI_USR_OFFS=28,this.SPI_USR1_OFFS=32,this.SPI_USR2_OFFS=36,this.SPI_W0_OFFS=128,this.SPI_MOSI_DLEN_OFFS=40,this.SPI_MISO_DLEN_OFFS=44}async readEfuse(e,t){const i=this.EFUSE_RD_REG_BASE+4*t;return e.debug("Read efuse "+i),await e.readReg(i)}async getPkgVersion(e){const t=await this.readEfuse(e,3);let i=t>>9&7;return i+=(t>>2&1)<<3,i}async getChipRevision(e){const t=await this.readEfuse(e,3),i=await this.readEfuse(e,5),s=await e.readReg(this.DR_REG_SYSCON_BASE+124);return 0!=(t>>15&1)?0!=(i>>20&1)?0!=(s>>31&1)?3:2:1:0}async getChipDescription(e){const t=["ESP32-D0WDQ6","ESP32-D0WD","ESP32-D2WD","","ESP32-U4WDH","ESP32-PICO-D4","ESP32-PICO-V3-02"];let i="";const s=await this.getPkgVersion(e),r=await this.getChipRevision(e),o=3==r;return 0!=(1&await this.readEfuse(e,3))&&(t[0]="ESP32-S0WDQ6",t[1]="ESP32-S0WD"),o&&(t[5]="ESP32-PICO-V3"),i=s>=0&&s<=6?t[s]:"Unknown ESP32",!o||0!==s&&1!==s||(i+="-V3"),i+" (revision "+r+")"}async getChipFeatures(e){const t=["Wi-Fi"],i=await this.readEfuse(e,3);0===(2&i)&&t.push(" BT");0!==(1&i)?t.push(" Single Core"):t.push(" Dual Core");if(0!==(8192&i)){0!==(4096&i)?t.push(" 160MHz"):t.push(" 240MHz")}const s=await this.getPkgVersion(e);-1!==[2,4,5,6].indexOf(s)&&t.push(" Embedded Flash"),6===s&&t.push(" Embedded PSRAM");0!==(await this.readEfuse(e,4)>>8&31)&&t.push(" VRef calibration in efuse");0!==(i>>14&1)&&t.push(" BLK3 partially reserved");const r=3&await this.readEfuse(e,6);return t.push(" Coding Scheme "+["None","3/4","Repeat (UNSUPPORTED)","Invalid"][r]),t}async getCrystalFreq(e){const t=await e.readReg(this.UART_CLKDIV_REG)&this.UART_CLKDIV_MASK,i=e.transport.baudrate*t/1e6/this.XTAL_CLK_DIVIDER;let s;return s=i>33?40:26,Math.abs(s-i)>1&&e.info("WARNING: Unsupported crystal in use"),s}_d2h(e){const t=(+e).toString(16);return 1===t.length?"0"+t:t}async readMac(e){let t=await this.readEfuse(e,1);t>>>=0;let i=await this.readEfuse(e,2);i>>>=0;const s=new Uint8Array(6);return s[0]=i>>8&255,s[1]=255&i,s[2]=t>>24&255,s[3]=t>>16&255,s[4]=t>>8&255,s[5]=255&t,this._d2h(s[0])+":"+this._d2h(s[1])+":"+this._d2h(s[2])+":"+this._d2h(s[3])+":"+this._d2h(s[4])+":"+this._d2h(s[5])}}var Oh=Object.freeze({__proto__:null,ESP32ROM:Uh});class Qh extends Uh{constructor(){super(...arguments),this.CHIP_NAME="ESP32-C3",this.IMAGE_CHIP_ID=5,this.EFUSE_BASE=1610647552,this.MAC_EFUSE_REG=this.EFUSE_BASE+68,this.UART_CLKDIV_REG=1072955412,this.UART_CLKDIV_MASK=1048575,this.UART_DATE_REG_ADDR=1610612860,this.FLASH_WRITE_SIZE=1024,this.BOOTLOADER_FLASH_OFFSET=0,this.SPI_REG_BASE=1610620928,this.SPI_USR_OFFS=24,this.SPI_USR1_OFFS=28,this.SPI_USR2_OFFS=32,this.SPI_MOSI_DLEN_OFFS=36,this.SPI_MISO_DLEN_OFFS=40,this.SPI_W0_OFFS=88,this.IROM_MAP_START=1107296256,this.IROM_MAP_END=1115684864,this.MEMORY_MAP=[[0,65536,"PADDING"],[1006632960,1015021568,"DROM"],[1070071808,1070465024,"DRAM"],[1070104576,1070596096,"BYTE_ACCESSIBLE"],[1072693248,1072824320,"DROM_MASK"],[1073741824,1074135040,"IROM_MASK"],[1107296256,1115684864,"IROM"],[1077395456,1077805056,"IRAM"],[1342177280,1342185472,"RTC_IRAM"],[1342177280,1342185472,"RTC_DRAM"],[1611653120,1611661312,"MEM_INTERNAL2"]]}async getPkgVersion(e){const t=this.EFUSE_BASE+68+12;return await e.readReg(t)>>21&7}async getChipRevision(e){const t=this.EFUSE_BASE+68+12;return(await e.readReg(t)&7<<18)>>18}async getMinorChipVersion(e){const t=this.EFUSE_BASE+68+20,i=await e.readReg(t)>>23&1,s=this.EFUSE_BASE+68+12;return(i<<3)+(await e.readReg(s)>>18&7)}async getMajorChipVersion(e){const t=this.EFUSE_BASE+68+20;return await e.readReg(t)>>24&3}async getChipDescription(e){const t=await this.getPkgVersion(e),i=await this.getMajorChipVersion(e),s=await this.getMinorChipVersion(e);return`${{0:"ESP32-C3 (QFN32)",1:"ESP8685 (QFN28)",2:"ESP32-C3 AZ (QFN32)",3:"ESP8686 (QFN24)"}[t]||"Unknown ESP32-C3"} (revision v${i}.${s})`}async getFlashCap(e){const t=this.EFUSE_BASE+68+12;return await e.readReg(t)>>27&7}async getFlashVendor(e){const t=this.EFUSE_BASE+68+16;return{1:"XMC",2:"GD",3:"FM",4:"TT",5:"ZBIT"}[7&await e.readReg(t)]||""}async getChipFeatures(e){const t=["Wi-Fi","BLE"],i=await this.getFlashCap(e),s=await this.getFlashVendor(e),r={0:null,1:"Embedded Flash 4MB",2:"Embedded Flash 2MB",3:"Embedded Flash 1MB",4:"Embedded Flash 8MB"}[i],o=void 0!==r?r:"Unknown Embedded Flash";return null!==r&&t.push(`${o} (${s})`),t}async getCrystalFreq(e){return 40}_d2h(e){const t=(+e).toString(16);return 1===t.length?"0"+t:t}async readMac(e){let t=await e.readReg(this.MAC_EFUSE_REG);t>>>=0;let i=await e.readReg(this.MAC_EFUSE_REG+4);i=i>>>0&65535;const s=new Uint8Array(6);return s[0]=i>>8&255,s[1]=255&i,s[2]=t>>24&255,s[3]=t>>16&255,s[4]=t>>8&255,s[5]=255&t,this._d2h(s[0])+":"+this._d2h(s[1])+":"+this._d2h(s[2])+":"+this._d2h(s[3])+":"+this._d2h(s[4])+":"+this._d2h(s[5])}getEraseSize(e,t){return t}}var zh=Object.freeze({__proto__:null,ESP32C3ROM:Qh});var Hh=Object.freeze({__proto__:null,ESP32C2ROM:class extends Qh{constructor(){super(...arguments),this.CHIP_NAME="ESP32-C2",this.IMAGE_CHIP_ID=12,this.EFUSE_BASE=1610647552,this.MAC_EFUSE_REG=this.EFUSE_BASE+64,this.UART_CLKDIV_REG=1610612756,this.UART_CLKDIV_MASK=1048575,this.UART_DATE_REG_ADDR=1610612860,this.XTAL_CLK_DIVIDER=1,this.FLASH_WRITE_SIZE=1024,this.BOOTLOADER_FLASH_OFFSET=0,this.SPI_REG_BASE=1610620928,this.SPI_USR_OFFS=24,this.SPI_USR1_OFFS=28,this.SPI_USR2_OFFS=32,this.SPI_MOSI_DLEN_OFFS=36,this.SPI_MISO_DLEN_OFFS=40,this.SPI_W0_OFFS=88,this.IROM_MAP_START=1107296256,this.IROM_MAP_END=1111490560,this.MEMORY_MAP=[[0,65536,"PADDING"],[1006632960,1010827264,"DROM"],[1070202880,1070465024,"DRAM"],[1070104576,1070596096,"BYTE_ACCESSIBLE"],[1072693248,1073020928,"DROM_MASK"],[1073741824,1074331648,"IROM_MASK"],[1107296256,1111490560,"IROM"],[1077395456,1077673984,"IRAM"]]}async getPkgVersion(e){const t=this.EFUSE_BASE+64+4;return await e.readReg(t)>>22&7}async getChipRevision(e){const t=this.EFUSE_BASE+64+4;return(await e.readReg(t)&3<<20)>>20}async getChipDescription(e){let t;const i=await this.getPkgVersion(e);t=0===i||1===i?"ESP32-C2":"unknown ESP32-C2";return t+=" (revision "+await this.getChipRevision(e)+")",t}async getChipFeatures(e){return["Wi-Fi","BLE"]}async getCrystalFreq(e){const t=await e.readReg(this.UART_CLKDIV_REG)&this.UART_CLKDIV_MASK,i=e.transport.baudrate*t/1e6/this.XTAL_CLK_DIVIDER;let s;return s=i>33?40:26,Math.abs(s-i)>1&&e.info("WARNING: Unsupported crystal in use"),s}async changeBaudRate(e){26===await this.getCrystalFreq(e)&&e.changeBaud()}_d2h(e){const t=(+e).toString(16);return 1===t.length?"0"+t:t}async readMac(e){let t=await e.readReg(this.MAC_EFUSE_REG);t>>>=0;let i=await e.readReg(this.MAC_EFUSE_REG+4);i=i>>>0&65535;const s=new Uint8Array(6);return s[0]=i>>8&255,s[1]=255&i,s[2]=t>>24&255,s[3]=t>>16&255,s[4]=t>>8&255,s[5]=255&t,this._d2h(s[0])+":"+this._d2h(s[1])+":"+this._d2h(s[2])+":"+this._d2h(s[3])+":"+this._d2h(s[4])+":"+this._d2h(s[5])}getEraseSize(e,t){return t}}});class Gh extends Qh{constructor(){super(...arguments),this.CHIP_NAME="ESP32-C6",this.IMAGE_CHIP_ID=13,this.EFUSE_BASE=1611335680,this.EFUSE_BLOCK1_ADDR=this.EFUSE_BASE+68,this.MAC_EFUSE_REG=this.EFUSE_BASE+68,this.UART_CLKDIV_REG=1072955412,this.UART_CLKDIV_MASK=1048575,this.UART_DATE_REG_ADDR=1610612860,this.FLASH_WRITE_SIZE=1024,this.BOOTLOADER_FLASH_OFFSET=0,this.SPI_REG_BASE=1610620928,this.SPI_USR_OFFS=24,this.SPI_USR1_OFFS=28,this.SPI_USR2_OFFS=32,this.SPI_MOSI_DLEN_OFFS=36,this.SPI_MISO_DLEN_OFFS=40,this.SPI_W0_OFFS=88,this.IROM_MAP_START=1107296256,this.IROM_MAP_END=1115684864,this.MEMORY_MAP=[[0,65536,"PADDING"],[1107296256,1124073472,"DROM"],[1082130432,1082654720,"DRAM"],[1082130432,1082654720,"BYTE_ACCESSIBLE"],[1074048e3,1074069504,"DROM_MASK"],[1073741824,1074048e3,"IROM_MASK"],[1107296256,1124073472,"IROM"],[1082130432,1082654720,"IRAM"],[1342177280,1342193664,"RTC_IRAM"],[1342177280,1342193664,"RTC_DRAM"],[1611653120,1611661312,"MEM_INTERNAL2"]]}async getPkgVersion(e){const t=this.EFUSE_BASE+68+12;return await e.readReg(t)>>21&7}async getChipRevision(e){const t=this.EFUSE_BASE+68+12;return(await e.readReg(t)&7<<18)>>18}async getChipDescription(e){let t;t=0===await this.getPkgVersion(e)?"ESP32-C6":"unknown ESP32-C6";return t+=" (revision "+await this.getChipRevision(e)+")",t}async getChipFeatures(e){return["Wi-Fi 6","BT 5","IEEE802.15.4"]}async getCrystalFreq(e){return 40}_d2h(e){const t=(+e).toString(16);return 1===t.length?"0"+t:t}async readMac(e){let t=await e.readReg(this.MAC_EFUSE_REG);t>>>=0;let i=await e.readReg(this.MAC_EFUSE_REG+4);i=i>>>0&65535;const s=new Uint8Array(6);return s[0]=i>>8&255,s[1]=255&i,s[2]=t>>24&255,s[3]=t>>16&255,s[4]=t>>8&255,s[5]=255&t,this._d2h(s[0])+":"+this._d2h(s[1])+":"+this._d2h(s[2])+":"+this._d2h(s[3])+":"+this._d2h(s[4])+":"+this._d2h(s[5])}getEraseSize(e,t){return t}}var Lh=Object.freeze({__proto__:null,ESP32C6ROM:Gh});var Nh=Object.freeze({__proto__:null,ESP32C61ROM:class extends Gh{constructor(){super(...arguments),this.CHIP_NAME="ESP32-C61",this.IMAGE_CHIP_ID=20,this.CHIP_DETECT_MAGIC_VALUE=[871374959,606167151],this.UART_DATE_REG_ADDR=1610612860,this.EFUSE_BASE=1611352064,this.EFUSE_BLOCK1_ADDR=this.EFUSE_BASE+68,this.MAC_EFUSE_REG=this.EFUSE_BASE+68,this.EFUSE_RD_REG_BASE=this.EFUSE_BASE+48,this.EFUSE_PURPOSE_KEY0_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY0_SHIFT=0,this.EFUSE_PURPOSE_KEY1_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY1_SHIFT=4,this.EFUSE_PURPOSE_KEY2_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY2_SHIFT=8,this.EFUSE_PURPOSE_KEY3_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY3_SHIFT=12,this.EFUSE_PURPOSE_KEY4_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY4_SHIFT=16,this.EFUSE_PURPOSE_KEY5_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY5_SHIFT=20,this.EFUSE_DIS_DOWNLOAD_MANUAL_ENCRYPT_REG=this.EFUSE_RD_REG_BASE,this.EFUSE_DIS_DOWNLOAD_MANUAL_ENCRYPT=1<<20,this.EFUSE_SPI_BOOT_CRYPT_CNT_REG=this.EFUSE_BASE+48,this.EFUSE_SPI_BOOT_CRYPT_CNT_MASK=7<<23,this.EFUSE_SECURE_BOOT_EN_REG=this.EFUSE_BASE+52,this.EFUSE_SECURE_BOOT_EN_MASK=1<<26,this.FLASH_FREQUENCY={"80m":15,"40m":0,"20m":2},this.IROM_MAP_START=1107296256,this.IROM_MAP_END=1115684864,this.MEMORY_MAP=[[0,65536,"PADDING"],[1098907648,1107296256,"DROM"],[1082130432,1082523648,"DRAM"],[1082130432,1082523648,"BYTE_ACCESSIBLE"],[1074048e3,1074069504,"DROM_MASK"],[1073741824,1074048e3,"IROM_MASK"],[1090519040,1098907648,"IROM"],[1082130432,1082523648,"IRAM"],[1342177280,1342193664,"RTC_IRAM"],[1342177280,1342193664,"RTC_DRAM"],[1611653120,1611661312,"MEM_INTERNAL2"]],this.UF2_FAMILY_ID=2010665156,this.EFUSE_MAX_KEY=5,this.KEY_PURPOSES={0:"USER/EMPTY",1:"ECDSA_KEY",2:"XTS_AES_256_KEY_1",3:"XTS_AES_256_KEY_2",4:"XTS_AES_128_KEY",5:"HMAC_DOWN_ALL",6:"HMAC_DOWN_JTAG",7:"HMAC_DOWN_DIGITAL_SIGNATURE",8:"HMAC_UP",9:"SECURE_BOOT_DIGEST0",10:"SECURE_BOOT_DIGEST1",11:"SECURE_BOOT_DIGEST2",12:"KM_INIT_KEY",13:"XTS_AES_256_KEY_1_PSRAM",14:"XTS_AES_256_KEY_2_PSRAM",15:"XTS_AES_128_KEY_PSRAM"}}async getPkgVersion(e){return await e.readReg(this.EFUSE_BLOCK1_ADDR+8)>>26&7}async getMinorChipVersion(e){return 15&await e.readReg(this.EFUSE_BLOCK1_ADDR+8)}async getMajorChipVersion(e){return await e.readReg(this.EFUSE_BLOCK1_ADDR+8)>>4&3}async getChipDescription(e){let t;t=0===await this.getPkgVersion(e)?"ESP32-C61":"unknown ESP32-C61";return`${t} (revision v${await this.getMajorChipVersion(e)}.${await this.getMinorChipVersion(e)})`}async getChipFeatures(e){return["WiFi 6","BT 5"]}async readMac(e){let t=await e.readReg(this.MAC_EFUSE_REG);t>>>=0;let i=await e.readReg(this.MAC_EFUSE_REG+4);i=i>>>0&65535;const s=new Uint8Array(6);return s[0]=i>>8&255,s[1]=255&i,s[2]=t>>24&255,s[3]=t>>16&255,s[4]=t>>8&255,s[5]=255&t,this._d2h(s[0])+":"+this._d2h(s[1])+":"+this._d2h(s[2])+":"+this._d2h(s[3])+":"+this._d2h(s[4])+":"+this._d2h(s[5])}}});var Yh=Object.freeze({__proto__:null,ESP32C5ROM:class extends Gh{constructor(){super(...arguments),this.CHIP_NAME="ESP32-C5",this.IMAGE_CHIP_ID=23,this.BOOTLOADER_FLASH_OFFSET=8192,this.EFUSE_BASE=1611352064,this.EFUSE_BLOCK1_ADDR=this.EFUSE_BASE+68,this.MAC_EFUSE_REG=this.EFUSE_BASE+68,this.UART_CLKDIV_REG=1610612756,this.EFUSE_RD_REG_BASE=this.EFUSE_BASE+48,this.EFUSE_FORCE_USE_KEY_MANAGER_KEY_REG=this.EFUSE_BASE+52,this.EFUSE_FORCE_USE_KEY_MANAGER_KEY_SHIFT=10,this.FORCE_USE_KEY_MANAGER_VAL_XTS_AES_KEY=2,this.EFUSE_PURPOSE_KEY0_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY0_SHIFT=22,this.EFUSE_PURPOSE_KEY1_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY1_SHIFT=27,this.EFUSE_PURPOSE_KEY2_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY2_SHIFT=0,this.EFUSE_PURPOSE_KEY3_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY3_SHIFT=5,this.EFUSE_PURPOSE_KEY4_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY4_SHIFT=10,this.EFUSE_PURPOSE_KEY5_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY5_SHIFT=15,this.EFUSE_DIS_DOWNLOAD_MANUAL_ENCRYPT_REG=this.EFUSE_RD_REG_BASE,this.EFUSE_DIS_DOWNLOAD_MANUAL_ENCRYPT=1<<20,this.EFUSE_SPI_BOOT_CRYPT_CNT_REG=this.EFUSE_BASE+52,this.EFUSE_SPI_BOOT_CRYPT_CNT_MASK=7<<18,this.EFUSE_SECURE_BOOT_EN_REG=this.EFUSE_BASE+56,this.EFUSE_SECURE_BOOT_EN_MASK=1<<20,this.IROM_MAP_START=1107296256,this.IROM_MAP_END=1140850688,this.DROM_MAP_START=1107296256,this.DROM_MAP_END=1140850688,this.PCR_SYSCLK_CONF_REG=1611227408,this.PCR_SYSCLK_XTAL_FREQ_V=127<<24,this.PCR_SYSCLK_XTAL_FREQ_S=24,this.XTAL_CLK_DIVIDER=1,this.UARTDEV_BUF_NO=1082520852,this.CHIP_DETECT_MAGIC_VALUE=[285294703,1675706479,1607549039],this.FLASH_FREQUENCY={"80m":15,"40m":0,"20m":2},this.MEMORY_MAP=[[0,65536,"PADDING"],[1107296256,1140850688,"DROM"],[1082130432,1082523648,"DRAM"],[1082130432,1082523648,"BYTE_ACCESSIBLE"],[1073979392,1074003968,"DROM_MASK"],[1073741824,1073979392,"IROM_MASK"],[1107296256,1140850688,"IROM"],[1082130432,1082523648,"IRAM"],[1342177280,1342193664,"RTC_IRAM"],[1342177280,1342193664,"RTC_DRAM"],[1611653120,1611661312,"MEM_INTERNAL2"]],this.UF2_FAMILY_ID=4145808195,this.EFUSE_MAX_KEY=5,this.PURPOSE_VAL_XTS_AES128_KEY=4,this.KEY_PURPOSES={0:"USER/EMPTY",1:"ECDSA_KEY",4:"XTS_AES_128_KEY",5:"HMAC_DOWN_ALL",6:"HMAC_DOWN_JTAG",7:"HMAC_DOWN_DIGITAL_SIGNATURE",8:"HMAC_UP",9:"SECURE_BOOT_DIGEST0",10:"SECURE_BOOT_DIGEST1",11:"SECURE_BOOT_DIGEST2",12:"KM_INIT_KEY",15:"XTS_AES_128_PSRAM_KEY",16:"ECDSA_KEY_P192",17:"ECDSA_KEY_P384_L",18:"ECDSA_KEY_P384_H"}}async getPkgVersion(e){return await e.readReg(this.EFUSE_BLOCK1_ADDR+8)>>26&7}async getMinorChipVersion(e){return 15&await e.readReg(this.EFUSE_BLOCK1_ADDR+8)}async getMajorChipVersion(e){return await e.readReg(this.EFUSE_BLOCK1_ADDR+8)>>4&3}async getChipDescription(e){let t;t=0===await this.getPkgVersion(e)?"ESP32-C5":"unknown ESP32-C5";return`${t} (revision v${await this.getMajorChipVersion(e)}.${await this.getMinorChipVersion(e)})`}async getChipFeatures(e){return["Wi-Fi 6 (dual-band)","BT 5 (LE)","IEEE802.15.4","Single Core + LP Core","240MHz"]}async getCrystalFreq(e){const t=await e.readReg(this.UART_CLKDIV_REG)&this.UART_CLKDIV_MASK,i=e.transport.baudrate*t/1e6/this.XTAL_CLK_DIVIDER;let s;return s=i>45?48:i>33?40:26,Math.abs(s-i)>1&&e.info("WARNING: Unsupported crystal in use"),s}async getCrystalFreqRomExpect(e){return(await e.readReg(this.PCR_SYSCLK_CONF_REG)&this.PCR_SYSCLK_XTAL_FREQ_V)>>this.PCR_SYSCLK_XTAL_FREQ_S}async getKeyBlockPurpose(e,t){if(t<0||t>this.EFUSE_MAX_KEY)throw new Error(`Valid key block numbers must be in range 0-${this.EFUSE_MAX_KEY}`);const i=[[this.EFUSE_PURPOSE_KEY0_REG,this.EFUSE_PURPOSE_KEY0_SHIFT],[this.EFUSE_PURPOSE_KEY1_REG,this.EFUSE_PURPOSE_KEY1_SHIFT],[this.EFUSE_PURPOSE_KEY2_REG,this.EFUSE_PURPOSE_KEY2_SHIFT],[this.EFUSE_PURPOSE_KEY3_REG,this.EFUSE_PURPOSE_KEY3_SHIFT],[this.EFUSE_PURPOSE_KEY4_REG,this.EFUSE_PURPOSE_KEY4_SHIFT],[this.EFUSE_PURPOSE_KEY5_REG,this.EFUSE_PURPOSE_KEY5_SHIFT]],[s,r]=i[t];return await e.readReg(s)>>r&31}async isFlashEncryptionKeyValid(e){const t=[];for(let i=0;i<=this.EFUSE_MAX_KEY;i++){const s=await this.getKeyBlockPurpose(e,i);t.push(s)}if(t.some(e=>e===this.PURPOSE_VAL_XTS_AES128_KEY))return!0;return 0!==(await e.readReg(this.EFUSE_FORCE_USE_KEY_MANAGER_KEY_REG)>>this.EFUSE_FORCE_USE_KEY_MANAGER_KEY_SHIFT&this.FORCE_USE_KEY_MANAGER_VAL_XTS_AES_KEY)}checkSpiConnection(e,t){if(!t.every(e=>e>=0&&e<=28))throw new Error("SPI Pin numbers must be in the range 0-28.");t.some(e=>13===e||14===e)&&e.info("GPIO pins 13 and 14 are used by USB-Serial/JTAG, consider using other pins for SPI flash connection.")}async usesUsbJtagSerial(e){const t=this.UARTDEV_BUF_NO;return 3===(255&await e.readReg(t))}async watchdogReset(e){throw e.info("Hard resetting with a watchdog..."),new Error("watchdogReset not yet implemented for ESP32-C5")}async changeBaud(e){if(!e.IS_STUB){const t=await this.getCrystalFreqRomExpect(e),i=await this.getCrystalFreq(e);e.info(`ROM expects crystal freq: ${t} MHz, detected ${i} MHz.`),(48===i&&40===t||40===i&&48===t)&&e.info("Crystal frequency mismatch detected. Baud rate adjustment may be needed but is not fully implemented in this version.")}await e.changeBaud()}}});var $h=Object.freeze({__proto__:null,ESP32H2ROM:class extends Gh{constructor(){super(...arguments),this.CHIP_NAME="ESP32-H2",this.IMAGE_CHIP_ID=16,this.EFUSE_BASE=1611335680,this.EFUSE_BLOCK1_ADDR=this.EFUSE_BASE+68,this.MAC_EFUSE_REG=this.EFUSE_BASE+68,this.UART_CLKDIV_REG=1072955412,this.UART_CLKDIV_MASK=1048575,this.UART_DATE_REG_ADDR=1610612860,this.FLASH_WRITE_SIZE=1024,this.BOOTLOADER_FLASH_OFFSET=0,this.SPI_REG_BASE=1610620928,this.SPI_USR_OFFS=24,this.SPI_USR1_OFFS=28,this.SPI_USR2_OFFS=32,this.SPI_MOSI_DLEN_OFFS=36,this.SPI_MISO_DLEN_OFFS=40,this.SPI_W0_OFFS=88,this.USB_RAM_BLOCK=2048,this.UARTDEV_BUF_NO_USB=3,this.UARTDEV_BUF_NO=1070526796,this.IROM_MAP_START=1107296256,this.IROM_MAP_END=1115684864,this.MEMORY_MAP=[[0,65536,"PADDING"],[1107296256,1124073472,"DROM"],[1082130432,1082654720,"DRAM"],[1082130432,1082654720,"BYTE_ACCESSIBLE"],[1074048e3,1074069504,"DROM_MASK"],[1073741824,1074048e3,"IROM_MASK"],[1107296256,1124073472,"IROM"],[1082130432,1082654720,"IRAM"],[1342177280,1342193664,"RTC_IRAM"],[1342177280,1342193664,"RTC_DRAM"],[1611653120,1611661312,"MEM_INTERNAL2"]]}async getPkgVersion(e){return 7&await e.readReg(this.EFUSE_BLOCK1_ADDR+16)}async getMinorChipVersion(e){return await e.readReg(this.EFUSE_BLOCK1_ADDR+12)>>18&7}async getMajorChipVersion(e){return await e.readReg(this.EFUSE_BLOCK1_ADDR+12)>>21&3}async getChipDescription(e){let t;t=0===await this.getPkgVersion(e)?"ESP32-H2":"unknown ESP32-H2";return`${t} (revision v${await this.getMajorChipVersion(e)}.${await this.getMinorChipVersion(e)})`}async getChipFeatures(e){return["BT 5 (LE)","IEEE802.15.4","Single Core","96MHz"]}async getCrystalFreq(e){return 32}_d2h(e){const t=(+e).toString(16);return 1===t.length?"0"+t:t}async postConnect(e){const t=255&await e.readReg(this.UARTDEV_BUF_NO);e.debug("In _post_connect "+t),t==this.UARTDEV_BUF_NO_USB&&(e.ESP_RAM_BLOCK=this.USB_RAM_BLOCK)}async readMac(e){let t=await e.readReg(this.MAC_EFUSE_REG);t>>>=0;let i=await e.readReg(this.MAC_EFUSE_REG+4);i=i>>>0&65535;const s=new Uint8Array(6);return s[0]=i>>8&255,s[1]=255&i,s[2]=t>>24&255,s[3]=t>>16&255,s[4]=t>>8&255,s[5]=255&t,this._d2h(s[0])+":"+this._d2h(s[1])+":"+this._d2h(s[2])+":"+this._d2h(s[3])+":"+this._d2h(s[4])+":"+this._d2h(s[5])}getEraseSize(e,t){return t}}});var Kh=Object.freeze({__proto__:null,ESP32S3ROM:class extends Uh{constructor(){super(...arguments),this.CHIP_NAME="ESP32-S3",this.IMAGE_CHIP_ID=9,this.EFUSE_BASE=1610641408,this.MAC_EFUSE_REG=this.EFUSE_BASE+68,this.EFUSE_BLOCK1_ADDR=this.EFUSE_BASE+68,this.EFUSE_BLOCK2_ADDR=this.EFUSE_BASE+92,this.UART_CLKDIV_REG=1610612756,this.UART_CLKDIV_MASK=1048575,this.UART_DATE_REG_ADDR=1610612864,this.FLASH_WRITE_SIZE=1024,this.BOOTLOADER_FLASH_OFFSET=0,this.SPI_REG_BASE=1610620928,this.SPI_USR_OFFS=24,this.SPI_USR1_OFFS=28,this.SPI_USR2_OFFS=32,this.SPI_MOSI_DLEN_OFFS=36,this.SPI_MISO_DLEN_OFFS=40,this.SPI_W0_OFFS=88,this.USB_RAM_BLOCK=2048,this.UARTDEV_BUF_NO_USB=3,this.UARTDEV_BUF_NO=1070526796,this.IROM_MAP_START=1107296256,this.IROM_MAP_END=1140850688,this.MEMORY_MAP=[[0,65536,"PADDING"],[1006632960,1023410176,"DROM"],[1023410176,1040187392,"EXTRAM_DATA"],[1611653120,1611661312,"RTC_DRAM"],[1070104576,1070596096,"BYTE_ACCESSIBLE"],[1070104576,1077813248,"MEM_INTERNAL"],[1070104576,1070596096,"DRAM"],[1073741824,1073848576,"IROM_MASK"],[1077346304,1077805056,"IRAM"],[1611653120,1611661312,"RTC_IRAM"],[1107296256,1115684864,"IROM"],[1342177280,1342185472,"RTC_DATA"]]}async getChipDescription(e){const t=await this.getMajorChipVersion(e),i=await this.getMinorChipVersion(e);return`${{0:"ESP32-S3 (QFN56)",1:"ESP32-S3-PICO-1 (LGA56)"}[await this.getPkgVersion(e)]||"unknown ESP32-S3"} (revision v${t}.${i})`}async getPkgVersion(e){return await e.readReg(this.EFUSE_BLOCK1_ADDR+12)>>21&7}async getRawMinorChipVersion(e){return((await e.readReg(this.EFUSE_BLOCK1_ADDR+20)>>23&1)<<3)+(await e.readReg(this.EFUSE_BLOCK1_ADDR+12)>>18&7)}async getMinorChipVersion(e){const t=await this.getRawMinorChipVersion(e);return await this.isEco0(e,t)?0:this.getRawMinorChipVersion(e)}async getRawMajorChipVersion(e){return await e.readReg(this.EFUSE_BLOCK1_ADDR+20)>>24&3}async getMajorChipVersion(e){const t=await this.getRawMinorChipVersion(e);return await this.isEco0(e,t)?0:this.getRawMajorChipVersion(e)}async getBlkVersionMajor(e){return 3&await e.readReg(this.EFUSE_BLOCK2_ADDR+16)}async getBlkVersionMinor(e){return await e.readReg(this.EFUSE_BLOCK1_ADDR+12)>>24&7}async isEco0(e,t){return!(7&t)&&1===await this.getBlkVersionMajor(e)&&1===await this.getBlkVersionMinor(e)}async getFlashCap(e){const t=this.EFUSE_BASE+68+12;return await e.readReg(t)>>27&7}async getFlashVendor(e){const t=this.EFUSE_BASE+68+16;return{1:"XMC",2:"GD",3:"FM",4:"TT",5:"BY"}[7&await e.readReg(t)]||""}async getPsramCap(e){const t=this.EFUSE_BASE+68+16;return await e.readReg(t)>>3&3}async getPsramVendor(e){const t=this.EFUSE_BASE+68+16;return{1:"AP_3v3",2:"AP_1v8"}[await e.readReg(t)>>7&3]||""}async getChipFeatures(e){const t=["Wi-Fi","BLE"],i=await this.getFlashCap(e),s=await this.getFlashVendor(e),r={0:null,1:"Embedded Flash 8MB",2:"Embedded Flash 4MB"}[i],o=void 0!==r?r:"Unknown Embedded Flash";null!==r&&t.push(`${o} (${s})`);const n=await this.getPsramCap(e),a=await this.getPsramVendor(e),l={0:null,1:"Embedded PSRAM 8MB",2:"Embedded PSRAM 2MB"}[n],c=void 0!==l?l:"Unknown Embedded PSRAM";return null!==l&&t.push(`${c} (${a})`),t}async getCrystalFreq(e){return 40}_d2h(e){const t=(+e).toString(16);return 1===t.length?"0"+t:t}async postConnect(e){const t=255&await e.readReg(this.UARTDEV_BUF_NO);e.debug("In _post_connect "+t),t==this.UARTDEV_BUF_NO_USB&&(e.ESP_RAM_BLOCK=this.USB_RAM_BLOCK)}async readMac(e){let t=await e.readReg(this.MAC_EFUSE_REG);t>>>=0;let i=await e.readReg(this.MAC_EFUSE_REG+4);i=i>>>0&65535;const s=new Uint8Array(6);return s[0]=i>>8&255,s[1]=255&i,s[2]=t>>24&255,s[3]=t>>16&255,s[4]=t>>8&255,s[5]=255&t,this._d2h(s[0])+":"+this._d2h(s[1])+":"+this._d2h(s[2])+":"+this._d2h(s[3])+":"+this._d2h(s[4])+":"+this._d2h(s[5])}getEraseSize(e,t){return t}}});var Jh=Object.freeze({__proto__:null,ESP32S2ROM:class extends Uh{constructor(){super(...arguments),this.CHIP_NAME="ESP32-S2",this.IMAGE_CHIP_ID=2,this.IROM_MAP_START=1074266112,this.IROM_MAP_END=1085800448,this.DROM_MAP_START=1056964608,this.DROM_MAP_END=1061093376,this.CHIP_DETECT_MAGIC_VALUE=[1990],this.SPI_REG_BASE=1061167104,this.SPI_USR_OFFS=24,this.SPI_USR1_OFFS=28,this.SPI_USR2_OFFS=32,this.SPI_MOSI_DLEN_OFFS=36,this.SPI_MISO_DLEN_OFFS=40,this.SPI_W0_OFFS=88,this.SPI_ADDR_REG_MSB=!1,this.MAC_EFUSE_REG=1061265476,this.UART_CLKDIV_REG=1061158932,this.SUPPORTS_ENCRYPTED_FLASH=!0,this.FLASH_ENCRYPTED_WRITE_ALIGN=16,this.EFUSE_BASE=1061265408,this.EFUSE_RD_REG_BASE=this.EFUSE_BASE+48,this.EFUSE_BLOCK1_ADDR=this.EFUSE_BASE+68,this.EFUSE_BLOCK2_ADDR=this.EFUSE_BASE+92,this.EFUSE_PURPOSE_KEY0_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY0_SHIFT=24,this.EFUSE_PURPOSE_KEY1_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY1_SHIFT=28,this.EFUSE_PURPOSE_KEY2_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY2_SHIFT=0,this.EFUSE_PURPOSE_KEY3_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY3_SHIFT=4,this.EFUSE_PURPOSE_KEY4_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY4_SHIFT=8,this.EFUSE_PURPOSE_KEY5_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY5_SHIFT=12,this.EFUSE_DIS_DOWNLOAD_MANUAL_ENCRYPT_REG=this.EFUSE_RD_REG_BASE,this.EFUSE_DIS_DOWNLOAD_MANUAL_ENCRYPT=1<<19,this.EFUSE_SPI_BOOT_CRYPT_CNT_REG=this.EFUSE_BASE+52,this.EFUSE_SPI_BOOT_CRYPT_CNT_MASK=7<<18,this.EFUSE_SECURE_BOOT_EN_REG=this.EFUSE_BASE+56,this.EFUSE_SECURE_BOOT_EN_MASK=1<<20,this.EFUSE_RD_REPEAT_DATA3_REG=this.EFUSE_BASE+60,this.EFUSE_RD_REPEAT_DATA3_REG_FLASH_TYPE_MASK=512,this.PURPOSE_VAL_XTS_AES256_KEY_1=2,this.PURPOSE_VAL_XTS_AES256_KEY_2=3,this.PURPOSE_VAL_XTS_AES128_KEY=4,this.UARTDEV_BUF_NO=1073741076,this.UARTDEV_BUF_NO_USB_OTG=2,this.USB_RAM_BLOCK=2048,this.GPIO_STRAP_REG=1061175352,this.GPIO_STRAP_SPI_BOOT_MASK=8,this.GPIO_STRAP_VDDSPI_MASK=16,this.RTC_CNTL_OPTION1_REG=1061191976,this.RTC_CNTL_FORCE_DOWNLOAD_BOOT_MASK=1,this.RTCCNTL_BASE_REG=1061191680,this.RTC_CNTL_WDTCONFIG0_REG=this.RTCCNTL_BASE_REG+148,this.RTC_CNTL_WDTCONFIG1_REG=this.RTCCNTL_BASE_REG+152,this.RTC_CNTL_WDTWPROTECT_REG=this.RTCCNTL_BASE_REG+172,this.RTC_CNTL_WDT_WKEY=1356348065,this.MEMORY_MAP=[[0,65536,"PADDING"],[1056964608,1073217536,"DROM"],[1062207488,1073217536,"EXTRAM_DATA"],[1073340416,1073348608,"RTC_DRAM"],[1073340416,1073741824,"BYTE_ACCESSIBLE"],[1073340416,1074208768,"MEM_INTERNAL"],[1073414144,1073741824,"DRAM"],[1073741824,1073848576,"IROM_MASK"],[1073872896,1074200576,"IRAM"],[1074200576,1074208768,"RTC_IRAM"],[1074266112,1082130432,"IROM"],[1342177280,1342185472,"RTC_DATA"]],this.EFUSE_VDD_SPI_REG=this.EFUSE_BASE+52,this.VDD_SPI_XPD=16,this.VDD_SPI_TIEH=32,this.VDD_SPI_FORCE=64,this.UF2_FAMILY_ID=3218951918,this.EFUSE_MAX_KEY=5,this.KEY_PURPOSES={0:"USER/EMPTY",1:"RESERVED",2:"XTS_AES_256_KEY_1",3:"XTS_AES_256_KEY_2",4:"XTS_AES_128_KEY",5:"HMAC_DOWN_ALL",6:"HMAC_DOWN_JTAG",7:"HMAC_DOWN_DIGITAL_SIGNATURE",8:"HMAC_UP",9:"SECURE_BOOT_DIGEST0",10:"SECURE_BOOT_DIGEST1",11:"SECURE_BOOT_DIGEST2"},this.UART_CLKDIV_MASK=1048575,this.UART_DATE_REG_ADDR=1610612856,this.FLASH_WRITE_SIZE=1024,this.BOOTLOADER_FLASH_OFFSET=4096}async getPkgVersion(e){const t=this.EFUSE_BLOCK1_ADDR+16;return 15&await e.readReg(t)}async getMinorChipVersion(e){return((await e.readReg(this.EFUSE_BLOCK1_ADDR+12)>>20&1)<<3)+(await e.readReg(this.EFUSE_BLOCK1_ADDR+16)>>4&7)}async getMajorChipVersion(e){return await e.readReg(this.EFUSE_BLOCK1_ADDR+12)>>18&3}async getFlashVersion(e){return await e.readReg(this.EFUSE_BLOCK1_ADDR+12)>>21&15}async getChipDescription(e){const t=await this.getFlashCap(e)+100*await this.getPsramCap(e),i=await this.getMajorChipVersion(e),s=await this.getMinorChipVersion(e);return`${{0:"ESP32-S2",1:"ESP32-S2FH2",2:"ESP32-S2FH4",102:"ESP32-S2FNR2",100:"ESP32-S2R2"}[t]||"unknown ESP32-S2"} (revision v${i}.${s})`}async getFlashCap(e){return await this.getFlashVersion(e)}async getPsramVersion(e){const t=this.EFUSE_BLOCK1_ADDR+12;return await e.readReg(t)>>28&15}async getPsramCap(e){return await this.getPsramVersion(e)}async getBlock2Version(e){const t=this.EFUSE_BLOCK2_ADDR+16;return await e.readReg(t)>>4&7}async getChipFeatures(e){const t=["Wi-Fi"],i={0:"No Embedded Flash",1:"Embedded Flash 2MB",2:"Embedded Flash 4MB"}[await this.getFlashCap(e)]||"Unknown Embedded Flash";t.push(i);const s={0:"No Embedded Flash",1:"Embedded PSRAM 2MB",2:"Embedded PSRAM 4MB"}[await this.getPsramCap(e)]||"Unknown Embedded PSRAM";t.push(s);const r={0:"No calibration in BLK2 of efuse",1:"ADC and temperature sensor calibration in BLK2 of efuse V1",2:"ADC and temperature sensor calibration in BLK2 of efuse V2"}[await this.getBlock2Version(e)]||"Unknown Calibration in BLK2";return t.push(r),t}async getCrystalFreq(e){return 40}_d2h(e){const t=(+e).toString(16);return 1===t.length?"0"+t:t}async readMac(e){let t=await e.readReg(this.MAC_EFUSE_REG);t>>>=0;let i=await e.readReg(this.MAC_EFUSE_REG+4);i=i>>>0&65535;const s=new Uint8Array(6);return s[0]=i>>8&255,s[1]=255&i,s[2]=t>>24&255,s[3]=t>>16&255,s[4]=t>>8&255,s[5]=255&t,this._d2h(s[0])+":"+this._d2h(s[1])+":"+this._d2h(s[2])+":"+this._d2h(s[3])+":"+this._d2h(s[4])+":"+this._d2h(s[5])}getEraseSize(e,t){return t}async usingUsbOtg(e){return(255&await e.readReg(this.UARTDEV_BUF_NO))===this.UARTDEV_BUF_NO_USB_OTG}async postConnect(e){const t=await this.usingUsbOtg(e);e.debug("In _post_connect using USB OTG ?"+t),t&&(e.ESP_RAM_BLOCK=this.USB_RAM_BLOCK)}}});var Wh=Object.freeze({__proto__:null,ESP32P4ROM:class extends Uh{constructor(){super(...arguments),this.CHIP_NAME="ESP32-P4",this.IMAGE_CHIP_ID=18,this.IROM_MAP_START=1073741824,this.IROM_MAP_END=1275068416,this.DROM_MAP_START=1073741824,this.DROM_MAP_END=1275068416,this.BOOTLOADER_FLASH_OFFSET=8192,this.CHIP_DETECT_MAGIC_VALUE=[0,182303440],this.UART_DATE_REG_ADDR=1343004812,this.EFUSE_BASE=1343410176,this.EFUSE_BLOCK1_ADDR=this.EFUSE_BASE+68,this.MAC_EFUSE_REG=this.EFUSE_BASE+68,this.SPI_REG_BASE=1342754816,this.SPI_USR_OFFS=24,this.SPI_USR1_OFFS=28,this.SPI_USR2_OFFS=32,this.SPI_MOSI_DLEN_OFFS=36,this.SPI_MISO_DLEN_OFFS=40,this.SPI_W0_OFFS=88,this.SPI_ADDR_REG_MSB=!1,this.USES_MAGIC_VALUE=!1,this.EFUSE_RD_REG_BASE=this.EFUSE_BASE+48,this.EFUSE_FORCE_USE_KEY_MANAGER_KEY_REG=this.EFUSE_BASE+52,this.EFUSE_FORCE_USE_KEY_MANAGER_KEY_SHIFT=9,this.FORCE_USE_KEY_MANAGER_VAL_XTS_AES_KEY=2,this.EFUSE_PURPOSE_KEY0_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY0_SHIFT=24,this.EFUSE_PURPOSE_KEY1_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY1_SHIFT=28,this.EFUSE_PURPOSE_KEY2_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY2_SHIFT=0,this.EFUSE_PURPOSE_KEY3_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY3_SHIFT=4,this.EFUSE_PURPOSE_KEY4_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY4_SHIFT=8,this.EFUSE_PURPOSE_KEY5_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY5_SHIFT=12,this.EFUSE_DIS_DOWNLOAD_MANUAL_ENCRYPT_REG=this.EFUSE_RD_REG_BASE,this.EFUSE_DIS_DOWNLOAD_MANUAL_ENCRYPT=1<<20,this.EFUSE_SPI_BOOT_CRYPT_CNT_REG=this.EFUSE_BASE+52,this.EFUSE_SPI_BOOT_CRYPT_CNT_MASK=7<<18,this.EFUSE_SECURE_BOOT_EN_REG=this.EFUSE_BASE+56,this.EFUSE_SECURE_BOOT_EN_MASK=1<<20,this.PURPOSE_VAL_XTS_AES256_KEY_1=2,this.PURPOSE_VAL_XTS_AES256_KEY_2=3,this.PURPOSE_VAL_XTS_AES128_KEY=4,this.SUPPORTS_ENCRYPTED_FLASH=!0,this.FLASH_ENCRYPTED_WRITE_ALIGN=16,this.USB_RAM_BLOCK=2048,this.GPIO_STRAP_REG=1343094840,this.GPIO_STRAP_SPI_BOOT_MASK=8,this.RTC_CNTL_OPTION1_REG=1343291400,this.RTC_CNTL_FORCE_DOWNLOAD_BOOT_MASK=4,this.DR_REG_LPAON_BASE=1343291392,this.DR_REG_PMU_BASE=this.DR_REG_LPAON_BASE+20480,this.DR_REG_LP_SYS_BASE=this.DR_REG_LPAON_BASE+0,this.LP_SYSTEM_REG_ANA_XPD_PAD_GROUP_REG=this.DR_REG_LP_SYS_BASE+268,this.PMU_EXT_LDO_P0_0P1A_ANA_REG=this.DR_REG_PMU_BASE+444,this.PMU_ANA_0P1A_EN_CUR_LIM_0=1<<27,this.PMU_EXT_LDO_P0_0P1A_REG=this.DR_REG_PMU_BASE+440,this.PMU_0P1A_TARGET0_0=255<<23,this.PMU_0P1A_FORCE_TIEH_SEL_0=128,this.PMU_DATE_REG=this.DR_REG_PMU_BASE+1020,this.UARTDEV_BUF_NO_USB_OTG=5,this.UARTDEV_BUF_NO_USB_JTAG_SERIAL=6,this.DR_REG_LP_WDT_BASE=1343315968,this.RTC_CNTL_WDTCONFIG0_REG=this.DR_REG_LP_WDT_BASE+0,this.RTC_CNTL_WDTCONFIG1_REG=this.DR_REG_LP_WDT_BASE+4,this.RTC_CNTL_WDTWPROTECT_REG=this.DR_REG_LP_WDT_BASE+24,this.RTC_CNTL_WDT_WKEY=1356348065,this.RTC_CNTL_SWD_CONF_REG=this.DR_REG_LP_WDT_BASE+28,this.RTC_CNTL_SWD_AUTO_FEED_EN=1<<18,this.RTC_CNTL_SWD_WPROTECT_REG=this.DR_REG_LP_WDT_BASE+32,this.RTC_CNTL_SWD_WKEY=1356348065,this.MEMORY_MAP=[[0,65536,"PADDING"],[1073741824,1275068416,"DROM"],[1341128704,1341784064,"DRAM"],[1341128704,1341784064,"BYTE_ACCESSIBLE"],[1337982976,1338114048,"DROM_MASK"],[1337982976,1338114048,"IROM_MASK"],[1073741824,1275068416,"IROM"],[1341128704,1341784064,"IRAM"],[1343258624,1343291392,"RTC_IRAM"],[1343258624,1343291392,"RTC_DRAM"],[1611653120,1611661312,"MEM_INTERNAL2"]],this.UF2_FAMILY_ID=1026592404,this.EFUSE_MAX_KEY=5,this.KEY_PURPOSES={0:"USER/EMPTY",1:"ECDSA_KEY",2:"XTS_AES_256_KEY_1",3:"XTS_AES_256_KEY_2",4:"XTS_AES_128_KEY",5:"HMAC_DOWN_ALL",6:"HMAC_DOWN_JTAG",7:"HMAC_DOWN_DIGITAL_SIGNATURE",8:"HMAC_UP",9:"SECURE_BOOT_DIGEST0",10:"SECURE_BOOT_DIGEST1",11:"SECURE_BOOT_DIGEST2",12:"KM_INIT_KEY"}}async getPkgVersion(e){const t=this.EFUSE_BLOCK1_ADDR+8;return await e.readReg(t)>>20&7}async getMinorChipVersion(e){const t=this.EFUSE_BLOCK1_ADDR+8;return 15&await e.readReg(t)}async getMajorChipVersion(e){const t=this.EFUSE_BLOCK1_ADDR+8,i=await e.readReg(t);return(i>>23&1)<<2|i>>4&3}async getChipRevision(e){return 100*await this.getMajorChipVersion(e)+await this.getMinorChipVersion(e)}async getStubJsonPath(e){return await this.getChipRevision(e)<300?"./targets/stub_flasher/stub_flasher_32p4rc1.json":"./targets/stub_flasher/stub_flasher_32p4.json"}async getChipDescription(e){return`${{0:"ESP32-P4"}[await this.getPkgVersion(e)]||"Unknown ESP32-P4"} (revision v${await this.getMajorChipVersion(e)}.${await this.getMinorChipVersion(e)})`}async getChipFeatures(e){return["High-Performance MCU"]}async getCrystalFreq(e){return 40}async getFlashVoltage(e){}async overrideVddsdio(e){e.debug("VDD_SDIO overrides are not supported for ESP32-P4")}async readMac(e){let t=await e.readReg(this.MAC_EFUSE_REG);t>>>=0;let i=await e.readReg(this.MAC_EFUSE_REG+4);i=i>>>0&65535;const s=new Uint8Array(6);return s[0]=i>>8&255,s[1]=255&i,s[2]=t>>24&255,s[3]=t>>16&255,s[4]=t>>8&255,s[5]=255&t,this._d2h(s[0])+":"+this._d2h(s[1])+":"+this._d2h(s[2])+":"+this._d2h(s[3])+":"+this._d2h(s[4])+":"+this._d2h(s[5])}async getFlashCryptConfig(e){}async getSecureBootEnabled(e){return 0!==(await e.readReg(this.EFUSE_SECURE_BOOT_EN_REG)&this.EFUSE_SECURE_BOOT_EN_MASK)}async getUartdevBufNo(e){return(await this.getChipRevision(e)<300?1341390512:1341914800)+24}async usesUsbOtg(e){const t=await this.getUartdevBufNo(e);return(255&await e.readReg(t))===this.UARTDEV_BUF_NO_USB_OTG}async usesUsbJtagSerial(e){const t=await this.getUartdevBufNo(e);return(255&await e.readReg(t))===this.UARTDEV_BUF_NO_USB_JTAG_SERIAL}async getKeyBlockPurpose(e,t){if(t<0||t>this.EFUSE_MAX_KEY)return void e.debug(`Valid key block numbers must be in range 0-${this.EFUSE_MAX_KEY}`);const i=[[this.EFUSE_PURPOSE_KEY0_REG,this.EFUSE_PURPOSE_KEY0_SHIFT],[this.EFUSE_PURPOSE_KEY1_REG,this.EFUSE_PURPOSE_KEY1_SHIFT],[this.EFUSE_PURPOSE_KEY2_REG,this.EFUSE_PURPOSE_KEY2_SHIFT],[this.EFUSE_PURPOSE_KEY3_REG,this.EFUSE_PURPOSE_KEY3_SHIFT],[this.EFUSE_PURPOSE_KEY4_REG,this.EFUSE_PURPOSE_KEY4_SHIFT],[this.EFUSE_PURPOSE_KEY5_REG,this.EFUSE_PURPOSE_KEY5_SHIFT]],[s,r]=i[t];return await e.readReg(s)>>r&15}async isFlashEncryptionKeyValid(e){const t=[];for(let i=0;i<=this.EFUSE_MAX_KEY;i++){const s=await this.getKeyBlockPurpose(e,i);t.push(s)}if(t.some(e=>e===this.PURPOSE_VAL_XTS_AES128_KEY))return!0;if(t.some(e=>e===this.PURPOSE_VAL_XTS_AES256_KEY_1)&&t.some(e=>e===this.PURPOSE_VAL_XTS_AES256_KEY_2))return!0;return 0!==(await e.readReg(this.EFUSE_FORCE_USE_KEY_MANAGER_KEY_REG)>>this.EFUSE_FORCE_USE_KEY_MANAGER_KEY_SHIFT&this.FORCE_USE_KEY_MANAGER_VAL_XTS_AES_KEY)}async postConnect(e){await this.usesUsbOtg(e)&&(e.ESP_RAM_BLOCK=this.USB_RAM_BLOCK),e.IS_STUB||await this.disableWatchdogs(e)}async disableWatchdogs(e){if(await this.usesUsbJtagSerial(e)){await e.writeReg(this.RTC_CNTL_WDTWPROTECT_REG,this.RTC_CNTL_WDT_WKEY),await e.writeReg(this.RTC_CNTL_WDTCONFIG0_REG,0),await e.writeReg(this.RTC_CNTL_WDTWPROTECT_REG,0),await e.writeReg(this.RTC_CNTL_SWD_WPROTECT_REG,this.RTC_CNTL_SWD_WKEY);const t=await e.readReg(this.RTC_CNTL_SWD_CONF_REG);await e.writeReg(this.RTC_CNTL_SWD_CONF_REG,t|this.RTC_CNTL_SWD_AUTO_FEED_EN),await e.writeReg(this.RTC_CNTL_SWD_WPROTECT_REG,0)}}checkSpiConnection(e,t){if(!t.every(e=>e>=0&&e<=54))throw new Error("SPI Pin numbers must be in the range 0-54.");t.some(e=>24===e||25===e)&&e.debug("GPIO pins 24 and 25 are used by USB-Serial/JTAG, consider using other pins for SPI flash connection.")}async watchdogReset(e){e.info("Hard resetting with a watchdog..."),await e.writeReg(this.RTC_CNTL_WDTWPROTECT_REG,this.RTC_CNTL_WDT_WKEY),await e.writeReg(this.RTC_CNTL_WDTCONFIG1_REG,2e3),await e.writeReg(this.RTC_CNTL_WDTCONFIG0_REG,-805306110),await e.writeReg(this.RTC_CNTL_WDTWPROTECT_REG,0),await new Promise(e=>setTimeout(e,500))}async powerOnFlash(e){if(await this.getChipRevision(e)<=300)return;await e.writeReg(this.LP_SYSTEM_REG_ANA_XPD_PAD_GROUP_REG,1),await new Promise(e=>setTimeout(e,10));let t=await e.readReg(this.PMU_EXT_LDO_P0_0P1A_ANA_REG);await e.writeReg(this.PMU_EXT_LDO_P0_0P1A_ANA_REG,t|this.PMU_ANA_0P1A_EN_CUR_LIM_0),t=await e.readReg(this.PMU_EXT_LDO_P0_0P1A_REG),await e.writeReg(this.PMU_EXT_LDO_P0_0P1A_REG,t|this.PMU_0P1A_FORCE_TIEH_SEL_0),t=await e.readReg(this.PMU_DATE_REG),await e.writeReg(this.PMU_DATE_REG,3|t),await new Promise(e=>setTimeout(e,50)),t=await e.readReg(this.PMU_EXT_LDO_P0_0P1A_ANA_REG),await e.writeReg(this.PMU_EXT_LDO_P0_0P1A_ANA_REG,t&~this.PMU_ANA_0P1A_EN_CUR_LIM_0),t=await e.readReg(this.PMU_EXT_LDO_P0_0P1A_REG),await e.writeReg(this.PMU_EXT_LDO_P0_0P1A_REG,t&~this.PMU_0P1A_TARGET0_0),t=await e.readReg(this.PMU_EXT_LDO_P0_0P1A_REG),await e.writeReg(this.PMU_EXT_LDO_P0_0P1A_REG,128|t),t=await e.readReg(this.PMU_EXT_LDO_P0_0P1A_REG),await e.writeReg(this.PMU_EXT_LDO_P0_0P1A_REG,t&~this.PMU_0P1A_FORCE_TIEH_SEL_0),await new Promise(e=>setTimeout(e,1800))}}});export{Jl as EPPGridPanel};
