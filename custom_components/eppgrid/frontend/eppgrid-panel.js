function t(t,e,i,s){var o,r=arguments.length,n=r<3?e:null===s?s=Object.getOwnPropertyDescriptor(e,i):s;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(t,e,i,s);else for(var a=t.length-1;a>=0;a--)(o=t[a])&&(n=(r<3?o(n):r>3?o(e,i,n):o(e,i))||n);return r>3&&n&&Object.defineProperty(e,i,n),n}"function"==typeof SuppressedError&&SuppressedError;
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const e=globalThis,i=e.ShadowRoot&&(void 0===e.ShadyCSS||e.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,s=Symbol(),o=new WeakMap;let r=class{constructor(t,e,i){if(this._$cssResult$=!0,i!==s)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o;const e=this.t;if(i&&void 0===t){const i=void 0!==e&&1===e.length;i&&(t=o.get(e)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),i&&o.set(e,t))}return t}toString(){return this.cssText}};const n=(t,...e)=>{const i=1===t.length?t[0]:e.reduce((e,i,s)=>e+(t=>{if(!0===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+t[s+1],t[0]);return new r(i,t,s)},a=i?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const i of t.cssRules)e+=i.cssText;return(t=>new r("string"==typeof t?t:t+"",void 0,s))(e)})(t):t,{is:l,defineProperty:c,getOwnPropertyDescriptor:h,getOwnPropertyNames:d,getOwnPropertySymbols:A,getPrototypeOf:g}=Object,u=globalThis,_=u.trustedTypes,p=_?_.emptyScript:"",f=u.reactiveElementPolyfillSupport,w=(t,e)=>t,E={toAttribute(t,e){switch(e){case Boolean:t=t?p:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t)}return t},fromAttribute(t,e){let i=t;switch(e){case Boolean:i=null!==t;break;case Number:i=null===t?null:Number(t);break;case Object:case Array:try{i=JSON.parse(t)}catch(t){i=null}}return i}},m=(t,e)=>!l(t,e),b={attribute:!0,type:String,converter:E,reflect:!1,useDefault:!1,hasChanged:m};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */Symbol.metadata??=Symbol("metadata"),u.litPropertyMetadata??=new WeakMap;let y=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=b){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){const i=Symbol(),s=this.getPropertyDescriptor(t,i,e);void 0!==s&&c(this.prototype,t,s)}}static getPropertyDescriptor(t,e,i){const{get:s,set:o}=h(this.prototype,t)??{get(){return this[e]},set(t){this[e]=t}};return{get:s,set(e){const r=s?.call(this);o?.call(this,e),this.requestUpdate(t,r,i)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??b}static _$Ei(){if(this.hasOwnProperty(w("elementProperties")))return;const t=g(this);t.finalize(),void 0!==t.l&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(w("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(w("properties"))){const t=this.properties,e=[...d(t),...A(t)];for(const i of e)this.createProperty(i,t[i])}const t=this[Symbol.metadata];if(null!==t){const e=litPropertyMetadata.get(t);if(void 0!==e)for(const[t,i]of e)this.elementProperties.set(t,i)}this._$Eh=new Map;for(const[t,e]of this.elementProperties){const i=this._$Eu(t,e);void 0!==i&&this._$Eh.set(i,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const e=[];if(Array.isArray(t)){const i=new Set(t.flat(1/0).reverse());for(const t of i)e.unshift(a(t))}else void 0!==t&&e.push(a(t));return e}static _$Eu(t,e){const i=e.attribute;return!1===i?void 0:"string"==typeof i?i:"string"==typeof t?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this))}addController(t){(this._$EO??=new Set).add(t),void 0!==this.renderRoot&&this.isConnected&&t.hostConnected?.()}removeController(t){this._$EO?.delete(t)}_$E_(){const t=new Map,e=this.constructor.elementProperties;for(const i of e.keys())this.hasOwnProperty(i)&&(t.set(i,this[i]),delete this[i]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return((t,s)=>{if(i)t.adoptedStyleSheets=s.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const i of s){const s=document.createElement("style"),o=e.litNonce;void 0!==o&&s.setAttribute("nonce",o),s.textContent=i.cssText,t.appendChild(s)}})(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(t=>t.hostConnected?.())}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.())}attributeChangedCallback(t,e,i){this._$AK(t,i)}_$ET(t,e){const i=this.constructor.elementProperties.get(t),s=this.constructor._$Eu(t,i);if(void 0!==s&&!0===i.reflect){const o=(void 0!==i.converter?.toAttribute?i.converter:E).toAttribute(e,i.type);this._$Em=t,null==o?this.removeAttribute(s):this.setAttribute(s,o),this._$Em=null}}_$AK(t,e){const i=this.constructor,s=i._$Eh.get(t);if(void 0!==s&&this._$Em!==s){const t=i.getPropertyOptions(s),o="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==t.converter?.fromAttribute?t.converter:E;this._$Em=s;const r=o.fromAttribute(e,t.type);this[s]=r??this._$Ej?.get(s)??r,this._$Em=null}}requestUpdate(t,e,i,s=!1,o){if(void 0!==t){const r=this.constructor;if(!1===s&&(o=this[t]),i??=r.getPropertyOptions(t),!((i.hasChanged??m)(o,e)||i.useDefault&&i.reflect&&o===this._$Ej?.get(t)&&!this.hasAttribute(r._$Eu(t,i))))return;this.C(t,e,i)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(t,e,{useDefault:i,reflect:s,wrapped:o},r){i&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,r??e??this[t]),!0!==o||void 0!==r)||(this._$AL.has(t)||(this.hasUpdated||i||(e=void 0),this._$AL.set(t,e)),!0===s&&this._$Em!==t&&(this._$Eq??=new Set).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[t,e]of this._$Ep)this[t]=e;this._$Ep=void 0}const t=this.constructor.elementProperties;if(t.size>0)for(const[e,i]of t){const{wrapped:t}=i,s=this[e];!0!==t||this._$AL.has(e)||void 0===s||this.C(e,void 0,i,s)}}let t=!1;const e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),this._$EO?.forEach(t=>t.hostUpdate?.()),this.update(e)):this._$EM()}catch(e){throw t=!1,this._$EM(),e}t&&this._$AE(e)}willUpdate(t){}_$AE(t){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(t){}firstUpdated(t){}};y.elementStyles=[],y.shadowRootOptions={mode:"open"},y[w("elementProperties")]=new Map,y[w("finalized")]=new Map,f?.({ReactiveElement:y}),(u.reactiveElementVersions??=[]).push("2.1.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const v=globalThis,C=t=>t,B=v.trustedTypes,S=B?B.createPolicy("lit-html",{createHTML:t=>t}):void 0,I="$lit$",x=`lit$${Math.random().toFixed(9).slice(2)}$`,D="?"+x,M=`<${D}>`,R=document,k=()=>R.createComment(""),T=t=>null===t||"object"!=typeof t&&"function"!=typeof t,F=Array.isArray,P="[ \t\n\f\r]",U=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,O=/-->/g,z=/>/g,Q=RegExp(`>|${P}(?:([^\\s"'>=/]+)(${P}*=${P}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),H=/'/g,G=/"/g,L=/^(?:script|style|textarea|title)$/i,N=t=>(e,...i)=>({_$litType$:t,strings:e,values:i}),$=N(1),Y=N(2),K=Symbol.for("lit-noChange"),J=Symbol.for("lit-nothing"),W=new WeakMap,j=R.createTreeWalker(R,129);function V(t,e){if(!F(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==S?S.createHTML(e):e}class Z{constructor({strings:t,_$litType$:e},i){let s;this.parts=[];let o=0,r=0;const n=t.length-1,a=this.parts,[l,c]=((t,e)=>{const i=t.length-1,s=[];let o,r=2===e?"<svg>":3===e?"<math>":"",n=U;for(let e=0;e<i;e++){const i=t[e];let a,l,c=-1,h=0;for(;h<i.length&&(n.lastIndex=h,l=n.exec(i),null!==l);)h=n.lastIndex,n===U?"!--"===l[1]?n=O:void 0!==l[1]?n=z:void 0!==l[2]?(L.test(l[2])&&(o=RegExp("</"+l[2],"g")),n=Q):void 0!==l[3]&&(n=Q):n===Q?">"===l[0]?(n=o??U,c=-1):void 0===l[1]?c=-2:(c=n.lastIndex-l[2].length,a=l[1],n=void 0===l[3]?Q:'"'===l[3]?G:H):n===G||n===H?n=Q:n===O||n===z?n=U:(n=Q,o=void 0);const d=n===Q&&t[e+1].startsWith("/>")?" ":"";r+=n===U?i+M:c>=0?(s.push(a),i.slice(0,c)+I+i.slice(c)+x+d):i+x+(-2===c?e:d)}return[V(t,r+(t[i]||"<?>")+(2===e?"</svg>":3===e?"</math>":"")),s]})(t,e);if(this.el=Z.createElement(l,i),j.currentNode=this.el.content,2===e||3===e){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes)}for(;null!==(s=j.nextNode())&&a.length<n;){if(1===s.nodeType){if(s.hasAttributes())for(const t of s.getAttributeNames())if(t.endsWith(I)){const e=c[r++],i=s.getAttribute(t).split(x),n=/([.?@])?(.*)/.exec(e);a.push({type:1,index:o,name:n[2],strings:i,ctor:"."===n[1]?it:"?"===n[1]?st:"@"===n[1]?ot:et}),s.removeAttribute(t)}else t.startsWith(x)&&(a.push({type:6,index:o}),s.removeAttribute(t));if(L.test(s.tagName)){const t=s.textContent.split(x),e=t.length-1;if(e>0){s.textContent=B?B.emptyScript:"";for(let i=0;i<e;i++)s.append(t[i],k()),j.nextNode(),a.push({type:2,index:++o});s.append(t[e],k())}}}else if(8===s.nodeType)if(s.data===D)a.push({type:2,index:o});else{let t=-1;for(;-1!==(t=s.data.indexOf(x,t+1));)a.push({type:7,index:o}),t+=x.length-1}o++}}static createElement(t,e){const i=R.createElement("template");return i.innerHTML=t,i}}function X(t,e,i=t,s){if(e===K)return e;let o=void 0!==s?i._$Co?.[s]:i._$Cl;const r=T(e)?void 0:e._$litDirective$;return o?.constructor!==r&&(o?._$AO?.(!1),void 0===r?o=void 0:(o=new r(t),o._$AT(t,i,s)),void 0!==s?(i._$Co??=[])[s]=o:i._$Cl=o),void 0!==o&&(e=X(t,o._$AS(t,e.values),o,s)),e}class q{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:e},parts:i}=this._$AD,s=(t?.creationScope??R).importNode(e,!0);j.currentNode=s;let o=j.nextNode(),r=0,n=0,a=i[0];for(;void 0!==a;){if(r===a.index){let e;2===a.type?e=new tt(o,o.nextSibling,this,t):1===a.type?e=new a.ctor(o,a.name,a.strings,this,t):6===a.type&&(e=new rt(o,this,t)),this._$AV.push(e),a=i[++n]}r!==a?.index&&(o=j.nextNode(),r++)}return j.currentNode=R,s}p(t){let e=0;for(const i of this._$AV)void 0!==i&&(void 0!==i.strings?(i._$AI(t,i,e),e+=i.strings.length-2):i._$AI(t[e])),e++}}class tt{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,e,i,s){this.type=2,this._$AH=J,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=i,this.options=s,this._$Cv=s?.isConnected??!0}get parentNode(){let t=this._$AA.parentNode;const e=this._$AM;return void 0!==e&&11===t?.nodeType&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=X(this,t,e),T(t)?t===J||null==t||""===t?(this._$AH!==J&&this._$AR(),this._$AH=J):t!==this._$AH&&t!==K&&this._(t):void 0!==t._$litType$?this.$(t):void 0!==t.nodeType?this.T(t):(t=>F(t)||"function"==typeof t?.[Symbol.iterator])(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==J&&T(this._$AH)?this._$AA.nextSibling.data=t:this.T(R.createTextNode(t)),this._$AH=t}$(t){const{values:e,_$litType$:i}=t,s="number"==typeof i?this._$AC(t):(void 0===i.el&&(i.el=Z.createElement(V(i.h,i.h[0]),this.options)),i);if(this._$AH?._$AD===s)this._$AH.p(e);else{const t=new q(s,this),i=t.u(this.options);t.p(e),this.T(i),this._$AH=t}}_$AC(t){let e=W.get(t.strings);return void 0===e&&W.set(t.strings,e=new Z(t)),e}k(t){F(this._$AH)||(this._$AH=[],this._$AR());const e=this._$AH;let i,s=0;for(const o of t)s===e.length?e.push(i=new tt(this.O(k()),this.O(k()),this,this.options)):i=e[s],i._$AI(o),s++;s<e.length&&(this._$AR(i&&i._$AB.nextSibling,s),e.length=s)}_$AR(t=this._$AA.nextSibling,e){for(this._$AP?.(!1,!0,e);t!==this._$AB;){const e=C(t).nextSibling;C(t).remove(),t=e}}setConnected(t){void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t))}}class et{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,i,s,o){this.type=1,this._$AH=J,this._$AN=void 0,this.element=t,this.name=e,this._$AM=s,this.options=o,i.length>2||""!==i[0]||""!==i[1]?(this._$AH=Array(i.length-1).fill(new String),this.strings=i):this._$AH=J}_$AI(t,e=this,i,s){const o=this.strings;let r=!1;if(void 0===o)t=X(this,t,e,0),r=!T(t)||t!==this._$AH&&t!==K,r&&(this._$AH=t);else{const s=t;let n,a;for(t=o[0],n=0;n<o.length-1;n++)a=X(this,s[i+n],e,n),a===K&&(a=this._$AH[n]),r||=!T(a)||a!==this._$AH[n],a===J?t=J:t!==J&&(t+=(a??"")+o[n+1]),this._$AH[n]=a}r&&!s&&this.j(t)}j(t){t===J?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class it extends et{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===J?void 0:t}}class st extends et{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==J)}}class ot extends et{constructor(t,e,i,s,o){super(t,e,i,s,o),this.type=5}_$AI(t,e=this){if((t=X(this,t,e,0)??J)===K)return;const i=this._$AH,s=t===J&&i!==J||t.capture!==i.capture||t.once!==i.once||t.passive!==i.passive,o=t!==J&&(i===J||s);s&&this.element.removeEventListener(this.name,this,i),o&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t)}}class rt{constructor(t,e,i){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=i}get _$AU(){return this._$AM._$AU}_$AI(t){X(this,t)}}const nt={I:tt},at=v.litHtmlPolyfillSupport;at?.(Z,tt),(v.litHtmlVersions??=[]).push("3.3.2");const lt=globalThis;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let ct=class extends y{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=((t,e,i)=>{const s=i?.renderBefore??e;let o=s._$litPart$;if(void 0===o){const t=i?.renderBefore??null;s._$litPart$=o=new tt(e.insertBefore(k(),t),t,void 0,i??{})}return o._$AI(t),o})(e,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return K}};ct._$litElement$=!0,ct.finalized=!0,lt.litElementHydrateSupport?.({LitElement:ct});const ht=lt.litElementPolyfillSupport;ht?.({LitElement:ct}),(lt.litElementVersions??=[]).push("4.2.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const dt={attribute:!0,type:String,converter:E,reflect:!1,hasChanged:m},At=(t=dt,e,i)=>{const{kind:s,metadata:o}=i;let r=globalThis.litPropertyMetadata.get(o);if(void 0===r&&globalThis.litPropertyMetadata.set(o,r=new Map),"setter"===s&&((t=Object.create(t)).wrapped=!0),r.set(i.name,t),"accessor"===s){const{name:s}=i;return{set(i){const o=e.get.call(this);e.set.call(this,i),this.requestUpdate(s,o,t,!0,i)},init(e){return void 0!==e&&this.C(s,void 0,t,e),e}}}if("setter"===s){const{name:s}=i;return function(i){const o=this[s];e.call(this,i),this.requestUpdate(s,o,t,!0,i)}}throw Error("Unsupported decorator location: "+s)};function gt(t){return(e,i)=>"object"==typeof i?At(t,e,i):((t,e,i)=>{const s=e.hasOwnProperty(i);return e.constructor.createProperty(i,t),s?Object.getOwnPropertyDescriptor(e,i):void 0})(t,e,i)}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function ut(t){return gt({...t,state:!0,attribute:!1})}
/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const _t=Symbol.for(""),pt=t=>{if(t?.r===_t)return t?._$litStatic$},ft=(t,...e)=>({_$litStatic$:e.reduce((e,i,s)=>e+(t=>{if(void 0!==t._$litStatic$)return t._$litStatic$;throw Error(`Value passed to 'literal' function must be a 'literal' result: ${t}. Use 'unsafeStatic' to pass non-literal values, but\n            take care to ensure page security.`)})(i)+t[s+1],t[0]),r:_t}),wt=new Map,Et=(t=>(e,...i)=>{const s=i.length;let o,r;const n=[],a=[];let l,c=0,h=!1;for(;c<s;){for(l=e[c];c<s&&void 0!==(r=i[c],o=pt(r));)l+=o+e[++c],h=!0;c!==s&&a.push(r),n.push(l),c++}if(c===s&&n.push(e[s]),h){const t=n.join("$$lit$$");void 0===(e=wt.get(t))&&(n.raw=n,wt.set(t,e=n)),i=a}return t(e,...i)})($);function mt(t,e){const i=e&&e.cache?e.cache:It,s=e&&e.serializer?e.serializer:Bt;return(e&&e.strategy?e.strategy:Ct)(t,{cache:i,serializer:s})}function bt(t,e,i,s){const o=null==(r=s)||"number"==typeof r||"boolean"==typeof r?s:i(s);var r;let n=e.get(o);return void 0===n&&(n=t.call(this,s),e.set(o,n)),n}function yt(t,e,i){const s=Array.prototype.slice.call(arguments,3),o=i(s);let r=e.get(o);return void 0===r&&(r=t.apply(this,s),e.set(o,r)),r}function vt(t,e,i,s,o){return i.bind(e,t,s,o)}function Ct(t,e){return vt(t,this,1===t.length?bt:yt,e.cache.create(),e.serializer)}const Bt=function(){return JSON.stringify(arguments)};class St{cache;constructor(){this.cache=Object.create(null)}get(t){return this.cache[t]}set(t,e){this.cache[t]=e}}const It={create:function(){return new St}},xt={variadic:function(t,e){return vt(t,this,yt,e.cache.create(),e.serializer)}},Dt=/(?:[Eec]{1,6}|G{1,5}|[Qq]{1,5}|(?:[yYur]+|U{1,5})|[ML]{1,5}|d{1,2}|D{1,3}|F{1}|[abB]{1,5}|[hkHK]{1,2}|w{1,2}|W{1}|m{1,2}|s{1,2}|[zZOvVxX]{1,4})(?=([^']*'[^']*')*[^']*$)/g;function Mt(t){const e={};return t.replace(Dt,t=>{const i=t.length;switch(t[0]){case"G":e.era=4===i?"long":5===i?"narrow":"short";break;case"y":e.year=2===i?"2-digit":"numeric";break;case"Y":case"u":case"U":case"r":throw new RangeError("`Y/u/U/r` (year) patterns are not supported, use `y` instead");case"q":case"Q":throw new RangeError("`q/Q` (quarter) patterns are not supported");case"M":case"L":e.month=["numeric","2-digit","short","long","narrow"][i-1];break;case"w":case"W":throw new RangeError("`w/W` (week) patterns are not supported");case"d":e.day=["numeric","2-digit"][i-1];break;case"D":case"F":case"g":throw new RangeError("`D/F/g` (day) patterns are not supported, use `d` instead");case"E":e.weekday=4===i?"long":5===i?"narrow":"short";break;case"e":if(i<4)throw new RangeError("`e..eee` (weekday) patterns are not supported");e.weekday=["short","long","narrow","short"][i-4];break;case"c":if(i<4)throw new RangeError("`c..ccc` (weekday) patterns are not supported");e.weekday=["short","long","narrow","short"][i-4];break;case"a":e.hour12=!0;break;case"b":case"B":throw new RangeError("`b/B` (period) patterns are not supported, use `a` instead");case"h":e.hourCycle="h12",e.hour=["numeric","2-digit"][i-1];break;case"H":e.hourCycle="h23",e.hour=["numeric","2-digit"][i-1];break;case"K":e.hourCycle="h11",e.hour=["numeric","2-digit"][i-1];break;case"k":e.hourCycle="h24",e.hour=["numeric","2-digit"][i-1];break;case"j":case"J":case"C":throw new RangeError("`j/J/C` (hour) patterns are not supported, use `h/H/K/k` instead");case"m":e.minute=["numeric","2-digit"][i-1];break;case"s":e.second=["numeric","2-digit"][i-1];break;case"S":case"A":throw new RangeError("`S/A` (second) patterns are not supported, use `s` instead");case"z":e.timeZoneName=i<4?"short":"long";break;case"Z":case"O":case"v":case"V":case"X":case"x":throw new RangeError("`Z/O/v/V/X/x` (timeZone) patterns are not supported, use `z` instead")}return""}),e}const Rt=/[\t-\r \x85\u200E\u200F\u2028\u2029]/i;function kt(t){return t.replace(/^(.*?)-/,"")}const Tt=/^\.(?:(0+)(\*)?|(#+)|(0+)(#+))$/g,Ft=/^(@+)?(\+|#+)?[rs]?$/g,Pt=/(\*)(0+)|(#+)(0+)|(0+)/g,Ut=/^(0+)$/;function Ot(t){const e={};return"r"===t[t.length-1]?e.roundingPriority="morePrecision":"s"===t[t.length-1]&&(e.roundingPriority="lessPrecision"),t.replace(Ft,function(t,i,s){return"string"!=typeof s?(e.minimumSignificantDigits=i.length,e.maximumSignificantDigits=i.length):"+"===s?e.minimumSignificantDigits=i.length:"#"===i[0]?e.maximumSignificantDigits=i.length:(e.minimumSignificantDigits=i.length,e.maximumSignificantDigits=i.length+("string"==typeof s?s.length:0)),""}),e}function zt(t){switch(t){case"sign-auto":return{signDisplay:"auto"};case"sign-accounting":case"()":return{currencySign:"accounting"};case"sign-always":case"+!":return{signDisplay:"always"};case"sign-accounting-always":case"()!":return{signDisplay:"always",currencySign:"accounting"};case"sign-except-zero":case"+?":return{signDisplay:"exceptZero"};case"sign-accounting-except-zero":case"()?":return{signDisplay:"exceptZero",currencySign:"accounting"};case"sign-never":case"+_":return{signDisplay:"never"}}}function Qt(t){let e;if("E"===t[0]&&"E"===t[1]?(e={notation:"engineering"},t=t.slice(2)):"E"===t[0]&&(e={notation:"scientific"},t=t.slice(1)),e){const i=t.slice(0,2);if("+!"===i?(e.signDisplay="always",t=t.slice(2)):"+?"===i&&(e.signDisplay="exceptZero",t=t.slice(2)),!Ut.test(t))throw new Error("Malformed concise eng/scientific notation");e.minimumIntegerDigits=t.length}return e}function Ht(t){const e=zt(t);return e||{}}function Gt(t){let e={};for(const i of t){switch(i.stem){case"percent":case"%":e.style="percent";continue;case"%x100":e.style="percent",e.scale=100;continue;case"currency":e.style="currency",e.currency=i.options[0];continue;case"group-off":case",_":e.useGrouping=!1;continue;case"precision-integer":case".":e.maximumFractionDigits=0;continue;case"measure-unit":case"unit":e.style="unit",e.unit=kt(i.options[0]);continue;case"compact-short":case"K":e.notation="compact",e.compactDisplay="short";continue;case"compact-long":case"KK":e.notation="compact",e.compactDisplay="long";continue;case"scientific":e={...e,notation:"scientific",...i.options.reduce((t,e)=>({...t,...Ht(e)}),{})};continue;case"engineering":e={...e,notation:"engineering",...i.options.reduce((t,e)=>({...t,...Ht(e)}),{})};continue;case"notation-simple":e.notation="standard";continue;case"unit-width-narrow":e.currencyDisplay="narrowSymbol",e.unitDisplay="narrow";continue;case"unit-width-short":e.currencyDisplay="code",e.unitDisplay="short";continue;case"unit-width-full-name":e.currencyDisplay="name",e.unitDisplay="long";continue;case"unit-width-iso-code":e.currencyDisplay="symbol";continue;case"scale":e.scale=parseFloat(i.options[0]);continue;case"rounding-mode-floor":e.roundingMode="floor";continue;case"rounding-mode-ceiling":e.roundingMode="ceil";continue;case"rounding-mode-down":e.roundingMode="trunc";continue;case"rounding-mode-up":e.roundingMode="expand";continue;case"rounding-mode-half-even":e.roundingMode="halfEven";continue;case"rounding-mode-half-down":e.roundingMode="halfTrunc";continue;case"rounding-mode-half-up":e.roundingMode="halfExpand";continue;case"integer-width":if(i.options.length>1)throw new RangeError("integer-width stems only accept a single optional option");i.options[0].replace(Pt,function(t,i,s,o,r,n){if(i)e.minimumIntegerDigits=s.length;else{if(o&&r)throw new Error("We currently do not support maximum integer digits");if(n)throw new Error("We currently do not support exact integer digits")}return""});continue}if(Ut.test(i.stem)){e.minimumIntegerDigits=i.stem.length;continue}if(Tt.test(i.stem)){if(i.options.length>1)throw new RangeError("Fraction-precision stems only accept a single optional option");i.stem.replace(Tt,function(t,i,s,o,r,n){return"*"===s?e.minimumFractionDigits=i.length:o&&"#"===o[0]?e.maximumFractionDigits=o.length:r&&n?(e.minimumFractionDigits=r.length,e.maximumFractionDigits=r.length+n.length):(e.minimumFractionDigits=i.length,e.maximumFractionDigits=i.length),""});const t=i.options[0];"w"===t?e={...e,trailingZeroDisplay:"stripIfInteger"}:t&&(e={...e,...Ot(t)});continue}if(Ft.test(i.stem)){e={...e,...Ot(i.stem)};continue}const t=zt(i.stem);t&&(e={...e,...t});const s=Qt(i.stem);s&&(e={...e,...s})}return e}let Lt=function(t){return t[t.literal=0]="literal",t[t.argument=1]="argument",t[t.number=2]="number",t[t.date=3]="date",t[t.time=4]="time",t[t.select=5]="select",t[t.plural=6]="plural",t[t.pound=7]="pound",t[t.tag=8]="tag",t}({}),Nt=function(t){return t[t.number=0]="number",t[t.dateTime=1]="dateTime",t}({});function $t(t){return t.type===Lt.literal}function Yt(t){return t.type===Lt.argument}function Kt(t){return t.type===Lt.number}function Jt(t){return t.type===Lt.date}function Wt(t){return t.type===Lt.time}function jt(t){return t.type===Lt.select}function Vt(t){return t.type===Lt.plural}function Zt(t){return t.type===Lt.pound}function Xt(t){return t.type===Lt.tag}function qt(t){return!(!t||"object"!=typeof t||t.type!==Nt.number)}function te(t){return!(!t||"object"!=typeof t||t.type!==Nt.dateTime)}let ee=function(t){return t[t.EXPECT_ARGUMENT_CLOSING_BRACE=1]="EXPECT_ARGUMENT_CLOSING_BRACE",t[t.EMPTY_ARGUMENT=2]="EMPTY_ARGUMENT",t[t.MALFORMED_ARGUMENT=3]="MALFORMED_ARGUMENT",t[t.EXPECT_ARGUMENT_TYPE=4]="EXPECT_ARGUMENT_TYPE",t[t.INVALID_ARGUMENT_TYPE=5]="INVALID_ARGUMENT_TYPE",t[t.EXPECT_ARGUMENT_STYLE=6]="EXPECT_ARGUMENT_STYLE",t[t.INVALID_NUMBER_SKELETON=7]="INVALID_NUMBER_SKELETON",t[t.INVALID_DATE_TIME_SKELETON=8]="INVALID_DATE_TIME_SKELETON",t[t.EXPECT_NUMBER_SKELETON=9]="EXPECT_NUMBER_SKELETON",t[t.EXPECT_DATE_TIME_SKELETON=10]="EXPECT_DATE_TIME_SKELETON",t[t.UNCLOSED_QUOTE_IN_ARGUMENT_STYLE=11]="UNCLOSED_QUOTE_IN_ARGUMENT_STYLE",t[t.EXPECT_SELECT_ARGUMENT_OPTIONS=12]="EXPECT_SELECT_ARGUMENT_OPTIONS",t[t.EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE=13]="EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE",t[t.INVALID_PLURAL_ARGUMENT_OFFSET_VALUE=14]="INVALID_PLURAL_ARGUMENT_OFFSET_VALUE",t[t.EXPECT_SELECT_ARGUMENT_SELECTOR=15]="EXPECT_SELECT_ARGUMENT_SELECTOR",t[t.EXPECT_PLURAL_ARGUMENT_SELECTOR=16]="EXPECT_PLURAL_ARGUMENT_SELECTOR",t[t.EXPECT_SELECT_ARGUMENT_SELECTOR_FRAGMENT=17]="EXPECT_SELECT_ARGUMENT_SELECTOR_FRAGMENT",t[t.EXPECT_PLURAL_ARGUMENT_SELECTOR_FRAGMENT=18]="EXPECT_PLURAL_ARGUMENT_SELECTOR_FRAGMENT",t[t.INVALID_PLURAL_ARGUMENT_SELECTOR=19]="INVALID_PLURAL_ARGUMENT_SELECTOR",t[t.DUPLICATE_PLURAL_ARGUMENT_SELECTOR=20]="DUPLICATE_PLURAL_ARGUMENT_SELECTOR",t[t.DUPLICATE_SELECT_ARGUMENT_SELECTOR=21]="DUPLICATE_SELECT_ARGUMENT_SELECTOR",t[t.MISSING_OTHER_CLAUSE=22]="MISSING_OTHER_CLAUSE",t[t.INVALID_TAG=23]="INVALID_TAG",t[t.INVALID_TAG_NAME=25]="INVALID_TAG_NAME",t[t.UNMATCHED_CLOSING_TAG=26]="UNMATCHED_CLOSING_TAG",t[t.UNCLOSED_TAG=27]="UNCLOSED_TAG",t}({});const ie=/[ \xA0\u1680\u2000-\u200A\u202F\u205F\u3000]/,se={"001":["H","h"],419:["h","H","hB","hb"],AC:["H","h","hb","hB"],AD:["H","hB"],AE:["h","hB","hb","H"],AF:["H","hb","hB","h"],AG:["h","hb","H","hB"],AI:["H","h","hb","hB"],AL:["h","H","hB"],AM:["H","hB"],AO:["H","hB"],AR:["h","H","hB","hb"],AS:["h","H"],AT:["H","hB"],AU:["h","hb","H","hB"],AW:["H","hB"],AX:["H"],AZ:["H","hB","h"],BA:["H","hB","h"],BB:["h","hb","H","hB"],BD:["h","hB","H"],BE:["H","hB"],BF:["H","hB"],BG:["H","hB","h"],BH:["h","hB","hb","H"],BI:["H","h"],BJ:["H","hB"],BL:["H","hB"],BM:["h","hb","H","hB"],BN:["hb","hB","h","H"],BO:["h","H","hB","hb"],BQ:["H"],BR:["H","hB"],BS:["h","hb","H","hB"],BT:["h","H"],BW:["H","h","hb","hB"],BY:["H","h"],BZ:["H","h","hb","hB"],CA:["h","hb","H","hB"],CC:["H","h","hb","hB"],CD:["hB","H"],CF:["H","h","hB"],CG:["H","hB"],CH:["H","hB","h"],CI:["H","hB"],CK:["H","h","hb","hB"],CL:["h","H","hB","hb"],CM:["H","h","hB"],CN:["H","hB","hb","h"],CO:["h","H","hB","hb"],CP:["H"],CR:["h","H","hB","hb"],CU:["h","H","hB","hb"],CV:["H","hB"],CW:["H","hB"],CX:["H","h","hb","hB"],CY:["h","H","hb","hB"],CZ:["H"],DE:["H","hB"],DG:["H","h","hb","hB"],DJ:["h","H"],DK:["H"],DM:["h","hb","H","hB"],DO:["h","H","hB","hb"],DZ:["h","hB","hb","H"],EA:["H","h","hB","hb"],EC:["h","H","hB","hb"],EE:["H","hB"],EG:["h","hB","hb","H"],EH:["h","hB","hb","H"],ER:["h","H"],ES:["H","hB","h","hb"],ET:["hB","hb","h","H"],FI:["H"],FJ:["h","hb","H","hB"],FK:["H","h","hb","hB"],FM:["h","hb","H","hB"],FO:["H","h"],FR:["H","hB"],GA:["H","hB"],GB:["H","h","hb","hB"],GD:["h","hb","H","hB"],GE:["H","hB","h"],GF:["H","hB"],GG:["H","h","hb","hB"],GH:["h","H"],GI:["H","h","hb","hB"],GL:["H","h"],GM:["h","hb","H","hB"],GN:["H","hB"],GP:["H","hB"],GQ:["H","hB","h","hb"],GR:["h","H","hb","hB"],GS:["H","h","hb","hB"],GT:["h","H","hB","hb"],GU:["h","hb","H","hB"],GW:["H","hB"],GY:["h","hb","H","hB"],HK:["h","hB","hb","H"],HN:["h","H","hB","hb"],HR:["H","hB"],HU:["H","h"],IC:["H","h","hB","hb"],ID:["H"],IE:["H","h","hb","hB"],IL:["H","hB"],IM:["H","h","hb","hB"],IN:["h","H"],IO:["H","h","hb","hB"],IQ:["h","hB","hb","H"],IR:["hB","H"],IS:["H"],IT:["H","hB"],JE:["H","h","hb","hB"],JM:["h","hb","H","hB"],JO:["h","hB","hb","H"],JP:["H","K","h"],KE:["hB","hb","H","h"],KG:["H","h","hB","hb"],KH:["hB","h","H","hb"],KI:["h","hb","H","hB"],KM:["H","h","hB","hb"],KN:["h","hb","H","hB"],KP:["h","H","hB","hb"],KR:["h","H","hB","hb"],KW:["h","hB","hb","H"],KY:["h","hb","H","hB"],KZ:["H","hB"],LA:["H","hb","hB","h"],LB:["h","hB","hb","H"],LC:["h","hb","H","hB"],LI:["H","hB","h"],LK:["H","h","hB","hb"],LR:["h","hb","H","hB"],LS:["h","H"],LT:["H","h","hb","hB"],LU:["H","h","hB"],LV:["H","hB","hb","h"],LY:["h","hB","hb","H"],MA:["H","h","hB","hb"],MC:["H","hB"],MD:["H","hB"],ME:["H","hB","h"],MF:["H","hB"],MG:["H","h"],MH:["h","hb","H","hB"],MK:["H","h","hb","hB"],ML:["H"],MM:["hB","hb","H","h"],MN:["H","h","hb","hB"],MO:["h","hB","hb","H"],MP:["h","hb","H","hB"],MQ:["H","hB"],MR:["h","hB","hb","H"],MS:["H","h","hb","hB"],MT:["H","h"],MU:["H","h"],MV:["H","h"],MW:["h","hb","H","hB"],MX:["h","H","hB","hb"],MY:["hb","hB","h","H"],MZ:["H","hB"],NA:["h","H","hB","hb"],NC:["H","hB"],NE:["H"],NF:["H","h","hb","hB"],NG:["H","h","hb","hB"],NI:["h","H","hB","hb"],NL:["H","hB"],NO:["H","h"],NP:["H","h","hB"],NR:["H","h","hb","hB"],NU:["H","h","hb","hB"],NZ:["h","hb","H","hB"],OM:["h","hB","hb","H"],PA:["h","H","hB","hb"],PE:["h","H","hB","hb"],PF:["H","h","hB"],PG:["h","H"],PH:["h","hB","hb","H"],PK:["h","hB","H"],PL:["H","h"],PM:["H","hB"],PN:["H","h","hb","hB"],PR:["h","H","hB","hb"],PS:["h","hB","hb","H"],PT:["H","hB"],PW:["h","H"],PY:["h","H","hB","hb"],QA:["h","hB","hb","H"],RE:["H","hB"],RO:["H","hB"],RS:["H","hB","h"],RU:["H"],RW:["H","h"],SA:["h","hB","hb","H"],SB:["h","hb","H","hB"],SC:["H","h","hB"],SD:["h","hB","hb","H"],SE:["H"],SG:["h","hb","H","hB"],SH:["H","h","hb","hB"],SI:["H","hB"],SJ:["H"],SK:["H"],SL:["h","hb","H","hB"],SM:["H","h","hB"],SN:["H","h","hB"],SO:["h","H"],SR:["H","hB"],SS:["h","hb","H","hB"],ST:["H","hB"],SV:["h","H","hB","hb"],SX:["H","h","hb","hB"],SY:["h","hB","hb","H"],SZ:["h","hb","H","hB"],TA:["H","h","hb","hB"],TC:["h","hb","H","hB"],TD:["h","H","hB"],TF:["H","h","hB"],TG:["H","hB"],TH:["H","h"],TJ:["H","h"],TL:["H","hB","hb","h"],TM:["H","h"],TN:["h","hB","hb","H"],TO:["h","H"],TR:["H","hB"],TT:["h","hb","H","hB"],TW:["hB","hb","h","H"],TZ:["hB","hb","H","h"],UA:["H","hB","h"],UG:["hB","hb","H","h"],UM:["h","hb","H","hB"],US:["h","hb","H","hB"],UY:["h","H","hB","hb"],UZ:["H","hB","h"],VA:["H","h","hB"],VC:["h","hb","H","hB"],VE:["h","H","hB","hb"],VG:["h","hb","H","hB"],VI:["h","hb","H","hB"],VN:["H","h"],VU:["h","H"],WF:["H","hB"],WS:["h","H"],XK:["H","hB","h"],YE:["h","hB","hb","H"],YT:["H","hB"],ZA:["H","h","hb","hB"],ZM:["h","hb","H","hB"],ZW:["H","h"],"af-ZA":["H","h","hB","hb"],"ar-001":["h","hB","hb","H"],"ca-ES":["H","h","hB"],"en-001":["h","hb","H","hB"],"en-HK":["h","hb","H","hB"],"en-IL":["H","h","hb","hB"],"en-MY":["h","hb","H","hB"],"es-BR":["H","h","hB","hb"],"es-ES":["H","h","hB","hb"],"es-GQ":["H","h","hB","hb"],"fr-CA":["H","h","hB"],"gl-ES":["H","h","hB"],"gu-IN":["hB","hb","h","H"],"hi-IN":["hB","h","H"],"it-CH":["H","h","hB"],"it-IT":["H","h","hB"],"kn-IN":["hB","h","H"],"ku-SY":["H","hB"],"ml-IN":["hB","h","H"],"mr-IN":["hB","hb","h","H"],"pa-IN":["hB","hb","h","H"],"ta-IN":["hB","h","hb","H"],"te-IN":["hB","h","H"],"zu-ZA":["H","hB","hb","h"]};function oe(t){let e=t.hourCycle;if(void 0===e&&t.hourCycles&&t.hourCycles.length&&(e=t.hourCycles[0]),e)switch(e){case"h24":return"k";case"h23":return"H";case"h12":return"h";case"h11":return"K";default:throw new Error("Invalid hourCycle")}const i=t.language;let s;"root"!==i&&(s=t.maximize().region);return(se[s||""]||se[i||""]||se[`${i}-001`]||se["001"])[0]}const re=new RegExp(`^${ie.source}*`),ne=new RegExp(`${ie.source}*$`);function ae(t,e){return{start:t,end:e}}const le=!!Object.fromEntries,ce=!!String.prototype.trimStart,he=!!String.prototype.trimEnd,de=le?Object.fromEntries:function(t){const e={};for(const[i,s]of t)e[i]=s;return e},Ae=ce?function(t){return t.trimStart()}:function(t){return t.replace(re,"")},ge=he?function(t){return t.trimEnd()}:function(t){return t.replace(ne,"")},ue=new RegExp("([^\\p{White_Space}\\p{Pattern_Syntax}]*)","yu");class _e{message;position;locale;ignoreTag;requiresOtherClause;shouldParseSkeletons;constructor(t,e={}){this.message=t,this.position={offset:0,line:1,column:1},this.ignoreTag=!!e.ignoreTag,this.locale=e.locale,this.requiresOtherClause=!!e.requiresOtherClause,this.shouldParseSkeletons=!!e.shouldParseSkeletons}parse(){if(0!==this.offset())throw Error("parser can only be used once");return this.parseMessage(0,"",!1)}parseMessage(t,e,i){let s=[];for(;!this.isEOF();){const o=this.char();if(123===o){const e=this.parseArgument(t,i);if(e.err)return e;s.push(e.val)}else{if(125===o&&t>0)break;if(35!==o||"plural"!==e&&"selectordinal"!==e){if(60===o&&!this.ignoreTag&&47===this.peek()){if(i)break;return this.error(ee.UNMATCHED_CLOSING_TAG,ae(this.clonePosition(),this.clonePosition()))}if(60===o&&!this.ignoreTag&&pe(this.peek()||0)){const i=this.parseTag(t,e);if(i.err)return i;s.push(i.val)}else{const i=this.parseLiteral(t,e);if(i.err)return i;s.push(i.val)}}else{const t=this.clonePosition();this.bump(),s.push({type:Lt.pound,location:ae(t,this.clonePosition())})}}}return{val:s,err:null}}parseTag(t,e){const i=this.clonePosition();this.bump();const s=this.parseTagName();if(this.bumpSpace(),this.bumpIf("/>"))return{val:{type:Lt.literal,value:`<${s}/>`,location:ae(i,this.clonePosition())},err:null};if(this.bumpIf(">")){const o=this.parseMessage(t+1,e,!0);if(o.err)return o;const r=o.val,n=this.clonePosition();if(this.bumpIf("</")){if(this.isEOF()||!pe(this.char()))return this.error(ee.INVALID_TAG,ae(n,this.clonePosition()));const t=this.clonePosition();return s!==this.parseTagName()?this.error(ee.UNMATCHED_CLOSING_TAG,ae(t,this.clonePosition())):(this.bumpSpace(),this.bumpIf(">")?{val:{type:Lt.tag,value:s,children:r,location:ae(i,this.clonePosition())},err:null}:this.error(ee.INVALID_TAG,ae(n,this.clonePosition())))}return this.error(ee.UNCLOSED_TAG,ae(i,this.clonePosition()))}return this.error(ee.INVALID_TAG,ae(i,this.clonePosition()))}parseTagName(){const t=this.offset();for(this.bump();!this.isEOF()&&fe(this.char());)this.bump();return this.message.slice(t,this.offset())}parseLiteral(t,e){const i=this.clonePosition();let s="";for(;;){const i=this.tryParseQuote(e);if(i){s+=i;continue}const o=this.tryParseUnquoted(t,e);if(o){s+=o;continue}const r=this.tryParseLeftAngleBracket();if(!r)break;s+=r}const o=ae(i,this.clonePosition());return{val:{type:Lt.literal,value:s,location:o},err:null}}tryParseLeftAngleBracket(){return this.isEOF()||60!==this.char()||!this.ignoreTag&&(pe(t=this.peek()||0)||47===t)?null:(this.bump(),"<");var t}tryParseQuote(t){if(this.isEOF()||39!==this.char())return null;switch(this.peek()){case 39:return this.bump(),this.bump(),"'";case 123:case 60:case 62:case 125:break;case 35:if("plural"===t||"selectordinal"===t)break;return null;default:return null}this.bump();const e=[this.char()];for(this.bump();!this.isEOF();){const t=this.char();if(39===t){if(39!==this.peek()){this.bump();break}e.push(39),this.bump()}else e.push(t);this.bump()}return String.fromCodePoint(...e)}tryParseUnquoted(t,e){if(this.isEOF())return null;const i=this.char();return 60===i||123===i||35===i&&("plural"===e||"selectordinal"===e)||125===i&&t>0?null:(this.bump(),String.fromCodePoint(i))}parseArgument(t,e){const i=this.clonePosition();if(this.bump(),this.bumpSpace(),this.isEOF())return this.error(ee.EXPECT_ARGUMENT_CLOSING_BRACE,ae(i,this.clonePosition()));if(125===this.char())return this.bump(),this.error(ee.EMPTY_ARGUMENT,ae(i,this.clonePosition()));let s=this.parseIdentifierIfPossible().value;if(!s)return this.error(ee.MALFORMED_ARGUMENT,ae(i,this.clonePosition()));if(this.bumpSpace(),this.isEOF())return this.error(ee.EXPECT_ARGUMENT_CLOSING_BRACE,ae(i,this.clonePosition()));switch(this.char()){case 125:return this.bump(),{val:{type:Lt.argument,value:s,location:ae(i,this.clonePosition())},err:null};case 44:return this.bump(),this.bumpSpace(),this.isEOF()?this.error(ee.EXPECT_ARGUMENT_CLOSING_BRACE,ae(i,this.clonePosition())):this.parseArgumentOptions(t,e,s,i);default:return this.error(ee.MALFORMED_ARGUMENT,ae(i,this.clonePosition()))}}parseIdentifierIfPossible(){const t=this.clonePosition(),e=this.offset(),i=function(t,e){return ue.lastIndex=e,ue.exec(t)[1]??""}(this.message,e),s=e+i.length;this.bumpTo(s);return{value:i,location:ae(t,this.clonePosition())}}parseArgumentOptions(t,e,i,s){let o=this.clonePosition(),r=this.parseIdentifierIfPossible().value,n=this.clonePosition();switch(r){case"":return this.error(ee.EXPECT_ARGUMENT_TYPE,ae(o,n));case"number":case"date":case"time":{this.bumpSpace();let t=null;if(this.bumpIf(",")){this.bumpSpace();const e=this.clonePosition(),i=this.parseSimpleArgStyleIfPossible();if(i.err)return i;const s=ge(i.val);if(0===s.length)return this.error(ee.EXPECT_ARGUMENT_STYLE,ae(this.clonePosition(),this.clonePosition()));t={style:s,styleLocation:ae(e,this.clonePosition())}}const e=this.tryParseArgumentClose(s);if(e.err)return e;const o=ae(s,this.clonePosition());if(t&&t.style.startsWith("::")){let e=Ae(t.style.slice(2));if("number"===r){const s=this.parseNumberSkeletonFromString(e,t.styleLocation);return s.err?s:{val:{type:Lt.number,value:i,location:o,style:s.val},err:null}}{if(0===e.length)return this.error(ee.EXPECT_DATE_TIME_SKELETON,o);let s=e;this.locale&&(s=function(t,e){let i="";for(let s=0;s<t.length;s++){const o=t.charAt(s);if("j"===o){let r=0;for(;s+1<t.length&&t.charAt(s+1)===o;)r++,s++;let n=1+(1&r),a=r<2?1:3+(r>>1),l="a",c=oe(e);for("H"!=c&&"k"!=c||(a=0);a-- >0;)i+=l;for(;n-- >0;)i=c+i}else i+="J"===o?"H":o}return i}(e,this.locale));const n={type:Nt.dateTime,pattern:s,location:t.styleLocation,parsedOptions:this.shouldParseSkeletons?Mt(s):{}};return{val:{type:"date"===r?Lt.date:Lt.time,value:i,location:o,style:n},err:null}}}return{val:{type:"number"===r?Lt.number:"date"===r?Lt.date:Lt.time,value:i,location:o,style:t?.style??null},err:null}}case"plural":case"selectordinal":case"select":{const o=this.clonePosition();if(this.bumpSpace(),!this.bumpIf(","))return this.error(ee.EXPECT_SELECT_ARGUMENT_OPTIONS,ae(o,{...o}));this.bumpSpace();let n=this.parseIdentifierIfPossible(),a=0;if("select"!==r&&"offset"===n.value){if(!this.bumpIf(":"))return this.error(ee.EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE,ae(this.clonePosition(),this.clonePosition()));this.bumpSpace();const t=this.tryParseDecimalInteger(ee.EXPECT_PLURAL_ARGUMENT_OFFSET_VALUE,ee.INVALID_PLURAL_ARGUMENT_OFFSET_VALUE);if(t.err)return t;this.bumpSpace(),n=this.parseIdentifierIfPossible(),a=t.val}const l=this.tryParsePluralOrSelectOptions(t,r,e,n);if(l.err)return l;const c=this.tryParseArgumentClose(s);if(c.err)return c;const h=ae(s,this.clonePosition());return"select"===r?{val:{type:Lt.select,value:i,options:de(l.val),location:h},err:null}:{val:{type:Lt.plural,value:i,options:de(l.val),offset:a,pluralType:"plural"===r?"cardinal":"ordinal",location:h},err:null}}default:return this.error(ee.INVALID_ARGUMENT_TYPE,ae(o,n))}}tryParseArgumentClose(t){return this.isEOF()||125!==this.char()?this.error(ee.EXPECT_ARGUMENT_CLOSING_BRACE,ae(t,this.clonePosition())):(this.bump(),{val:!0,err:null})}parseSimpleArgStyleIfPossible(){let t=0;const e=this.clonePosition();for(;!this.isEOF();){switch(this.char()){case 39:{this.bump();let t=this.clonePosition();if(!this.bumpUntil("'"))return this.error(ee.UNCLOSED_QUOTE_IN_ARGUMENT_STYLE,ae(t,this.clonePosition()));this.bump();break}case 123:t+=1,this.bump();break;case 125:if(!(t>0))return{val:this.message.slice(e.offset,this.offset()),err:null};t-=1;break;default:this.bump()}}return{val:this.message.slice(e.offset,this.offset()),err:null}}parseNumberSkeletonFromString(t,e){let i=[];try{i=function(t){if(0===t.length)throw new Error("Number skeleton cannot be empty");const e=t.split(Rt).filter(t=>t.length>0),i=[];for(const t of e){let e=t.split("/");if(0===e.length)throw new Error("Invalid number skeleton");const[s,...o]=e;for(const t of o)if(0===t.length)throw new Error("Invalid number skeleton");i.push({stem:s,options:o})}return i}(t)}catch{return this.error(ee.INVALID_NUMBER_SKELETON,e)}return{val:{type:Nt.number,tokens:i,location:e,parsedOptions:this.shouldParseSkeletons?Gt(i):{}},err:null}}tryParsePluralOrSelectOptions(t,e,i,s){let o=!1;const r=[],n=new Set;let{value:a,location:l}=s;for(;;){if(0===a.length){const t=this.clonePosition();if("select"===e||!this.bumpIf("="))break;{const e=this.tryParseDecimalInteger(ee.EXPECT_PLURAL_ARGUMENT_SELECTOR,ee.INVALID_PLURAL_ARGUMENT_SELECTOR);if(e.err)return e;l=ae(t,this.clonePosition()),a=this.message.slice(t.offset,this.offset())}}if(n.has(a))return this.error("select"===e?ee.DUPLICATE_SELECT_ARGUMENT_SELECTOR:ee.DUPLICATE_PLURAL_ARGUMENT_SELECTOR,l);"other"===a&&(o=!0),this.bumpSpace();const s=this.clonePosition();if(!this.bumpIf("{"))return this.error("select"===e?ee.EXPECT_SELECT_ARGUMENT_SELECTOR_FRAGMENT:ee.EXPECT_PLURAL_ARGUMENT_SELECTOR_FRAGMENT,ae(this.clonePosition(),this.clonePosition()));const c=this.parseMessage(t+1,e,i);if(c.err)return c;const h=this.tryParseArgumentClose(s);if(h.err)return h;r.push([a,{value:c.val,location:ae(s,this.clonePosition())}]),n.add(a),this.bumpSpace(),({value:a,location:l}=this.parseIdentifierIfPossible())}return 0===r.length?this.error("select"===e?ee.EXPECT_SELECT_ARGUMENT_SELECTOR:ee.EXPECT_PLURAL_ARGUMENT_SELECTOR,ae(this.clonePosition(),this.clonePosition())):this.requiresOtherClause&&!o?this.error(ee.MISSING_OTHER_CLAUSE,ae(this.clonePosition(),this.clonePosition())):{val:r,err:null}}tryParseDecimalInteger(t,e){let i=1;const s=this.clonePosition();this.bumpIf("+")||this.bumpIf("-")&&(i=-1);let o=!1,r=0;for(;!this.isEOF();){const t=this.char();if(!(t>=48&&t<=57))break;o=!0,r=10*r+(t-48),this.bump()}const n=ae(s,this.clonePosition());return o?(r*=i,Number.isSafeInteger(r)?{val:r,err:null}:this.error(e,n)):this.error(t,n)}offset(){return this.position.offset}isEOF(){return this.offset()===this.message.length}clonePosition(){return{offset:this.position.offset,line:this.position.line,column:this.position.column}}char(){const t=this.position.offset;if(t>=this.message.length)throw Error("out of bound");const e=this.message.codePointAt(t);if(void 0===e)throw Error(`Offset ${t} is at invalid UTF-16 code unit boundary`);return e}error(t,e){return{val:null,err:{kind:t,message:this.message,location:e}}}bump(){if(this.isEOF())return;const t=this.char();10===t?(this.position.line+=1,this.position.column=1,this.position.offset+=1):(this.position.column+=1,this.position.offset+=t<65536?1:2)}bumpIf(t){if(this.message.startsWith(t,this.offset())){for(let e=0;e<t.length;e++)this.bump();return!0}return!1}bumpUntil(t){const e=this.offset(),i=this.message.indexOf(t,e);return i>=0?(this.bumpTo(i),!0):(this.bumpTo(this.message.length),!1)}bumpTo(t){if(this.offset()>t)throw Error(`targetOffset ${t} must be greater than or equal to the current offset ${this.offset()}`);for(t=Math.min(t,this.message.length);;){const e=this.offset();if(e===t)break;if(e>t)throw Error(`targetOffset ${t} is at invalid UTF-16 code unit boundary`);if(this.bump(),this.isEOF())break}}bumpSpace(){for(;!this.isEOF()&&we(this.char());)this.bump()}peek(){if(this.isEOF())return null;const t=this.char(),e=this.offset();return this.message.charCodeAt(e+(t>=65536?2:1))??null}}function pe(t){return t>=97&&t<=122||t>=65&&t<=90}function fe(t){return 45===t||46===t||t>=48&&t<=57||95===t||t>=97&&t<=122||t>=65&&t<=90||183==t||t>=192&&t<=214||t>=216&&t<=246||t>=248&&t<=893||t>=895&&t<=8191||t>=8204&&t<=8205||t>=8255&&t<=8256||t>=8304&&t<=8591||t>=11264&&t<=12271||t>=12289&&t<=55295||t>=63744&&t<=64975||t>=65008&&t<=65533||t>=65536&&t<=983039}function we(t){return t>=9&&t<=13||32===t||133===t||t>=8206&&t<=8207||8232===t||8233===t}function Ee(t){t.forEach(t=>{if(delete t.location,jt(t)||Vt(t))for(const e in t.options)delete t.options[e].location,Ee(t.options[e].value);else Kt(t)&&qt(t.style)||(Jt(t)||Wt(t))&&te(t.style)?delete t.style.location:Xt(t)&&Ee(t.children)})}function me(t,e={}){e={shouldParseSkeletons:!0,requiresOtherClause:!0,...e};const i=new _e(t,e).parse();if(i.err){const t=SyntaxError(ee[i.err.kind]);throw t.location=i.err.location,t.originalMessage=i.err.message,t}return e?.captureLocation||Ee(i.val),i.val}let be=function(t){return t.MISSING_VALUE="MISSING_VALUE",t.INVALID_VALUE="INVALID_VALUE",t.MISSING_INTL_API="MISSING_INTL_API",t}({});class ye extends Error{code;originalMessage;constructor(t,e,i){super(t),this.code=e,this.originalMessage=i}toString(){return`[formatjs Error: ${this.code}] ${this.message}`}}class ve extends ye{constructor(t,e,i,s){super(`Invalid values for "${t}": "${e}". Options are "${Object.keys(i).join('", "')}"`,be.INVALID_VALUE,s)}}class Ce extends ye{constructor(t,e,i){super(`Value for "${t}" must be of type ${e}`,be.INVALID_VALUE,i)}}class Be extends ye{constructor(t,e){super(`The intl string context variable "${t}" was not provided to the string "${e}"`,be.MISSING_VALUE,e)}}let Se=function(t){return t[t.literal=0]="literal",t[t.object=1]="object",t}({});function Ie(t){return"function"==typeof t}function xe(t,e,i,s,o,r,n){if(1===t.length&&$t(t[0]))return[{type:Se.literal,value:t[0].value}];const a=[];for(const l of t){if($t(l)){a.push({type:Se.literal,value:l.value});continue}if(Zt(l)){"number"==typeof r&&a.push({type:Se.literal,value:i.getNumberFormat(e).format(r)});continue}const{value:t}=l;if(!o||!(t in o))throw new Be(t,n);let c=o[t];if(Yt(l))c&&"string"!=typeof c&&"number"!=typeof c&&"bigint"!=typeof c||(c="string"==typeof c||"number"==typeof c||"bigint"==typeof c?String(c):""),a.push({type:"string"==typeof c?Se.literal:Se.object,value:c});else{if(Jt(l)){const t="string"==typeof l.style?s.date[l.style]:te(l.style)?l.style.parsedOptions:void 0;a.push({type:Se.literal,value:i.getDateTimeFormat(e,t).format(c)});continue}if(Wt(l)){const t="string"==typeof l.style?s.time[l.style]:te(l.style)?l.style.parsedOptions:s.time.medium;a.push({type:Se.literal,value:i.getDateTimeFormat(e,t).format(c)});continue}if(Kt(l)){const t="string"==typeof l.style?s.number[l.style]:qt(l.style)?l.style.parsedOptions:void 0;if(t&&t.scale){const e=t.scale||1;if("bigint"==typeof c){if(!Number.isInteger(e))throw new TypeError(`Cannot apply fractional scale ${e} to bigint value. Scale must be an integer when formatting bigint.`);c*=BigInt(e)}else c*=e}a.push({type:Se.literal,value:i.getNumberFormat(e,t).format(c)});continue}if(Xt(l)){const{children:t,value:c}=l,h=o[c];if(!Ie(h))throw new Ce(c,"function",n);let d=h(xe(t,e,i,s,o,r).map(t=>t.value));Array.isArray(d)||(d=[d]),a.push(...d.map(t=>({type:"string"==typeof t?Se.literal:Se.object,value:t})))}if(jt(l)){const t=c,r=(Object.prototype.hasOwnProperty.call(l.options,t)?l.options[t]:void 0)||l.options.other;if(!r)throw new ve(l.value,c,Object.keys(l.options),n);a.push(...xe(r.value,e,i,s,o));continue}if(Vt(l)){const t=`=${c}`;let r=Object.prototype.hasOwnProperty.call(l.options,t)?l.options[t]:void 0;if(!r){if(!Intl.PluralRules)throw new ye('Intl.PluralRules is not available in this environment.\nTry polyfilling it using "@formatjs/intl-pluralrules"\n',be.MISSING_INTL_API,n);const t="bigint"==typeof c?Number(c):c,s=i.getPluralRules(e,{type:l.pluralType}).select(t-(l.offset||0));r=(Object.prototype.hasOwnProperty.call(l.options,s)?l.options[s]:void 0)||l.options.other}if(!r)throw new ve(l.value,c,Object.keys(l.options),n);const h="bigint"==typeof c?Number(c):c;a.push(...xe(r.value,e,i,s,o,h-(l.offset||0)));continue}}}return(l=a).length<2?l:l.reduce((t,e)=>{const i=t[t.length-1];return i&&i.type===Se.literal&&e.type===Se.literal?i.value+=e.value:t.push(e),t},[]);var l}function De(t,e){return e?Object.keys(t).reduce((i,s)=>{var o,r;return i[s]=(o=t[s],(r=e[s])?{...o,...r,...Object.keys(o).reduce((t,e)=>(t[e]={...o[e],...r[e]},t),{})}:o),i},{...t}):t}function Me(t){return{create:()=>({get:e=>t[e],set(e,i){t[e]=i}})}}class Re{ast;locales;resolvedLocale;formatters;formats;message;formatterCache={number:{},dateTime:{},pluralRules:{}};constructor(t,e=Re.defaultLocale,i,s){if(this.locales=e,this.resolvedLocale=Re.resolveLocale(e),"string"==typeof t){if(this.message=t,!Re.__parse)throw new TypeError("IntlMessageFormat.__parse must be set to process `message` of type `string`");const{...e}=s||{};this.ast=Re.__parse(t,{...e,locale:this.resolvedLocale})}else this.ast=t;if(!Array.isArray(this.ast))throw new TypeError("A message must be provided as a String or AST.");this.formats=De(Re.formats,i),this.formatters=s&&s.formatters||function(t={number:{},dateTime:{},pluralRules:{}}){return{getNumberFormat:mt((...t)=>new Intl.NumberFormat(...t),{cache:Me(t.number),strategy:xt.variadic}),getDateTimeFormat:mt((...t)=>new Intl.DateTimeFormat(...t),{cache:Me(t.dateTime),strategy:xt.variadic}),getPluralRules:mt((...t)=>new Intl.PluralRules(...t),{cache:Me(t.pluralRules),strategy:xt.variadic})}}(this.formatterCache)}format=t=>{const e=this.formatToParts(t);if(1===e.length)return e[0].value;const i=e.reduce((t,e)=>(t.length&&e.type===Se.literal&&"string"==typeof t[t.length-1]?t[t.length-1]+=e.value:t.push(e.value),t),[]);return i.length<=1?i[0]||"":i};formatToParts=t=>xe(this.ast,this.locales,this.formatters,this.formats,t,void 0,this.message);resolvedOptions=()=>({locale:this.resolvedLocale?.toString()||Intl.NumberFormat.supportedLocalesOf(this.locales)[0]});getAst=()=>this.ast;static memoizedDefaultLocale=null;static get defaultLocale(){return Re.memoizedDefaultLocale||(Re.memoizedDefaultLocale=(new Intl.NumberFormat).resolvedOptions().locale),Re.memoizedDefaultLocale}static resolveLocale=t=>{if(void 0===Intl.Locale)return;const e=Intl.NumberFormat.supportedLocalesOf(t);return e.length>0?new Intl.Locale(e[0]):new Intl.Locale("string"==typeof t?t:t[0])};static __parse=me;static formats={number:{integer:{maximumFractionDigits:0},currency:{style:"currency"},percent:{style:"percent"}},date:{short:{month:"numeric",day:"numeric",year:"2-digit"},medium:{month:"short",day:"numeric",year:"numeric"},long:{month:"long",day:"numeric",year:"numeric"},full:{weekday:"long",month:"long",day:"numeric",year:"numeric"}},time:{short:{hour:"numeric",minute:"numeric"},medium:{hour:"numeric",minute:"numeric",second:"numeric"},long:{hour:"numeric",minute:"numeric",second:"numeric",timeZoneName:"short"},full:{hour:"numeric",minute:"numeric",second:"numeric",timeZoneName:"short"}}}}const ke={en:{common:{save:"Save",saving:"Saving...",cancel:"Cancel",delete:"Delete",close:"Close",add:"Add",discard:"Discard",loading:"Loading..."},furniture:{armchair:"Armchair",bath:"Bath",bedside_table:"Bedside table",bidet:"Bidet",car:"Car",carpet:"Carpet",cat_bed:"Cat bed",cabinet:"Cabinet",ceiling_fan:"Ceiling fan",counter:"Counter",cupboard:"Cupboard",desk:"Desk",dog_bed:"Dog bed",dining_table:"Dining table",door_left_swing:"Door (left swing)",door_right_swing:"Door (right swing)",double_bed:"Double bed",fridge:"Fridge",hot_tub:"Hot tub",kitchen_island:"Kitchen island",lamp:"Lamp",oven_stove:"Oven / stove",plant:"Plant",pool:"Pool",round_table:"Round table",shower:"Shower",side_table:"Side table",single_bed:"Single bed",sliding_door:"Sliding door",sofa_2_seat:"Sofa (2 seat)",sofa_3_seat:"Sofa (3 seat)",speaker:"Speaker",tv:"TV",washbasin:"Wash basin",washing_machine:"Washing machine",toilet:"Toilet",window:"Window",custom_icon:"Custom icon",custom:"Custom",search_placeholder:"Search furniture..."},corners:{front_left:"Front-left",front_right:"Front-right",back_right:"Back-right",back_left:"Back-left",left_wall:"left wall",right_wall:"right wall",front_wall:"front wall",back_wall:"back wall"},wizard:{how_calibration_works:"How room calibration works",calibrate_room_size:"Calibrate room size",begin_marking:"Start calibration",mark_corner:"Mark {corner}",recording:"Recording... {current}s / {total}s",paused:"Paused — need exactly one target visible",stand_still:"Stand still",no_target:"No target detected. Make sure you are visible to the sensor.",multiple_targets:"Multiple targets detected. Only one person should be in the room during calibration.",save_prompt:"Click Save to store this room's calibration, or click a corner above to re-mark it.",walk_instruction_full:"<strong>Walk to each corner</strong> in order (1 → 2 → 3 → 4) and click Mark. Stand still for a few seconds so the sensor can lock on.",cant_reach:"<strong>Can't reach a corner?</strong> Stand as close as you can and enter the distance from each wall in the offset fields — like corner 4 in the diagram above, where a plant is in the way.",corner_sensor_hint:"In this example, your sensor is mounted in Corner 2, but it can be anywhere. You can stand right in front of it.",walk_instruction:"Walk to each corner of the room and click Mark. The sensor will record your position over {duration} seconds.",corner_step:"Corner {index}/4: Walk to the {corner}",distance_from:"Distance from:",distance_from_side:"Distance from {wall} (cm)",front_wall_label:"Front wall (sensor side)",back_wall_label:"Back wall",sensor:"Sensor",no_presence:"No presence",dont_show_again:"Don't show this again"},dialogs:{delete_calibration_title:"Delete room calibration?",delete_calibration_body:"This will also delete all detection zones and furniture. This cannot be undone.",unsaved_changes:"You have unsaved changes",unsaved_changes_body:"Your changes will be lost if you navigate away without applying.",backup_configuration:"Backup configuration",restore_configuration:"Restore configuration",no_configurations:"No saved configurations.",configuration_name:"Configuration name"},menu:{settings:"Settings",room_calibration:"Calibrate room size",delete_calibration:"Delete room calibration",detection_zones:"Detection zones",furniture:"Furniture",overlays:"Overlays"},settings:{title:"Settings",detection_ranges:"Detection Ranges",sensor_calibration:"Sensor Calibration",entities:"Entities",target_sensor:"Target Sensor",stuck_target_timeout:"Stuck target timeout",static_sensor:"Static Sensor",motion_sensor:"Motion Sensor",environmental:"Environmental",auto:"Auto",max_distance:"Max distance",min_distance:"Min distance",presence_timeout:"Presence timeout",trigger_threshold:"Trigger threshold",renew_threshold:"Renew threshold",illuminance_offset:"Illuminance offset",humidity_offset:"Humidity offset",temperature_offset:"Temperature offset",presence_delay:"Presence delay",furthest_point:"Current furthest point from sensor:",logging:"Logging",log_system:"System",log_epp:"Zone Engine",log_led:"LED",log_networking:"Network",log_ble:"Bluetooth",log_co2:"CO2",led_and_relay:"LED and Relay",led:"LED",led_mode:"Mode",led_brightness:"Brightness",led_presence_color:"Occupancy color",manual_control:"Manual Control",presence:"Occupancy",environmental_presence:"Environmental + Occupancy",relay:"Relay",relay_trigger_mode:"Trigger Mode",relay_contact_mode:"Contact Mode",relay_disabled:"Disabled",relay_motion:"Motion Only",relay_presence:"Presence Only",relay_occupancy:"Occupancy",relay_normally_open:"Normally Open (NO)",relay_normally_closed:"Normally Closed (NC)",update_rate:"Update rate",reset_to_default:"Reset to default",show_info:"Show info",frequency:{"5hz":"5 Hz","2hz":"2 Hz","1hz":"1 Hz","0_5hz":"0.5 Hz"},log_level:{none:"None",error:"Error",warning:"Warning",info:"Info",debug:"Debug"}},sidebar:{detection_zones:"Detection zones",furniture:"Furniture",overlays:"Overlays",live_overview:"Live overview",add_zone:"Add zone",rest_of_room:"Rest of room",room:"Room"},zones:{type:"Type",default:"Default",bed:"Bed",seating:"Seating",transit:"Transit",custom:"Custom",trigger:"Trigger",renew:"Renew",presence_timeout:"Presence timeout",handoff_timeout:"Handoff timeout",seconds_suffix:"s",remove_zone:"Remove zone"},overlays:{entry_exit:"Entry / Exit",interference:"Interference",suppress:"Suppress",click_to_paint:"Click to paint"},live:{presence:"Presence",detected:"Detected",clear:"Clear",show_info:"Show info",environment:"Environment",occupancy:"Occupancy",static_presence:"Static presence",motion_presence:"Motion presence",target_presence:"Target presence",mmwave:"mmWave",delete_target:"Delete target",mark_interference:"Mark as interference source",suppress_detection:"Suppress detection",grid_dimensions:"{width, number, ::.0}m × {depth, number, ::.0}m · Furthest point: {furthest, number, ::.0}m",illuminance_value:"{value, number, ::.0} lux",temperature_value:"{value, number, ::.0} °C",humidity_value:"{value, number, ::.0} %",co2_value:"{value, number} ppm",debug:{detection_events:"Detection events",copy_all:"Copy all",clear:"Clear",waiting_for_events:"Waiting for events...",static:"Static",motion:"Motion",occ:"Occ",on:"on",off:"off",active:"active",pending:"pending",inactive:"inactive",occupied:"occupied",room:"Room",no_targets:"no targets",all_clear:"all clear",zone_n:"Zone {n}"}},entities:{room_level:"Room level",zone_level:"Zone level",target_level:"Target level",occupancy:"Occupancy",static_presence:"Static presence",motion_presence:"Motion presence",target_presence:"Target presence",mmwave:"mmWave presence",target_count:"Target count",zone_presence:"Presence",zone_target_count:"Target count",xy:"XY position",active:"Active",target_signal:"Signal",target_zone:"Zone",illuminance:"Illuminance",humidity:"Humidity",temperature:"Temperature",co2:"CO₂"},info:{occupancy:"Combined occupancy from all sources — PIR motion, static mmWave presence, and zone tracking. Shows detected if any source detects presence.",static_presence:"mmWave radar detects stationary people by measuring micro-movements like breathing. Works through furniture and blankets.",motion_presence:"Passive infrared sensor detects movement by sensing body heat. Fast response but only triggers on motion, not stationary presence.",target_presence:"Whether any target is actively tracked by the mmWave radar. Detected when at least one target point is being reported.",mmwave:"Combines static mmWave presence and the target tracker, ignoring the PIR motion sensor. Detected when either source is on, except while the static sensor is off and the target tracker is only pending.",zone_occupancy:"Zone {slot} occupancy. Currently {count} {count, plural, one {target} other {targets}} detected. Sensitivity determines how many consecutive frames are needed to confirm presence.",rest_of_room_occupancy:"Covers the entire room outside of any defined zones. Currently {count} {count, plural, one {target} other {targets}} detected.",target_auto_range:"Automatically set max distance from room dimensions.",target_max_distance:"Maximum detection distance for the target sensor (LD2450). Hardware limit: 6m.",stuck_target_timeout:"Auto-dismiss a target reported at exactly the same coordinates for this many seconds. Set to 0 to disable. Default is 300 seconds (5 minutes).",static_min_distance:"Minimum detection distance for the static sensor.",static_max_distance:"Maximum detection distance for the static sensor. Hardware limit: 16m.",motion_timeout:"Time after last motion before the motion sensor clears.",static_timeout:"Time after last static detection before the sensor clears.",trigger_threshold:"Minimum signal strength needed to initially detect static presence. Higher = harder to trigger.",renew_threshold:"Minimum signal strength needed to maintain static presence detection. Higher = harder to renew.",illuminance_offset:"Adjust the illuminance reading by a fixed amount.",humidity_offset:"Adjust the humidity reading by a fixed amount.",temperature_offset:"Adjust the temperature reading by a fixed amount.",presence_delay:"Delay before reporting presence after initial detection. Helps filter brief false positives.",room_occupancy:"Combined room occupancy from all sensors.",room_static:"mmWave static presence detection.",room_motion:"PIR motion detection.",room_target_presence:"Whether any target is actively tracked.",room_mmwave:"Combined static mmWave + target tracker, ignoring PIR motion. Off when only the target tracker is pending and static is inactive.",room_target_count:"Number of targets detected in the room.",zone_presence:"Per-zone occupancy based on target tracking.",zone_target_count:"Number of targets in each zone.",xy:"XY coordinates mapped to the room grid.",active:"Whether each target slot is actively tracking.",target_signal:"Signal strength for each target (higher = stronger detection).",target_zone:"Which zone each target is currently in.",illuminance:"BH1750 illuminance sensor.",humidity:"SHTC3 humidity sensor.",temperature:"SHTC3 temperature sensor.",co2:"SCD40 CO₂ sensor (optional module).",log_system:"Framework logs including OTA, API, mDNS, I2C, and sensor drivers.",log_epp:"Zone engine logs — zone detection, target tracking, and configuration.",log_led:"LED control script logs — mode transitions and decision tree.",log_networking:"WiFi or Ethernet connection and DHCP logs.",log_ble:"Bluetooth Low Energy scanner and proxy logs.",log_co2:"CO2 sensor (SCD4x) logs.",led_mode:"Controls the RGB LED behavior. Manual Control disables automatic LED and lets you control it as a standard HA light entity.",led_brightness:"Brightness multiplier for the RGB LED in automatic modes.",led_presence_color:"Color used for occupancy indication when LED is in Occupancy or Environmental + Occupancy mode.",relay_trigger_mode:"What activates the relay. Disabled leaves the relay under manual control via the relay switch entity. Any other mode follows the chosen presence signal automatically and overrides manual control.",relay_contact_mode:'Normally Open closes the relay when the trigger fires (typical "active = closed"). Normally Closed opens it instead — useful for security circuits that expect a closed loop in the idle state.'},dimensions:{width_cm:"W (cm)",height_cm:"H (cm)",rotation:"Rot"},protocol:{firmware_behind:"This sensor's firmware needs to be updated to work with this version of the integration.",firmware_ahead:"This sensor's firmware is newer than the integration. Update the Everything Presence Pro Grid integration via HACS.",open_hacs:"Open in HACS",unavailable:"Device is offline — firmware version cannot be determined.",update_firmware:"Update Firmware"},tabs:{device_configuration:"Device Configuration",flash_firmware:"Flash Firmware",help:"Open user guide"},flasher:{title:"Flash Firmware",devices_on_network:"Installed Devices",no_devices:"No Everything Presence Pro devices installed.",no_eppgrid_devices:"No devices with Everything Presence Pro Grid firmware found.",flash_from_tab:"Flash your devices from the Flash Firmware tab",offline:"Offline",online:"Online",usb_title:"USB Connection",usb_flash_title:"Flash Firmware",usb_flash_desc:"Install or update firmware and configure WiFi.",usb_wifi_title:"Configure WiFi",usb_wifi_desc:"Set up WiFi on an already flashed device.",usb_browser_warning:"USB flashing requires Chrome or Edge browser.",select_variant:"Select firmware variant:",cancelling:"Cancelling...",wifi:"WiFi",ethernet:"Ethernet",go_to_config:"Go to Device Configuration",flash_usb:"Flash firmware over USB",loading:"Loading devices...",configure_wifi:"Configure WiFi",scan:"Scan Again",scanning:"Scanning...",select_a_network:"Select a network...",manual_ssid:"Enter SSID manually (hidden network)",enter_ssid:"Enter SSID",wifi_password:"WiFi password",show_password:"Show password",connected_to:"Connected to {ssid}",ip_address:"IP Address: {ip}",continue:"Continue",connect:"Connect",usb_flash:"Flash via USB",usb_step_connecting:"Connecting to device...",usb_step_wifi_check:"Checking existing WiFi connection...",usb_step_flashing:"Flashing firmware {version}...",usb_step_scanning:"Scanning for WiFi networks...",wifi_scan_hint:"If the device is already connected to WiFi, scanning may not work. Use manual SSID entry instead.",usb_step_provisioning:"Configuring WiFi...",usb_step_wifi_connecting:"Connecting to WiFi...",usb_step_reading_ip:"Detecting device IP address...",wifi_configured:"WiFi configured successfully",configure_wifi_override:"Not this network? Configure WiFi",go_to_integrations:"Go to Integrations",copy_ip:"Copy IP address",retry_ha_add:"Retry adding to Home Assistant",flash_another:"Flash another device",ha_add:{adding:"Adding device to Home Assistant...",retrying:"Waiting for device to come online (attempt {attempt} of {max})...",added:"Device added to Home Assistant",already_added:"Device is already in Home Assistant",needs_auth:"Device reached — complete setup in Integrations to provide the encryption key",cannot_connect:"Couldn't reach the device on the network. Check that Home Assistant and the device are on the same network.",failed:"Failed to add: {reason}"},usb_ethernet_complete:"Firmware flashed successfully!",usb_ethernet_hint:"Connect the device to your network via ethernet cable. It will be automatically detected by ESPHome.",go_to_devices:"Go to Settings → Devices",usb_retry:"Retry",confirm_delete_message:"This device was previously configured with the original firmware. The old configuration will be removed from Home Assistant.",update:"Update",integration_update:"Integration update needed",integration_outdated_title:"Integration update required",integration_outdated_body:"One or more devices have firmware that is newer than this version of the integration. Update the Everything Presence Pro Grid integration to restore full functionality.",open_hacs:"Open in HACS",ota_retry:"Retry",cancel:"Cancel",start_over:"Start over",cancelled_ip_hint:"Device reachable at {ip} — it should appear in Home Assistant discovery shortly.",errors:{start_failed:"Failed to start update. Is the device online?",connect_failed:"Failed to connect to device",connection_lost:"Connection lost during update",update_timeout:"Update timed out",device_offline:"Device went offline during update",update_failed_generic:"Update failed",ota_failed_version_unchanged:"Update failed — firmware version unchanged",ota_timeout:"OTA update timed out",ota_device_error:"Update failed: {message}",flash_cancelled:"Flash cancelled",timeout:"Timeout",aborted:"Cancelled"}},connection:{connecting:"Connecting to device...",offline:"Device is offline",failed:"Cannot connect to device",client_count:"{count} client(s) are currently connected.",check_connections:"Check for other browser tabs with this panel open, ESPHome log sessions, or additional Home Assistant instances.",retry:"Retry",ha_reconnecting:"Reconnecting to Home Assistant..."},usb:{errors:{serial_port_busy:"Serial port is busy from a previous operation. Refresh the page and try again.",serial_port_unavailable:"Serial port not available",device_disconnected:"Device disconnected. Unplug, plug it back in, and try again.",manifest_download_failed:"Failed to download firmware manifest",file_download_failed:"Failed to download firmware file: {file}",port_open_failed:"Could not open serial port. Unplug the device, plug it back in, and try again.",no_device_response:"No response from device — it may be flashed with ethernet firmware which does not support WiFi configuration.",base_url_required:"baseUrl is required for firmware download",flash_failed:"Firmware flash failed."}},wifi:{errors:{provisioning_failed:"WiFi provisioning failed",scan_failed:"WiFi scan failed",connection_failed:"WiFi connection failed — check SSID/password and try again",error_code:"WiFi error (code {code})",invalid_command:"Invalid command — device may need to be power-cycled",unknown_command:"Unknown command",not_authorized:"Not authorized"}}},es:{common:{save:"Guardar",saving:"Guardando...",cancel:"Cancelar",delete:"Eliminar",close:"Cerrar",add:"Añadir",discard:"Descartar",loading:"Cargando..."},furniture:{armchair:"Sillón",bath:"Bañera",bedside_table:"Mesita de noche",bidet:"Bidé",car:"Coche",carpet:"Alfombra",cat_bed:"Cama para gato",cabinet:"Armario",ceiling_fan:"Ventilador de techo",counter:"Mostrador",cupboard:"Alacena",desk:"Escritorio",dog_bed:"Cama para perro",dining_table:"Mesa de comedor",door_left_swing:"Puerta (apertura izquierda)",door_right_swing:"Puerta (apertura derecha)",double_bed:"Cama doble",fridge:"Nevera",hot_tub:"Jacuzzi",kitchen_island:"Isla de cocina",lamp:"Lámpara",oven_stove:"Horno / cocina",plant:"Planta",pool:"Piscina",round_table:"Mesa redonda",shower:"Ducha",side_table:"Mesa auxiliar",single_bed:"Cama individual",sliding_door:"Puerta corredera",sofa_2_seat:"Sofá (2 plazas)",sofa_3_seat:"Sofá (3 plazas)",speaker:"Altavoz",tv:"TV",washbasin:"Lavabo",washing_machine:"Lavadora",toilet:"Inodoro",window:"Ventana",custom_icon:"Icono personalizado",custom:"Personalizado",search_placeholder:"Buscar mobiliario..."},corners:{front_left:"Frente-izquierda",front_right:"Frente-derecha",back_right:"Fondo-derecha",back_left:"Fondo-izquierda",left_wall:"pared izquierda",right_wall:"pared derecha",front_wall:"pared frontal",back_wall:"pared del fondo"},wizard:{how_calibration_works:"Cómo funciona la calibración de la habitación",calibrate_room_size:"Calibrar tamaño de la habitación",begin_marking:"Iniciar calibración",mark_corner:"Marcar {corner}",recording:"Grabando... {current}s / {total}s",paused:"En pausa — se necesita exactamente un objetivo visible",stand_still:"Permanece inmóvil",no_target:"No se detecta ningún objetivo. Asegúrate de que el sensor pueda verte.",multiple_targets:"Se detectan varios objetivos. Solo debe haber una persona en la habitación durante la calibración.",save_prompt:"Haz clic en Guardar para almacenar la calibración de esta habitación, o haz clic en una esquina superior para volver a marcarla.",walk_instruction_full:"<strong>Camina hasta cada esquina</strong> en orden (1 → 2 → 3 → 4) y haz clic en Marcar. Permanece inmóvil unos segundos para que el sensor pueda registrar tu posición.",cant_reach:"<strong>¿No puedes llegar a una esquina?</strong> Acércate todo lo que puedas e introduce la distancia a cada pared en los campos de desplazamiento, como en la esquina 4 del diagrama superior, donde hay una planta en el camino.",corner_sensor_hint:"En este ejemplo, el sensor está montado en la esquina 2, pero puede estar en cualquier lugar. Puedes colocarte justo delante de él.",walk_instruction:"Camina hasta cada esquina de la habitación y haz clic en Marcar. El sensor registrará tu posición durante {duration} segundos.",corner_step:"Esquina {index}/4: Camina hasta la {corner}",distance_from:"Distancia desde:",distance_from_side:"Distancia desde {wall} (cm)",front_wall_label:"Pared frontal (lado del sensor)",back_wall_label:"Pared del fondo",sensor:"Sensor",no_presence:"Sin presencia",dont_show_again:"No mostrar esto de nuevo"},dialogs:{delete_calibration_title:"¿Eliminar la calibración de la habitación?",delete_calibration_body:"Esto también eliminará todas las zonas de detección y el mobiliario. Esta acción no se puede deshacer.",unsaved_changes:"Tienes cambios sin guardar",unsaved_changes_body:"Los cambios se perderán si navegas a otra página sin aplicarlos.",backup_configuration:"Respaldar configuración",restore_configuration:"Restaurar configuración",no_configurations:"No hay configuraciones guardadas.",configuration_name:"Nombre de la configuración"},menu:{settings:"Ajustes",room_calibration:"Calibrar tamaño de la habitación",delete_calibration:"Eliminar calibración de la habitación",detection_zones:"Zonas de detección",furniture:"Mobiliario",overlays:"Capas"},settings:{title:"Ajustes",detection_ranges:"Rangos de detección",sensor_calibration:"Calibración del sensor",entities:"Entidades",target_sensor:"Sensor de objetivos",stuck_target_timeout:"Tiempo de objetivo atascado",static_sensor:"Sensor estático",motion_sensor:"Sensor de movimiento",environmental:"Ambiental",auto:"Auto",max_distance:"Distancia máxima",min_distance:"Distancia mínima",presence_timeout:"Tiempo de espera de presencia",trigger_threshold:"Umbral de activación",renew_threshold:"Umbral de renovación",illuminance_offset:"Desplazamiento de iluminancia",humidity_offset:"Desplazamiento de humedad",temperature_offset:"Desplazamiento de temperatura",presence_delay:"Retardo de presencia",furthest_point:"Punto más lejano actual del sensor:",logging:"Registro",log_system:"Sistema",log_epp:"Motor de zonas",log_led:"LED",log_networking:"Red",log_ble:"Bluetooth",log_co2:"CO2",led_and_relay:"LED y relé",led:"LED",led_mode:"Modo",led_brightness:"Brillo",led_presence_color:"Color de ocupación",manual_control:"Control manual",presence:"Ocupación",environmental_presence:"Ambiental + Ocupación",relay:"Relé",relay_trigger_mode:"Modo de activación",relay_contact_mode:"Modo de contacto",relay_disabled:"Desactivado",relay_motion:"Solo movimiento",relay_presence:"Solo presencia",relay_occupancy:"Ocupación",relay_normally_open:"Normalmente abierto (NA)",relay_normally_closed:"Normalmente cerrado (NC)",update_rate:"Frecuencia de actualización",reset_to_default:"Restablecer valores predeterminados",show_info:"Mostrar información",frequency:{"5hz":"5 Hz","2hz":"2 Hz","1hz":"1 Hz","0_5hz":"0,5 Hz"},log_level:{none:"Ninguno",error:"Error",warning:"Advertencia",info:"Información",debug:"Depuración"}},sidebar:{detection_zones:"Zonas de detección",furniture:"Mobiliario",overlays:"Capas",live_overview:"Vista en directo",add_zone:"Añadir zona",rest_of_room:"Resto de la habitación",room:"Habitación"},zones:{type:"Tipo",default:"Predeterminado",bed:"Cama",seating:"Asiento",transit:"Tránsito",custom:"Personalizado",trigger:"Activación",renew:"Renovación",presence_timeout:"Tiempo de espera de presencia",handoff_timeout:"Tiempo de espera de transferencia",seconds_suffix:"s",remove_zone:"Eliminar zona"},overlays:{entry_exit:"Entrada / Salida",interference:"Interferencia",suppress:"Suprimir",click_to_paint:"Haz clic para pintar"},live:{presence:"Presencia",detected:"Detectado",clear:"Sin detección",show_info:"Mostrar información",environment:"Entorno",occupancy:"Ocupación",static_presence:"Presencia estática",motion_presence:"Presencia en movimiento",target_presence:"Presencia de objetivo",mmwave:"mmWave",delete_target:"Eliminar objetivo",mark_interference:"Marcar como fuente de interferencia",suppress_detection:"Suprimir detección",grid_dimensions:"{width, number, ::.0}m × {depth, number, ::.0}m · Punto más lejano: {furthest, number, ::.0}m",illuminance_value:"{value, number, ::.0} lux",temperature_value:"{value, number, ::.0} °C",humidity_value:"{value, number, ::.0} %",co2_value:"{value, number} ppm",debug:{detection_events:"Eventos de detección",copy_all:"Copiar todo",clear:"Borrar",waiting_for_events:"Esperando eventos...",static:"Estático",motion:"Movimiento",occ:"Ocup",on:"sí",off:"no",active:"activo",pending:"pendiente",inactive:"inactivo",occupied:"ocupada",room:"Habitación",no_targets:"sin objetivos",all_clear:"todo despejado",zone_n:"Zona {n}"}},entities:{room_level:"Nivel de habitación",zone_level:"Nivel de zona",target_level:"Nivel de objetivo",occupancy:"Ocupación",static_presence:"Presencia estática",motion_presence:"Presencia en movimiento",target_presence:"Presencia de objetivo",mmwave:"Presencia mmWave",target_count:"Número de objetivos",zone_presence:"Presencia",zone_target_count:"Número de objetivos",xy:"Posición XY",active:"Activo",target_signal:"Señal",target_zone:"Zona",illuminance:"Iluminancia",humidity:"Humedad",temperature:"Temperatura",co2:"CO₂"},info:{occupancy:"Ocupación combinada de todas las fuentes: sensor PIR de movimiento, presencia estática por radar mmWave y seguimiento de zonas. Muestra «detectado» si alguna fuente detecta presencia.",static_presence:"El radar mmWave detecta personas inmóviles midiendo micromovimientos como la respiración. Funciona a través de muebles y mantas.",motion_presence:"El sensor infrarrojo pasivo detecta movimiento captando el calor corporal. Respuesta rápida, pero solo se activa con movimiento, no con presencia estática.",target_presence:"Indica si el radar mmWave está rastreando activamente algún objetivo. Se muestra como detectado cuando se está reportando al menos un punto objetivo.",mmwave:"Combina la presencia mmWave estática y el seguimiento de objetivos, ignorando el sensor PIR de movimiento. Detectado cuando alguna de las dos fuentes está activa, salvo cuando el sensor estático está apagado y el seguimiento de objetivos solo está pendiente.",zone_occupancy:"Ocupación de la zona {slot}. Actualmente se detectan {count} {count, plural, one {objetivo} other {objetivos}}. La sensibilidad determina cuántos fotogramas consecutivos son necesarios para confirmar presencia.",rest_of_room_occupancy:"Cubre toda la habitación fuera de las zonas definidas. Actualmente se detectan {count} {count, plural, one {objetivo} other {objetivos}}.",target_auto_range:"Establece automáticamente la distancia máxima a partir de las dimensiones de la habitación.",target_max_distance:"Distancia máxima de detección para el sensor de objetivos (LD2450). Límite hardware: 6 m.",stuck_target_timeout:"Descarta automáticamente un objetivo reportado exactamente en las mismas coordenadas durante este número de segundos. Establece 0 para deshabilitar. Por defecto 300 segundos (5 minutos).",static_min_distance:"Distancia mínima de detección para el sensor estático.",static_max_distance:"Distancia máxima de detección para el sensor estático. Límite hardware: 16 m.",motion_timeout:"Tiempo tras el último movimiento antes de que el sensor de movimiento se limpie.",static_timeout:"Tiempo tras la última detección estática antes de que el sensor se limpie.",trigger_threshold:"Intensidad de señal mínima necesaria para detectar inicialmente presencia estática. Más alto = más difícil de activar.",renew_threshold:"Intensidad de señal mínima necesaria para mantener la detección de presencia estática. Más alto = más difícil de renovar.",illuminance_offset:"Ajusta la lectura de iluminancia en un valor fijo.",humidity_offset:"Ajusta la lectura de humedad en un valor fijo.",temperature_offset:"Ajusta la lectura de temperatura en un valor fijo.",presence_delay:"Retardo antes de notificar presencia tras la detección inicial. Ayuda a filtrar falsos positivos breves.",room_occupancy:"Ocupación combinada de la habitación procedente de todos los sensores.",room_static:"Detección de presencia estática por radar mmWave.",room_motion:"Detección de movimiento por PIR.",room_target_presence:"Indica si se está rastreando activamente algún objetivo.",room_mmwave:"Presencia mmWave estática + seguimiento de objetivos, ignorando el PIR de movimiento. Apagado si el sensor estático está inactivo y el seguimiento solo está pendiente.",room_target_count:"Número de objetivos detectados en la habitación.",zone_presence:"Ocupación por zona basada en el seguimiento de objetivos.",zone_target_count:"Número de objetivos en cada zona.",xy:"Coordenadas XY mapeadas a la cuadrícula de la habitación.",active:"Indica si cada ranura de objetivo está rastreando activamente.",target_signal:"Intensidad de señal de cada objetivo (más alta = detección más sólida).",target_zone:"Zona en la que se encuentra actualmente cada objetivo.",illuminance:"Sensor de iluminancia BH1750.",humidity:"Sensor de humedad SHTC3.",temperature:"Sensor de temperatura SHTC3.",co2:"Sensor de CO₂ SCD40 (módulo opcional).",log_system:"Registros del framework: OTA, API, mDNS, I2C y controladores de sensores.",log_epp:"Registros del motor de zonas: detección de zonas, seguimiento de objetivos y configuración.",log_led:"Registros del script de control del LED: transiciones de modo y árbol de decisión.",log_networking:"Registros de conexión WiFi o Ethernet y DHCP.",log_ble:"Registros del escáner y proxy Bluetooth de baja energía.",log_co2:"Registros del sensor de CO2 (SCD4x).",led_mode:"Controla el comportamiento del LED RGB. El control manual desactiva el LED automático y permite controlarlo como una entidad de luz estándar de HA.",led_brightness:"Multiplicador de brillo para el LED RGB en los modos automáticos.",led_presence_color:"Color utilizado para indicar ocupación cuando el LED está en modo Ocupación o Ambiental + Ocupación.",relay_trigger_mode:"Qué activa el relé. Desactivado deja el relé bajo control manual a través de la entidad de interruptor del relé. Cualquier otro modo sigue automáticamente la señal de presencia elegida y anula el control manual.",relay_contact_mode:'Normalmente abierto cierra el relé cuando se dispara el activador (típico "activo = cerrado"). Normalmente cerrado lo abre en su lugar — útil para circuitos de seguridad que esperan un bucle cerrado en estado inactivo.'},dimensions:{width_cm:"An (cm)",height_cm:"Al (cm)",rotation:"Rot"},protocol:{firmware_behind:"El firmware de este sensor debe actualizarse para funcionar con esta versión de la integración.",firmware_ahead:"El firmware de este sensor es más reciente que la integración. Actualiza la integración Everything Presence Pro Grid desde HACS.",open_hacs:"Abrir en HACS",unavailable:"El dispositivo no está disponible — no se puede determinar la versión del firmware.",update_firmware:"Actualizar firmware"},tabs:{device_configuration:"Configuración del dispositivo",flash_firmware:"Instalar firmware",help:"Abrir la guía del usuario"},flasher:{title:"Instalar firmware",devices_on_network:"Dispositivos instalados",no_devices:"No hay dispositivos Everything Presence Pro instalados.",no_eppgrid_devices:"No se han encontrado dispositivos con firmware Everything Presence Pro Grid.",flash_from_tab:"Instala el firmware de tus dispositivos desde la pestaña Instalar firmware",offline:"Sin conexión",online:"Conectado",usb_title:"Conexión USB",usb_flash_title:"Instalar firmware",usb_flash_desc:"Instala o actualiza el firmware y configura el WiFi.",usb_wifi_title:"Configurar WiFi",usb_wifi_desc:"Configura el WiFi en un dispositivo que ya tiene firmware instalado.",usb_browser_warning:"La instalación por USB requiere el navegador Chrome o Edge.",select_variant:"Selecciona la variante de firmware:",cancelling:"Cancelando...",wifi:"WiFi",ethernet:"Ethernet",go_to_config:"Ir a la configuración del dispositivo",flash_usb:"Instalar firmware por USB",loading:"Cargando dispositivos...",configure_wifi:"Configurar WiFi",scan:"Buscar de nuevo",scanning:"Buscando...",select_a_network:"Selecciona una red...",manual_ssid:"Introducir SSID manualmente (red oculta)",enter_ssid:"Introducir SSID",wifi_password:"Contraseña WiFi",show_password:"Mostrar contraseña",connected_to:"Conectado a {ssid}",ip_address:"Dirección IP: {ip}",continue:"Continuar",connect:"Conectar",usb_flash:"Instalar por USB",usb_step_connecting:"Conectando al dispositivo...",usb_step_wifi_check:"Comprobando conexión WiFi existente...",usb_step_flashing:"Instalando firmware {version}...",usb_step_scanning:"Buscando redes WiFi...",wifi_scan_hint:"Si el dispositivo ya está conectado al WiFi, es posible que la búsqueda no funcione. Usa la entrada manual de SSID en su lugar.",usb_step_provisioning:"Configurando WiFi...",usb_step_wifi_connecting:"Conectando al WiFi...",usb_step_reading_ip:"Detectando la dirección IP del dispositivo...",wifi_configured:"WiFi configurado correctamente",configure_wifi_override:"¿No es esta red? Configurar WiFi",go_to_integrations:"Ir a Integraciones",copy_ip:"Copiar dirección IP",retry_ha_add:"Reintentar añadir a Home Assistant",flash_another:"Flashear otro dispositivo",ha_add:{adding:"Añadiendo dispositivo a Home Assistant...",retrying:"Esperando a que el dispositivo esté disponible (intento {attempt} de {max})...",added:"Dispositivo añadido a Home Assistant",already_added:"El dispositivo ya está en Home Assistant",needs_auth:"Dispositivo accesible — completa la configuración en Integraciones para proporcionar la clave de cifrado",cannot_connect:"No se pudo conectar al dispositivo en la red. Comprueba que Home Assistant y el dispositivo están en la misma red.",failed:"Error al añadir: {reason}"},usb_ethernet_complete:"¡Firmware instalado correctamente!",usb_ethernet_hint:"Conecta el dispositivo a tu red mediante cable Ethernet. ESPHome lo detectará automáticamente.",go_to_devices:"Ir a Ajustes → Dispositivos",usb_retry:"Reintentar",confirm_delete_message:"Este dispositivo se configuró anteriormente con el firmware original. La configuración antigua se eliminará de Home Assistant.",update:"Actualizar",integration_update:"Actualización de la integración necesaria",integration_outdated_title:"Se requiere actualización de la integración",integration_outdated_body:"Uno o más dispositivos tienen un firmware más reciente que esta versión de la integración. Actualiza la integración Everything Presence Pro Grid para restaurar toda la funcionalidad.",open_hacs:"Abrir en HACS",ota_retry:"Reintentar",cancel:"Cancelar",start_over:"Empezar de nuevo",cancelled_ip_hint:"El dispositivo es accesible en {ip} — debería aparecer en la detección de Home Assistant pronto.",errors:{start_failed:"No se ha podido iniciar la actualización. ¿El dispositivo está en línea?",connect_failed:"No se ha podido conectar al dispositivo",connection_lost:"Se perdió la conexión durante la actualización",update_timeout:"La actualización ha agotado el tiempo de espera",device_offline:"El dispositivo se desconectó durante la actualización",update_failed_generic:"Error en la actualización",ota_failed_version_unchanged:"Actualización fallida — la versión del firmware no ha cambiado",ota_timeout:"La actualización OTA ha agotado el tiempo de espera",ota_device_error:"Error en la actualización: {message}",flash_cancelled:"Instalación cancelada",timeout:"Tiempo de espera agotado",aborted:"Cancelado"}},connection:{connecting:"Conectando al dispositivo...",offline:"El dispositivo no está disponible",failed:"No se puede conectar al dispositivo",client_count:"Hay {count} cliente(s) conectados actualmente.",check_connections:"Comprueba si hay otras pestañas del navegador con este panel abierto, sesiones de registro de ESPHome o instancias adicionales de Home Assistant.",retry:"Reintentar",ha_reconnecting:"Reconectando a Home Assistant..."},usb:{errors:{serial_port_busy:"El puerto serie está ocupado por una operación anterior. Actualiza la página e inténtalo de nuevo.",serial_port_unavailable:"Puerto serie no disponible",device_disconnected:"Dispositivo desconectado. Desconéctalo, vuelve a conectarlo e inténtalo de nuevo.",manifest_download_failed:"No se ha podido descargar el manifiesto del firmware",file_download_failed:"No se ha podido descargar el archivo de firmware: {file}",port_open_failed:"No se ha podido abrir el puerto serie. Desconecta el dispositivo, vuelve a conectarlo e inténtalo de nuevo.",no_device_response:"Sin respuesta del dispositivo — puede que tenga instalado el firmware Ethernet, que no admite configuración WiFi.",base_url_required:"baseUrl es obligatorio para la descarga del firmware",flash_failed:"Error al instalar el firmware."}},wifi:{errors:{provisioning_failed:"Error al configurar el WiFi",scan_failed:"Error al buscar redes WiFi",connection_failed:"Error de conexión WiFi — comprueba el SSID y la contraseña e inténtalo de nuevo",error_code:"Error de WiFi (código {code})",invalid_command:"Comando no válido — puede que el dispositivo necesite reiniciarse",unknown_command:"Comando desconocido",not_authorized:"No autorizado"}}}},Te=Object.assign(t=>t,{formatNumber:(t,e=1)=>t.toFixed(e),lang:"en"});function Fe(t,e){const i=e.split(".");let s=t;for(const t of i){if(null==s||"object"!=typeof s)return;s=s[t]}return"string"==typeof s?s:void 0}const Pe=["M12 13C12.8 13 13.61 13.13 14.38 13.36C14.28 13.73 14.2 14.11 14.2 14.5V14.74C13.5 15.34 13 16.24 13 17.2V20.24L12 21.5C7.88 16.37 4.39 12.06 .365 7C3.69 4.41 7.78 3 12 3C16.2 3 20.31 4.41 23.64 7L20.91 10.39C20.32 10.14 19.68 10 19 10C18.87 10 18.75 10.03 18.62 10.04L20.7 7.45C18.08 5.86 15.06 5 12 5S5.9 5.85 3.26 7.44L8.38 13.8C9.5 13.28 10.74 13 12 13M23 17.3V20.8C23 21.4 22.4 22 21.7 22H16.2C15.6 22 15 21.4 15 20.7V17.2C15 16.6 15.6 16 16.2 16V14.5C16.2 13.1 17.6 12 19 12S21.8 13.1 21.8 14.5V16C22.4 16 23 16.6 23 17.3M20.5 14.5C20.5 13.7 19.8 13.2 19 13.2S17.5 13.7 17.5 14.5V16H20.5V14.5Z","M14.2 14.5V14.74C13.5 15.34 13 16.24 13 17.2V20.24L12 21.5C7.88 16.37 4.39 12.06 .365 7C3.69 4.41 7.78 3 12 3C16.2 3 20.31 4.41 23.64 7L20.91 10.39C20.32 10.14 19.68 10 19 10C18.87 10 18.74 10.03 18.61 10.04L20.7 7.45C18.08 5.86 15.06 5 12 5S5.9 5.85 3.26 7.44L6.5 11.43C7.73 10.75 9.61 10 12 10C13.68 10 15.12 10.38 16.26 10.84C15.03 11.67 14.2 13 14.2 14.5M23 17.3V20.8C23 21.4 22.4 22 21.7 22H16.2C15.6 22 15 21.4 15 20.7V17.2C15 16.6 15.6 16 16.2 16V14.5C16.2 13.1 17.6 12 19 12S21.8 13.1 21.8 14.5V16C22.4 16 23 16.6 23 17.3M20.5 14.5C20.5 13.7 19.8 13.2 19 13.2S17.5 13.7 17.5 14.5V16H20.5V14.5Z","M19 10C19.68 10 20.32 10.14 20.91 10.39L23.64 7C20.31 4.41 16.2 3 12 3C7.78 3 3.69 4.41 .365 7C4.39 12.06 7.88 16.37 12 21.5L13 20.24V17.2C13 16.24 13.5 15.34 14.2 14.74V14.5C14.2 12.06 16.4 10 19 10M12 8C9 8 6.67 9 5.2 9.84L3.26 7.44C5.9 5.85 8.91 5 12 5S18.08 5.86 20.7 7.45L18.76 9.88C17.25 9 14.87 8 12 8M21.8 16V14.5C21.8 13.1 20.4 12 19 12S16.2 13.1 16.2 14.5V16C15.6 16 15 16.6 15 17.2V20.7C15 21.4 15.6 22 16.2 22H21.7C22.4 22 23 21.4 23 20.8V17.3C23 16.6 22.4 16 21.8 16M20.5 16H17.5V14.5C17.5 13.7 18.2 13.2 19 13.2S20.5 13.7 20.5 14.5V16Z","M14.2 14.5V14.74C13.5 15.34 13 16.24 13 17.2V20.24L12 21.5C7.88 16.37 4.39 12.06 .365 7C3.69 4.41 7.78 3 12 3C16.2 3 20.31 4.41 23.64 7L20.91 10.39C20.32 10.14 19.68 10 19 10C16.4 10 14.2 12.06 14.2 14.5M23 17.3V20.8C23 21.4 22.4 22 21.7 22H16.2C15.6 22 15 21.4 15 20.7V17.2C15 16.6 15.6 16 16.2 16V14.5C16.2 13.1 17.6 12 19 12S21.8 13.1 21.8 14.5V16C22.4 16 23 16.6 23 17.3M20.5 14.5C20.5 13.7 19.8 13.2 19 13.2S17.5 13.7 17.5 14.5V16H20.5V14.5Z"],Ue=["M12 13C12.74 13 13.5 13.12 14.22 13.31C14.22 13.38 14.2 13.44 14.2 13.5V14.74C13.5 15.34 13 16.24 13 17.2V20.24L12 21.5C7.88 16.37 4.39 12.06 .365 7C3.69 4.41 7.78 3 12 3C16.2 3 20.31 4.41 23.64 7L21.5 9.69C20.86 9.33 20.16 9.11 19.42 9.04L20.7 7.45C18.08 5.86 15.06 5 12 5S5.9 5.85 3.26 7.44L8.38 13.8C9.5 13.28 10.74 13 12 13M21.8 16H17.5V13.5C17.5 12.7 18.2 12.2 19 12.2S20.5 12.7 20.5 13.5V14H21.8V13.5C21.8 12.1 20.4 11 19 11S16.2 12.1 16.2 13.5V16C15.6 16 15 16.6 15 17.2V20.7C15 21.4 15.6 22 16.2 22H21.7C22.4 22 23 21.4 23 20.8V17.3C23 16.6 22.4 16 21.8 16Z","M15.44 10.55C14.68 11.35 14.2 12.38 14.2 13.5V14.74C13.5 15.34 13 16.24 13 17.2V20.24L12 21.5C7.88 16.37 4.39 12.06 .365 7C3.69 4.41 7.78 3 12 3C16.2 3 20.31 4.41 23.64 7L21.5 9.69C20.86 9.33 20.16 9.1 19.41 9.04L20.7 7.45C18.08 5.86 15.06 5 12 5S5.9 5.85 3.26 7.44L6.5 11.43C7.73 10.75 9.61 10 12 10C13.29 10 14.45 10.23 15.44 10.55M21.8 16H17.5V13.5C17.5 12.7 18.2 12.2 19 12.2S20.5 12.7 20.5 13.5V14H21.8V13.5C21.8 12.1 20.4 11 19 11S16.2 12.1 16.2 13.5V16C15.6 16 15 16.6 15 17.2V20.7C15 21.4 15.6 22 16.2 22H21.7C22.4 22 23 21.4 23 20.8V17.3C23 16.6 22.4 16 21.8 16Z","M14.2 13.5V14.74C13.5 15.34 13 16.24 13 17.2V20.24L12 21.5C7.88 16.37 4.39 12.06 .365 7C3.69 4.41 7.78 3 12 3C16.2 3 20.31 4.41 23.64 7L21.5 9.69C20.86 9.33 20.17 9.11 19.42 9.04L20.7 7.45C18.08 5.86 15.06 5 12 5S5.9 5.85 3.26 7.44L5.2 9.84C6.67 9 9 8 12 8C14.18 8 16.08 8.58 17.53 9.25C15.63 9.85 14.2 11.54 14.2 13.5M21.8 16H17.5V13.5C17.5 12.7 18.2 12.2 19 12.2S20.5 12.7 20.5 13.5V14H21.8V13.5C21.8 12.1 20.4 11 19 11S16.2 12.1 16.2 13.5V16C15.6 16 15 16.6 15 17.2V20.7C15 21.4 15.6 22 16.2 22H21.7C22.4 22 23 21.4 23 20.8V17.3C23 16.6 22.4 16 21.8 16Z","M14.2 13.5V14.74C13.5 15.34 13 16.24 13 17.2V20.24L12 21.5C7.88 16.37 4.39 12.06 .365 7C3.69 4.41 7.78 3 12 3C16.2 3 20.31 4.41 23.64 7L21.5 9.69C20.75 9.26 19.9 9 19 9C16.4 9 14.2 11.06 14.2 13.5M21.8 16H17.5V13.5C17.5 12.7 18.2 12.2 19 12.2S20.5 12.7 20.5 13.5V14H21.8V13.5C21.8 12.1 20.4 11 19 11S16.2 12.1 16.2 13.5V16C15.6 16 15 16.6 15 17.2V20.7C15 21.4 15.6 22 16.2 22H21.7C22.4 22 23 21.4 23 20.8V17.3C23 16.6 22.4 16 21.8 16Z"];function Oe(t,e){const i=t>=-50?3:t>=-65?2:t>=-75?1:0;return e?Pe[i]:Ue[i]}const ze=n`
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

  .usb-flash-iframe {
    display: block;
    width: 100%;
    height: 500px;
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 12px;
    margin: 16px 0;
    background: var(--card-background-color, #fff);
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

`;class Qe extends ct{constructor(){super(...arguments),this.flashableDevices=[],this.loading=!1,this.localize=Te,this._selectedVariant="wifi",this.firmwareBaseUrl="",this.firmwareVersion="",this.integrationVersion="",this.usbFlashState=null,this.wifiNetworks=[],this.otaStates={},this.cancelledDeviceIpHint=null,this._hasWebSerial="undefined"!=typeof navigator&&"serial"in navigator,this._showUsbFlash=!1,this._cancelling=!1,this._wifiScanning=!1,this._selectedSsid="",this._manualSsid=!1,this._wifiPassword="",this._showPassword=!1,this._wifiConnected=!1,this._deviceIp=null,this._showWifiProvisioning=!1,this._errorPopoverMac=null}_dispatchUpdateFirmware(t){this.dispatchEvent(new CustomEvent("update-firmware",{detail:{mac:t.mac},bubbles:!0,composed:!0}))}_toggleErrorPopover(t,e){t.stopPropagation(),this._errorPopoverMac=this._errorPopoverMac===e?null:e}_dispatchRetryOta(t){this._errorPopoverMac=null,this.dispatchEvent(new CustomEvent("retry-ota",{detail:{mac:t.mac},bubbles:!0,composed:!0}))}_renderOtaIndicator(t){const e=this.otaStates[t.mac];if(!e)return J;switch(e.state){case"updating":{if(null==e.progress)return $`<div class="ota-spinner"></div>`;const t=14,i=2*Math.PI*t,s=i-e.progress/100*i;return $`
					<div class="ota-progress">
						<svg width="36" height="36" viewBox="0 0 36 36">
							<circle class="ota-track" cx="18" cy="18" r="${t}" />
							<circle class="ota-fill" cx="18" cy="18" r="${t}"
								stroke-dasharray="${i}"
								stroke-dashoffset="${s}" />
						</svg>
						<span class="ota-pct">${Math.round(e.progress)}</span>
					</div>`}case"success":return $`<ha-icon class="ota-success" icon="mdi:check-circle"></ha-icon>`;case"error":return $`
					<div class="ota-error">
						<ha-icon class="ota-error-icon"
							icon="mdi:alert-circle"
							@click=${e=>this._toggleErrorPopover(e,t.mac)}
						></ha-icon>
						${t.available?$`<ha-button
									@click=${()=>this._dispatchRetryOta(t)}>
									${this.localize("flasher.ota_retry")}
								</ha-button>`:J}
						${this._errorPopoverMac===t.mac?$`<div class="ota-error-popover">${e.errorKey?this.localize(e.errorKey,e.errorParams):""}</div>`:J}
					</div>`}}_onUsbConnect(){this._showUsbFlash=!0}_dispatchFlashComplete(){this.dispatchEvent(new CustomEvent("flash-complete",{bubbles:!0,composed:!0}))}_dispatchUsbFlash(){this.dispatchEvent(new CustomEvent("usb-flash",{detail:{variant:this._getFirmwareVariant()},bubbles:!0,composed:!0}))}_dispatchUsbRetry(){this.dispatchEvent(new CustomEvent("usb-retry",{bubbles:!0,composed:!0}))}_dispatchRetryHaAdd(){this.dispatchEvent(new CustomEvent("retry-ha-add",{bubbles:!0,composed:!0}))}_dispatchCancel(){null==this.usbFlashState?this._showUsbFlash=!1:this._cancelling=!0,this._wifiPassword="",this.dispatchEvent(new CustomEvent("flasher-cancel",{bubbles:!0,composed:!0}))}updated(t){t.has("usbFlashState")&&null==this.usbFlashState&&(this._cancelling=!1)}_renderCancelButton(t){const e=this._cancelling?this.localize("flasher.cancelling"):this.localize("flasher.cancel");return $`<ha-button
			class=${t??""}
			@click=${this._dispatchCancel}
			?disabled=${this._cancelling}
		>${e}</ha-button>`}async _copyIp(t){if(t&&navigator.clipboard)try{await navigator.clipboard.writeText(t)}catch(t){console.error("failed to copy IP",t)}}_dispatchWifiScan(){this.dispatchEvent(new CustomEvent("wifi-scan",{bubbles:!0,composed:!0}))}_dispatchWifiProvision(){this.dispatchEvent(new CustomEvent("wifi-provision",{detail:{ssid:this._selectedSsid,password:this._wifiPassword},bubbles:!0,composed:!0}))}_dispatchWifiComplete(){this.dispatchEvent(new CustomEvent("wifi-complete",{bubbles:!0,composed:!0}))}_renderLoading(){return $`<div class="flasher-loading">${this.localize("flasher.loading")}</div>`}_renderWifiProvisioning(){if(this._wifiConnected)return $`
        <div class="flasher-content">
          <ha-card>
            <div class="card-header">${this.localize("flasher.configure_wifi")}</div>
            <div class="card-content">
              <div class="usb-complete">
                <ha-icon icon="mdi:wifi-check"></ha-icon>
                <p>${this.localize("flasher.connected_to",{ssid:this._selectedSsid})}</p>
                ${this._deviceIp?$`<p class="usb-ip">${this.localize("flasher.ip_address",{ip:this._deviceIp})}</p>`:J}
              </div>
              <div class="confirm-actions">
                <ha-button appearance="accent" @click=${this._dispatchWifiComplete}>
                  ${this.localize("flasher.continue")}
                </ha-button>
              </div>
            </div>
          </ha-card>
        </div>
      `;const t=[...this.wifiNetworks].sort((t,e)=>e.rssi-t.rssi),e=this._manualSsid||0===t.length;return $`
      <div class="flasher-content">
        <ha-card>
          <div class="card-header">${this.localize("flasher.configure_wifi")}</div>
          <div class="card-content wifi-form">

            ${t.length>0?$`
                <ha-select
                  .label=${this.localize("flasher.select_a_network")}
                  .value=${this._selectedSsid}
                  .options=${t.map(t=>({value:t.ssid,label:t.ssid,iconPath:Oe(t.rssi,t.authRequired)}))}
                  @selected=${t=>{t.detail.value!==this._selectedSsid&&(this._wifiPassword=""),this._selectedSsid=t.detail.value,this._manualSsid=!1}}
                  @closed=${t=>t.stopPropagation()}
                ></ha-select>
              `:J}

            <ha-formfield .label=${this.localize("flasher.manual_ssid")}>
              <ha-checkbox
                .checked=${e}
                @change=${t=>{this._manualSsid=t.target.checked,this._manualSsid||(this._selectedSsid=""),this._wifiPassword=""}}
              ></ha-checkbox>
            </ha-formfield>

            ${(()=>{const t=customElements.get("ha-input")?ft`ha-input`:ft`ha-textfield`,i=e?Et`
                <${t}
                  .label=${this.localize("flasher.enter_ssid")}
                  autocomplete="off"
                  .value=${this._selectedSsid}
                  @input=${t=>{this._selectedSsid=t.target.value}}
                ></${t}>
              `:J,s=Et`
              <${t}
                .label=${this.localize("flasher.wifi_password")}
                type=${this._showPassword?"text":"password"}
                autocomplete="new-password"
                .value=${this._wifiPassword}
                @input=${t=>{this._wifiPassword=t.target.value}}
              ></${t}>
            `;return $`${i}${s}`})()}

            <ha-formfield
              data-show-password
              .label=${this.localize("flasher.show_password")}
            >
              <ha-checkbox
                .checked=${this._showPassword}
                @change=${t=>{this._showPassword=t.target.checked}}
              ></ha-checkbox>
            </ha-formfield>

            <div class="confirm-actions">
              ${this._renderCancelButton()}
              <ha-button @click=${this._dispatchWifiScan}>
                ${this._wifiScanning?this.localize("flasher.scanning"):this.localize("flasher.scan")}
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
    `}_renderDeviceList(){const{flashableDevices:t}=this,e=t.some(t=>"eppgrid"===t.firmware_type&&"firmware_ahead"===t.firmware_status);return $`
      <div class="flasher-content">
        ${e?$`
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
            ${this.integrationVersion?$`<span class="integration-version">v${this.integrationVersion}</span>`:J}
          </div>
          <div class="card-content">
            ${0===t.length?$`<div class="flasher-empty">
                  <ha-icon icon="mdi:access-point-off"></ha-icon>
                  <p>${this.localize("flasher.no_devices")}</p>
                </div>`:$`
                <div class="device-list">
                  ${t.map(t=>{const e=!t.available||"original"===t.firmware_type;return $`
                      <div class="device-row">
                        <div class="device-info${e?" device-info-faded":""}">
                          <div class="device-name">${t.name} <span class="device-mac">(${t.mac.replace(/:/g,"").slice(-6).toLowerCase()})</span></div>
                          <div class="device-host">${t.host??this.localize("flasher.offline")}${"eppgrid"===t.firmware_type&&t.firmware_version&&"unknown"!==t.firmware_version?` - v${t.firmware_version}`:""}</div>
                        </div>
                        ${t.available?J:$`<span class="firmware-badge firmware-badge-offline">${this.localize("flasher.offline")}</span>`}
                        ${"eppgrid"!==t.firmware_type||!t.available||this.otaStates[t.mac]||t.update_available||"compatible"!==t.firmware_status&&"firmware_ahead"!==t.firmware_status?J:$`<span class="firmware-badge firmware-badge-online">${this.localize("flasher.online")}</span>`}
                        ${"original"===t.firmware_type?$`<span class="firmware-badge firmware-badge-original">${this.localize("flasher.flash_usb")}</span>`:J}
                        ${"eppgrid"===t.firmware_type&&"firmware_ahead"===t.firmware_status?$`<span class="firmware-badge firmware-badge-ahead">${this.localize("flasher.integration_update")}</span>`:J}
                        ${this.otaStates[t.mac]?this._renderOtaIndicator(t):"eppgrid"!==t.firmware_type||!t.update_available&&"firmware_behind"!==t.firmware_status?J:$`<ha-button
																		appearance="accent"
																		@click=${()=>this._dispatchUpdateFirmware(t)}
																	>${this.localize("flasher.update")}</ha-button>`}
                      </div>
                    `})}
                </div>
              `}
          </div>
        </ha-card>
        ${this._renderUsbSection()}
      </div>
    `}_dispatchUsbWifiConfig(){this.dispatchEvent(new CustomEvent("usb-wifi-config",{bubbles:!0,composed:!0}))}_renderUsbSection(){return $`
      <ha-card>
        <div class="card-header">${this.localize("flasher.usb_title")}</div>
        <div class="card-content">
          ${this._hasWebSerial?J:$`<div class="browser-warning">
                ${this.localize("flasher.usb_browser_warning")}
              </div>`}
          <div class="usb-actions">
            <div class="usb-action" @click=${this._onUsbConnect}>
              <ha-icon icon="mdi:chip"></ha-icon>
              <div class="usb-action-text">
                <div class="usb-action-title">${this.localize("flasher.usb_flash_title")}</div>
                <div class="usb-action-desc">${this.localize("flasher.usb_flash_desc")}</div>
              </div>
            </div>
            <div class="usb-action" @click=${this._dispatchUsbWifiConfig}>
              <ha-icon icon="mdi:wifi-cog"></ha-icon>
              <div class="usb-action-text">
                <div class="usb-action-title">${this.localize("flasher.usb_wifi_title")}</div>
                <div class="usb-action-desc">${this.localize("flasher.usb_wifi_desc")}</div>
              </div>
            </div>
          </div>
        </div>
      </ha-card>
    `}render(){return this.loading?this._renderLoading():this._showWifiProvisioning?this._renderWifiProvisioning():this._showUsbFlash||this.usbFlashState?this._renderUsbFlash():this._renderDeviceList()}_getFirmwareVariant(){return"wifi"===this._selectedVariant?"wifi-ble-co2":"ethernet-ble-co2"}_getManifestUrl(){const t=this._getFirmwareVariant();return`${this.firmwareBaseUrl}/everything-presence-pro-${t}-manifest.json`}_renderUsbFlash(){const t=this.usbFlashState;if("wifi_provision"===t?.step)return this._renderWifiProvisioning();if("error"===t?.step)return $`
				<div class="flasher-content">
					<ha-card>
						<div class="card-content">
							<div class="usb-error">
								<ha-icon icon="mdi:alert-circle-outline"></ha-icon>
								<p>${t.errorKey?this.localize(t.errorKey,t.errorParams):""}</p>
							</div>
							<div class="confirm-actions">
								<ha-button @click=${this._dispatchCancel}>
									${this.localize("flasher.start_over")}
								</ha-button>
								${t.fatal?J:$`<ha-button appearance="accent" @click=${this._dispatchUsbRetry}>
									${this.localize("flasher.usb_retry")}
								</ha-button>`}
							</div>
						</div>
					</ha-card>
				</div>
			`;if("wifi_configured"===t?.step)return $`
				<div class="flasher-content">
					<ha-card>
						<div class="card-content">
							<div class="usb-complete">
								<ha-icon icon="mdi:check-circle-outline"></ha-icon>
								<p>${this.localize("flasher.wifi_configured")}</p>
								${t.ip?$`<p class="usb-ip">${this.localize("flasher.ip_address",{ip:t.ip})}</p>`:J}
							</div>
							<div class="ha-add-progress">
								<ha-circular-progress indeterminate size="small"></ha-circular-progress>
								<span>
									${void 0!==t.haAddAttempt&&void 0!==t.haAddMaxAttempts?this.localize("flasher.ha_add.retrying",{attempt:t.haAddAttempt,max:t.haAddMaxAttempts}):this.localize("flasher.ha_add.adding")}
								</span>
							</div>
							${t.autoSkipped?$`<div class="wifi-override-row">
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
			`;if("complete"===t?.step){const e=t.variant?.startsWith("ethernet");if(e)return $`
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
				`;const i=t.ip,s=t.haAdd,o="added"===s?.type||"already_added"===s?.type,r=o?"mdi:check-circle-outline":"mdi:alert-outline",n=s?.type??"failed",a="failed"===s?.type?s.reason??"unknown":"";return $`
				<div class="flasher-content">
					<ha-card>
						<div class="card-content">
							<div class="usb-complete">
								<ha-icon icon=${r}></ha-icon>
								<p>${this.localize("flasher.wifi_configured")}</p>
								${i?$`<p class="usb-ip">${this.localize("flasher.ip_address",{ip:i})}</p>`:J}
								<p class="ha-add-result">
									${this.localize(`flasher.ha_add.${n}`,{reason:a})}
								</p>
							</div>
							<div class="confirm-actions">
								${o?$`<ha-button appearance="accent" @click=${this._dispatchFlashComplete}>
										${this.localize("flasher.go_to_config")}
									</ha-button>`:"needs_auth"===s?.type?$`<a href="/config/integrations/dashboard">
											<ha-button appearance="accent">${this.localize("flasher.go_to_integrations")}</ha-button>
										</a>`:$`
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
			`}if(t&&"idle"!==t.step){const e={connecting:"flasher.usb_step_connecting",flashing:"flasher.usb_step_flashing",wifi_check:"flasher.usb_step_wifi_check",wifi_scan:"flasher.usb_step_scanning",wifi_provision:"flasher.usb_step_provisioning",wifi_connecting:"flasher.usb_step_wifi_connecting",reading_ip:"flasher.usb_step_reading_ip"}[t.step]??t.step,i="flashing"===t.step?{version:this.firmwareVersion}:void 0,s="flashing"!==t.step&&"connecting"!==t.step;return $`
				<div class="flasher-content">
					<ha-card>
						<div class="card-content">
							<div class="usb-status">
								<p>${this.localize(e,i)}</p>
								${"flashing"===t.step&&null!=t.progress?$`<div class="usb-progress">
											<div class="usb-progress-bar" style="width: ${t.progress}%"></div>
											<span>${t.progress}%</span>
										</div>`:J}
								${"wifi_scan"===t.step?$`<p class="usb-hint">${this.localize("flasher.wifi_scan_hint")}</p>`:J}
								${s?$`<div class="confirm-actions">
											${this._renderCancelButton("cancel-btn")}
										</div>`:J}
							</div>
						</div>
					</ha-card>
				</div>
			`}return $`
			<div class="flasher-content">
				${this.cancelledDeviceIpHint?$`<div class="cancelled-ip-hint">
							${this.localize("flasher.cancelled_ip_hint",{ip:this.cancelledDeviceIpHint})}
						</div>`:J}
				<ha-card>
					<div class="card-header">
						${this.localize("flasher.title")}
						${this.firmwareVersion?$`<code>${this.firmwareVersion}</code>`:J}
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
		`}}Qe.styles=[ze],t([gt({attribute:!1})],Qe.prototype,"flashableDevices",void 0),t([gt({type:Boolean})],Qe.prototype,"loading",void 0),t([gt({attribute:!1})],Qe.prototype,"localize",void 0),t([ut()],Qe.prototype,"_selectedVariant",void 0),t([gt()],Qe.prototype,"firmwareBaseUrl",void 0),t([gt()],Qe.prototype,"firmwareVersion",void 0),t([gt()],Qe.prototype,"integrationVersion",void 0),t([gt({attribute:!1})],Qe.prototype,"usbFlashState",void 0),t([gt({attribute:!1})],Qe.prototype,"wifiNetworks",void 0),t([gt({attribute:!1})],Qe.prototype,"otaStates",void 0),t([gt({attribute:!1})],Qe.prototype,"cancelledDeviceIpHint",void 0),t([ut()],Qe.prototype,"_hasWebSerial",void 0),t([ut()],Qe.prototype,"_showUsbFlash",void 0),t([ut()],Qe.prototype,"_cancelling",void 0),t([ut()],Qe.prototype,"_wifiScanning",void 0),t([ut()],Qe.prototype,"_selectedSsid",void 0),t([ut()],Qe.prototype,"_manualSsid",void 0),t([ut()],Qe.prototype,"_wifiPassword",void 0),t([ut()],Qe.prototype,"_showPassword",void 0),t([ut()],Qe.prototype,"_wifiConnected",void 0),t([ut()],Qe.prototype,"_deviceIp",void 0),t([ut()],Qe.prototype,"_showWifiProvisioning",void 0),t([ut()],Qe.prototype,"_errorPopoverMac",void 0),customElements.get("epp-flasher-view")||customElements.define("epp-flasher-view",Qe)
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */;const He=2,Ge=t=>(...e)=>({_$litDirective$:t,values:e});let Le=class{constructor(t){}get _$AU(){return this._$AM._$AU}_$AT(t,e,i){this._$Ct=t,this._$AM=e,this._$Ci=i}_$AS(t,e){return this.update(t,e)}update(t,e){return this.render(...e)}};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class Ne extends Le{constructor(t){if(super(t),this.it=J,t.type!==He)throw Error(this.constructor.directiveName+"() can only be used in child bindings")}render(t){if(t===J||null==t)return this._t=void 0,this.it=t;if(t===K)return t;if("string"!=typeof t)throw Error(this.constructor.directiveName+"() called with a non-string value");if(t===this.it)return this._t;this.it=t;const e=[t];return e.raw=e,this._t={_$litType$:this.constructor.resultType,strings:e,values:[]}}}Ne.directiveName="unsafeHTML",Ne.resultType=1;const $e=Ge(Ne);
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */let Ye=class extends Ne{};Ye.directiveName="unsafeSVG",Ye.resultType=2;const Ke=Ge(Ye),Je=1,We=2,je=3,Ve=20,Ze=20,Xe=400,qe=300,ti=6e3,ei=t=>!!(1&t),ii=t=>t>>1&7,si=(t,e)=>-15&t|(7&e)<<1,oi=t=>t>>4&3,ri=(t,e)=>-49&t|(3&e)<<4,ni={entry:1,interference:2,suppress:3};function ai(t){let e=Ve,i=0,s=Ze,o=0;for(let r=0;r<Xe;r++)if(ei(t[r])){const t=r%Ve,n=Math.floor(r/Ve);t<e&&(e=t),t>i&&(i=t),n<s&&(s=n),n>o&&(o=n)}return{minCol:e,maxCol:i,minRow:s,maxRow:o}}function li(t){const{minCol:e,maxCol:i,minRow:s,maxRow:o}=ai(t);return{minCol:Math.max(0,e-1),maxCol:Math.min(19,i+1),minRow:Math.max(0,s-1),maxRow:Math.min(19,o+1)}}function ci(t){for(let e=0;e<Xe;e++)if(ei(t[e]))return!0;return!1}function hi(t,e,i,s){const o=i??ci(t),r=s??ci(e);if(!o||!r)return{dr:0,dc:0};const n=ai(t),a=ai(e);return{dr:a.minRow-n.minRow,dc:a.minCol-n.minCol}}function di(t,e){const i=new Uint8Array(Xe),s=Math.ceil(t/qe),o=Math.ceil(e/qe),r=Math.floor((Ve-s)/2);for(let t=0;t<Ze;t++)for(let e=0;e<Ve;e++){e>=r&&e<r+s&&t>=0&&t<0+o&&(i[t*Ve+e]=1)}return i}const Ai={armchair:{viewBox:"4 4 92 82",content:'<path d="M 15,10 Q 15,5 20,5 L 80,5 Q 85,5 85,10 L 85,25 L 15,25 Z" stroke="black" stroke-width="2" fill="none"/><path d="M 10,15 Q 5,15 5,20 L 5,80 Q 5,85 10,85 L 20,85 L 20,15 Z" stroke="black" stroke-width="2" fill="none"/><path d="M 80,15 L 80,85 L 90,85 Q 95,85 95,80 L 95,20 Q 95,15 90,15 Z" stroke="black" stroke-width="2" fill="none"/><rect x="20" y="25" width="60" height="60" rx="3" ry="3" stroke="black" stroke-width="2" fill="none"/>'},car:{viewBox:"-1 4 82 152",content:'<rect x="8" y="5" width="64" height="150" rx="20" ry="20" stroke="black" stroke-width="2" fill="none"/><path d="M 14,35 L 14,50 Q 14,55 20,55 L 60,55 Q 66,55 66,50 L 66,35" stroke="black" stroke-width="1.5" fill="none"/><path d="M 14,125 L 14,115 Q 14,110 20,110 L 60,110 Q 66,110 66,115 L 66,125" stroke="black" stroke-width="1.5" fill="none"/><rect x="14" y="55" width="52" height="55" rx="3" ry="3" stroke="black" stroke-width="1.5" fill="none"/><ellipse cx="4" cy="48" rx="4" ry="3" stroke="black" stroke-width="2" fill="none"/><ellipse cx="76" cy="48" rx="4" ry="3" stroke="black" stroke-width="2" fill="none"/><rect x="2" y="25" width="6" height="16" rx="2" ry="2" fill="black"/><rect x="72" y="25" width="6" height="16" rx="2" ry="2" fill="black"/><rect x="2" y="118" width="6" height="16" rx="2" ry="2" fill="black"/><rect x="72" y="118" width="6" height="16" rx="2" ry="2" fill="black"/><circle cx="22" cy="12" r="4" stroke="black" stroke-width="2" fill="none"/><circle cx="58" cy="12" r="4" stroke="black" stroke-width="2" fill="none"/>'},carpet:{viewBox:"4 0.25 132 89.5",content:'<rect x="5" y="5" width="130" height="80" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/><rect x="15" y="15" width="110" height="60" rx="1" ry="1" stroke="black" stroke-width="1" fill="none"/><line x1="15" y1="5" x2="15" y2="1" stroke="black" stroke-width="1.5"/><line x1="25" y1="5" x2="25" y2="1" stroke="black" stroke-width="1.5"/><line x1="35" y1="5" x2="35" y2="1" stroke="black" stroke-width="1.5"/><line x1="45" y1="5" x2="45" y2="1" stroke="black" stroke-width="1.5"/><line x1="55" y1="5" x2="55" y2="1" stroke="black" stroke-width="1.5"/><line x1="65" y1="5" x2="65" y2="1" stroke="black" stroke-width="1.5"/><line x1="75" y1="5" x2="75" y2="1" stroke="black" stroke-width="1.5"/><line x1="85" y1="5" x2="85" y2="1" stroke="black" stroke-width="1.5"/><line x1="95" y1="5" x2="95" y2="1" stroke="black" stroke-width="1.5"/><line x1="105" y1="5" x2="105" y2="1" stroke="black" stroke-width="1.5"/><line x1="115" y1="5" x2="115" y2="1" stroke="black" stroke-width="1.5"/><line x1="125" y1="5" x2="125" y2="1" stroke="black" stroke-width="1.5"/><line x1="15" y1="85" x2="15" y2="89" stroke="black" stroke-width="1.5"/><line x1="25" y1="85" x2="25" y2="89" stroke="black" stroke-width="1.5"/><line x1="35" y1="85" x2="35" y2="89" stroke="black" stroke-width="1.5"/><line x1="45" y1="85" x2="45" y2="89" stroke="black" stroke-width="1.5"/><line x1="55" y1="85" x2="55" y2="89" stroke="black" stroke-width="1.5"/><line x1="65" y1="85" x2="65" y2="89" stroke="black" stroke-width="1.5"/><line x1="75" y1="85" x2="75" y2="89" stroke="black" stroke-width="1.5"/><line x1="85" y1="85" x2="85" y2="89" stroke="black" stroke-width="1.5"/><line x1="95" y1="85" x2="95" y2="89" stroke="black" stroke-width="1.5"/><line x1="105" y1="85" x2="105" y2="89" stroke="black" stroke-width="1.5"/><line x1="115" y1="85" x2="115" y2="89" stroke="black" stroke-width="1.5"/><line x1="125" y1="85" x2="125" y2="89" stroke="black" stroke-width="1.5"/>'},"cat-bed":{viewBox:"4 4 62 62",content:'<circle cx="35" cy="35" r="30" stroke="black" stroke-width="2" fill="none"/><circle cx="35" cy="35" r="20" stroke="black" stroke-width="2" fill="none"/><path d="M 38,30 Q 45,28 44,35 Q 43,42 35,41 Q 28,40 30,34" stroke="black" stroke-width="1.5" fill="none"/><path d="M 36,28 L 38,23 L 41,27" stroke="black" stroke-width="1.5" fill="none"/>'},"ceiling-fan":{viewBox:"6.8107 5.5095 86.3786 83.5837",content:'<g transform="translate(50,50)"><path d="M -4,-10 L 4,-10 L 7,-42 Q 0,-45 -7,-42 Z" stroke="black" stroke-width="2" fill="none"/><path d="M -4,-10 L 4,-10 L 7,-42 Q 0,-45 -7,-42 Z" transform="rotate(72)" stroke="black" stroke-width="2" fill="none"/><path d="M -4,-10 L 4,-10 L 7,-42 Q 0,-45 -7,-42 Z" transform="rotate(144)" stroke="black" stroke-width="2" fill="none"/><path d="M -4,-10 L 4,-10 L 7,-42 Q 0,-45 -7,-42 Z" transform="rotate(216)" stroke="black" stroke-width="2" fill="none"/><path d="M -4,-10 L 4,-10 L 7,-42 Q 0,-45 -7,-42 Z" transform="rotate(288)" stroke="black" stroke-width="2" fill="none"/></g><circle cx="50" cy="50" r="10" stroke="black" stroke-width="2" fill="none"/><circle cx="50" cy="50" r="4" stroke="black" stroke-width="2" fill="none"/><circle cx="50" cy="50" r="1.5" fill="black" stroke="none"/>'},"dog-bed":{viewBox:"4 4 92 72",content:'<ellipse cx="50" cy="40" rx="45" ry="35" stroke="black" stroke-width="2" fill="none"/><ellipse cx="50" cy="40" rx="32" ry="22" stroke="black" stroke-width="2" fill="none"/><circle cx="46" cy="36" r="4" stroke="black" stroke-width="1.5" fill="none"/><circle cx="40" cy="29" r="2" stroke="black" stroke-width="1" fill="none"/><circle cx="47" cy="27" r="2" stroke="black" stroke-width="1" fill="none"/><circle cx="53" cy="29" r="2" stroke="black" stroke-width="1" fill="none"/>'},bath:{viewBox:"4 4 192 82",content:'<rect x="5" y="5" width="190" height="80" rx="20" ry="20" stroke="black" stroke-width="2" fill="none"/><rect x="15" y="15" width="170" height="60" rx="14" ry="14" stroke="black" stroke-width="2" fill="none"/><circle cx="32" cy="38" r="5" stroke="black" stroke-width="2" fill="none"/><circle cx="32" cy="52" r="5" stroke="black" stroke-width="2" fill="none"/><rect x="28" y="40" width="8" height="10" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/><circle cx="170" cy="45" r="4" stroke="black" stroke-width="2" fill="none"/><circle cx="170" cy="45" r="1.5" fill="black" stroke="none"/>'},"bed-double":{viewBox:"4 4 142 192",content:'<rect x="5" y="5" width="140" height="190" rx="3" ry="3" stroke="black" stroke-width="2" fill="none"/><rect x="5" y="5" width="140" height="20" rx="3" ry="3" stroke="black" stroke-width="2" fill="none"/><rect x="12" y="30" width="58" height="28" rx="6" ry="6" stroke="black" stroke-width="2" fill="none"/><rect x="80" y="30" width="58" height="28" rx="6" ry="6" stroke="black" stroke-width="2" fill="none"/><line x1="15" y1="70" x2="135" y2="70" stroke="black" stroke-width="2"/>'},"bed-single":{viewBox:"4 4 82 192",content:'<rect x="5" y="5" width="80" height="190" rx="3" ry="3" stroke="black" stroke-width="2" fill="none"/><rect x="5" y="5" width="80" height="20" rx="3" ry="3" stroke="black" stroke-width="2" fill="none"/><rect x="12" y="30" width="66" height="28" rx="6" ry="6" stroke="black" stroke-width="2" fill="none"/><line x1="15" y1="70" x2="75" y2="70" stroke="black" stroke-width="2"/>'},"door-left":{viewBox:"-2.5 9.75 105 89.75",content:'<line x1="0" y1="97" x2="7" y2="97" stroke="black" stroke-width="5"/><line x1="93" y1="97" x2="100" y2="97" stroke="black" stroke-width="5"/><line x1="7" y1="97" x2="7" y2="11" stroke="black" stroke-width="2.5"/><path d="M 7,11 A 86,86 0 0,1 93,97" stroke="black" stroke-width="1.5" fill="none" stroke-dasharray="4 3"/>'},"door-right":{viewBox:"-2.5 9.75 105 89.75",content:'<line x1="0" y1="97" x2="7" y2="97" stroke="black" stroke-width="5"/><line x1="93" y1="97" x2="100" y2="97" stroke="black" stroke-width="5"/><line x1="93" y1="97" x2="93" y2="11" stroke="black" stroke-width="2.5"/><path d="M 93,11 A 86,86 0 0,0 7,97" stroke="black" stroke-width="1.5" fill="none" stroke-dasharray="4 3"/>'},"hot-tub":{viewBox:"7 7 86 86",content:'<circle cx="50" cy="50" r="42" stroke="black" stroke-width="2" fill="none"/><circle cx="50" cy="50" r="35" stroke="black" stroke-width="2" fill="none"/><path d="M 30,40 Q 33,36 36,40 Q 39,44 42,40" stroke="black" stroke-width="1.5" fill="none"/><path d="M 50,35 Q 53,31 56,35 Q 59,39 62,35" stroke="black" stroke-width="1.5" fill="none"/><path d="M 38,55 Q 41,51 44,55 Q 47,59 50,55" stroke="black" stroke-width="1.5" fill="none"/><path d="M 56,50 Q 59,46 62,50 Q 65,54 68,50" stroke="black" stroke-width="1.5" fill="none"/><circle cx="50" cy="15" r="2" fill="black" stroke="none"/><circle cx="50" cy="85" r="2" fill="black" stroke="none"/><circle cx="15" cy="50" r="2" fill="black" stroke="none"/><circle cx="85" cy="50" r="2" fill="black" stroke="none"/>'},"floor-lamp":{viewBox:"7 1 34 56",content:'<path d="M 8,56 Q 18,52 28,56" stroke="black" stroke-width="2" fill="none"/><line x1="18" y1="54" x2="18" y2="12" stroke="black" stroke-width="2"/><path d="M 18,12 Q 18,6 24,6 L 30,6" stroke="black" stroke-width="2" fill="none"/><rect x="24" y="2" width="16" height="14" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/>'},oven:{viewBox:"4 4 92 92",content:'<rect x="5" y="5" width="90" height="90" rx="3" ry="3" stroke="black" stroke-width="2" fill="none"/><circle cx="30" cy="30" r="14" stroke="black" stroke-width="2" fill="none"/><circle cx="30" cy="30" r="7" stroke="black" stroke-width="2" fill="none"/><circle cx="70" cy="30" r="14" stroke="black" stroke-width="2" fill="none"/><circle cx="70" cy="30" r="7" stroke="black" stroke-width="2" fill="none"/><circle cx="30" cy="70" r="14" stroke="black" stroke-width="2" fill="none"/><circle cx="30" cy="70" r="7" stroke="black" stroke-width="2" fill="none"/><circle cx="70" cy="70" r="14" stroke="black" stroke-width="2" fill="none"/><circle cx="70" cy="70" r="7" stroke="black" stroke-width="2" fill="none"/>'},plant:{viewBox:"4.25 4.25 51.5 51.5",content:'<circle cx="30" cy="30" r="25" stroke="black" stroke-width="1.5" fill="none"/><g transform="translate(30,30)"><path d="M 0,0 C -5,-10 -3,-18 0,-20 C 3,-18 5,-10 0,0 Z" stroke="black" stroke-width="1.5" fill="none"/><path d="M 0,0 C -5,-10 -3,-18 0,-20 C 3,-18 5,-10 0,0 Z" transform="rotate(72)" stroke="black" stroke-width="1.5" fill="none"/><path d="M 0,0 C -5,-10 -3,-18 0,-20 C 3,-18 5,-10 0,0 Z" transform="rotate(144)" stroke="black" stroke-width="1.5" fill="none"/><path d="M 0,0 C -5,-10 -3,-18 0,-20 C 3,-18 5,-10 0,0 Z" transform="rotate(216)" stroke="black" stroke-width="1.5" fill="none"/><path d="M 0,0 C -5,-10 -3,-18 0,-20 C 3,-18 5,-10 0,0 Z" transform="rotate(288)" stroke="black" stroke-width="1.5" fill="none"/></g>'},pool:{viewBox:"4 4 172 92",content:'<rect x="5" y="5" width="170" height="90" rx="20" ry="20" stroke="black" stroke-width="2" fill="none"/><rect x="12" y="12" width="156" height="76" rx="16" ry="16" stroke="black" stroke-width="2" fill="none"/><line x1="25" y1="30" x2="155" y2="30" stroke="black" stroke-width="1" stroke-dasharray="4 3"/><line x1="25" y1="50" x2="155" y2="50" stroke="black" stroke-width="1" stroke-dasharray="4 3"/><line x1="25" y1="70" x2="155" y2="70" stroke="black" stroke-width="1" stroke-dasharray="4 3"/><path d="M 20,12 L 20,25 L 35,25 L 35,18 L 28,18 L 28,12" stroke="black" stroke-width="1.5" fill="none"/>'},shower:{viewBox:"4 4 92 92",content:'<rect x="5" y="5" width="90" height="90" rx="5" ry="5" stroke="black" stroke-width="2" fill="none"/><circle cx="22" cy="22" r="9" stroke="black" stroke-width="2" fill="none"/><circle cx="22" cy="22" r="4" stroke="black" stroke-width="2" fill="none"/><circle cx="50" cy="50" r="5" stroke="black" stroke-width="2" fill="none"/><circle cx="50" cy="50" r="2" fill="black" stroke="none"/>'},"sofa-two-seater":{viewBox:"4 4 152 82",content:'<path d="M 15,10 Q 15,5 20,5 L 140,5 Q 145,5 145,10 L 145,25 L 15,25 Z" stroke="black" stroke-width="2" fill="none"/><path d="M 10,15 Q 5,15 5,20 L 5,80 Q 5,85 10,85 L 20,85 L 20,15 Z" stroke="black" stroke-width="2" fill="none"/><path d="M 140,15 L 140,85 L 150,85 Q 155,85 155,80 L 155,20 Q 155,15 150,15 Z" stroke="black" stroke-width="2" fill="none"/><rect x="20" y="25" width="120" height="60" rx="3" ry="3" stroke="black" stroke-width="2" fill="none"/><line x1="80" y1="28" x2="80" y2="82" stroke="black" stroke-width="2"/>'},"sofa-three-seater":{viewBox:"4 4 212 82",content:'<path d="M 15,10 Q 15,5 20,5 L 200,5 Q 205,5 205,10 L 205,25 L 15,25 Z" stroke="black" stroke-width="2" fill="none"/><path d="M 10,15 Q 5,15 5,20 L 5,80 Q 5,85 10,85 L 20,85 L 20,15 Z" stroke="black" stroke-width="2" fill="none"/><path d="M 200,15 L 200,85 L 210,85 Q 215,85 215,80 L 215,20 Q 215,15 210,15 Z" stroke="black" stroke-width="2" fill="none"/><rect x="20" y="25" width="180" height="60" rx="3" ry="3" stroke="black" stroke-width="2" fill="none"/><line x1="80" y1="28" x2="80" y2="82" stroke="black" stroke-width="2"/><line x1="140" y1="28" x2="140" y2="82" stroke="black" stroke-width="2"/>'},"table-dining-room":{viewBox:"7 4 166 112",content:'<rect x="35" y="28" width="110" height="64" rx="3" ry="3" stroke="black" stroke-width="2" fill="none"/><rect x="52" y="5" width="30" height="16" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/><rect x="98" y="5" width="30" height="16" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/><rect x="52" y="99" width="30" height="16" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/><rect x="98" y="99" width="30" height="16" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/><rect x="8" y="45" width="16" height="30" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/><rect x="156" y="45" width="16" height="30" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/>'},"table-dining-room-round":{viewBox:"7 7 106 106",content:'<circle cx="60" cy="60" r="30" stroke="black" stroke-width="2" fill="none"/><rect x="42" y="8" width="36" height="14" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/><rect x="42" y="98" width="36" height="14" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/><rect x="8" y="42" width="14" height="36" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/><rect x="98" y="42" width="14" height="36" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/>'},television:{viewBox:"4 1 152 17",content:'<rect x="5" y="2" width="150" height="8" rx="1" ry="1" stroke="black" stroke-width="2" fill="none"/><rect x="60" y="10" width="40" height="7" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/>'},"bedside-table":{viewBox:"4 4 42 42",content:'<rect x="5" y="5" width="40" height="40" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/><line x1="5" y1="25" x2="45" y2="25" stroke="black" stroke-width="2"/>'},bidet:{viewBox:"9 9 62 82",content:'<ellipse cx="40" cy="50" rx="30" ry="40" stroke="black" stroke-width="2" fill="none"/><ellipse cx="40" cy="53" rx="20" ry="28" stroke="black" stroke-width="2" fill="none"/><circle cx="40" cy="18" r="4" stroke="black" stroke-width="2" fill="none"/><circle cx="40" cy="18" r="1.5" fill="black" stroke="none"/>'},cabinet:{viewBox:"4 4 72 32",content:'<rect x="5" y="5" width="70" height="30" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/><line x1="8" y1="15" x2="72" y2="15" stroke="black" stroke-width="1" stroke-dasharray="3 2"/><line x1="8" y1="25" x2="72" y2="25" stroke="black" stroke-width="1" stroke-dasharray="3 2"/>'},counter:{viewBox:"4 4 192 32",content:'<rect x="5" y="5" width="190" height="30" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/>'},cupboard:{viewBox:"4 4 92 42",content:'<rect x="5" y="5" width="90" height="40" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/><line x1="50" y1="5" x2="50" y2="45" stroke="black" stroke-width="2"/><circle cx="43" cy="25" r="2" fill="black" stroke="none"/><circle cx="57" cy="25" r="2" fill="black" stroke="none"/>'},desk:{viewBox:"4 4 132 87.2485",content:'<rect x="30" y="64" width="66" height="14" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/><line x1="33" y1="78" x2="30" y2="86" stroke="black" stroke-width="2"/><line x1="93" y1="78" x2="96" y2="86" stroke="black" stroke-width="2"/><path d="M 30,86 Q 63,94 96,86" stroke="black" stroke-width="2.5" fill="none"/><rect x="5" y="5" width="130" height="55" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/><rect x="40" y="12" width="42" height="12" rx="1" ry="1" stroke="black" stroke-width="2" fill="none"/><rect x="40" y="26" width="42" height="26" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/><line x1="45" y1="32" x2="77" y2="32" stroke="black" stroke-width="1"/><line x1="45" y1="37" x2="77" y2="37" stroke="black" stroke-width="1"/><line x1="45" y1="42" x2="77" y2="42" stroke="black" stroke-width="1"/><rect x="54" y="44" width="14" height="6" rx="1" ry="1" stroke="black" stroke-width="1" fill="none"/><circle cx="110" cy="22" r="10" stroke="black" stroke-width="2" fill="none"/><circle cx="110" cy="22" r="4" stroke="black" stroke-width="2" fill="none"/>'},fridge:{viewBox:"4 4 62 62",content:'<rect x="5" y="5" width="60" height="60" rx="3" ry="3" stroke="black" stroke-width="2" fill="none"/><rect x="9" y="9" width="52" height="52" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/><line x1="14" y1="22" x2="14" y2="48" stroke="black" stroke-width="2.5"/><circle cx="57" cy="20" r="1.5" fill="black" stroke="none"/><circle cx="57" cy="50" r="1.5" fill="black" stroke="none"/>'},"kitchen-island":{viewBox:"4 4 192 72",content:'<rect x="5" y="5" width="190" height="70" rx="3" ry="3" stroke="black" stroke-width="2" fill="none"/><rect x="20" y="35" width="35" height="25" rx="5" ry="5" stroke="black" stroke-width="2" fill="none"/><circle cx="37" cy="47" r="3" stroke="black" stroke-width="2" fill="none"/><circle cx="37" cy="47" r="1" fill="black" stroke="none"/><circle cx="16" cy="32" r="3" stroke="black" stroke-width="2" fill="none"/><path d="M 16,32 Q 28,32 28,42" stroke="black" stroke-width="2" fill="none"/><circle cx="130" cy="25" r="10" stroke="black" stroke-width="2" fill="none"/><circle cx="130" cy="25" r="5" stroke="black" stroke-width="2" fill="none"/><circle cx="165" cy="25" r="10" stroke="black" stroke-width="2" fill="none"/><circle cx="165" cy="25" r="5" stroke="black" stroke-width="2" fill="none"/><circle cx="130" cy="55" r="10" stroke="black" stroke-width="2" fill="none"/><circle cx="130" cy="55" r="5" stroke="black" stroke-width="2" fill="none"/><circle cx="165" cy="55" r="10" stroke="black" stroke-width="2" fill="none"/><circle cx="165" cy="55" r="5" stroke="black" stroke-width="2" fill="none"/>'},"side-table":{viewBox:"7.2513 3.5 39.4975 40.5",content:'<circle cx="27" cy="25" r="18" stroke="black" stroke-width="2" fill="none"/><path d="M 21,8 Q 27,1 33,8" stroke="black" stroke-width="2" fill="none"/><path d="M 9,28 Q 6,37 15,39" stroke="black" stroke-width="2" fill="none"/><path d="M 39,39 Q 48,37 45,28" stroke="black" stroke-width="2" fill="none"/>'},"sliding-door":{viewBox:"-2.5 4.75 105 10.5",content:'<line x1="0" y1="10" x2="8" y2="10" stroke="black" stroke-width="5"/><line x1="92" y1="10" x2="100" y2="10" stroke="black" stroke-width="5"/><line x1="8" y1="6" x2="52" y2="6" stroke="black" stroke-width="2.5"/><line x1="48" y1="14" x2="92" y2="14" stroke="black" stroke-width="2.5"/>'},speaker:{viewBox:"2.25 2.25 25.5 35.5",content:'<rect x="3" y="3" width="24" height="34" rx="3" ry="3" stroke="black" stroke-width="1.5" fill="none"/><circle cx="15" cy="25" r="8" stroke="black" stroke-width="1.5" fill="none"/><circle cx="15" cy="25" r="4" stroke="black" stroke-width="1.5" fill="none"/><circle cx="15" cy="11" r="4" stroke="black" stroke-width="1.5" fill="none"/><circle cx="15" cy="11" r="1.5" fill="black" stroke="none"/>'},"washing-machine":{viewBox:"4 4 72 72",content:'<rect x="5" y="5" width="70" height="70" rx="5" ry="5" stroke="black" stroke-width="2" fill="none"/><line x1="5" y1="20" x2="75" y2="20" stroke="black" stroke-width="2"/><circle cx="22" cy="13" r="5" stroke="black" stroke-width="2" fill="none"/><line x1="22" y1="13" x2="22" y2="9" stroke="black" stroke-width="1.5"/><circle cx="55" cy="13" r="2.5" fill="black" stroke="none"/><circle cx="65" cy="13" r="2.5" fill="black" stroke="none"/><circle cx="40" cy="48" r="20" stroke="black" stroke-width="2" fill="none"/><circle cx="40" cy="48" r="14" stroke="black" stroke-width="2" fill="none"/>'},window:{viewBox:"-1 1 102 12",content:'<line x1="0" y1="2" x2="100" y2="2" stroke="black" stroke-width="2"/><line x1="0" y1="12" x2="100" y2="12" stroke="black" stroke-width="2"/><line x1="0" y1="7" x2="100" y2="7" stroke="black" stroke-width="1"/><line x1="50" y1="2" x2="50" y2="12" stroke="black" stroke-width="1.5"/>'},toilet:{viewBox:"17 3 66 103",content:'<rect x="18" y="4" width="64" height="24" rx="4" ry="4" stroke="black" stroke-width="2" fill="none"/><rect x="22" y="7" width="56" height="18" rx="2" ry="2" stroke="black" stroke-width="2" fill="none"/><ellipse cx="50" cy="16" rx="6" ry="4" stroke="black" stroke-width="2" fill="none"/><circle cx="30" cy="30" r="2.5" fill="black" stroke="none"/><circle cx="70" cy="30" r="2.5" fill="black" stroke="none"/><path d="M 20,32 L 20,60 Q 20,100 50,105 Q 80,100 80,60 L 80,32" stroke="black" stroke-width="2" fill="none"/><path d="M 24,34 L 24,58 Q 24,94 50,99 Q 76,94 76,58 L 76,34" stroke="black" stroke-width="2" fill="none"/><path d="M 32,40 L 32,58 Q 32,86 50,90 Q 68,86 68,58 L 68,40 Q 68,36 50,36 Q 32,36 32,40 Z" stroke="black" stroke-width="2" fill="none"/><line x1="24" y1="34" x2="76" y2="34" stroke="black" stroke-width="2"/>'},washbasin:{viewBox:"4 4 92 62",content:'<rect x="5" y="5" width="90" height="60" rx="8" ry="8" stroke="black" stroke-width="2" fill="none"/><ellipse cx="50" cy="40" rx="35" ry="20" stroke="black" stroke-width="2" fill="none"/><circle cx="50" cy="12" r="3.5" stroke="black" stroke-width="2" fill="none"/><rect x="48.5" y="13" width="3" height="6" rx="1" ry="1" stroke="black" stroke-width="2" fill="none"/><circle cx="50" cy="40" r="3" stroke="black" stroke-width="2" fill="none"/><circle cx="50" cy="40" r="1" fill="black" stroke="none"/>'}},gi=[{type:"svg",icon:"armchair",label:"furniture.armchair",defaultWidth:800,defaultHeight:800},{type:"svg",icon:"bath",label:"furniture.bath",defaultWidth:1700,defaultHeight:700},{type:"svg",icon:"bed-double",label:"furniture.double_bed",defaultWidth:1600,defaultHeight:2e3},{type:"svg",icon:"bed-single",label:"furniture.single_bed",defaultWidth:900,defaultHeight:2e3},{type:"svg",icon:"door-left",label:"furniture.door_left_swing",defaultWidth:800,defaultHeight:800},{type:"svg",icon:"door-right",label:"furniture.door_right_swing",defaultWidth:800,defaultHeight:800},{type:"svg",icon:"table-dining-room",label:"furniture.dining_table",defaultWidth:1600,defaultHeight:900},{type:"svg",icon:"table-dining-room-round",label:"furniture.round_table",defaultWidth:1e3,defaultHeight:1e3},{type:"svg",icon:"floor-lamp",label:"furniture.lamp",defaultWidth:400,defaultHeight:400},{type:"svg",icon:"oven",label:"furniture.oven_stove",defaultWidth:600,defaultHeight:600},{type:"svg",icon:"plant",label:"furniture.plant",defaultWidth:400,defaultHeight:400},{type:"svg",icon:"shower",label:"furniture.shower",defaultWidth:900,defaultHeight:900},{type:"svg",icon:"sofa-two-seater",label:"furniture.sofa_2_seat",defaultWidth:1600,defaultHeight:800},{type:"svg",icon:"sofa-three-seater",label:"furniture.sofa_3_seat",defaultWidth:2400,defaultHeight:800},{type:"svg",icon:"television",label:"furniture.tv",defaultWidth:1200,defaultHeight:200},{type:"svg",icon:"toilet",label:"furniture.toilet",defaultWidth:400,defaultHeight:700},{type:"svg",icon:"car",label:"furniture.car",defaultWidth:1800,defaultHeight:4500},{type:"svg",icon:"carpet",label:"furniture.carpet",defaultWidth:2e3,defaultHeight:1400},{type:"svg",icon:"cat-bed",label:"furniture.cat_bed",defaultWidth:500,defaultHeight:500},{type:"svg",icon:"dog-bed",label:"furniture.dog_bed",defaultWidth:800,defaultHeight:600},{type:"svg",icon:"pool",label:"furniture.pool",defaultWidth:5e3,defaultHeight:3e3},{type:"svg",icon:"bedside-table",label:"furniture.bedside_table",defaultWidth:500,defaultHeight:500},{type:"svg",icon:"bidet",label:"furniture.bidet",defaultWidth:400,defaultHeight:500},{type:"svg",icon:"washbasin",label:"furniture.washbasin",defaultWidth:600,defaultHeight:420},{type:"svg",icon:"hot-tub",label:"furniture.hot_tub",defaultWidth:1500,defaultHeight:1500},{type:"svg",icon:"cabinet",label:"furniture.cabinet",defaultWidth:800,defaultHeight:400},{type:"svg",icon:"ceiling-fan",label:"furniture.ceiling_fan",defaultWidth:1200,defaultHeight:1200},{type:"svg",icon:"counter",label:"furniture.counter",defaultWidth:2e3,defaultHeight:400},{type:"svg",icon:"cupboard",label:"furniture.cupboard",defaultWidth:1e3,defaultHeight:500},{type:"svg",icon:"desk",label:"furniture.desk",defaultWidth:1400,defaultHeight:700},{type:"svg",icon:"fridge",label:"furniture.fridge",defaultWidth:700,defaultHeight:700},{type:"svg",icon:"kitchen-island",label:"furniture.kitchen_island",defaultWidth:2e3,defaultHeight:800},{type:"svg",icon:"side-table",label:"furniture.side_table",defaultWidth:500,defaultHeight:500},{type:"svg",icon:"sliding-door",label:"furniture.sliding_door",defaultWidth:1e3,defaultHeight:200},{type:"svg",icon:"speaker",label:"furniture.speaker",defaultWidth:300,defaultHeight:300},{type:"svg",icon:"washing-machine",label:"furniture.washing_machine",defaultWidth:600,defaultHeight:600},{type:"svg",icon:"window",label:"furniture.window",defaultWidth:1e3,defaultHeight:150}],ui=["corners.front_left","corners.front_right","corners.back_right","corners.back_left"],_i=[["corners.left_wall","corners.front_wall"],["corners.right_wall","corners.front_wall"],["corners.right_wall","corners.back_wall"],["corners.left_wall","corners.back_wall"]],pi=["#2196F3","#FF5722","#4CAF50"];if(3!==pi.length)throw new Error(`TARGET_COLORS palette (${pi.length}) must match MAX_TARGETS (3)`);const fi=Math.PI/3,wi=ti*Math.sin(Math.PI/3);function Ei(t,e){return t/qe*(e+1)}function mi(t,e){return t/(e+1)*qe}function bi(t,e,i){const s=i-e;return Math.round((t+s+360)%360)}class yi extends ct{constructor(){super(...arguments),this.furniture=[],this.selectedFurnitureId=null,this.roomWidth=3e3,this.cellPx=28,this.minCol=0,this.minRow=0,this.visCols=20,this.visRows=20,this.sidebarTab="zones",this.localize=Te}_mmToPx(t){return Ei(t,this.cellPx)}_fireEvent(t,e){this.dispatchEvent(new CustomEvent(t,{bubbles:!0,composed:!0,detail:e}))}_itemRotation(t){return this.furniture.find(e=>e.id===t)?.rotation??0}_onItemPointerDown(t,e){this._fireEvent("furniture-select",e),this._fireEvent("furniture-pointer-down",{e:t,id:e,type:"move",rotation:this._itemRotation(e)})}_onResizePointerDown(t,e,i){this._fireEvent("furniture-pointer-down",{e:t,id:e,type:"resize",handle:i,rotation:this._itemRotation(e)})}_onRotatePointerDown(t,e){this._fireEvent("furniture-pointer-down",{e:t,id:e,type:"rotate",rotation:this._itemRotation(e)})}_onDeletePointerDown(t,e){t.stopPropagation(),this._fireEvent("furniture-delete",e)}render(){if(!this.furniture.length)return J;const t=Math.ceil(this.roomWidth/qe),e=Math.floor((Ve-t)/2),i=this.cellPx+1,s="furniture"===this.sidebarTab;return $`
			<div class="furniture-overlay ${s?"":"non-interactive"}">
				${this.furniture.map(t=>{const s=(e-this.minCol)*i+this._mmToPx(t.x),o=(0-this.minRow)*i+this._mmToPx(t.y),r=this._mmToPx(t.width),n=this._mmToPx(t.height),a=this.selectedFurnitureId===t.id;return $`
						<div
							class="furniture-item ${a?"selected":""}"
							data-id="${t.id}"
							style="
								left: ${s}px; top: ${o}px;
								width: ${r}px; height: ${n}px;
								transform: rotate(${t.rotation}deg);
							"
							@pointerdown=${e=>this._onItemPointerDown(e,t.id)}
						>
							${"svg"===t.type&&Ai[t.icon]?Y`<svg viewBox="${Ai[t.icon].viewBox}" preserveAspectRatio="none" class="furn-svg">
										${Ke(Ai[t.icon].content)}
									</svg>`:$`<ha-icon icon="${t.icon}" style="--mdc-icon-size: ${.6*Math.min(r,n)}px;"></ha-icon>`}
							${a?$`
										<!-- Resize handles (cursor follows visual rotation) -->
										${["n","s","e","w","ne","nw","se","sw"].map(e=>$`
												<div
													class="furn-handle furn-handle-${e}"
													style="cursor: ${function(t,e){const i=t.includes("e")?1:t.includes("w")?-1:0,s=t.includes("s")?1:t.includes("n")?-1:0,o=((180*Math.atan2(i,-s)/Math.PI+e)%180+180)%180;switch(45*Math.round(o/45)%180){case 0:return"ns-resize";case 45:return"nesw-resize";case 90:return"ew-resize";default:return"nwse-resize"}}(e,t.rotation)};"
													@pointerdown=${i=>this._onResizePointerDown(i,t.id,e)}
												></div>
											`)}
										<!-- Rotate handle with stem -->
										<div class="furn-rotate-stem"></div>
										<div class="furn-rotate-handle" @pointerdown=${e=>this._onRotatePointerDown(e,t.id)}>
											<ha-icon icon="mdi:rotate-right" style="--mdc-icon-size: 14px;"></ha-icon>
										</div>
										<!-- Delete button -->
										<div class="furn-delete-btn" @pointerdown=${e=>this._onDeletePointerDown(e,t.id)}>
											<ha-icon icon="mdi:close" style="--mdc-icon-size: 14px;"></ha-icon>
										</div>
									`:J}
						</div>
					`})}
			</div>
		`}}yi.styles=n`
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
			width: 22px;
			height: 22px;
			background: transparent;
			pointer-events: auto;
			z-index: 2;
			display: flex;
			align-items: center;
			justify-content: center;
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
	`,t([gt({attribute:!1})],yi.prototype,"furniture",void 0),t([gt({attribute:!1})],yi.prototype,"selectedFurnitureId",void 0),t([gt({type:Number})],yi.prototype,"roomWidth",void 0),t([gt({type:Number})],yi.prototype,"cellPx",void 0),t([gt({type:Number})],yi.prototype,"minCol",void 0),t([gt({type:Number})],yi.prototype,"minRow",void 0),t([gt({type:Number})],yi.prototype,"visCols",void 0),t([gt({type:Number})],yi.prototype,"visRows",void 0),t([gt({attribute:!1})],yi.prototype,"sidebarTab",void 0),t([gt({attribute:!1})],yi.prototype,"localize",void 0),customElements.get("epp-furniture-overlay")||customElements.define("epp-furniture-overlay",yi);const vi=n`
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
`,Ci=n`
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
`,Bi=n`
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
`,Si=n`
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
`,Ii=n`
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
`;class xi extends ct{constructor(){super(...arguments),this.furniture=[],this.selectedFurnitureId=null,this.hass=void 0,this.localize=Te,this.showCustomIconPicker=!1,this.customIconValue="",this._searchQuery=""}render(){return this._renderFurnitureSidebar()}_renderFurnitureSidebar(){const t=this.furniture.find(t=>t.id===this.selectedFurnitureId);return $`
			<input
				type="search"
				class="furn-search"
				.value=${this._searchQuery}
				placeholder=${this.localize("furniture.search_placeholder")}
				aria-label=${this.localize("furniture.search_placeholder")}
				@input=${t=>{this._searchQuery=t.target.value}}
			/>

			${t?$`
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
										@change=${e=>this._fireUpdate(t.id,{width:10*parseInt(e.target.value,10)})}
									/>
								</label>
								<label>
									${this.localize("dimensions.height_cm")}
									<input type="number" min="10" step="5" .value=${String(Math.round(t.height/10))}
										@change=${e=>this._fireUpdate(t.id,{height:10*parseInt(e.target.value,10)})}
									/>
								</label>
								<label>
									${this.localize("dimensions.rotation")}
									<input type="number" step="5" .value=${String(Math.round(10*t.rotation)/10)}
										@change=${e=>{const i=parseFloat(e.target.value);if(!Number.isFinite(i))return;const s=(i%360+360)%360;this._fireUpdate(t.id,{rotation:s})}}
									/>
								</label>
							</div>
						</div>
					`:J}

			<div class="furn-catalog">
				${function(t,e,i){const s=e.trim().toLowerCase(),o=t.map(t=>{const e=i(t.label);return{sticker:t,localizedLabel:e,normalizedLabel:e.toLowerCase()}}),r=s?o.filter(t=>t.normalizedLabel.includes(s)):o;return r.slice().sort((t,e)=>t.localizedLabel.localeCompare(e.localizedLabel)).map(t=>t.sticker)}(gi,this._searchQuery,this.localize).map(t=>$`
						<button class="furn-sticker" @click=${()=>this._fireAdd(t)}>
							${"svg"===t.type&&Ai[t.icon]?Y`<svg viewBox="${Ai[t.icon].viewBox}" class="furn-sticker-svg">
										${Ke(Ai[t.icon].content)}
									</svg>`:$`<ha-icon icon="${t.icon}" style="--mdc-icon-size: 24px;"></ha-icon>`}
							<span>${this.localize(t.label)}</span>
						</button>
					`)}
				<button class="furn-sticker furn-custom" @click=${()=>{this.dispatchEvent(new CustomEvent("custom-icon-toggle",{bubbles:!0,composed:!0}))}}>
					<ha-icon icon="mdi:plus" style="--mdc-icon-size: 24px;"></ha-icon>
					<span>${this.localize("furniture.custom_icon")}</span>
				</button>
			</div>
			${this.showCustomIconPicker?$`
						<div class="template-dialog">
							<div class="template-dialog-card">
								<h3>${this.localize("furniture.custom_icon")}</h3>
								<ha-icon-picker
									.hass=${this.hass}
									.value=${this.customIconValue}
									@value-changed=${t=>{this.dispatchEvent(new CustomEvent("custom-icon-change",{detail:t.detail?.value??"",bubbles:!0,composed:!0}))}}
								></ha-icon-picker>
								${this.customIconValue.trim()?$`
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
		`}_fireAdd(t){this.dispatchEvent(new CustomEvent("furniture-add",{detail:t,bubbles:!0,composed:!0}))}_fireRemove(t){this.dispatchEvent(new CustomEvent("furniture-remove",{detail:t,bubbles:!0,composed:!0}))}_fireUpdate(t,e){this.dispatchEvent(new CustomEvent("furniture-update",{detail:{id:t,updates:e},bubbles:!0,composed:!0}))}}xi.styles=[vi,Ci,n`
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
		`],t([gt({attribute:!1})],xi.prototype,"furniture",void 0),t([gt({attribute:!1})],xi.prototype,"selectedFurnitureId",void 0),t([gt({attribute:!1})],xi.prototype,"hass",void 0),t([gt({attribute:!1})],xi.prototype,"localize",void 0),t([gt({attribute:!1})],xi.prototype,"showCustomIconPicker",void 0),t([gt({attribute:!1})],xi.prototype,"customIconValue",void 0),t([ut()],xi.prototype,"_searchQuery",void 0),customElements.get("epp-furniture-sidebar")||customElements.define("epp-furniture-sidebar",xi)
/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */;const{I:Di}=nt,Mi=t=>t,Ri=()=>document.createComment(""),ki=(t,e,i)=>{const s=t._$AA.parentNode,o=void 0===e?t._$AB:e._$AA;if(void 0===i){const e=s.insertBefore(Ri(),o),r=s.insertBefore(Ri(),o);i=new Di(e,r,t,t.options)}else{const e=i._$AB.nextSibling,r=i._$AM,n=r!==t;if(n){let e;i._$AQ?.(t),i._$AM=t,void 0!==i._$AP&&(e=t._$AU)!==r._$AU&&i._$AP(e)}if(e!==o||n){let t=i._$AA;for(;t!==e;){const e=Mi(t).nextSibling;Mi(s).insertBefore(t,o),t=e}}}return i},Ti=(t,e,i=t)=>(t._$AI(e,i),t),Fi={},Pi=(t,e=Fi)=>t._$AH=e,Ui=t=>{t._$AR(),t._$AA.remove()},Oi=(t,e,i)=>{const s=new Map;for(let o=e;o<=i;o++)s.set(t[o],o);return s},zi=Ge(class extends Le{constructor(t){if(super(t),t.type!==He)throw Error("repeat() can only be used in text expressions")}dt(t,e,i){let s;void 0===i?i=e:void 0!==e&&(s=e);const o=[],r=[];let n=0;for(const e of t)o[n]=s?s(e,n):n,r[n]=i(e,n),n++;return{values:r,keys:o}}render(t,e,i){return this.dt(t,e,i).values}update(t,[e,i,s]){const o=(t=>t._$AH)(t),{values:r,keys:n}=this.dt(e,i,s);if(!Array.isArray(o))return this.ut=n,r;const a=this.ut??=[],l=[];let c,h,d=0,A=o.length-1,g=0,u=r.length-1;for(;d<=A&&g<=u;)if(null===o[d])d++;else if(null===o[A])A--;else if(a[d]===n[g])l[g]=Ti(o[d],r[g]),d++,g++;else if(a[A]===n[u])l[u]=Ti(o[A],r[u]),A--,u--;else if(a[d]===n[u])l[u]=Ti(o[d],r[u]),ki(t,l[u+1],o[d]),d++,u--;else if(a[A]===n[g])l[g]=Ti(o[A],r[g]),ki(t,o[d],o[A]),A--,g++;else if(void 0===c&&(c=Oi(n,g,u),h=Oi(a,d,A)),c.has(a[d]))if(c.has(a[A])){const e=h.get(n[g]),i=void 0!==e?o[e]:null;if(null===i){const e=ki(t,o[d]);Ti(e,r[g]),l[g]=e}else l[g]=Ti(i,r[g]),ki(t,o[d],i),o[e]=null;g++}else Ui(o[A]),A--;else Ui(o[d]),d++;for(;g<=u;){const e=ki(t,l[u+1]);Ti(e,r[g]),l[g++]=e}for(;d<=A;){const t=o[d++];null!==t&&Ui(t)}return this.ut=n,Pi(t,l),K}});
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function Qi(t,e,i,s){if(i<=0||s<=0)return null;const o=Math.ceil(i/qe);return{col:Math.floor((Ve-o)/2)+t/qe,row:e/qe}}function Hi(t,e){if(!ei(t))return"var(--secondary-background-color, #e0e0e0)";const i=ii(t);if(i>0&&i<=7){const t=e[i-1];if(t)return t.color}return"var(--card-background-color, #fff)"}function Gi(t){return{r:parseInt(t.slice(1,3),16),g:parseInt(t.slice(3,5),16),b:parseInt(t.slice(5,7),16)}}function Li(t,e,i){const s=t[6]*e+t[7]*i+1;return{x:(t[0]*e+t[1]*i+t[2])/s,y:(t[3]*e+t[4]*i+t[5])/s}}function Ni(t){const e=Li(t,0,0),i=Li(t,0,1e3),s=i.x-e.x,o=i.y-e.y,r=Math.sqrt(s*s+o*o);return!Number.isFinite(r)||r<1e-6?null:{sensorPos:e,dirX:s/r,dirY:o/r}}function $i(t){return t?Li(t,0,0):null}function Yi(t,e,i,s,o){if(!i)return"in_range";const r=Math.ceil(s/qe),n=Math.floor((Ve-r)/2),a=(e+.5)*qe,l=(t-n+.5)*qe-i.sensorPos.x,c=a-i.sensorPos.y,h=l*l+c*c;if(h<1)return"in_range";const d=l*i.dirX+c*i.dirY;return d<=0||d*d<.25*h||h>36e6?"out_of_cone":h>o*o?"beyond_max_range":"in_range"}function Ki(t,e,i,s){let o=Ve,r=0,n=Ze,a=0;for(let l=0;l<Xe;l++){if(!ei(t[l]))continue;const c=l%Ve,h=Math.floor(l/Ve);"out_of_cone"!==Yi(c,h,e,i,s)&&(c<o&&(o=c),c>r&&(r=c),h<n&&(n=h),h>a&&(a=h))}return o>r?{minCol:o,maxCol:r,minRow:n,maxRow:a}:{minCol:Math.max(0,o-1),maxCol:Math.min(19,r+1),minRow:Math.max(0,n-1),maxRow:Math.min(19,a+1)}}function Ji(t,e,i,s){if(t<=0||e<=0)return 0;const o=$i(i);if(o){const e=Math.ceil(t/qe),i=Math.floor((Ve-e)/2);let r=0;const n=ai(s);for(let t=n.minRow;t<=n.maxRow;t++)for(let e=n.minCol;e<=n.maxCol;e++){if(!ei(s[t*Ve+e]))continue;const n=(t+.5)*qe,a=(e-i+.5)*qe-o.x,l=n-o.y,c=Math.sqrt(a*a+l*l);c>r&&(r=c)}if(r>0){const t=r/1e3;return Math.ceil(2*t)/2}}const r=Math.max(t,e)/1e3;return Math.ceil(2*r)/2}function Wi(t){if(0===t.length)return 0;const e=[...t].sort((t,e)=>t-e),i=Math.floor(e.length/2);return e.length%2?e[i]:(e[i-1]+e[i])/2}function ji(t,e,i,s,o){const r=Math.ceil(e/qe),n=Math.floor((Ve-r)/2);let a=Ve,l=0,c=Ze,h=0,d=0;for(let i=0;i<Xe;i++){if(!ei(t[i]))continue;const r=i%Ve,n=Math.floor(i/Ve);s&&null!=o&&"out_of_cone"===Yi(r,n,s,e,o)||(r<a&&(a=r),r>l&&(l=r),n<c&&(c=n),n>h&&(h=n))}if(a>l)return null;const A=(l-a+1)*qe,g=(h-c+1)*qe,u=s?.sensorPos??$i(i),_=u?u.x:A/2,p=u?u.y:0;for(let i=0;i<Xe;i++){if(!ei(t[i]))continue;const r=i%Ve,a=Math.floor(i/Ve);if(s&&null!=o&&"out_of_cone"===Yi(r,a,s,e,o))continue;const l=(r-n+.5)*qe-_,c=(a+.5)*qe-p,h=l*l+c*c;h>d&&(d=h)}return{widthM:A/1e3,depthM:g/1e3,furthestM:Math.sqrt(d)/1e3}}const Vi={[Je]:"background-image: repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(60,60,60,0.7) 6px, rgba(60,60,60,0.7) 8px);",[We]:"background-image: repeating-linear-gradient(-45deg, transparent, transparent 5px, var(--error-color, #cc3333) 5px, var(--error-color, #cc3333) 7px);",[je]:"background-image: repeating-linear-gradient(-45deg, transparent, transparent 5px, var(--error-color, #cc3333) 5px, var(--error-color, #cc3333) 7px), repeating-linear-gradient(45deg, transparent, transparent 5px, var(--error-color, #cc3333) 5px, var(--error-color, #cc3333) 7px);"};class Zi extends ct{constructor(){super(...arguments),this.grid=new Uint8Array(0),this.zoneConfigs=[],this.targets=[],this.roomWidth=0,this.roomDepth=0,this.perspective=null,this.furniture=[],this.selectedFurnitureId=null,this.sidebarTab="zones",this.editable=!1,this.activeZone=null,this.showHitCounts=!1,this.occupancy={},this.targetPrevXY=[],this.heatmapColors=null,this.localize=Te,this.maxRangeMm=ti,this.dismissedTargets=new Map,this.maxGridPx=480,this.frozenBounds=null,this._fovCache=null,this._fovPerspective=Zi._FOV_UNCACHED,this._lastEnterIdx=-1}willUpdate(t){if((t.has("targets")||t.has("dismissedTargets")||t.has("roomWidth")||t.has("roomDepth"))&&0!==this.dismissedTargets.size)for(const[t,e]of this.dismissedTargets){const i=this.targets[t];if(!i||"inactive"===i.status||null==i.x||null==i.y)continue;const s=Qi(i.x,i.y,this.roomWidth,this.roomDepth);if(!s)continue;const o=Math.floor(s.col);Math.floor(s.row)*Ve+o!==e&&this.dispatchEvent(new CustomEvent("target-undismissed",{detail:{targetIndex:t},bubbles:!0,composed:!0}))}}render(){const t=this.frozenBounds??Ki(this.grid,this._getSensorFov(),this.roomWidth,this.maxRangeMm),e=t.minCol>t.maxCol,i=e?0:t.minCol,s=e?19:t.maxCol,o=e?0:t.minRow,r=e?19:t.maxRow,n=s-i+1,a=r-o+1,l=Math.min(Math.floor(this.maxGridPx/n),Math.floor(this.maxGridPx/a),32);return $`
			<div class="grid-targets-wrapper">
				<div
					class="grid"
					style="grid-template-columns: repeat(${n}, ${l}px); grid-template-rows: repeat(${a}, ${l}px);"
					@mouseup=${this._onCellMouseUp}
				>
					${this._renderVisibleCells(i,s,o,r,l)}
				</div>
				${this._renderFurnitureOverlay(l,i,o,n,a)}
				${this._renderTargetDots(i,s,o,r,n,a)}
			</div>
			${this._renderGridDimensions()}
		`}_getSensorFov(){return this.perspective?(this._fovPerspective===this.perspective||(this._fovCache=Ni(this.perspective),this._fovPerspective=this.perspective),this._fovCache):null}_renderVisibleCells(t,e,i,s,o){const r=this.heatmapColors,n=this.occupancy,a=this._getSensorFov(),l=this.maxRangeMm,c=[];for(let h=i;h<=s;h++)for(let i=t;i<=e;i++){const t=h*Ve+i,e=this.grid[t],s=Yi(i,h,a,this.roomWidth,l),d="in_range"===s,A=ei(e);let g;g="in_range"===s?Hi(e,this.zoneConfigs):"beyond_max_range"===s&&A?"repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,0.13) 3px, rgba(0,0,0,0.13) 4px), repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(0,0,0,0.13) 3px, rgba(0,0,0,0.13) 4px), #fff":"beyond_max_range"===s?Hi(e,this.zoneConfigs):"repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,0.13) 3px, rgba(0,0,0,0.13) 4px), repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(0,0,0,0.13) 3px, rgba(0,0,0,0.13) 4px), #c8c8c8";let u="";if(d&&ei(e)){const t=ii(e);if(r){const e=r.get(t);e&&(g=`linear-gradient(${e}, ${e}), linear-gradient(${g}, ${g})`)}if(n[t]){const e=t>0?this.zoneConfigs[t-1]?.color:null;u=`position: relative; z-index: 1; box-shadow: 0 0 8px 1px color-mix(in srgb, ${e??"#999"} 60%, ${e?"#222":"#444"});`}}const _=d&&ei(e)?Vi[oi(e)]??"":"";c.push($`
					<div
						class="cell"
						style="background: ${g}; width: ${o}px; height: ${o}px; ${u} ${_}"
						@mousedown=${()=>{d&&this._onCellMouseDown(t)}}
						@mouseenter=${()=>{d&&this._onCellMouseEnter(t)}}
					></div>
				`)}return c}_onCellMouseDown(t){this._lastEnterIdx=-1,this.dispatchEvent(new CustomEvent("cell-paint",{detail:{index:t,action:"down"},bubbles:!0,composed:!0}))}_onCellMouseEnter(t){t!==this._lastEnterIdx&&(this._lastEnterIdx=t,this.dispatchEvent(new CustomEvent("cell-paint",{detail:{index:t,action:"enter"},bubbles:!0,composed:!0})))}_onCellMouseUp(){this._lastEnterIdx=-1,this.dispatchEvent(new CustomEvent("cell-paint",{detail:{action:"up"},bubbles:!0,composed:!0}))}_renderTargetDots(t,e,i,s,o,r){return $`
			<div class="targets-overlay" style="pointer-events: none;">
				${zi(this.targets.slice(0,3),(t,e)=>e,(n,a)=>{if("inactive"===n.status)return J;let l=null!=n.x&&null!=n.y?Qi(n.x,n.y,this.roomWidth,this.roomDepth):null;const c=l&&l.col>=t&&l.col<=e&&l.row>=i&&l.row<=s;if("pending"===n.status&&!c&&this.targetPrevXY[a])l=Qi(this.targetPrevXY[a].x,this.targetPrevXY[a].y,this.roomWidth,this.roomDepth);else if(!c)return J;if(!l)return J;const h=Math.max(0,Math.min(100,(l.col-t)/o*100)),d=Math.max(0,Math.min(100,(l.row-i)/r*100));if(this.dismissedTargets.has(a)){const t=Math.floor(l.col),e=Math.floor(l.row)*Ve+t;if(this.dismissedTargets.get(a)===e)return J}if(this.grid.length>0){const t=Math.floor(l.col),e=Math.floor(l.row)*Ve+t;if(e>=0&&e<this.grid.length){const t=oi(this.grid[e]);if(2===t||3===t){const t=ii(this.grid[e]);if(!this.occupancy[t])return J}}}const A="pending"===n.status?.3:1;return $`
							<div
								class="target-dot ${this.editable?"":"clickable"}"
								style="left: ${h}%; top: ${d}%; background: ${pi[a]}; opacity: ${A}; transition: opacity 0.5s ease;"
								@click=${t=>{this.editable||(t.stopPropagation(),this.dispatchEvent(new CustomEvent("target-click",{detail:{targetIndex:a,x:n.x,y:n.y,pctX:h,pctY:d},bubbles:!0,composed:!0})))}}
							></div>
							${"active"===n.status&&n.signal>0?$`
										<div style="position: absolute; left: ${h}%; top: ${d}%; transform: translate(-50%, -280%); background: rgba(0,0,0,0.7); color: #fff; font-size: 10px; font-weight: bold; padding: 0 4px; border-radius: 6px; pointer-events: none;">
											${n.signal}
										</div>
									`:J}
						`})}
			</div>
		`}_renderGridDimensions(){const t=ji(this.grid,this.roomWidth,this.perspective,this._getSensorFov(),this.maxRangeMm);return t?$`
			<div class="grid-dimensions">
				${this.localize("live.grid_dimensions",{width:t.widthM,depth:t.depthM,furthest:t.furthestM})}
			</div>
		`:J}_renderFurnitureOverlay(t,e,i,s,o){return this.furniture.length?$`
			<epp-furniture-overlay
				.furniture=${this.furniture}
				.selectedFurnitureId=${this.selectedFurnitureId}
				.roomWidth=${this.roomWidth}
				.cellPx=${t}
				.minCol=${e}
				.minRow=${i}
				.visCols=${s}
				.visRows=${o}
				.sidebarTab=${this.sidebarTab}
				.localize=${this.localize}
				@furniture-select=${t=>{t.stopPropagation(),this.dispatchEvent(new CustomEvent("furniture-select",{detail:t.detail,bubbles:!0,composed:!0}))}}
				@furniture-pointer-down=${t=>{t.stopPropagation(),this.dispatchEvent(new CustomEvent("furniture-pointer-down",{detail:t.detail,bubbles:!0,composed:!0}))}}
				@furniture-delete=${t=>{t.stopPropagation(),this.dispatchEvent(new CustomEvent("furniture-delete",{detail:t.detail,bubbles:!0,composed:!0}))}}
			></epp-furniture-overlay>
		`:J}}Zi.styles=n`
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
	`,Zi._FOV_UNCACHED={},t([gt({attribute:!1})],Zi.prototype,"grid",void 0),t([gt({attribute:!1})],Zi.prototype,"zoneConfigs",void 0),t([gt({attribute:!1})],Zi.prototype,"targets",void 0),t([gt({type:Number})],Zi.prototype,"roomWidth",void 0),t([gt({type:Number})],Zi.prototype,"roomDepth",void 0),t([gt({attribute:!1})],Zi.prototype,"perspective",void 0),t([gt({attribute:!1})],Zi.prototype,"furniture",void 0),t([gt({attribute:!1})],Zi.prototype,"selectedFurnitureId",void 0),t([gt({attribute:!1})],Zi.prototype,"sidebarTab",void 0),t([gt({type:Boolean,reflect:!0})],Zi.prototype,"editable",void 0),t([gt({attribute:!1})],Zi.prototype,"activeZone",void 0),t([gt({type:Boolean})],Zi.prototype,"showHitCounts",void 0),t([gt({attribute:!1})],Zi.prototype,"occupancy",void 0),t([gt({attribute:!1})],Zi.prototype,"targetPrevXY",void 0),t([gt({attribute:!1})],Zi.prototype,"heatmapColors",void 0),t([gt({attribute:!1})],Zi.prototype,"localize",void 0),t([gt({type:Number})],Zi.prototype,"maxRangeMm",void 0),t([gt({attribute:!1})],Zi.prototype,"dismissedTargets",void 0),t([gt({type:Number})],Zi.prototype,"maxGridPx",void 0),t([gt({attribute:!1})],Zi.prototype,"frozenBounds",void 0),customElements.get("epp-grid")||customElements.define("epp-grid",Zi);class Xi extends ct{constructor(){super(...arguments),this.sensorState={occupancy:!1,static_presence:!1,motion_presence:!1,target_presence:!1,mmwave:!1,illuminance:null,temperature:null,humidity:null,co2:null},this.zoneState={occupancy:{},target_counts:{},frame_count:0},this.zoneConfigs=[],this.hasPerspective=!1,this.localize=Te,this._expandedSensorInfo=null}render(){const t=this.sensorState,e=this.zoneState,i=[{id:"occupancy",label:this.localize("live.occupancy"),on:t.occupancy_state??t.occupancy,info:this.localize("info.occupancy")},{id:"static",label:this.localize("live.static_presence"),on:t.static_state?"I"!==t.static_state:t.static_presence,info:this.localize("info.static_presence")},{id:"motion",label:this.localize("live.motion_presence"),on:t.motion_state?"I"!==t.motion_state:t.motion_presence,info:this.localize("info.motion_presence")},{id:"target",label:this.localize("live.target_presence"),on:t.target_presence,info:this.localize("info.target_presence")},{id:"mmwave",label:this.localize("live.mmwave"),on:t.mmwave,info:this.localize("info.mmwave")}],s=[],o=e.occupancy[0]??!1,r=e.target_counts[0]??0;s.push({id:"zone_0",label:this.localize("sidebar.rest_of_room"),on:o,info:this.localize("info.rest_of_room_occupancy",{count:r}),color:null});for(let t=0;t<7;t++){const i=this.zoneConfigs[t];if(!i)continue;const o=t+1,r=e.occupancy[o]??!1,n=e.target_counts[o]??0;s.push({id:`zone_${o}`,label:i.name,on:r,info:this.localize("info.zone_occupancy",{slot:o,count:n}),color:i.color})}const n=[];return null!==t.illuminance&&n.push({id:"illuminance",label:this.localize("entities.illuminance"),value:this.localize("live.illuminance_value",{value:t.illuminance})}),null!==t.temperature&&n.push({id:"temperature",label:this.localize("entities.temperature"),value:this.localize("live.temperature_value",{value:t.temperature})}),null!==t.humidity&&n.push({id:"humidity",label:this.localize("entities.humidity"),value:this.localize("live.humidity_value",{value:t.humidity})}),null!==t.co2&&n.push({id:"co2",label:this.localize("entities.co2"),value:this.localize("live.co2_value",{value:t.co2})}),$`
      <div style="padding: 8px 0;">
        <div class="live-section-header">${this.localize("live.presence")}</div>
        ${i.map(t=>$`
          <div class="live-sensor-row">
            <div class="live-sensor-dot ${t.on?"on":"off"}"></div>
            <span class="live-sensor-label">${t.label}</span>
            <span class="live-sensor-state ${t.on?"detected":""}">${t.on?this.localize("live.detected"):this.localize("live.clear")}</span>
            <button class="live-sensor-info-btn"
              type="button"
              aria-label=${this.localize("live.show_info")}
              @click=${()=>{this._expandedSensorInfo=this._expandedSensorInfo===t.id?null:t.id}}
            >
              <ha-icon icon="mdi:information-outline" style="--mdc-icon-size: 16px;"></ha-icon>
            </button>
          </div>
          ${this._expandedSensorInfo===t.id?$`
            <div class="live-sensor-info-text">${t.info}</div>
          `:J}
        `)}

        ${this.hasPerspective?$`
        <hr style="border: none; border-top: 1px solid var(--divider-color, #eee); margin: 10px 12px;"/>

        <button class="live-section-header live-section-link" @click=${()=>{this.dispatchEvent(new CustomEvent("view-change",{detail:{view:"editor",sidebarTab:"zones"},bubbles:!0,composed:!0}))}}>${this.localize("sidebar.detection_zones")}</button>
        ${s.map(t=>$`
          <div class="live-sensor-row">
            <div
              class="live-sensor-dot"
              style=${t.color?`background: ${t.color};${t.on?` box-shadow: 0 0 6px 2px ${t.color};`:""}`:"background: #fff; border: 1px solid #ccc;"+(t.on?" box-shadow: 0 0 6px 2px #999;":"")}
            ></div>
            <span class="live-sensor-label">${t.label}</span>
            <span class="live-sensor-state ${t.on?"detected":""}">${t.on?this.localize("live.detected"):this.localize("live.clear")}</span>
            <button class="live-sensor-info-btn"
              type="button"
              aria-label=${this.localize("live.show_info")}
              @click=${()=>{this._expandedSensorInfo=this._expandedSensorInfo===t.id?null:t.id}}
            >
              <ha-icon icon="mdi:information-outline" style="--mdc-icon-size: 16px;"></ha-icon>
            </button>
          </div>
          ${this._expandedSensorInfo===t.id?$`
            <div class="live-sensor-info-text">${t.info}</div>
          `:J}
        `)}
        `:J}

        <hr style="border: none; border-top: 1px solid var(--divider-color, #eee); margin: 10px 12px;"/>

        ${n.length?$`
          <div class="live-section-header">${this.localize("live.environment")}</div>
          ${n.map(t=>$`
            <div class="live-sensor-row">
              <span class="live-sensor-label">${t.label}</span>
              <span class="live-sensor-value">${t.value}</span>
            </div>
          `)}
        `:J}

      </div>
    `}}Xi.styles=n`
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

  `,t([gt({attribute:!1})],Xi.prototype,"sensorState",void 0),t([gt({attribute:!1})],Xi.prototype,"zoneState",void 0),t([gt({attribute:!1})],Xi.prototype,"zoneConfigs",void 0),t([gt({attribute:!1})],Xi.prototype,"hasPerspective",void 0),t([gt({attribute:!1})],Xi.prototype,"localize",void 0),t([ut()],Xi.prototype,"_expandedSensorInfo",void 0),customElements.get("epp-live-sidebar")||customElements.define("epp-live-sidebar",Xi);const qi=[{type:"default"},null,null,null,null,null,null,null],ts={default:{trigger:5,renew:3,timeout:10,handoff_timeout:3},bed:{trigger:8,renew:2,timeout:600,handoff_timeout:10},seating:{trigger:7,renew:1,timeout:30,handoff_timeout:10},transit:{trigger:3,renew:2,timeout:3,handoff_timeout:1}},es=["default","bed","seating","transit","custom"],is=["#B8E7FF","#CFDB70","#FFC4CF","#F3E7AC","#7CCFB8","#A0C4E7","#F3AC94"];function ss(t){const e=ts[t.type]??ts.default,i="custom"===t.type;return{type:t.type,trigger:i?t.trigger??e.trigger:e.trigger,renew:i?t.renew??e.renew:e.renew,timeout:i?t.timeout??e.timeout:e.timeout,handoff_timeout:i?t.handoff_timeout??e.handoff_timeout:e.handoff_timeout}}function os(t,e,i,s,o,r,n){if(0===t){const t=ts[i]||ts.default;return"custom"===i?{trigger:s,renew:o,timeout:r,handoffTimeout:n}:{trigger:t.trigger,renew:t.renew,timeout:t.timeout,handoffTimeout:t.handoff_timeout}}if(t>0&&t<=e.length){const i=e[t-1];if(i){const t=ts[i.type]||ts.default;return"custom"===i.type?{trigger:i.trigger??t.trigger,renew:i.renew??t.renew,timeout:i.timeout??t.timeout,handoffTimeout:i.handoff_timeout??t.handoff_timeout}:{trigger:t.trigger,renew:t.renew,timeout:t.timeout,handoffTimeout:t.handoff_timeout}}}rs.has(t)||(rs.add(t),console.warn(`getZoneThresholds: no thresholds for zid=${t}, falling back to defaults`));const a=ts.default;return{trigger:a.trigger,renew:a.renew,timeout:a.timeout,handoffTimeout:a.handoff_timeout}}const rs=new Set;function ns(t){return es.includes(t)?t:"default"}function as(t,e){const i="number"==typeof t?t:"string"==typeof t?Number(t):NaN;return Number.isFinite(i)?i:e}function ls(t,e){const i=as(t,e);return i>0?i:e}function cs(t,e){return"string"==typeof t&&t.length>0?t:"number"==typeof t&&Number.isFinite(t)?String(t):e}function hs(t,e,i){const s=t||{};return{temperatureOffset:s.temperature_offset??0,humidityOffset:s.humidity_offset??0,illuminanceOffset:s.illuminance_offset??0,motionTimeout:s.motion_timeout??5,targetAutoDistance:s.target_auto_distance??!0,targetMaxDistance:s.target_max_distance??6,stuckTargetTimeout:s.stuck_target_timeout??300,staticAutoDistance:s.static_auto_distance??!0,staticMinDistance:s.static_min_distance??.3,staticMaxDistance:s.static_max_distance??16,staticTriggerThreshold:s.static_trigger_threshold??3,staticRenewThreshold:s.static_renew_threshold??3,staticTimeout:s.static_timeout??30,staticOnDelay:Math.min(Math.max(s.static_on_delay??0,0),2),entities:e||{},logLevels:i??{},ledMode:s.led_mode??"Manual Control",ledBrightness:s.led_brightness??1,ledPresenceColor:s.led_presence_color??"#CC33FF",relayTriggerMode:s.relay_trigger_mode??"disabled",relayContactMode:s.relay_contact_mode??"no",targetUpdateRateMs:s.target_update_rate_ms??1e3,zoneUpdateRateMs:s.zone_update_rate_ms??1e3}}function ds(t){const e=function(t){const e=t?.calibration,i=e?.perspective,s=Array.isArray(i)&&8===i.length&&i.every(t=>"number"==typeof t&&Number.isFinite(t))&&i.some(t=>Math.abs(t)>1e-9);return s&&e.room_width>0?{perspective:i,roomWidth:e.room_width||0,roomDepth:e.room_depth||0}:{perspective:null,roomWidth:0,roomDepth:0}}(t),i=t?.room_layout||{},s=(o=i.furniture,(Array.isArray(o)?o:[]).map((t,e)=>{const i="svg"===cs(t?.type,"icon")?"svg":"icon";return{id:cs(t?.id,`f_load_${e}`),type:i,icon:cs(t?.icon,"mdi:help"),label:cs(t?.label,"Item"),x:as(t?.x,0),y:as(t?.y,0),width:ls(t?.width,600),height:ls(t?.height,600),rotation:as(t?.rotation,0),lockAspect:"boolean"==typeof t?.lockAspect?t.lockAspect:"svg"!==i}}));var o;const r=function(t,e,i){return t?.grid_bytes&&Array.isArray(t.grid_bytes)?new Uint8Array(t.grid_bytes):e>0&&i>0?di(e,i):new Uint8Array(Xe)}(i,e.roomWidth,e.roomDepth),{zone0:n,zones:a}=function(t){const e={zone0:{type:"default"},zones:Array(7).fill(null)},i=t?.zone_slots;if(!Array.isArray(i)||8!==i.length)return e;if(!i[0]||"object"!=typeof i[0])return e;const s={type:ns(i[0].type),trigger:i[0].trigger,renew:i[0].renew,timeout:i[0].timeout,handoff_timeout:i[0].handoff_timeout},o=Array.from({length:7},(t,e)=>{const s=i[e+1];return s&&"object"==typeof s?{...s,type:ns(s.type)}:null});return{zone0:s,zones:o}}(i);return{calibration:e,furniture:s,grid:r,zone0:n,zoneConfigs:a,settings:hs(t?.settings,t?.entities,t?.log_levels)}}const As=n`
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
`,gs=n`
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
`;class us extends ct{constructor(){super(...arguments),this.sensorState={occupancy:!1,static_presence:!1,motion_presence:!1,target_presence:!1,illuminance:null,temperature:null,humidity:null,co2:null},this.targetAutoDistance=!0,this.targetMaxDistance=6,this.stuckTargetTimeout=300,this.staticAutoDistance=!0,this.staticMinDistance=.3,this.staticMaxDistance=16,this.openAccordions=new Set,this.perspective=null,this.roomWidth=0,this.roomDepth=0,this.grid=new Uint8Array(0),this.saving=!1,this.dirty=!1,this.temperatureOffset=0,this.humidityOffset=0,this.illuminanceOffset=0,this.motionTimeout=5,this.staticTimeout=30,this.staticTriggerThreshold=3,this.staticRenewThreshold=3,this.staticOnDelay=0,this.entitiesConfig={},this.logLevels={},this.bluetoothEnabled=!1,this.co2Enabled=!1,this.ledMode="Manual Control",this.ledBrightness=1,this.ledPresenceColor="#CC33FF",this.relayTriggerMode="disabled",this.relayContactMode="no",this.targetUpdateRateMs=1e3,this.zoneUpdateRateMs=1e3,this._overrides={},this._localDirty=!1,this.localize=Te,this._stopClosed=t=>{t.stopPropagation()},this._tipIdCounter=0,this._openTooltip=null,this._openTooltipBtn=null,this._tipListenersAttached=!1,this._onTooltipKeydown=t=>{"Escape"===t.key&&this._closeOpenTooltip()},this._onTooltipViewportChange=()=>{this._closeOpenTooltip()},this._onTooltipPointerDown=t=>{const e=t.composedPath();this._openTooltipBtn&&e.includes(this._openTooltipBtn)||this._closeOpenTooltip()}}render(){this._tipIdCounter=0;return $`
      <div class="settings-container">
        <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 500;">${this.localize("settings.title")}</h2>
        ${[{id:"reporting",label:"settings.entities",icon:"mdi:format-list-checks"},{id:"detection",label:"settings.detection_ranges",icon:"mdi:signal-distance-variant"},{id:"sensitivity",label:"settings.sensor_calibration",icon:"mdi:tune-vertical"},{id:"led_relay",label:"settings.led_and_relay",icon:"mdi:led-variant-on"},{id:"logging",label:"settings.logging",icon:"mdi:math-log"}].map(t=>{const e=this.openAccordions.has(t.id);return $`
            <div class="accordion">
              <button class="accordion-header" ?data-open=${e} @click=${()=>this.toggleAccordion(t.id)}>
                <ha-icon icon=${t.icon}></ha-icon>
                <span class="accordion-title">${this.localize(t.label)}</span>
                <ha-icon class="accordion-chevron" icon="mdi:chevron-down" ?data-open=${e}></ha-icon>
              </button>
              ${e?$`
                <div class="accordion-body">
                  ${this.renderSettingsSection(t.id)}
                </div>
              `:J}
            </div>
          `})}
        ${this.renderSaveCancelButtons()}
      </div>
    `}toggleAccordion(t){const e=this.openAccordions.has(t)?new Set:new Set([t]);this.openAccordions=e,this.dispatchEvent(new CustomEvent("accordion-toggle",{detail:e,bubbles:!0,composed:!0}))}renderSettingsSection(t){switch(t){case"detection":return this.renderDetectionRanges();case"sensitivity":return this.renderSensitivities();case"reporting":return this.renderEntities();case"led_relay":return $`${this.renderLed()}${this.renderRelay()}`;case"logging":return this.renderLogging();default:return J}}renderEnvOffset(t,e,i,s,o,r,n,a,l,c=-1/0,h=1/0){const d=`${i}Offset`,A="function"==typeof e?e:()=>e,g=A(),u=this[d]??0,_=null!=g?g-u:null,p=t=>Math.max(c,Math.min(h,t)),f=null!=_?this.localize.formatNumber(p(_+u),a):"—";return $`
      <div class="setting-row">
        <label>${t}</label>
        <span class="setting-input-unit"><input type="range" class="setting-range" data-offset-key=${i} data-precision=${a} data-display-min=${c} data-display-max=${h} min=${s} max=${o} step=${r} .value=${String(u)} @input=${t=>{const e=t.target,s=parseFloat(e.value),o=A(),r=this[d]??0,n=null!=o?o-r:null,l=null!=n?this.localize.formatNumber(p(n+s),a):"—";this._setSettingValue(e,l),this._overrides[`${i}Offset`]=s,this._fireDirty()}} /><span class="setting-value">${f}</span> ${n}</span>
        ${this.resetBtn(0)}${this.infoTip(l)}
      </div>
    `}_setText(t,e){const i=document.createTreeWalker(t,NodeFilter.SHOW_TEXT).nextNode();i?i.data=e:t.textContent=e}_setSettingValue(t,e){const i=t.parentElement?.querySelector(".setting-value");i instanceof HTMLElement&&this._setText(i,e)}_resetSlider(t,e,i){const s=t.querySelector(".setting-range");if(!s)return;const o=parseFloat(s.value);s.value=String(e);const r=s.parentElement?.querySelector(".setting-value");if(r){const t=parseFloat(r.textContent||"");if(s.dataset.offsetKey){if(Number.isNaN(t))this._setText(r,"—");else{const i=parseInt(s.dataset.precision??"0",10),n=parseFloat(s.dataset.displayMin??"-Infinity"),a=parseFloat(s.dataset.displayMax??"Infinity"),l=Math.max(n,Math.min(a,t-o+e));this._setText(r,this.localize.formatNumber(l,i))}this._overrides[`${s.dataset.offsetKey}Offset`]=e}else this._setText(r,String(e))}i&&(this._overrides[i]=e),this._localDirty=!0}resetBtn(t,e){return $`<button
			type="button"
			class="setting-info"
			aria-label=${this.localize("settings.reset_to_default")}
			title=${this.localize("settings.reset_to_default")}
			@click=${i=>{i.stopPropagation();const s=i.currentTarget.closest(".setting-row");s&&this._resetSlider(s,t,e),e?this._fireChange(e,t):this._fireDirty()}}
		><ha-icon icon="mdi:restart"></ha-icon></button>`}_attachTooltipListeners(){this._tipListenersAttached||(document.addEventListener("keydown",this._onTooltipKeydown),document.addEventListener("pointerdown",this._onTooltipPointerDown,!0),window.addEventListener("scroll",this._onTooltipViewportChange,!0),window.addEventListener("resize",this._onTooltipViewportChange),this._tipListenersAttached=!0)}_detachTooltipListeners(){this._tipListenersAttached&&(document.removeEventListener("keydown",this._onTooltipKeydown),document.removeEventListener("pointerdown",this._onTooltipPointerDown,!0),window.removeEventListener("scroll",this._onTooltipViewportChange,!0),window.removeEventListener("resize",this._onTooltipViewportChange),this._tipListenersAttached=!1)}_closeOpenTooltip(){this._openTooltip&&(this._openTooltip.style.display="none",this._openTooltip=null,this._openTooltipBtn=null),this._detachTooltipListeners()}disconnectedCallback(){super.disconnectedCallback(),this._closeOpenTooltip()}infoTip(t){const e="epp-tip-"+ ++this._tipIdCounter;return $`<button
			type="button"
			class="setting-info"
			aria-label=${this.localize("settings.show_info")}
			aria-describedby=${e}
			title=${this.localize("settings.show_info")}
			@click=${t=>{t.stopPropagation();const e=t.currentTarget,i=e.querySelector(".setting-info-tooltip");if(!i)return;const s="block"===i.style.display;if(this.shadowRoot.querySelectorAll(".setting-info-tooltip").forEach(t=>{t.style.display="none"}),s)return this._openTooltip=null,this._openTooltipBtn=null,void this._detachTooltipListeners();const o=e.getBoundingClientRect();i.style.display="block",i.style.left=`${Math.max(8,Math.min(o.right-240,window.innerWidth-256))}px`,i.style.top=`${o.bottom+6}px`,this._openTooltip=i,this._openTooltipBtn=e,this._attachTooltipListeners()}}
		><ha-icon icon="mdi:help-circle-outline"></ha-icon><span id=${e} class="setting-info-tooltip" role="tooltip">${t}</span></button>`}renderDetectionRanges(){const t=Ji(this.roomWidth,this.roomDepth,this.perspective,this.grid),e=ji(this.grid,this.roomWidth,this.perspective),i=t>0?Math.min(t,6):6,s=t>0?Math.min(t,16):16,o=this.targetAutoDistance?i:this.targetMaxDistance,r=this.staticAutoDistance?s:this.staticMaxDistance,n="opacity: 0.5; pointer-events: none;";return $`
      <div class="settings-section">
        ${e?$`<p style="font-size: 13px; color: var(--secondary-text-color, #757575); margin: 0 0 12px;">${this.localize("settings.furthest_point")} <span style="font-weight: 700; color: var(--error-color, #db4437);">${this.localize.formatNumber(e.furthestM,1)}m</span></p>`:J}
        <div class="setting-group">
          <h4>${this.localize("settings.target_sensor")}</h4>
          <div class="setting-row">
            <label>${this.localize("settings.auto")}</label>
            <label class="toggle-switch">
              <input type="checkbox" .checked=${this.targetAutoDistance}
                @change=${t=>{const e=t.target.checked;e||(this._overrides.targetMaxDistance=o,this._fireChange("targetMaxDistance",o)),this._overrides.targetAutoDistance=e,this._fireChange("targetAutoDistance",e)}} />
              <span class="toggle-slider"></span>
            </label>
            ${this.infoTip(this.localize("info.target_auto_range"))}
          </div>
          <div class="setting-row" style="${this.targetAutoDistance?n:""}">
            <label>${this.localize("settings.max_distance")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" .value=${String(o)} min="0.5" max="6" step="0.1"
              @input=${t=>{const e=t.target,i=Number(e.value);this._overrides.targetMaxDistance=i,this._fireChange("targetMaxDistance",i),this._setSettingValue(e,this.localize.formatNumber(i,1))}} /><span class="setting-value">${this.localize.formatNumber(o,1)}</span><span class="setting-unit">m</span></span>
            ${this.resetBtn(i,"targetMaxDistance")}${this.infoTip(this.localize("info.target_max_distance"))}
          </div>
        </div>
        <div class="setting-group">
          <h4>${this.localize("settings.static_sensor")}</h4>
          <div class="setting-row">
            <label>${this.localize("settings.auto")}</label>
            <label class="toggle-switch">
              <input type="checkbox" .checked=${this.staticAutoDistance}
                @change=${t=>{const e=t.target.checked;e||(this._overrides.staticMinDistance=.3,this._fireChange("staticMinDistance",.3),this._overrides.staticMaxDistance=r,this._fireChange("staticMaxDistance",r)),this._overrides.staticAutoDistance=e,this._fireChange("staticAutoDistance",e)}} />
              <span class="toggle-slider"></span>
            </label>
            ${this.infoTip(this.localize("info.target_auto_range"))}
          </div>
          <div class="setting-row" style="${this.staticAutoDistance?n:""}">
            <label>${this.localize("settings.min_distance")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" .value=${String(this.staticAutoDistance?.3:this.staticMinDistance)} min="0.3" max="16" step="0.1"
              @input=${t=>{const e=t.target;let i=Number(e.value);const s=this._overrides.staticMaxDistance??this.staticMaxDistance;i>=s&&(i=Math.round(10*(s-.1))/10,e.value=String(i)),this._overrides.staticMinDistance=i,this._fireChange("staticMinDistance",i),this._setSettingValue(e,this.localize.formatNumber(i,1))}} /><span class="setting-value">${this.localize.formatNumber(this.staticAutoDistance?.3:this.staticMinDistance,1)}</span><span class="setting-unit">m</span></span>
            ${this.resetBtn(.3,"staticMinDistance")}${this.infoTip(this.localize("info.static_min_distance"))}
          </div>
          <div class="setting-row" style="${this.staticAutoDistance?n:""}">
            <label>${this.localize("settings.max_distance")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" .value=${String(r)} min="2.4" max="16" step="0.1"
              @input=${t=>{const e=t.target;let i=Number(e.value);const s=this._overrides.staticMinDistance??this.staticMinDistance;i<=s&&(i=Math.round(10*(s+.1))/10,e.value=String(i)),this._overrides.staticMaxDistance=i,this._fireChange("staticMaxDistance",i),this._setSettingValue(e,this.localize.formatNumber(i,1))}} /><span class="setting-value">${this.localize.formatNumber(r,1)}</span><span class="setting-unit">m</span></span>
            ${this.resetBtn(s,"staticMaxDistance")}${this.infoTip(this.localize("info.static_max_distance"))}
          </div>
        </div>
      </div>
    `}renderSensitivities(){return $`
      <div class="settings-section">
        <div class="setting-group">
          <h4>${this.localize("settings.motion_sensor")}</h4>
          <div class="setting-row">
            <label>${this.localize("settings.presence_timeout")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" .value=${String(this.motionTimeout)} min="0" max="120" step="1" @input=${t=>{const e=t.target,i=Number(e.value);this._overrides.motionTimeout=i,this._setSettingValue(e,e.value),this._fireChange("motionTimeout",i)}} /><span class="setting-value">${this.motionTimeout}</span><span class="setting-unit">s</span></span>
            ${this.resetBtn(5,"motionTimeout")}${this.infoTip(this.localize("info.motion_timeout"))}
          </div>
        </div>
        <div class="setting-group">
          <h4>${this.localize("settings.static_sensor")}</h4>
          <div class="setting-row">
            <label>${this.localize("settings.presence_delay")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" .value=${String(this.staticOnDelay)} min="0" max=${String(2)} step="0.1" @input=${t=>{const e=t.target,i=Number(e.value);this._overrides.staticOnDelay=i,this._setSettingValue(e,e.value),this._fireChange("staticOnDelay",i)}} /><span class="setting-value">${this.staticOnDelay}</span><span class="setting-unit">s</span></span>
            ${this.resetBtn(0,"staticOnDelay")}${this.infoTip(this.localize("info.presence_delay"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("settings.presence_timeout")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" .value=${String(this.staticTimeout)} min="0" max="120" step="1" @input=${t=>{const e=t.target,i=Number(e.value);this._overrides.staticTimeout=i,this._setSettingValue(e,e.value),this._fireChange("staticTimeout",i)}} /><span class="setting-value">${this.staticTimeout}</span><span class="setting-unit">s</span></span>
            ${this.resetBtn(30,"staticTimeout")}${this.infoTip(this.localize("info.static_timeout"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("settings.trigger_threshold")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" min="1" max="9" .value=${String(this.staticTriggerThreshold)} @input=${t=>{const e=t.target,i=Number(e.value);this._overrides.staticTriggerThreshold=i,this._setSettingValue(e,e.value),this._fireChange("staticTriggerThreshold",i)}} /><span class="setting-value">${this.staticTriggerThreshold}</span><span class="setting-unit"></span></span>
            ${this.resetBtn(3,"staticTriggerThreshold")}${this.infoTip(this.localize("info.trigger_threshold"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("settings.renew_threshold")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" min="1" max="9" .value=${String(this.staticRenewThreshold)} @input=${t=>{const e=t.target,i=Number(e.value);this._overrides.staticRenewThreshold=i,this._setSettingValue(e,e.value),this._fireChange("staticRenewThreshold",i)}} /><span class="setting-value">${this.staticRenewThreshold}</span><span class="setting-unit"></span></span>
            ${this.resetBtn(3,"staticRenewThreshold")}${this.infoTip(this.localize("info.renew_threshold"))}
          </div>
        </div>
        <div class="setting-group">
          <h4>${this.localize("settings.target_sensor")}</h4>
          <div class="setting-row">
            <label>${this.localize("settings.stuck_target_timeout")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" .value=${String(this.stuckTargetTimeout)} min="0" max="600" step="1" @input=${t=>{const e=t.target,i=Number(e.value);this._overrides.stuckTargetTimeout=i,this._setSettingValue(e,e.value),this._fireChange("stuckTargetTimeout",i)}} /><span class="setting-value">${this.stuckTargetTimeout}</span><span class="setting-unit">s</span></span>
            ${this.resetBtn(300,"stuckTargetTimeout")}${this.infoTip(this.localize("info.stuck_target_timeout"))}
          </div>
        </div>
        <div class="setting-group">
          <h4>${this.localize("settings.environmental")}</h4>
          ${this.renderEnvOffset(this.localize("settings.illuminance_offset"),()=>this.sensorState.illuminance,"illuminance",-500,500,1,"lux",1,this.localize("info.illuminance_offset"),0)}
          ${this.renderEnvOffset(this.localize("settings.humidity_offset"),()=>this.sensorState.humidity,"humidity",-50,50,.1,"%",1,this.localize("info.humidity_offset"),0,100)}
          ${this.renderEnvOffset(this.localize("settings.temperature_offset"),()=>this.sensorState.temperature,"temperature",-20,20,.1,"°C",1,this.localize("info.temperature_offset"))}
        </div>
      </div>
    `}renderEntities(){const t=this.entitiesConfig||{},e=this._overrides.entities||{},i=(i,s)=>e[i]??t[i]??s,s=t=>{const e=t.target,i=e.dataset.entityKey;this._overrides.entities||(this._overrides.entities={}),this._overrides.entities[i]=e.checked,this._fireChange("entitiesConfig",{...this.entitiesConfig||{},...this._overrides.entities})},o=this._overrides,r=i("zone_presence",!0)||i("zone_target_count",!1),n=i("target_xy",!1)||i("target_active",!1)||i("target_signal",!1)||i("target_zone",!1)||i("target_count",!1),a=[{value:"200",label:this.localize("settings.frequency.5hz")},{value:"500",label:this.localize("settings.frequency.2hz")},{value:"1000",label:this.localize("settings.frequency.1hz")},{value:"2000",label:this.localize("settings.frequency.0_5hz")}];return $`
      <div class="settings-section">
        <div class="setting-group">
          <h4>${this.localize("entities.room_level")}</h4>
          <div class="setting-row">
            <label>${this.localize("entities.occupancy")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${s} data-entity-key="room_occupancy" .checked=${i("room_occupancy",!0)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.room_occupancy"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.static_presence")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${s} data-entity-key="room_static_presence" .checked=${i("room_static_presence",!1)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.room_static"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.motion_presence")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${s} data-entity-key="room_motion_presence" .checked=${i("room_motion_presence",!1)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.room_motion"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.target_presence")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${s} data-entity-key="room_target_presence" .checked=${i("room_target_presence",!1)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.room_target_presence"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.mmwave")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${s} data-entity-key="room_mmwave" .checked=${i("room_mmwave",!1)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.room_mmwave"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.target_count")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${s} data-entity-key="target_count" .checked=${i("target_count",!1)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.room_target_count"))}
          </div>
        </div>
        <div class="setting-group">
          <h4>${this.localize("entities.zone_level")}</h4>
          <div class="setting-row">
            <label>${this.localize("entities.zone_presence")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${s} data-entity-key="zone_presence" .checked=${i("zone_presence",!0)} .disabled=${!this.perspective} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.zone_presence"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.zone_target_count")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${s} data-entity-key="zone_target_count" .checked=${i("zone_target_count",!1)} .disabled=${!this.perspective} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.zone_target_count"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("settings.update_rate")}</label>
            <ha-select
              .value=${String(o.zoneUpdateRateMs??this.zoneUpdateRateMs)}
              .options=${a}
              .disabled=${!r}
              @selected=${t=>{const e=t.detail.value;if(e){const t=Number(e);this._overrides.zoneUpdateRateMs=t,this._fireChange("zoneUpdateRateMs",t),this.requestUpdate()}}}
              @closed=${this._stopClosed}>
            </ha-select>
          </div>
        </div>
        <div class="setting-group">
          <h4>${this.localize("entities.target_level")}</h4>
          <div class="setting-row">
            <label>${this.localize("entities.xy")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${s} data-entity-key="target_xy" .checked=${i("target_xy",!1)} .disabled=${!this.perspective} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.xy"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.active")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${s} data-entity-key="target_active" .checked=${i("target_active",!1)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.active"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.target_signal")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${s} data-entity-key="target_signal" .checked=${i("target_signal",!1)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.target_signal"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.target_zone")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${s} data-entity-key="target_zone" .checked=${i("target_zone",!1)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.target_zone"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("settings.update_rate")}</label>
            <ha-select
              .value=${String(o.targetUpdateRateMs??this.targetUpdateRateMs)}
              .options=${a}
              .disabled=${!n}
              @selected=${t=>{const e=t.detail.value;if(e){const t=Number(e);this._overrides.targetUpdateRateMs=t,this._fireChange("targetUpdateRateMs",t),this.requestUpdate()}}}
              @closed=${this._stopClosed}>
            </ha-select>
          </div>
        </div>
        <div class="setting-group">
          <h4>${this.localize("settings.environmental")}</h4>
          <div class="setting-row">
            <label>${this.localize("entities.illuminance")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${s} data-entity-key="env_illuminance" .checked=${i("env_illuminance",!1)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.illuminance"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.humidity")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${s} data-entity-key="env_humidity" .checked=${i("env_humidity",!1)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.humidity"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.temperature")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${s} data-entity-key="env_temperature" .checked=${i("env_temperature",!1)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.temperature"))}
          </div>
          <div class="setting-row">
            <label>${this.localize("entities.co2")}</label>
            <label class="toggle-switch"><input type="checkbox" @change=${s} data-entity-key="env_co2" .checked=${i("env_co2",!1)} /><span class="toggle-slider"></span></label>
            ${this.infoTip(this.localize("info.co2"))}
          </div>
        </div>
      </div>
    `}renderLogging(){const t=["None","Error","Warning","Info","Debug"],e=[{key:"system",label:"settings.log_system",tip:"info.log_system",show:!0},{key:"epp",label:"settings.log_epp",tip:"info.log_epp",show:!0},{key:"led",label:"settings.log_led",tip:"info.log_led",show:!0},{key:"networking",label:"settings.log_networking",tip:"info.log_networking",show:!0},{key:"ble",label:"settings.log_ble",tip:"info.log_ble",show:this.bluetoothEnabled},{key:"co2",label:"settings.log_co2",tip:"info.log_co2",show:this.co2Enabled}];return $`
      <div class="settings-section">
        <div class="setting-group">
          ${e.filter(t=>t.show).map(e=>{const i=(this._overrides.logLevels||{})[e.key]??this.logLevels[e.key]??"None";return $`
              <div class="setting-row">
                <label>${this.localize(e.label)}</label>
                <ha-select
                  .value=${i}
                  .options=${t.map(t=>({value:t,label:this.localize(`settings.log_level.${t.toLowerCase()}`)}))}
                  @selected=${t=>{const s=t.detail.value;s&&s!==i&&(this._overrides.logLevels||(this._overrides.logLevels={}),this._overrides.logLevels[e.key]=s,this._fireChange("logLevels",{...this.logLevels||{},...this._overrides.logLevels}),this.requestUpdate())}}
                  @closed=${this._stopClosed}
                ></ha-select>
                <button
								type="button"
								class="setting-info"
								aria-label=${this.localize("settings.reset_to_default")}
								title=${this.localize("settings.reset_to_default")}
								@click=${t=>{t.stopPropagation(),this._overrides.logLevels||(this._overrides.logLevels={}),this._overrides.logLevels[e.key]="None",this._fireChange("logLevels",{...this.logLevels||{},...this._overrides.logLevels}),this.requestUpdate()}}
							><ha-icon icon="mdi:restart"></ha-icon></button>
                ${this.infoTip(this.localize(e.tip))}
              </div>
            `})}
        </div>
      </div>
    `}renderLed(){const t=this._overrides.ledMode??this.ledMode,e="Manual Control"!==t,i="Presence"===t||"Environmental + Presence"===t,s=[{value:"Manual Control",label:this.localize("settings.manual_control")},{value:"Presence",label:this.localize("settings.presence")}];this.co2Enabled&&s.push({value:"Environmental",label:this.localize("settings.environmental")},{value:"Environmental + Presence",label:this.localize("settings.environmental_presence")});const o=this._overrides.ledBrightness??this.ledBrightness,r=this._overrides.ledPresenceColor??this.ledPresenceColor;return $`
      <div class="settings-section">
        <div class="setting-group">
          <h4>${this.localize("settings.led")}</h4>
          <div class="setting-row">
            <label>${this.localize("settings.led_mode")}</label>
            <ha-select class="wide-select" .value=${t} .options=${s} @selected=${t=>{const e=t.detail.value;e&&(this._overrides.ledMode=e,this._fireChange("ledMode",e),this.requestUpdate())}} @closed=${this._stopClosed}>
            </ha-select>
            ${this.infoTip(this.localize("info.led_mode"))}
          </div>
          ${e?$`
          <div class="setting-row">
            <label>${this.localize("settings.led_brightness")}</label>
            <span class="setting-input-unit"><input type="range" class="setting-range" data-led-brightness min="0.1" max="1" step="0.05" .value=${String(o)} @input=${t=>{const e=t.target,i=parseFloat(e.value);this._overrides.ledBrightness=i,this._setSettingValue(e,`${Math.round(100*i)}%`),this._fireChange("ledBrightness",i)}} /><span class="setting-value">${Math.round(100*o)}%</span></span>
            ${this.resetBtn(1,"ledBrightness")}${this.infoTip(this.localize("info.led_brightness"))}
          </div>`:J}
          ${i?$`
          <div class="setting-row">
            <label>${this.localize("settings.led_presence_color")}</label>
            <input type="color" .value=${r} @input=${t=>{const e=t.target.value;this._overrides.ledPresenceColor=e,this._fireChange("ledPresenceColor",e)}} />
            ${this.infoTip(this.localize("info.led_presence_color"))}
          </div>`:J}
        </div>
      </div>
    `}renderRelay(){const t=[{value:"disabled",label:this.localize("settings.relay_disabled")},{value:"motion",label:this.localize("settings.relay_motion")},{value:"presence",label:this.localize("settings.relay_presence")},{value:"occupancy",label:this.localize("settings.relay_occupancy")}],e=[{value:"no",label:this.localize("settings.relay_normally_open")},{value:"nc",label:this.localize("settings.relay_normally_closed")}],i=this._overrides.relayTriggerMode??this.relayTriggerMode,s=this._overrides.relayContactMode??this.relayContactMode,o="disabled"!==i;return $`
      <div class="settings-section">
        <div class="setting-group">
          <h4>${this.localize("settings.relay")}</h4>
          <div class="setting-row">
            <label>${this.localize("settings.relay_trigger_mode")}</label>
            <ha-select class="wide-select"
              .value=${i}
              .options=${t}
              @selected=${t=>{const e=t.detail.value;e&&e!==i&&(this._overrides.relayTriggerMode=e,this._fireChange("relayTriggerMode",e),this.requestUpdate())}}
              @closed=${this._stopClosed}
            ></ha-select>
            ${this.infoTip(this.localize("info.relay_trigger_mode"))}
          </div>
          ${o?$`
            <div class="setting-row">
              <label>${this.localize("settings.relay_contact_mode")}</label>
              <ha-select class="wide-select"
                .value=${s}
                .options=${e}
                @selected=${t=>{const e=t.detail.value;e&&e!==s&&(this._overrides.relayContactMode=e,this._fireChange("relayContactMode",e),this.requestUpdate())}}
                @closed=${this._stopClosed}
              ></ha-select>
              ${this.infoTip(this.localize("info.relay_contact_mode"))}
            </div>
          `:J}
        </div>
      </div>
    `}renderSaveCancelButtons(){this.dirty||!this._localDirty||this.saving||(this._localDirty=!1);const t=this.dirty||this._localDirty;return $`
      <div class="save-cancel-bar">
        <button class="wizard-btn wizard-btn-back"
          @click=${()=>{this.dispatchEvent(new CustomEvent("cancel",{bubbles:!0,composed:!0}))}}
        >${this.localize("common.cancel")}</button>
        <button class="wizard-btn wizard-btn-primary save-btn"
          ?disabled=${this.saving||!t}
          @click=${()=>{this._emitSave()}}
        >${this.saving?this.localize("common.saving"):this.localize("common.save")}</button>
      </div>
    `}_emitSave(){const t=this._overrides,e={...this.entitiesConfig,...t.entities||{}},i=t.targetAutoDistance??this.targetAutoDistance,s=t.staticAutoDistance??this.staticAutoDistance;let o=t.targetMaxDistance??this.targetMaxDistance,r=t.staticMinDistance??this.staticMinDistance,n=t.staticMaxDistance??this.staticMaxDistance;if(i||s){const t=Ji(this.roomWidth,this.roomDepth,this.perspective,this.grid);i&&(o=t>0?Math.min(t,6):6),s&&(r=.3,n=t>0?Math.min(t,16):16)}this.dispatchEvent(new CustomEvent("save",{detail:{target_auto_distance:i,target_max_distance:o,stuck_target_timeout:t.stuckTargetTimeout??this.stuckTargetTimeout,static_auto_distance:s,static_min_distance:r,static_max_distance:n,motion_timeout:t.motionTimeout??this.motionTimeout,static_timeout:t.staticTimeout??this.staticTimeout,static_trigger_threshold:t.staticTriggerThreshold??this.staticTriggerThreshold,static_renew_threshold:t.staticRenewThreshold??this.staticRenewThreshold,static_on_delay:t.staticOnDelay??this.staticOnDelay,temperature_offset:t.temperatureOffset??this.temperatureOffset,humidity_offset:t.humidityOffset??this.humidityOffset,illuminance_offset:t.illuminanceOffset??this.illuminanceOffset,entities:e,log_levels:{...this.logLevels,...t.logLevels||{}},led_mode:t.ledMode??this.ledMode,led_brightness:t.ledBrightness??this.ledBrightness,led_presence_color:t.ledPresenceColor??this.ledPresenceColor,relay_trigger_mode:t.relayTriggerMode??this.relayTriggerMode,relay_contact_mode:t.relayContactMode??this.relayContactMode,target_update_rate_ms:t.targetUpdateRateMs??this.targetUpdateRateMs,zone_update_rate_ms:t.zoneUpdateRateMs??this.zoneUpdateRateMs},bubbles:!0,composed:!0}))}_fireChange(t,e){this.dispatchEvent(new CustomEvent("setting-change",{detail:{key:t,value:e},bubbles:!0,composed:!0})),this._fireDirty()}_fireDirty(){this._localDirty=!0,this.dispatchEvent(new CustomEvent("dirty",{bubbles:!0,composed:!0}))}}us.styles=[As,Ci,Bi,Si,gs,n`
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
    `],t([gt({attribute:!1})],us.prototype,"sensorState",void 0),t([gt({type:Boolean})],us.prototype,"targetAutoDistance",void 0),t([gt({type:Number})],us.prototype,"targetMaxDistance",void 0),t([gt({type:Number})],us.prototype,"stuckTargetTimeout",void 0),t([gt({type:Boolean})],us.prototype,"staticAutoDistance",void 0),t([gt({type:Number})],us.prototype,"staticMinDistance",void 0),t([gt({type:Number})],us.prototype,"staticMaxDistance",void 0),t([gt({attribute:!1})],us.prototype,"openAccordions",void 0),t([gt({attribute:!1})],us.prototype,"perspective",void 0),t([gt({type:Number})],us.prototype,"roomWidth",void 0),t([gt({type:Number})],us.prototype,"roomDepth",void 0),t([gt({attribute:!1})],us.prototype,"grid",void 0),t([gt({type:Boolean})],us.prototype,"saving",void 0),t([gt({type:Boolean})],us.prototype,"dirty",void 0),t([gt({type:Number})],us.prototype,"temperatureOffset",void 0),t([gt({type:Number})],us.prototype,"humidityOffset",void 0),t([gt({type:Number})],us.prototype,"illuminanceOffset",void 0),t([gt({type:Number})],us.prototype,"motionTimeout",void 0),t([gt({type:Number})],us.prototype,"staticTimeout",void 0),t([gt({type:Number})],us.prototype,"staticTriggerThreshold",void 0),t([gt({type:Number})],us.prototype,"staticRenewThreshold",void 0),t([gt({type:Number})],us.prototype,"staticOnDelay",void 0),t([gt({attribute:!1})],us.prototype,"entitiesConfig",void 0),t([gt({attribute:!1})],us.prototype,"logLevels",void 0),t([gt({type:Boolean})],us.prototype,"bluetoothEnabled",void 0),t([gt({type:Boolean})],us.prototype,"co2Enabled",void 0),t([gt({type:String})],us.prototype,"ledMode",void 0),t([gt({type:Number})],us.prototype,"ledBrightness",void 0),t([gt({type:String})],us.prototype,"ledPresenceColor",void 0),t([gt({type:String})],us.prototype,"relayTriggerMode",void 0),t([gt({type:String})],us.prototype,"relayContactMode",void 0),t([gt({type:Number})],us.prototype,"targetUpdateRateMs",void 0),t([gt({type:Number})],us.prototype,"zoneUpdateRateMs",void 0),t([gt({attribute:!1})],us.prototype,"localize",void 0),customElements.get("epp-settings-view")||customElements.define("epp-settings-view",us);class _s extends ct{constructor(){super(...arguments),this.selectedMac="",this.rawTargets=[],this.sensorState={occupancy:!1},this.localize=Te,this.initialRoomWidth=0,this.initialRoomDepth=0,this.initialStep=null,this.mode="wizard",this._setupStep="guide",this._wizardSaving=!1,this._wizardCornerIndex=0,this._wizardCorners=[null,null,null,null],this._wizardRoomWidth=0,this._wizardRoomDepth=0,this._wizardCapturing=!1,this._wizardCaptureProgress=0,this._wizardCapturePaused=!1,this._wizardOffsetSide="",this._wizardOffsetFb="",this._dismissTutorial=!1,this._wizardCaptureCancelled=!1,this._captureRafId=null,this._smoothBuffer=[],this._perspective=null,this._captureOverlayListenersAttached=!1,this._onCaptureOverlayKeydown=t=>{if("Escape"===t.key)t.preventDefault(),this._wizardCancelCapture();else if("Tab"===t.key){t.preventDefault();const e=this.shadowRoot?.querySelector(".capture-overlay .wizard-btn-back");e?.focus()}}}connectedCallback(){super.connectedCallback(),this._wizardRoomWidth=this.initialRoomWidth,this._wizardRoomDepth=this.initialRoomDepth,null!==this.initialStep&&(this._setupStep=this.initialStep),this._wizardCapturing&&this._attachCaptureOverlayListeners()}_attachCaptureOverlayListeners(){this._captureOverlayListenersAttached||(document.addEventListener("keydown",this._onCaptureOverlayKeydown),this._captureOverlayListenersAttached=!0)}_detachCaptureOverlayListeners(){this._captureOverlayListenersAttached&&(document.removeEventListener("keydown",this._onCaptureOverlayKeydown),this._captureOverlayListenersAttached=!1)}updated(t){if(t.has("_wizardCapturing"))if(this._wizardCapturing){this._attachCaptureOverlayListeners();const t=this.shadowRoot?.querySelector(".capture-overlay .wizard-btn-back");t?.focus()}else this._detachCaptureOverlayListeners()}disconnectedCallback(){super.disconnectedCallback(),this._detachCaptureOverlayListeners(),this._wizardCaptureCancelled=!0,null!==this._captureRafId&&(cancelAnimationFrame(this._captureRafId),this._captureRafId=null)}_syncCornerOffsets(){const t=this._wizardCorners[this._wizardCornerIndex];this._wizardOffsetSide=t?.offset_side?String(t.offset_side/10):"",this._wizardOffsetFb=t?.offset_fb?String(t.offset_fb/10):""}_getSmoothedRaw(){const t=this.rawTargets.find(t=>null!=t.raw_x&&null!=t.raw_y);if(!t)return null;const e=function(t,e,i,s){let o=0;for(;o<t.length&&s-t[o].t>1e3;)o++;const r=t.length-o+1,n=new Array(r),a=new Array(r),l=new Array(r);for(let e=0;e<r-1;e++){const i=t[o+e];n[e]=i,a[e]=i.x,l[e]=i.y}n[r-1]={x:e,y:i,t:s},a[r-1]=e,l[r-1]=i,a.sort((t,e)=>t-e),l.sort((t,e)=>t-e);const c=r>>1;return{x:r%2?a[c]:(a[c-1]+a[c])/2,y:r%2?l[c]:(l[c-1]+l[c])/2,buffer:n}}(this._smoothBuffer,t.raw_x,t.raw_y,Date.now());return this._smoothBuffer=e.buffer,{x:e.x,y:e.y}}_wizardCancelCapture(){this._wizardCaptureCancelled=!0,this._wizardCapturing=!1,this._wizardCapturePaused=!1}_wizardStartCapture(){const t=this.rawTargets.find(t=>null!=t.raw_x&&null!=t.raw_y);if(!t)return;this._wizardCapturing=!0,this._wizardCaptureProgress=0,this._wizardCapturePaused=!1,this._wizardCaptureCancelled=!1;const e=[];let i=0,s=Date.now();const o=()=>{if(this._wizardCaptureCancelled)return;const t=Date.now(),r=t-s;s=t;const n=this.rawTargets.filter(t=>null!=t.raw_x&&null!=t.raw_y),a=1===n.length;if(this._wizardCapturePaused=!a,a&&(i+=r,e.push({x:n[0].raw_x,y:n[0].raw_y})),this._wizardCaptureProgress=Math.min(i/5e3,1),i<5e3)return void(this._captureRafId=requestAnimationFrame(o));if(this._captureRafId=null,this._wizardCapturing=!1,this._wizardCapturePaused=!1,0===e.length)return;const l=function(t){return 0===t.length?null:{x:Wi(t.map(t=>t.x)),y:Wi(t.map(t=>t.y))}}(e);if(!l)return;const c=this._wizardCornerIndex;this._wizardCorners=[...this._wizardCorners],this._wizardCorners[c]={raw_x:l.x,raw_y:l.y,offset_side:10*(parseFloat(this._wizardOffsetSide)||0),offset_fb:10*(parseFloat(this._wizardOffsetFb)||0)},c<3&&(this._wizardCornerIndex=c+1),this._syncCornerOffsets(),this._wizardCorners.every(t=>null!==t)&&this._autoComputeRoomDimensions()};this._captureRafId=requestAnimationFrame(o)}_autoComputeRoomDimensions(){const t=function(t){const e=(t,e)=>Math.sqrt((t.raw_x-e.raw_x)**2+(t.raw_y-e.raw_y)**2),i=Math.round(e(t[0],t[1])),s=e(t[0],t[3]),o=e(t[1],t[2]);return{width:i,depth:Math.round((s+o)/2)}}(this._wizardCorners);this._wizardRoomWidth=t.width,this._wizardRoomDepth=t.depth}_solvePerspective(t,e){return function(t,e){const i=Math.max(1,...t.map(t=>Math.abs(t.x))),s=Math.max(1,...t.map(t=>Math.abs(t.y))),o=[],r=[];for(let n=0;n<4;n++){const a=t[n].x/i,l=t[n].y/s,c=e[n].x,h=e[n].y;o.push([a,l,1,0,0,0,-a*c,-l*c]),r.push(c),o.push([0,0,0,a,l,1,-a*h,-l*h]),r.push(h)}const n=o.map((t,e)=>[...t,r[e]]);for(let t=0;t<8;t++){let e=Math.abs(n[t][t]),i=t;for(let s=t+1;s<8;s++)Math.abs(n[s][t])>e&&(e=Math.abs(n[s][t]),i=s);if(e<1e-12)return null;[n[t],n[i]]=[n[i],n[t]];for(let e=t+1;e<8;e++){const i=n[e][t]/n[t][t];for(let s=t;s<=8;s++)n[e][s]-=i*n[t][s]}}const a=new Array(8);for(let t=7;t>=0;t--){a[t]=n[t][8];for(let e=t+1;e<8;e++)a[t]-=n[t][e]*a[e];a[t]/=n[t][t]}return[a[0]/i,a[1]/s,a[2],a[3]/i,a[4]/s,a[5],a[6]/i,a[7]/s]}(t,e)}_computeWizardPerspective(){const t=this._wizardCorners;if(!t.every(t=>null!==t))return;const e=this._wizardRoomWidth,i=this._wizardRoomDepth,s=t.map(t=>({x:t.raw_x,y:t.raw_y})),o=[{x:t[0].offset_side,y:t[0].offset_fb},{x:e-t[1].offset_side,y:t[1].offset_fb},{x:e-t[2].offset_side,y:i-t[2].offset_fb},{x:t[3].offset_side,y:i-t[3].offset_fb}];this._perspective=this._solvePerspective(s,o)}async _wizardFinish(){if(this._perspective){this._wizardSaving=!0;try{await this.hass.callWS({type:"eppgrid/set_setup",mac:this.selectedMac,perspective:this._perspective,room_width:this._wizardRoomWidth,room_depth:this._wizardRoomDepth}),this.dispatchEvent(new CustomEvent("calibration-complete",{detail:{perspective:this._perspective,roomWidth:this._wizardRoomWidth,roomDepth:this._wizardRoomDepth},bubbles:!0,composed:!0}))}finally{this._wizardSaving=!1}}}_rawToFovPct(t,e){return function(t,e){return{xPct:(t+wi)/(2*wi)*100,yPct:e/ti*100}}(t,e)}_getWizardTargetStyle(t){const{xPct:e,yPct:i}=this._rawToFovPct(t.raw_x??0,t.raw_y??0);return`left: ${e}%; top: ${i}%;`}render(){return"uncalibrated-fov"===this.mode?this._renderUncalibratedFov():null===this._setupStep?J:this._renderWizard()}_renderWizard(){let t;switch(this._setupStep){case"guide":t=this._renderWizardGuide();break;case"corners":t=this._renderWizardCorners()}return $`
      ${t}
      ${this._wizardCapturing?$`
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
    `}_renderWizardGuide(){const t=(t,e,i=!1,s=0)=>Y`
      <g transform="translate(${t}, ${e}) rotate(${s}) scale(${i?-.7:.7}, 0.7)">
        <circle cx="0" cy="-12" r="4" fill="var(--primary-color, #03a9f4)"/>
        <line x1="0" y1="-8" x2="0" y2="2" stroke="var(--primary-color, #03a9f4)" stroke-width="2" stroke-linecap="round"/>
        <line x1="0" y1="2" x2="-4" y2="10" stroke="var(--primary-color, #03a9f4)" stroke-width="2" stroke-linecap="round"/>
        <line x1="0" y1="2" x2="4" y2="10" stroke="var(--primary-color, #03a9f4)" stroke-width="2" stroke-linecap="round"/>
        <line x1="0" y1="-4" x2="-5" y2="2" stroke="var(--primary-color, #03a9f4)" stroke-width="2" stroke-linecap="round"/>
        <line x1="0" y1="-4" x2="5" y2="-1" stroke="var(--primary-color, #03a9f4)" stroke-width="2" stroke-linecap="round"/>
      </g>
    `,e=(t,e,i,s)=>{const o=i-t,r=s-e,n=Math.sqrt(o*o+r*r),a=o/n,l=r/n,c=i-40*a,h=s-40*l;return Y`
        <line x1="${t+40*a}" y1="${e+40*l}" x2="${c}" y2="${h}" stroke="var(--primary-color, #03a9f4)" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
        <polygon points="${c},${h} ${c-8*a+4*l},${h-8*l-4*a} ${c-8*a-4*l},${h-8*l+4*a}" fill="var(--primary-color, #03a9f4)" opacity="0.5"/>
      `},i=50,s=55,o=290,r=55,n=290,a=225,l=50,c=235,h=98,d=225,A=Y`
      <svg viewBox="0 0 360 290" width="360" height="290" style="display: block; margin: 0 auto;">
        <!-- Room with rounded corners, soft fill -->
        <rect x="30" y="35" width="280" height="210" rx="8"
              fill="var(--secondary-background-color, #f5f5f5)"
              stroke="var(--divider-color, #d0d0d0)" stroke-width="2.5"/>

        <!-- Wall labels -->
        <text x="170" y="28" font-size="9" fill="var(--secondary-text-color, #aaa)" text-anchor="middle">${this.localize("wizard.front_wall_label")}</text>
        <text x="170" y="262" font-size="9" fill="var(--secondary-text-color, #aaa)" text-anchor="middle">${this.localize("wizard.back_wall_label")}</text>

        <!-- Arrows with walking figures: 1->2->3->4 -->
        ${e(i,s,o,r)}
        ${t(170,72)}
        ${e(o,r,n,a)}
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
        <circle cx="${i}" cy="${s}" r="14" fill="#4CAF50" opacity="0.15"/>
        <circle cx="${i}" cy="${s}" r="14" fill="none" stroke="#4CAF50" stroke-width="2.5"/>
        <text x="${i}" y="${s+5}" font-size="14" fill="#4CAF50" font-weight="bold" text-anchor="middle">1</text>

        <!-- Corner 2: front-right (sensor here) -->
        <circle cx="${o}" cy="${r}" r="14" fill="#4CAF50" opacity="0.15"/>
        <circle cx="${o}" cy="${r}" r="14" fill="none" stroke="#4CAF50" stroke-width="2.5"/>
        <text x="${o}" y="${r+5}" font-size="14" fill="#4CAF50" font-weight="bold" text-anchor="middle">2</text>

        <!-- Corner 3: back-right -->
        <circle cx="${n}" cy="${a}" r="14" fill="#4CAF50" opacity="0.15"/>
        <circle cx="${n}" cy="${a}" r="14" fill="none" stroke="#4CAF50" stroke-width="2.5"/>
        <text x="${n}" y="${a+5}" font-size="14" fill="#4CAF50" font-weight="bold" text-anchor="middle">3</text>

        <!-- Sensor icon outside the top-right corner -->
        <g transform="translate(${o+18}, ${r-18}) rotate(-45)">
          <rect x="-5" y="-7" width="10" height="14" rx="3" fill="var(--primary-color, #03a9f4)"/>
          <circle cx="0" cy="-11" r="3.5" fill="var(--primary-color, #03a9f4)" opacity="0.4"/>
        </g>
        <text x="${o+24}" y="${r-24}" font-size="10" fill="var(--primary-color, #03a9f4)" font-weight="500">${this.localize("wizard.sensor")}</text>
      </svg>
    `;return $`
      <div style="max-width: 560px; margin: 0 auto;">
        <div class="setting-group">
          <h4 style="text-align: center; margin-bottom: 16px;">${this.localize("wizard.how_calibration_works")}</h4>

          ${A}

          <div style="display: flex; flex-direction: column; gap: 14px; padding: 16px 4px 0;">
            <div style="display: flex; align-items: flex-start; gap: 10px;">
              <div style="min-width: 22px; height: 22px; border-radius: 50%; background: #4CAF50; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; color: white;">1</div>
              <div style="font-size: 13px;">
                ${$e(this.localize("wizard.walk_instruction_full"))}
              </div>
            </div>

            <div style="display: flex; align-items: flex-start; gap: 10px;">
              <div style="min-width: 22px; height: 22px; border-radius: 50%; background: #FF9800; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; color: white;">!</div>
              <div style="font-size: 13px;">
                ${$e(this.localize("wizard.cant_reach"))}
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
            @change=${t=>{this._dismissTutorial=t.currentTarget.checked}}
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
    `}_renderWizardCorners(){const t=this._wizardCornerIndex,e=this.rawTargets.filter(t=>null!=t.raw_x&&null!=t.raw_y),i=e.length>0,s=e.length>1,o=this._wizardCorners.every(t=>null!==t),r=ui[t]||"",[n,a]=_i[t]||["",""];return $`
      <div class="wizard-card">
        <h2>${this.localize("wizard.calibrate_room_size")}</h2>
        <p>
          ${this.localize("wizard.walk_instruction",{duration:5})}
        </p>

        ${o?J:$`
            <p class="corner-instruction">
              ${this.localize("wizard.corner_step",{index:t+1,corner:this.localize(r)})}
            </p>
        `}

        <div class="corner-progress">
          ${ui.map((e,i)=>{const s=!!this._wizardCorners[i],o=i<3,r=i<t;return $`
                <span
                  class="corner-chip ${s?"done":""} ${i===t?"active":""}"
                  @click=${()=>{const t=this._wizardCorners[i];this._wizardCornerIndex=i,this._wizardCorners=[...this._wizardCorners],this._wizardCorners[i]=null,this._perspective=null,this._wizardOffsetSide=t?.offset_side?String(t.offset_side/10):"",this._wizardOffsetFb=t?.offset_fb?String(t.offset_fb/10):""}}
                >
                  ${this.localize(e)} ${s?"✓":""}
                </span>
                ${o?$`
                  <span class="corner-arrow ${r?"done":""}">›</span>
                `:J}
              `})}
        </div>

        <div class="corner-offsets" key="${t}">
          <span class="offset-label">${this.localize("wizard.distance_from")}</span>
          <input
            type="number"
            class="offset-input"
            min="0"
            step="1"
            placeholder="${this.localize("wizard.distance_from_side",{wall:this.localize(n)})}"
            .value=${this._wizardOffsetSide}
            @input=${e=>{this._wizardOffsetSide=e.target.value;const i=10*(parseFloat(this._wizardOffsetSide)||0),s=this._wizardCorners[t];s&&(s.offset_side=i)}}
          />
          <input
            type="number"
            class="offset-input"
            min="0"
            step="1"
            placeholder="${this.localize("wizard.distance_from_side",{wall:this.localize(a)})}"
            .value=${this._wizardOffsetFb}
            @input=${e=>{this._wizardOffsetFb=e.target.value;const i=10*(parseFloat(this._wizardOffsetFb)||0),s=this._wizardCorners[t];s&&(s.offset_fb=i)}}
          />
        </div>

        ${this._renderMiniSensorView()}

        ${o?$`
          <p style="font-size: 13px; color: var(--secondary-text-color); margin: 12px 0 4px;">
            ${this.localize("wizard.save_prompt")}
          </p>
        `:$`
          <p class="no-target-warning" style="visibility: ${!i||s?"visible":"hidden"};">
            ${i?this.localize("wizard.multiple_targets"):this.localize("wizard.no_target")}
          </p>
        `}

        <div class="wizard-actions">
          <button
            class="wizard-btn wizard-btn-back"
            @click=${()=>{this._fireCancel()}}
          >${this.localize("common.cancel")}</button>
          ${o?$`
            <button
              class="wizard-btn wizard-btn-primary"
              ?disabled=${this._wizardSaving}
              @click=${()=>{this._computeWizardPerspective(),this._wizardFinish()}}
            >
              ${this._wizardSaving?this.localize("common.saving"):this.localize("common.save")}
            </button>
          `:$`
            <button
              class="wizard-btn wizard-btn-primary"
              ?disabled=${!i||s||this._wizardCapturing}
              @click=${()=>this._wizardStartCapture()}
            >
              ${this.localize("wizard.mark_corner",{corner:this.localize(r)})}
            </button>
          `}
        </div>
      </div>
    `}_renderMiniSensorView(){const t=wi,e=ti,i=200,s=-t,o=e*Math.cos(fi),r=`M 0 0 L ${s} ${o} A 6000 6000 0 0 0 ${t} ${o} Z`,n=[2e3,4e3].map(t=>{const e=t*Math.sin(fi),i=t*Math.cos(fi);return`M ${-e} ${i} A ${t} ${t} 0 0 0 ${e} ${i}`});return $`
      <div class="mini-grid-container">
        <div class="sensor-fov-view">
          <svg
            class="sensor-fov-svg"
            viewBox="${-t-i} ${-200} ${2*t+400} ${6400}"
            preserveAspectRatio="xMidYMid meet"
          >
            <path
              d="${r}"
              fill="rgba(3, 169, 244, 0.10)"
              stroke="rgba(3, 169, 244, 0.3)"
              stroke-width="30"
            />
            ${n.map(t=>Y`
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
          ${this._wizardCorners.filter(t=>null!==t).map((t,e)=>{const{xPct:i,yPct:s}=this._rawToFovPct(t.raw_x,t.raw_y);return $`
                <div
                  class="mini-grid-captured"
                  style="left: ${i}%; top: ${s}%;"
                  title="${this.localize(ui[e])}"
                ></div>
              `})}
          <!-- Live targets (per-target colors) -->
          ${this.rawTargets.map((t,e)=>null!=t.raw_x&&null!=t.raw_y?$`
              <div
                class="mini-grid-target"
                style="${this._getWizardTargetStyle(t)} background: ${pi[e]||pi[0]};"
              ></div>
            `:J)}
        </div>
      </div>
    `}_renderUncalibratedFov(){const t=this.sensorState.occupancy,e=t?"#4CAF50":"var(--primary-color, #03a9f4)",i=160,s=14,o=180,r=30*Math.PI/180,n=150*Math.PI/180,a=i+o*Math.cos(r),l=s+o*Math.sin(r),c=i+o*Math.cos(n),h=s+o*Math.sin(n);return $`
      <div style="display: flex; flex-direction: column; align-items: center; padding: 24px;">
        <svg viewBox="0 0 320 210" width="320" height="210" style="display: block;">
          <!-- Sensor at top center -->
          <rect x="${154}" y="0" width="12" height="8" rx="3" fill="${e}"/>
          <circle cx="${i}" cy="0" r="4" fill="${e}" opacity="0.4"/>

          <!-- 120 deg FOV wedge with rounded arc end -->
          <path d="M ${i} ${s} L ${a} ${l} A ${o} ${o} 0 0 1 ${c} ${h} Z"
                fill="${e}" fill-opacity="${t?.15:.06}"
                stroke="${e}" stroke-width="1" stroke-opacity="0.2"/>

          <!-- Range arcs -->
          ${[60,120,180].map(t=>{const o=i+t*Math.cos(r),a=s+t*Math.sin(r),l=i+t*Math.cos(n),c=s+t*Math.sin(n);return Y`
              <path d="M ${o} ${a} A ${t} ${t} 0 0 1 ${l} ${c}"
                    fill="none" stroke="${e}" stroke-width="1"
                    stroke-dasharray="4 3" opacity="0.2"/>
            `})}

          <!-- Edge lines -->
          <line x1="${i}" y1="${s}" x2="${a}" y2="${l}" stroke="${e}" stroke-width="0.5" opacity="0.2"/>
          <line x1="${i}" y1="${s}" x2="${c}" y2="${h}" stroke="${e}" stroke-width="0.5" opacity="0.2"/>

          <!-- Target dots -->
          ${this.rawTargets.map((t,e)=>{if(null==t.raw_x||null==t.raw_y)return J;const r=Math.sqrt(t.raw_x*t.raw_x+t.raw_y*t.raw_y),n=Math.atan2(t.raw_x,t.raw_y),a=Math.min(r/6e3,1)*o,l=Math.PI/2-n,c=i+a*Math.cos(l),h=s+a*Math.sin(l);return Y`<circle cx="${c}" cy="${h}" r="5" fill="${pi[e]||pi[0]}"/>`})}

          ${t?Y`
            <text x="${i}" y="120" font-size="13" fill="${e}" text-anchor="middle" font-weight="500">${this.localize("live.detected")}</text>
          `:Y`
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
    `}_fireStartCalibration(){this.dispatchEvent(new CustomEvent("start-calibration",{bubbles:!0,composed:!0}))}_fireDismissTutorial(){this.dispatchEvent(new CustomEvent("dismiss-tutorial",{bubbles:!0,composed:!0}))}_onBeginMarking(){this._dismissTutorial&&this._fireDismissTutorial(),this._setupStep="corners",this.dispatchEvent(new CustomEvent("begin-corners",{bubbles:!0,composed:!0}))}_fireCancel(){this._setupStep=null,this._wizardCorners=[null,null,null,null],this._wizardCornerIndex=0,this._wizardOffsetSide="",this._wizardOffsetFb="",this._smoothBuffer=[],this._perspective=null,this.dispatchEvent(new CustomEvent("wizard-cancel",{bubbles:!0,composed:!0}))}}_s.styles=[Ci,Ii,Bi,n`
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
    `],t([gt({attribute:!1})],_s.prototype,"hass",void 0),t([gt({type:String})],_s.prototype,"selectedMac",void 0),t([gt({attribute:!1})],_s.prototype,"rawTargets",void 0),t([gt({attribute:!1})],_s.prototype,"sensorState",void 0),t([gt({attribute:!1})],_s.prototype,"localize",void 0),t([gt({type:Number})],_s.prototype,"initialRoomWidth",void 0),t([gt({type:Number})],_s.prototype,"initialRoomDepth",void 0),t([gt({type:String})],_s.prototype,"initialStep",void 0),t([gt({type:String})],_s.prototype,"mode",void 0),t([ut()],_s.prototype,"_setupStep",void 0),t([ut()],_s.prototype,"_wizardSaving",void 0),t([ut()],_s.prototype,"_wizardCornerIndex",void 0),t([ut()],_s.prototype,"_wizardCorners",void 0),t([ut()],_s.prototype,"_wizardRoomWidth",void 0),t([ut()],_s.prototype,"_wizardRoomDepth",void 0),t([ut()],_s.prototype,"_wizardCapturing",void 0),t([ut()],_s.prototype,"_wizardCaptureProgress",void 0),t([ut()],_s.prototype,"_wizardCapturePaused",void 0),t([ut()],_s.prototype,"_wizardOffsetSide",void 0),t([ut()],_s.prototype,"_wizardOffsetFb",void 0),t([ut()],_s.prototype,"_dismissTutorial",void 0),customElements.get("epp-wizard")||customElements.define("epp-wizard",_s);class ps extends ct{constructor(){super(...arguments),this.overlayMode=null,this.localize=Te}render(){return $`
			<div class="overlay-scroll-area">
				<!-- Entry / Exit -->
				<div
					class="overlay-item ${"entry"===this.overlayMode?"active":""}"
					@click=${()=>{this.dispatchEvent(new CustomEvent("overlay-select",{detail:{mode:"entry"===this.overlayMode?null:"entry"},bubbles:!0,composed:!0}))}}
				>
					<div class="overlay-item-row">
						<div
							class="overlay-dot"
							style="background: repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(60,60,60,0.6) 4px, rgba(60,60,60,0.6) 6px);"
						></div>
						<span class="overlay-name"
							>${this.localize("overlays.entry_exit")}</span
						>
						<span class="overlay-hint"
							>${this.localize("overlays.click_to_paint")}</span
						>
					</div>
				</div>

				<!-- Interference -->
				<div
					class="overlay-item ${"interference"===this.overlayMode?"active":""}"
					@click=${()=>{this.dispatchEvent(new CustomEvent("overlay-select",{detail:{mode:"interference"===this.overlayMode?null:"interference"},bubbles:!0,composed:!0}))}}
				>
					<div class="overlay-item-row">
						<div
							class="overlay-dot"
							style="background: repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(200,0,0,0.6) 4px, rgba(200,0,0,0.6) 6px);"
						></div>
						<span class="overlay-name"
							>${this.localize("overlays.interference")}</span
						>
						<span class="overlay-hint"
							>${this.localize("overlays.click_to_paint")}</span
						>
					</div>
				</div>

				<!-- Suppress -->
				<div
					class="overlay-item ${"suppress"===this.overlayMode?"active":""}"
					@click=${()=>{this.dispatchEvent(new CustomEvent("overlay-select",{detail:{mode:"suppress"===this.overlayMode?null:"suppress"},bubbles:!0,composed:!0}))}}
				>
					<div class="overlay-item-row">
						<div
							class="overlay-dot"
							style="background: repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(200,0,0,0.6) 4px, rgba(200,0,0,0.6) 6px), repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(200,0,0,0.6) 4px, rgba(200,0,0,0.6) 6px);"
						></div>
						<span class="overlay-name"
							>${this.localize("overlays.suppress")}</span
						>
						<span class="overlay-hint"
							>${this.localize("overlays.click_to_paint")}</span
						>
					</div>
				</div>
			</div>
		`}}ps.styles=n`
		:host {
			display: block;
		}

		.overlay-scroll-area {
			display: flex;
			flex-direction: column;
			gap: 6px;
		}

		.overlay-item {
			display: flex;
			flex-direction: column;
			gap: 4px;
			padding: 6px 8px;
			border-radius: 8px;
			cursor: pointer;
			border: 2px solid var(--divider-color, #e0e0e0);
			transition: border-color 0.2s;
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

	`,t([gt({attribute:!1})],ps.prototype,"overlayMode",void 0),t([gt({attribute:!1})],ps.prototype,"localize",void 0),customElements.get("epp-overlay-sidebar")||customElements.define("epp-overlay-sidebar",ps);class fs extends ct{constructor(){super(...arguments),this.zoneConfigs=[],this.activeZone=null,this.zone0={type:"default"},this.localZoneState=new Map,this.localize=Te,this._nameDebounceTimer=null,this._pendingNameUpdate=null,this._flushPendingName=()=>{this._nameDebounceTimer=null;const t=this._pendingNameUpdate;t&&(this._pendingNameUpdate=null,this.dispatchEvent(new CustomEvent("zone-config-change",{detail:{index:t.index,updates:{name:t.name}},bubbles:!0,composed:!0})))}}_onNameInput(t,e){this._pendingNameUpdate={index:t,name:e},null!==this._nameDebounceTimer&&clearTimeout(this._nameDebounceTimer),this._nameDebounceTimer=setTimeout(this._flushPendingName,fs.NAME_DEBOUNCE_MS)}disconnectedCallback(){super.disconnectedCallback(),null!==this._nameDebounceTimer&&(clearTimeout(this._nameDebounceTimer),this._flushPendingName())}render(){return this._renderZoneSidebar()}updated(){for(const t of this.renderRoot.querySelectorAll(".sensitivity-select")){const e=t.dataset.value;null!=e&&t.value!==e&&(t.value=e)}}_renderZoneSidebar(){return $`
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
					${0===this.activeZone?$` ${this._renderBoundaryTypeControls()} `:J}
				</div>

				<hr class="zone-separator" />
				<!-- Named zones 1..N -->
				${this.zoneConfigs.map((t,e)=>{if(null===t)return J;const i=e+1;return $`
						<div
							class="zone-item ${this.activeZone===i?"active":""}"
							@click=${()=>{this.dispatchEvent(new CustomEvent("zone-select",{detail:{zone:i},bubbles:!0,composed:!0}))}}
						>
							<div class="zone-item-row">
								${this.activeZone===i?$`
											<input
												type="color"
												class="zone-color-picker"
												style="width: 16px; height: 16px; border-radius: 50%;${this.localZoneState.get(i)?.occupied?` box-shadow: 0 0 6px 2px ${t.color};`:""}"
												.value=${t.color}
												@input=${t=>{const i=t.target.value;this.dispatchEvent(new CustomEvent("zone-config-change",{detail:{index:e,updates:{color:i}},bubbles:!0,composed:!0}))}}
												@click=${t=>t.stopPropagation()}
											/>
										`:$`
											<div
												class="zone-color-dot"
												style="background: ${t.color};${this.localZoneState.get(i)?.occupied?` box-shadow: 0 0 6px 2px ${t.color};`:""}"
											></div>
										`}
								<input
									class="zone-name-input"
									type="text"
									.value=${t.name}
									@input=${t=>{const i=t.target.value;this._onNameInput(e,i)}}
									@blur=${()=>{null!==this._nameDebounceTimer&&(clearTimeout(this._nameDebounceTimer),this._flushPendingName())}}
									@click=${t=>{t.stopPropagation(),this.dispatchEvent(new CustomEvent("zone-select",{detail:{zone:i},bubbles:!0,composed:!0}))}}
									@focus=${()=>{this.dispatchEvent(new CustomEvent("zone-select",{detail:{zone:i},bubbles:!0,composed:!0}))}}
								/>
								<button
									class="zone-remove-btn"
									type="button"
									aria-label=${this.localize("zones.remove_zone")}
									@click=${t=>{t.stopPropagation(),this.dispatchEvent(new CustomEvent("zone-remove",{detail:{slot:i},bubbles:!0,composed:!0}))}}
								>
									<ha-icon icon="mdi:close"></ha-icon>
								</button>
							</div>
							${this.activeZone===i?$`
										${this._renderZoneTypeControls(t,e)}
									`:J}
						</div>
					`})}

				${this.zoneConfigs.some(t=>null===t)?$`
							<button
								class="add-zone-btn"
								@click=${()=>{this.dispatchEvent(new CustomEvent("zone-add",{bubbles:!0,composed:!0}))}}
							>
								<ha-icon icon="mdi:plus"></ha-icon>
								${this.localize("sidebar.add_zone")}
							</button>
						`:J}

			</div>
		`}_emitZone0Change(t){this.dispatchEvent(new CustomEvent("zone0-change",{detail:t,bubbles:!0,composed:!0}))}_renderBoundaryTypeControls(){const t=this.zone0,e="custom"===t.type,i=ss(t),s=i.trigger,o=i.renew,r=i.timeout,n=i.handoff_timeout,a=`width: 100%; display: flex; align-items: center; gap: 4px; font-size: 12px; opacity: ${e?1:.5};`;return $`
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
						data-value=${t.type}
						@change=${t=>{const e=t.target.value;if("custom"===e){const t=ss(this.zone0);this._emitZone0Change({type:e,trigger:t.trigger,renew:t.renew,timeout:t.timeout,handoff_timeout:t.handoff_timeout})}else this._emitZone0Change({type:e,trigger:void 0,renew:void 0,timeout:void 0,handoff_timeout:void 0})}}
						@click=${t=>t.stopPropagation()}
					>
						${es.map(t=>$`<option value=${t}>${this.localize(`zones.${t}`)}</option>`)}
					</select>
				</div>
				<div style="${a}">
					<label style="width: 80px; flex-shrink: 0;"
						>${this.localize("zones.trigger")}</label
					>
					<input
						type="range"
						min="1"
						max="9"
						style="flex: 1; min-width: 0;"
						.value=${String(s)}
						?disabled=${!e}
						@input=${t=>{this._emitZone0Change({trigger:Number(t.target.value)})}}
						@click=${t=>t.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0;"
						>${s}</span
					>
				</div>
				<div style="${a}">
					<label style="width: 80px; flex-shrink: 0;"
						>${this.localize("zones.renew")}</label
					>
					<input
						type="range"
						min="1"
						max="9"
						style="flex: 1; min-width: 0;"
						.value=${String(o)}
						?disabled=${!e}
						@input=${t=>{this._emitZone0Change({renew:Number(t.target.value)})}}
						@click=${t=>t.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0;"
						>${o}</span
					>
				</div>
				<div style="${a}">
					<label style="width: 80px; flex-shrink: 0;"
						>${this.localize("zones.presence_timeout")}</label
					>
					<span style="flex: 1;"></span>
					<input
						type="number"
						min="1"
						max="3600"
						style="width: 48px; text-align: right; font: inherit; font-size: 12px;"
						.value=${String(r)}
						?disabled=${!e}
						@input=${t=>{const e=Number(t.target.value);e>0&&this._emitZone0Change({timeout:e})}}
						@click=${t=>t.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0; font-size: 12px;"
						>${this.localize("zones.seconds_suffix")}</span
					>
				</div>
				<div style="${a}">
					<label style="width: 80px; flex-shrink: 0;"
						>${this.localize("zones.handoff_timeout")}</label
					>
					<span style="flex: 1;"></span>
					<input
						type="number"
						min="1"
						max="300"
						style="width: 48px; text-align: right; font: inherit; font-size: 12px;"
						.value=${String(n)}
						?disabled=${!e}
						@input=${t=>{const e=Number(t.target.value);e>0&&this._emitZone0Change({handoff_timeout:e})}}
						@click=${t=>t.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0; font-size: 12px;"
						>${this.localize("zones.seconds_suffix")}</span
					>
				</div>
			</div>
		`}_renderZoneTypeControls(t,e){const i="custom"===t.type,s=ts[t.type]||ts.default,o=t.trigger??s.trigger,r=t.renew??s.renew,n=t.timeout??s.timeout,a=t.handoff_timeout??s.handoff_timeout,l=`width: 100%; display: flex; align-items: center; gap: 4px; font-size: 12px; opacity: ${i?1:.5};`;return $`
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
						data-value=${t.type}
						@change=${i=>{const s=i.target.value,o="custom"===s?{...ss(t),type:s}:{type:s,trigger:void 0,renew:void 0,timeout:void 0,handoff_timeout:void 0};this.dispatchEvent(new CustomEvent("zone-config-change",{detail:{index:e,updates:o},bubbles:!0,composed:!0}))}}
						@click=${t=>t.stopPropagation()}
					>
						${es.map(t=>$`<option value=${t}>${this.localize(`zones.${t}`)}</option>`)}
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
						.value=${String(o)}
						?disabled=${!i}
						@input=${t=>{this.dispatchEvent(new CustomEvent("zone-config-change",{detail:{index:e,updates:{trigger:Number(t.target.value)}},bubbles:!0,composed:!0}))}}
						@click=${t=>t.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0;"
						>${o}</span
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
						.value=${String(r)}
						?disabled=${!i}
						@input=${t=>{this.dispatchEvent(new CustomEvent("zone-config-change",{detail:{index:e,updates:{renew:Number(t.target.value)}},bubbles:!0,composed:!0}))}}
						@click=${t=>t.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0;"
						>${r}</span
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
						max="3600"
						style="width: 48px; text-align: right; font: inherit; font-size: 12px; margin-right: 0;"
						.value=${String(n)}
						?disabled=${!i}
						@input=${t=>{const i=Number(t.target.value);i>0&&this.dispatchEvent(new CustomEvent("zone-config-change",{detail:{index:e,updates:{timeout:i}},bubbles:!0,composed:!0}))}}
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
						@input=${t=>{const i=Number(t.target.value);i>0&&this.dispatchEvent(new CustomEvent("zone-config-change",{detail:{index:e,updates:{handoff_timeout:i}},bubbles:!0,composed:!0}))}}
						@click=${t=>t.stopPropagation()}
					/>
					<span
						style="width: 10px; text-align: right; flex-shrink: 0; font-size: 12px;"
						>${this.localize("zones.seconds_suffix")}</span
					>
				</div>
			</div>
		`}}function ws(t){if(t)try{t()}catch(t){console.debug("safeUnsub: callback threw (ignored):",t)}}fs.NAME_DEBOUNCE_MS=150,fs.styles=[Si,n`
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
		`],t([gt({attribute:!1})],fs.prototype,"grid",void 0),t([gt({attribute:!1})],fs.prototype,"zoneConfigs",void 0),t([gt({attribute:!1})],fs.prototype,"activeZone",void 0),t([gt({attribute:!1})],fs.prototype,"zone0",void 0),t([gt({attribute:!1})],fs.prototype,"localZoneState",void 0),t([gt({attribute:!1})],fs.prototype,"localize",void 0),customElements.get("epp-zone-sidebar")||customElements.define("epp-zone-sidebar",fs);const Es="epp_selected_mac";function ms(){try{return localStorage.getItem(Es)}catch{return null}}function bs(t){try{""===t?localStorage.removeItem(Es):localStorage.setItem(Es,t)}catch{}}class ys{constructor(t){this.devices=[],this.selectedMac="",this.showRoomCalibrationTutorial=!0,this._hass=null,this._reconnecting=!1,this._connectionFailed=!1,this._lastSelectedOnline=null,this._targetsGen=0,this._displayGen=0,this._deviceListGen=0,this._sessionGen=0,this._wantDeviceListSub=!1,this._disposed=!1,this._host=t,t.addController(this)}hostConnected(){this._disposed=!1}hostDisconnected(){this._disposed=!0,this.unsubscribeDeviceList(),this.closeDeviceSession()}get hass(){return this._hass}set hass(t){const e=this._hass?.connection;if(this._hass=t,t?.connection&&t.connection!==e&&e){const t=this._wantDeviceListSub;this._unsubDevice=void 0,this._unsubTargets=void 0,this._unsubDisplay=void 0,this._unsubDeviceList=void 0,this._targetRetryTimer&&(clearTimeout(this._targetRetryTimer),this._targetRetryTimer=void 0),this._displayRetryTimer&&(clearTimeout(this._displayRetryTimer),this._displayRetryTimer=void 0),this._targetsGen++,this._displayGen++,this._deviceListGen++,this._sessionGen++,t&&this.subscribeDeviceList().catch(()=>{})}}get hasDeviceSession(){return!!this._unsubDevice}get reconnecting(){return this._reconnecting}get connectionFailed(){return this._connectionFailed}setShowRoomCalibrationTutorial(t){this.showRoomCalibrationTutorial!==t&&(this.showRoomCalibrationTutorial=t,this._host.requestUpdate())}async loadDevices(){if(!this._hass)return;try{const t=await this._hass.callWS({type:"eppgrid/list_devices"});this.devices=[...t.devices].sort((t,e)=>(t.name||"").localeCompare(e.name||"")),this.setShowRoomCalibrationTutorial(t.show_room_calibration_tutorial??!0)}catch{return this.devices=[],void this._host.requestUpdate()}const t=this.selectedMac,e=ms(),i=e&&this.devices.find(t=>t.mac===e);this.selectedMac=i?e:this.devices[0]?.mac??"",t!==this.selectedMac&&(this._lastSelectedOnline=null),this._host.requestUpdate()}async subscribeDeviceList(){if(this._wantDeviceListSub=!0,this._deviceListGen++,ws(this._unsubDeviceList),this._unsubDeviceList=void 0,!this._hass)return;const t=++this._deviceListGen;try{const e=await this._hass.connection.subscribeMessage(t=>{this.setShowRoomCalibrationTutorial(t.show_room_calibration_tutorial??!0),this._applyDeviceList(t.devices??[])},{type:"eppgrid/subscribe_device_list"});if(this._deviceListGen!==t){try{e()}catch{}return}this._unsubDeviceList=e}catch{await this.loadDevices()}}unsubscribeDeviceList(){this._wantDeviceListSub=!1,this._deviceListGen++,ws(this._unsubDeviceList),this._unsubDeviceList=void 0}_applyDeviceList(t){this.devices=[...t].sort((t,e)=>(t.name||"").localeCompare(e.name||""));const e=this.selectedMac,i=ms();if(this.devices.length>0){const t=i&&this.devices.find(t=>t.mac===i),e=t?i:this.devices[0].mac,s=e!==this.selectedMac&&!!this.selectedMac&&!this.devices.some(t=>t.mac===this.selectedMac)&&(this.isHostDirty?.()??!1);s||(this.selectedMac=e)}else!this.selectedMac&&i&&(this.selectedMac=i);e!==this.selectedMac&&(this._lastSelectedOnline=null);const s=this.devices.find(t=>t.mac===this.selectedMac),o=(s?.available??!1)&&"unavailable"!==s?.firmware_status,r=this._lastSelectedOnline;this._lastSelectedOnline=o,!0!==r||o||(this.closeDeviceSession(),this.onSessionClosed?.()),!1===r&&o&&this.selectedMac&&this.onSelectedAvailable?.(this.selectedMac),this.onDeviceListChanged?.(),this._host.requestUpdate()}async loadDeviceConfig(t){const e=this._loadConfigInFlight;if(e){if(e.mac===t)return e.promise;if(await e.promise.catch(()=>{}),this._disposed)return null}const i={mac:t,promise:void 0};return i.promise=(async()=>{this._reconnecting=!0,this._host.requestUpdate();try{const e=this._sessionGen;let i=null;try{i=(await this._hass.callWS({type:"eppgrid/get_config",mac:t})).config}catch{}return this._sessionGen!==e||await this.reopenSession(t),i}finally{this._reconnecting=!1,this._loadConfigInFlight===i&&(this._loadConfigInFlight=void 0),this._host.requestUpdate()}})(),this._loadConfigInFlight=i,i.promise}async reopenSession(t){if(!this._hass||!t)return;const e=this._reopenInFlight;if(e){if(e.mac===t)return e.promise;if(await e.promise.catch(()=>{}),this._disposed)return}const i={mac:t,promise:void 0};return i.promise=(async()=>{try{await this.openDeviceSession(t),this._unsubDevice&&this.subscribeTargets(t)}finally{this._reopenInFlight===i&&(this._reopenInFlight=void 0)}})(),this._reopenInFlight=i,i.promise}async openDeviceSession(t){if(this.closeDeviceSession(),!this._hass||!t)return;const e=++this._sessionGen;try{const i=await this._hass.connection.subscribeMessage(()=>{},{type:"eppgrid/subscribe_device",mac:t});if(this._sessionGen!==e){try{i()}catch{}return}this._unsubDevice=i,this._connectionFailed=!1,this._host.requestUpdate()}catch(t){if(this._sessionGen!==e)return;console.warn("Failed to open device session:",t);const i=t;this._connectionFailed="connection_failed"===i?.code||"not_found"===i?.code,this._host.requestUpdate()}}closeDeviceSession(){this._sessionGen++,this.unsubscribeTargets(),ws(this._unsubDevice),this._unsubDevice=void 0}subscribeTargets(t){if(this.unsubscribeTargets(),!this._hass||!t)return;const e=this._hass.connection;this._subscribeGridTargets(e,t),this.subscribeDisplay(t)}unsubscribeTargets(){this.unsubscribeDisplay(),this._targetsGen++,this._targetRetryTimer&&(clearTimeout(this._targetRetryTimer),this._targetRetryTimer=void 0),ws(this._unsubTargets),this._unsubTargets=void 0}_subscribeGridTargets(t,e,i=1){const s=++this._targetsGen;t.subscribeMessage(t=>{const e=(t.targets||[]).map(t=>({x:t.x,y:t.y,status:t.status??"inactive",signal:t.signal??0})),i=t.sensors?{occupancy:t.sensors.occupancy??!1,static_presence:t.sensors.static_presence??!1,motion_presence:t.sensors.motion_presence??!1,target_presence:t.sensors.target_presence??!1,mmwave:t.sensors.mmwave??!1,static_state:t.sensors.static_state,motion_state:t.sensors.motion_state,occupancy_state:t.sensors.occupancy_state,illuminance:t.sensors.illuminance??null,temperature:t.sensors.temperature??null,humidity:t.sensors.humidity??null,co2:t.sensors.co2??null}:{occupancy:!1,static_presence:!1,motion_presence:!1,target_presence:!1,mmwave:!1,static_state:void 0,motion_state:void 0,occupancy_state:void 0,illuminance:null,temperature:null,humidity:null,co2:null},s=t.zones?{occupancy:t.zones.occupancy??{},target_counts:t.zones.target_counts??{},frame_count:t.zones.frame_count??0,debug_log:t.zones.debug_log}:null;this.onTargetData?.({targets:e,sensors:i,zones:s})},{type:"eppgrid/subscribe_grid_targets",mac:e}).then(t=>{if(this._targetsGen===s)this._unsubTargets=t;else try{t()}catch{}}).catch(()=>{if(this._targetsGen===s){if(i>=5)return this._connectionFailed=!0,void this._host.requestUpdate();this._targetRetryTimer&&clearTimeout(this._targetRetryTimer),this._targetRetryTimer=setTimeout(()=>{this._targetRetryTimer=void 0,this._hass?.connection===t&&this._subscribeGridTargets(t,e,i+1)},2e3)}})}subscribeDisplay(t){this.unsubscribeDisplay(),this._hass&&t&&this._subscribeRawTargets(this._hass.connection,t)}_subscribeRawTargets(t,e,i=1){const s=++this._displayGen;t.subscribeMessage(t=>{const e=(t.targets||[]).map(t=>({raw_x:t.raw_x,raw_y:t.raw_y}));this.onRawTargetData?.(e)},{type:"eppgrid/subscribe_raw_targets",mac:e}).then(t=>{if(this._displayGen===s)this._unsubDisplay=t;else try{t()}catch{}}).catch(()=>{if(this._displayGen===s){if(i>=5)return this._connectionFailed=!0,void this._host.requestUpdate();this._displayRetryTimer&&clearTimeout(this._displayRetryTimer),this._displayRetryTimer=setTimeout(()=>{this._displayRetryTimer=void 0,this._hass?.connection===t&&this._subscribeRawTargets(t,e,i+1)},2e3)}})}unsubscribeDisplay(){this._displayGen++,this._displayRetryTimer&&(clearTimeout(this._displayRetryTimer),this._displayRetryTimer=void 0),ws(this._unsubDisplay),this._unsubDisplay=void 0}selectDevice(t){this.selectedMac=t,this._lastSelectedOnline=null,this._connectionFailed=!1,bs(t),this._host.requestUpdate()}}function vs(t){if("string"!=typeof t||""===t)return"";if(t.startsWith("/")&&!t.startsWith("//"))return t;try{const e=new URL(t);return"https:"===e.protocol||"http:"===e.protocol?t:""}catch{return""}}class Cs{constructor(t){this.flashableDevices=[],this.firmwareBaseUrl="",this.firmwareVersion="",this.integrationVersion="",this.loading=!0,this.usbConnected=!1,this.usbDeviceMac=null,this.usbExistingDevice=null,this.usbFlashState=null,this.wifiNetworks=[],this.otaStates={},this.cancelledDeviceIpHint=null,this._cancelledIpTimeout=null,this._hass=null,this._serialPort=null,this._serialReader=null,this._serialWriter=null,this._wifiCheckAbort=null,this._wifiCheckPromise=null,this._opId=0,this._opRunning=!1,this._otaUnsubs={},this._otaTimeouts={},this._otaGen=0,this._deviceListGen=0,this._wantDeviceListSub=!1,this._host=t,t.addController(this)}hostConnected(){}hostDisconnected(){this._wantDeviceListSub=!1,this.unsubscribeDeviceList(),this._tearDownSerialPort(),this._otaGen++;for(const t of Object.keys(this._otaUnsubs))this._unsubOta(t);for(const t of Object.keys(this._otaTimeouts))this._resetOtaTimeout(t);this.otaStates={},this._cancelledIpTimeout&&(clearTimeout(this._cancelledIpTimeout),this._cancelledIpTimeout=null)}_tearDownSerialPort(){try{this._serialReader?.releaseLock()}catch{}try{this._serialWriter?.releaseLock()}catch{}this._serialReader=null,this._serialWriter=null;const t=this._serialPort?.close().catch(()=>{})??Promise.resolve();return this._serialPort=null,t}_setOtaState(t,e){this.otaStates={...this.otaStates,[t]:e}}_deleteOtaState(t){if(!(t in this.otaStates))return;const{[t]:e,...i}=this.otaStates;this.otaStates=i}async startOta(t){if("updating"===this.otaStates[t]?.state)return;const e=this._otaGen;this._setOtaState(t,{state:"updating",progress:0,errorKey:null}),this._host.requestUpdate();try{await this._hass.callWS({type:"eppgrid/update_firmware",mac:t})}catch{if(this._otaGen!==e)return;return this._setOtaState(t,{state:"error",progress:null,errorKey:"flasher.errors.start_failed"}),void this._host.requestUpdate()}if(this._otaGen===e)try{const i=await this._hass.connection.subscribeMessage(e=>{this._handleOtaEvent(t,e)},{type:"eppgrid/subscribe_ota_progress",mac:t});if(this._otaGen!==e){try{i()}catch{}return}this._unsubOta(t),this._otaUnsubs[t]=i,this._startOtaTimeout(t,15e3)}catch{if(this._otaGen!==e)return;this._setOtaState(t,{state:"error",progress:null,errorKey:"flasher.errors.connect_failed"}),this._host.requestUpdate()}}_handleOtaEvent(t,e){switch(e.state){case"updating":{const i=e.progress??null;null!=i&&i>=100?this._otaSuccess(t):(this._setOtaState(t,{state:"updating",progress:i,errorKey:null}),this._startOtaTimeout(t,null!=i&&i>0?1e4:15e3));break}case"success":this._otaSuccess(t);break;case"error":{const i=e.error_key??"flasher.errors.update_failed_generic";this._setOtaState(t,{state:"error",progress:null,errorKey:i,errorParams:{message:e.message??""}}),this._resetOtaTimeout(t),this._unsubOta(t);break}}this._host.requestUpdate()}_otaSuccess(t){this._setOtaState(t,{state:"success",progress:null,errorKey:null}),this._unsubOta(t),this._resetOtaTimeout(t),this._otaTimeouts[t]=setTimeout(()=>{delete this._otaTimeouts[t],"success"===this.otaStates[t]?.state&&(this._deleteOtaState(t),this._host.requestUpdate())},5e3)}_startOtaTimeout(t,e){this._resetOtaTimeout(t),this._otaTimeouts[t]=setTimeout(()=>{const e=this.otaStates[t];e&&"updating"===e.state&&(null!=e.progress&&e.progress>0?this._setOtaState(t,{state:"error",progress:null,errorKey:"flasher.errors.connection_lost"}):this._setOtaState(t,{state:"error",progress:null,errorKey:"flasher.errors.update_timeout"}),this._unsubOta(t),this._host.requestUpdate())},e)}_resetOtaTimeout(t){const e=this._otaTimeouts[t];e&&(clearTimeout(e),delete this._otaTimeouts[t])}dismissOtaError(t){this._unsubOta(t),this._resetOtaTimeout(t),this._deleteOtaState(t),this._host.requestUpdate()}_unsubOta(t){const e=this._otaUnsubs[t];if(e){try{e()}catch{}delete this._otaUnsubs[t]}}get hass(){return this._hass}set hass(t){const e=this._hass?.connection;if(this._hass=t,t?.connection&&t.connection!==e&&e){const t=this._wantDeviceListSub;this._unsubDeviceList=void 0,this._deviceListGen++,this._otaGen++;for(const t of Object.keys(this._otaUnsubs))delete this._otaUnsubs[t];for(const t of Object.keys(this._otaTimeouts))this._resetOtaTimeout(t);this.otaStates={},this._host.requestUpdate(),t&&this.subscribeDeviceList().catch(()=>{})}}async loadDevices(){if(!this._hass)return this.loading=!1,void this._host.requestUpdate();try{const t=await this._hass.callWS({type:"eppgrid/list_flashable_devices"});this.flashableDevices=t.devices,this.firmwareBaseUrl=vs(t.firmware_base_url),this.firmwareVersion=t.latest_firmware_version??""}catch{this.flashableDevices=[]}this.loading=!1,this._host.requestUpdate()}async subscribeDeviceList(){if(this._wantDeviceListSub=!0,this._deviceListGen++,ws(this._unsubDeviceList),this._unsubDeviceList=void 0,!this._hass)return;const t=++this._deviceListGen;try{const e=await this._hass.connection.subscribeMessage(t=>{this._applyDeviceList(t)},{type:"eppgrid/subscribe_flashable_devices"});if(this._deviceListGen!==t){try{e()}catch{}return}this._unsubDeviceList=e}catch{await this.loadDevices()}}unsubscribeDeviceList(){this._wantDeviceListSub=!1,this._deviceListGen++,ws(this._unsubDeviceList),this._unsubDeviceList=void 0}_applyDeviceList(t){this.flashableDevices=t.devices??[],this.firmwareBaseUrl=vs(t.firmware_base_url),this.firmwareVersion=t.latest_firmware_version??"",this.integrationVersion=t.integration_version??"",this.loading=!1,this.onDeviceListChanged?.(),this._host.requestUpdate(),this._checkOtaDevicesOffline()}_checkOtaDevicesOffline(){for(const[t,e]of Object.entries(this.otaStates)){if("updating"!==e.state)continue;const i=this.flashableDevices.find(e=>e.mac===t);i&&!i.available&&(this._setOtaState(t,{state:"error",progress:null,errorKey:"flasher.errors.device_offline"}),this._unsubOta(t),this._resetOtaTimeout(t),this._host.requestUpdate())}}async deleteEsphomeDevice(t){this._hass&&await this._hass.callWS({type:"eppgrid/delete_esphome_device",config_entry_id:t})}async addEsphomeDevice(t){return this._hass?await this._hass.callWS({type:"eppgrid/add_esphome_device",host:t}):{type:"failed",reason:"no_hass"}}updateUsbState(t){this.usbFlashState=t,this._host.requestUpdate()}get opId(){return this._opId}get opRunning(){return this._opRunning}set opRunning(t){this._opRunning=t}async resetUsbState(){this.usbFlashState=null,this.wifiNetworks=[],this._opId++;const t=this._wifiCheckAbort,e=this._wifiCheckPromise;if(this._wifiCheckAbort=null,this._wifiCheckPromise=null,t?.abort(),this._host.requestUpdate(),e)try{await e}catch{}await this._tearDownSerialPort()}setCancelledDeviceIpHint(t){this.cancelledDeviceIpHint=t,this._cancelledIpTimeout&&(clearTimeout(this._cancelledIpTimeout),this._cancelledIpTimeout=null),t&&(this._cancelledIpTimeout=setTimeout(()=>{this.cancelledDeviceIpHint=null,this._cancelledIpTimeout=null,this._host.requestUpdate()},8e3)),this._host.requestUpdate()}bumpOpId(){this._opId++}set serialPort(t){this._serialPort=t}get serialPort(){return this._serialPort}}const Bs={room_occupancy:!0,zone_presence:!0,room_target_presence:!1,room_static_presence:!1,room_motion_presence:!1,room_mmwave:!1,target_active:!1,target_xy:!1,target_signal:!1,target_zone:!1,zone_target_count:!1,target_count:!1,env_temperature:!1,env_humidity:!1,env_illuminance:!1,env_co2:!1},Ss={temperature_offset:0,humidity_offset:0,illuminance_offset:0,motion_timeout:5,target_auto_distance:!0,target_max_distance:6,stuck_target_timeout:300,static_auto_distance:!0,static_min_distance:.3,static_max_distance:16,static_trigger_threshold:3,static_renew_threshold:3,static_timeout:30,static_on_delay:0,led_mode:"Manual Control",led_brightness:1,led_presence_color:"#CC33FF",relay_trigger_mode:"disabled",relay_contact_mode:"no",target_update_rate_ms:1e3,zone_update_rate_ms:1e3,entities:{...Bs},log_levels:{}};function Is(t,e){return"object"==typeof e&&null!==e?0===Object.keys(e).length&&("object"==typeof t&&null!==t&&0===Object.keys(t).length):t===e}const xs=[["temperature_offset","_temperatureOffset"],["humidity_offset","_humidityOffset"],["illuminance_offset","_illuminanceOffset"],["motion_timeout","_motionTimeout"],["target_auto_distance","_targetAutoDistance"],["target_max_distance","_targetMaxDistance"],["stuck_target_timeout","_stuckTargetTimeout"],["static_auto_distance","_staticAutoDistance"],["static_min_distance","_staticMinDistance"],["static_max_distance","_staticMaxDistance"],["static_trigger_threshold","_staticTriggerThreshold"],["static_renew_threshold","_staticRenewThreshold"],["static_timeout","_staticTimeout"],["static_on_delay","_staticOnDelay"],["led_mode","_ledMode"],["led_brightness","_ledBrightness"],["led_presence_color","_ledPresenceColor"],["relay_trigger_mode","_relayTriggerMode"],["relay_contact_mode","_relayContactMode"],["target_update_rate_ms","_targetUpdateRateMs"],["zone_update_rate_ms","_zoneUpdateRateMs"],["entities","_entitiesConfig"],["log_levels","_logLevels"]];function Ds(t){return null===t?null:ni[t]}function Ms(t,e){if(null===t)return null;if(0===e){const e=t,i={type:e.type};return"custom"===e.type&&(i.trigger=e.trigger,i.renew=e.renew,i.timeout=e.timeout,i.handoff_timeout=e.handoff_timeout),i}const i=t,s={name:i.name,color:i.color,type:i.type};return"custom"===i.type&&(s.trigger=i.trigger,s.renew=i.renew,s.timeout=i.timeout,s.handoff_timeout=i.handoff_timeout),s}class Rs{constructor(t){this.configurations=[],this.host=t,t.addController(this)}hostConnected(){}hostDisconnected(){}onCellMouseDown(t){if("furniture"===this.host._sidebarTab)return void(this.host._selectedFurnitureId=null);const e=Ds(this.host._overlayMode);if(null!==e)this.host._paintAction=(i=this.host._grid[t],s=e,oi(i)===s?"clear":"set");else{if("zones"!==this.host._sidebarTab||null===this.host._activeZone)return;this.host._paintAction=function(t,e){if(0===e)return ei(t)&&0===ii(t)?"clear":"set";return ii(t)===e?"clear":"set"}(this.host._grid[t],this.host._activeZone)}var i,s;this.host._isPainting=!0,this.host._frozenBounds=this.host._getVisibleRoomBounds(),this.applyPaintToCell(t);const o=()=>{this.onCellMouseUp(),window.removeEventListener("mouseup",o)};window.addEventListener("mouseup",o)}onCellMouseEnter(t){this.host._isPainting&&this.applyPaintToCell(t)}onCellMouseUp(){this.host._isPainting&&(this.host._justPainted=!0,requestAnimationFrame(()=>{this.host._justPainted=!1})),this.host._isPainting=!1,this.host._frozenBounds=null}applyPaintToCell(t){let e;const i=Ds(this.host._overlayMode);if(null!==i)s=this.host._grid[t],o=i,r=this.host._paintAction,e=ei(s)?ri(s,"set"===r?o:0):null;else{if(null===this.host._activeZone)return;e=function(t,e,i){return 0===e?"set"===i?1:0:ei(t)?"set"===i?si(1|t,e):si(t,0):null}(this.host._grid[t],this.host._activeZone,this.host._paintAction)}var s,o,r;null!==e&&e!==this.host._grid[t]&&(this.host._grid=new Uint8Array(this.host._grid),this.host._grid[t]=e,this.host._dirty=!0,this.host.requestUpdate())}initGridFromRoom(){this.host._grid=di(this.host._roomWidth,this.host._roomDepth)}addZone(){const t=[...this.host._zoneConfigs],e=t.findIndex((t,e)=>e>0&&null===t);if(-1===e)return;const i=new Set(t.filter((t,e)=>e>0&&null!==t).map(t=>t.color)),s=is.find(t=>!i.has(t)),o=this.host._localize?.("live.debug.zone_n",{n:e})??`Zone ${e}`;t[e]={name:o,color:s,type:"default"},this.host._zoneConfigs=t,this.host._activeZone=e,this.host._dirty=!0}removeZone(t){if(t<1||t>7||null===this.host._zoneConfigs[t])return;const e=function(t,e){if(e<1||e>7)return null;let i=-1;for(let s=0;s<Xe;s++)if(ii(t[s])===e){i=s;break}if(-1===i)return null;const s=new Uint8Array(t);for(let t=i;t<Xe;t++)ii(s[t])===e&&(s[t]=si(s[t],0));return s}(this.host._grid,t);e&&(this.host._grid=e);const i=[...this.host._zoneConfigs];i[t]=null,this.host._zoneConfigs=i,this.host._activeZone===t&&(this.host._activeZone=null),this.host._dirty=!0}addFurniture(t){const e=`f_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,i=function(t,e,i,s){return{id:s,type:t.type,icon:t.icon,label:t.label,x:Math.max(0,(e-t.defaultWidth)/2),y:Math.max(0,(i-t.defaultHeight)/2),width:t.defaultWidth,height:t.defaultHeight,rotation:0,lockAspect:t.lockAspect??"icon"===t.type}}(t,this.host._roomWidth,this.host._roomDepth,e);this.host._furniture=[...this.host._furniture,i],this.host._selectedFurnitureId=i.id,this.host._dirty=!0}addCustomFurniture(t){this.addFurniture({type:"icon",icon:t,label:"furniture.custom",defaultWidth:600,defaultHeight:600,lockAspect:!1})}removeFurniture(t){this.host._furniture=function(t,e){return t.filter(t=>t.id!==e)}(this.host._furniture,t),this.host._selectedFurnitureId===t&&(this.host._selectedFurnitureId=null),this.host._dirty=!0}updateFurniture(t,e){this.host._furniture=function(t,e,i){return t.map(t=>t.id===e?{...t,...i}:t)}(this.host._furniture,t,e),this.host._dirty=!0}onFurniturePointerDown(t,e,i,s,o){t.preventDefault(),t.stopPropagation(),this.host._selectedFurnitureId=e;const r=this.host._furniture.find(t=>t.id===e);if(!r)return;const n=o??r.rotation;let a=0,l=0,c=0;if("rotate"===i){const i=this.host.shadowRoot?.querySelector("epp-grid")?.shadowRoot?.querySelector("epp-furniture-overlay")?.shadowRoot?.querySelector(`.furniture-item[data-id="${e}"]`);if(i){const e=i.getBoundingClientRect();a=e.left+e.width/2,l=e.top+e.height/2,c=Math.atan2(t.clientY-l,t.clientX-a)*(180/Math.PI)}}this.host._dragState={type:i,id:e,startX:t.clientX,startY:t.clientY,origX:r.x,origY:r.y,origW:r.width,origH:r.height,origRot:n,handle:s,centerX:a,centerY:l,startAngle:c};const h=t=>this.onFurnitureDrag(t),d=()=>{this.host._dragState=null,window.removeEventListener("pointermove",h),window.removeEventListener("pointerup",d)};window.addEventListener("pointermove",h),window.addEventListener("pointerup",d)}onFurnitureDrag(t){if(!this.host._dragState)return;const e=this.host._dragState,i=this.host.shadowRoot?.querySelector("epp-grid")?.shadowRoot?.querySelector(".grid");if(!i)return;const s=i.firstElementChild?i.firstElementChild.offsetWidth:28,o=t.clientX-e.startX,r=t.clientY-e.startY;if("move"===e.type){const t=this.host._furniture.find(t=>t.id===e.id),i=this.host._getVisibleRoomBounds(),n=Math.ceil(this.host._roomWidth/qe),a=Math.floor((Ve-n)/2),l=(i.minCol-a)*qe,c=(i.maxCol+1-a)*qe,h=i.minRow*qe,d=(i.maxRow+1)*qe,A=function(t,e,i,s,o,r,n,a,l,c,h,d){const A=mi(i,o),g=mi(s,o),u=d*Math.PI/180,_=Math.abs(Math.cos(u)),p=Math.abs(Math.sin(u)),f=(r*_+n*p-r)/2,w=(r*p+n*_-n)/2;return{x:Math.max(a+f,Math.min(l-r-f,t+A)),y:Math.max(c+w,Math.min(h-n-w,e+g))}}(e.origX,e.origY,o,r,s,t?.width??0,t?.height??0,l,c,h,d,e.origRot);this.updateFurniture(e.id,A)}else if("resize"===e.type&&e.handle){const t=this.host._furniture.find(t=>t.id===e.id),i=function(t,e,i,s,o,r,n,a,l,c){const h=c*Math.PI/180,d=Math.cos(h),A=Math.sin(h),g=-e*A+i*d,u=mi(e*d+i*A,s),_=mi(g,s),p=t.includes("e")?1:t.includes("w")?-1:0,f=t.includes("s")?1:t.includes("n")?-1:0;let w=n,E=a;if(l){const t=Math.abs(u)>Math.abs(_)?u:_,e=n/a,i=p<0||f<0?-1:1;w=Math.max(100,n+i*t),E=Math.max(100,w/e),w=E*e}else 0!==p&&(w=Math.max(100,n+p*u)),0!==f&&(E=Math.max(100,a+f*_));const m=w-n,b=E-a,y=p*m/2,v=f*b/2;return{x:o-m/2+(y*d-v*A),y:r-b/2+(y*A+v*d),width:w,height:E}}(e.handle,o,r,s,e.origX,e.origY,e.origW,e.origH,t?.lockAspect??!1,e.origRot);this.updateFurniture(e.id,i)}else if("rotate"===e.type){const i=Math.atan2(t.clientY-(e.centerY??0),t.clientX-(e.centerX??0))*(180/Math.PI);this.updateFurniture(e.id,{rotation:bi(e.origRot,e.startAngle??0,i)})}}async fetchConfigurations(){try{const t=(await this.host.hass.callWS({type:"eppgrid/list_configurations"})).configurations||{};this.configurations=Object.entries(t).map(([t,e])=>({...e,name:t}))}catch{this.configurations=[]}}async saveConfiguration(){const t=this.host._configurationName.trim();if(!t)return;const e=this.host._zoneConfigs.map((t,e)=>Ms(t,e)),i={grid:Array.from(this.host._grid),zones:e,roomWidth:this.host._roomWidth,roomDepth:this.host._roomDepth,furniture:this.host._furniture.map(t=>({...t})),settings:this.host._buildSparseSettings()};await this.host.hass.callWS({type:"eppgrid/save_configuration",name:t,configuration:i}),this.host._showConfigurationBackup=!1,this.host._configurationName="",await this.fetchConfigurations()}async loadConfiguration(t){const e=this.configurations.find(e=>e.name===t);if(!e)return;const i=e.zones||[],s=t=>null===t||null!=t&&"object"==typeof t&&"string"==typeof t.name&&"string"==typeof t.color&&"string"==typeof t.type,o=new Error(`Configuration "${t}" is in an old format — please re-save it`);if(8!==i.length)throw o;if(!(t=>null!=t&&"object"==typeof t&&"string"==typeof t.type)(i[0]))throw o;for(let t=1;t<8;t++)if(!s(i[t]))throw o;const r={grid:this.host._grid,zoneConfigs:this.host._zoneConfigs,roomWidth:this.host._roomWidth,roomDepth:this.host._roomDepth,furniture:this.host._furniture,showConfigurationRestore:this.host._showConfigurationRestore,dirty:this.host._dirty,settings:new Map},n=new Uint8Array(e.grid),a=ci(this.host._grid),l=ci(n);if(this.host._grid=function(t,e){const i=ci(t),s=ci(e);if(!s)return console.warn("[eppgrid] alignTemplateGrid: current grid has no inside-room cells; falling back to verbatim template copy"),new Uint8Array(t);const o=new Uint8Array(Xe);for(let t=0;t<Xe;t++)o[t]=1&e[t];i||console.warn("[eppgrid] alignTemplateGrid: template has no inside-room cells; falling back to offset (0,0)");const{dr:r,dc:n}=hi(t,e,i,s);for(let e=0;e<Ze;e++)for(let s=0;s<Ve;s++){const a=t[e*Ve+s];if(i&&!(1&a))continue;const l=62&a;if(0===l)continue;const c=e+r,h=s+n;if(c<0||c>=Ze||h<0||h>=Ve)continue;const d=c*Ve+h;1&o[d]&&(o[d]|=l)}return o}(n,this.host._grid),this.host._zoneConfigs=Array.from({length:8},(t,e)=>i[e]??null),a){const{dr:t,dc:i}=hi(n,this.host._grid,l,a),s=Math.ceil(e.roomWidth/qe),o=Math.ceil(this.host._roomWidth/qe),r=(i+Math.floor((Ve-s)/2)-Math.floor((Ve-o)/2))*qe,c=t*qe;this.host._furniture=(e.furniture||[]).map(t=>({...t,x:t.x+r,y:t.y+c}))}else this.host._roomWidth=e.roomWidth,this.host._roomDepth=e.roomDepth,this.host._furniture=(e.furniture||[]).map(t=>({...t}));const c=e.settings,h=null!=c&&"object"==typeof c;if(h)for(const[t,e]of xs)if(r.settings.set(e,this.host[e]),"entities"===t){const t="entities"in c?c.entities:void 0;this.host[e]={...Bs,...t||{}}}else this.host[e]=t in c?c[t]:Ss[t];if(this.host._showConfigurationRestore=!1,this.host._dirty=!0,h)try{await this.host.hass.callWS({type:"eppgrid/set_settings",mac:this.host._selectedMac,...this.host._buildSettingsPayload()})}catch(t){this.host._grid=r.grid,this.host._zoneConfigs=r.zoneConfigs,this.host._roomWidth=r.roomWidth,this.host._roomDepth=r.roomDepth,this.host._furniture=r.furniture,this.host._showConfigurationRestore=r.showConfigurationRestore,this.host._dirty=r.dirty;for(const[t,e]of r.settings)this.host[t]=e;throw this.host.requestUpdate(),t}await this.applyLayout()}async deleteConfiguration(t){await this.host.hass.callWS({type:"eppgrid/delete_configuration",name:t}),await this.fetchConfigurations(),this.host.requestUpdate()}async applyLayout(){const t=new Map;for(let e=0;e<this.host._grid.length;e++)if(ei(this.host._grid[e])){const i=ii(this.host._grid[e]);i>0&&t.set(i,(t.get(i)??0)+1)}const e=this.host._zoneConfigs.map((e,i)=>0===i?e:null!==e&&0===(t.get(i)??0)?null:e),i=li(this.host._grid);let s=this.host._furniture;if(i.minCol<=i.maxCol&&i.minRow<=i.maxRow){const t=Math.ceil(this.host._roomWidth/qe),e=Math.floor((Ve-t)/2),o=(i.minCol-e)*qe,r=(i.maxCol+1-e)*qe,n=i.minRow*qe,a=(i.maxRow+1)*qe;s=s.filter(t=>{return i=o,s=r,l=n,c=a,!((e=t).x+e.width<=i||e.x>=s||e.y+e.height<=l||e.y>=c);var e,i,s,l,c})}this.host._saving=!0;try{if(await this.host.hass.callWS({type:"eppgrid/set_room_layout",mac:this.host._selectedMac,grid_bytes:Array.from(this.host._grid),zone_slots:e.map((t,e)=>Ms(t,e)),furniture:s.map(t=>({type:t.type,icon:t.icon,label:t.label,x:t.x,y:t.y,width:t.width,height:t.height,rotation:t.rotation,lockAspect:t.lockAspect}))}),this.host._zoneConfigs=e,this.host._furniture=s,this.host._targetAutoDistance||this.host._staticAutoDistance){const t=Ji(this.host._roomWidth,this.host._roomDepth,this.host._perspective,this.host._grid),e=this.host._targetAutoDistance?t>0?Math.min(t,6):6:this.host._targetMaxDistance,i=this.host._staticAutoDistance?.3:this.host._staticMinDistance,s=this.host._staticAutoDistance?t>0?Math.min(t,16):16:this.host._staticMaxDistance;await this.host.hass.callWS({type:"eppgrid/set_settings",mac:this.host._selectedMac,temperature_offset:this.host._temperatureOffset,humidity_offset:this.host._humidityOffset,illuminance_offset:this.host._illuminanceOffset,motion_timeout:this.host._motionTimeout,target_auto_distance:this.host._targetAutoDistance,target_max_distance:e,stuck_target_timeout:this.host._stuckTargetTimeout,static_auto_distance:this.host._staticAutoDistance,static_min_distance:i,static_max_distance:s,static_trigger_threshold:this.host._staticTriggerThreshold,static_renew_threshold:this.host._staticRenewThreshold,static_timeout:this.host._staticTimeout,static_on_delay:this.host._staticOnDelay,led_mode:this.host._ledMode,led_brightness:this.host._ledBrightness,led_presence_color:this.host._ledPresenceColor,relay_trigger_mode:this.host._relayTriggerMode,relay_contact_mode:this.host._relayContactMode,entities:this.host._entitiesConfig||{}})}this.host._dirty=!1,this.host._selectedFurnitureId=null,this.host._overlayMode=null,this.host._view="live"}finally{this.host._saving=!1}}async saveSettings(t){this.host._saving=!0;try{await this.host.hass.callWS({type:"eppgrid/set_settings",mac:this.host._selectedMac,...t}),t.entities&&(this.host._entitiesConfig=t.entities),this.host._temperatureOffset=t.temperature_offset??this.host._temperatureOffset,this.host._humidityOffset=t.humidity_offset??this.host._humidityOffset,this.host._illuminanceOffset=t.illuminance_offset??this.host._illuminanceOffset,this.host._motionTimeout=t.motion_timeout??this.host._motionTimeout,this.host._staticTimeout=t.static_timeout??this.host._staticTimeout,this.host._staticTriggerThreshold=t.static_trigger_threshold??this.host._staticTriggerThreshold,this.host._staticRenewThreshold=t.static_renew_threshold??this.host._staticRenewThreshold,this.host._staticOnDelay=t.static_on_delay??this.host._staticOnDelay,this.host._logLevels=t.log_levels??this.host._logLevels,this.host._targetAutoDistance=t.target_auto_distance??this.host._targetAutoDistance,this.host._targetMaxDistance=t.target_max_distance??this.host._targetMaxDistance,this.host._stuckTargetTimeout=t.stuck_target_timeout??this.host._stuckTargetTimeout,this.host._staticAutoDistance=t.static_auto_distance??this.host._staticAutoDistance,this.host._staticMinDistance=t.static_min_distance??this.host._staticMinDistance,this.host._staticMaxDistance=t.static_max_distance??this.host._staticMaxDistance,this.host._ledMode=t.led_mode??this.host._ledMode,this.host._ledBrightness=t.led_brightness??this.host._ledBrightness,this.host._ledPresenceColor=t.led_presence_color??this.host._ledPresenceColor,this.host._relayTriggerMode=t.relay_trigger_mode??this.host._relayTriggerMode,this.host._relayContactMode=t.relay_contact_mode??this.host._relayContactMode,this.host._targetUpdateRateMs=t.target_update_rate_ms??this.host._targetUpdateRateMs,this.host._zoneUpdateRateMs=t.zone_update_rate_ms??this.host._zoneUpdateRateMs,this.host._dirty=!1,this.host._view="live"}catch(t){console.error("Failed to save settings:",t),this.onError?.("save_settings",t)}finally{this.host._saving=!1}}}function ks(){return{localZoneState:new Map,targetPrev:[null,null,null],targetGateCount:[0,0,0],targetPrevXY:[null,null,null],lastZone:[null,null,null],lastOnOverlay:[!1,!1,!1],staticState:"inactive",motionState:"inactive",staticPendingSince:null,motionPendingSince:null,sensorsEverActive:!1}}function Ts(t,e,i,s){for(let o=-1;o<=1;o++)for(let r=-1;r<=1;r++){const n=e+o,a=i+r;if(n<0||n>=Ze||a<0||a>=Ve)continue;const l=t[n*Ve+a];if(1===oi(l)&&ii(l)===s)return!0}return!1}class Fs{constructor(t){this._zoneEngineState=ks(),this._allZoneIdsCache=null,this._allZoneIdsCacheGrid=null,this.host=t,t.addController(this)}hostConnected(){}hostDisconnected(){}get zoneEngineState(){return this._zoneEngineState}set zoneEngineState(t){this._zoneEngineState=t}resetZoneEngineState(){this._zoneEngineState=ks()}handleTargetData(t){if("settings"===this.host._view){const e=this.host._sensorState,i=t.sensors,s={};return null==e.temperature&&null!=i.temperature&&(s.temperature=i.temperature),null==e.humidity&&null!=i.humidity&&(s.humidity=i.humidity),null==e.illuminance&&null!=i.illuminance&&(s.illuminance=i.illuminance),null==e.co2&&null!=i.co2&&(s.co2=i.co2),void(Object.keys(s).length>0&&(this.host._sensorState={...e,...s}))}this.host._targets=t.targets,this.host._sensorState=t.sensors,t.zones&&(this.host._zoneState={occupancy:t.zones.occupancy,target_counts:t.zones.target_counts,frame_count:t.zones.frame_count},this.host._showBackendDebugLog&&t.zones.debug_log&&this.appendBackendDebugLog(t.zones.debug_log))}handleRawTargetData(t){"settings"!==this.host._view&&(this.host._rawTargets=t)}runLocalZoneEngine(){const t=this.host._sensorState,e=this.host._zoneConfigs,i=ss(e[0]),s=function(t,e){const i=e.now??Date.now()/1e3,s=new Map,o=new Map,r=[null,null,null],n=[null,null,null];for(let i=0;i<3&&i<e.targets.length;i++){const a=e.targets[i];if(null==a.x||null==a.y){t.targetPrev[i]=null,t.targetGateCount[i]=0;continue}const l=a.signal;if(l<=0)continue;o.set(i,l);const c=Qi(a.x,a.y,e.roomWidth,e.roomDepth);if(!c){t.targetPrev[i]=null,t.targetGateCount[i]=0;continue}const h=Math.floor(c.col),d=Math.floor(c.row);if(h<0||h>=Ve||d<0||d>=Ze){t.targetPrev[i]=null,t.targetGateCount[i]=0;continue}const A=d*Ve+h,g=e.grid[A];if(!ei(g)){t.targetPrev[i]=null,t.targetGateCount[i]=0;continue}const u=oi(g);if(3===u){t.targetPrev[i]=null,t.targetGateCount[i]=0;continue}const _=2===u,p=ii(g);n[i]=p,t.lastZone[i]=p,t.lastOnOverlay[i]=1===u||Ts(e.grid,d,h,p);const f=t.targetPrev[i];if(null!==f){const t=f.row*Ve+f.col;t>=0&&t<Xe&&ei(e.grid[t])&&(r[i]=ii(e.grid[t]))}t.targetPrevXY[i]={x:a.x,y:a.y};let w=!1;null!==f&&(w=Math.max(Math.abs(h-f.col),Math.abs(d-f.row))<=5);const E=os(p,e.zoneConfigs,e.roomType,e.roomTrigger,e.roomRenew,e.roomTimeout,e.roomHandoffTimeout),{trigger:m,renew:b}=E,y=t.localZoneState.get(p),v=!y?.occupied;if(_&&!w&&v){t.targetPrev[i]=null,t.targetGateCount[i]=0;continue}let C=v?m:_?9:b;const B=1===u||Ts(e.grid,d,h,p);B&&v&&!_&&(C=1),B||w||!v?l>=C?(s.set(p,!0),y&&y.confirmedTargets.add(i),t.targetPrev[i]={col:h,row:d},t.targetGateCount[i]=0):t.targetPrev[i]={col:h,row:d}:l>=Math.min(C+2,8)?(t.targetGateCount[i]++,t.targetGateCount[i]>=2?(s.set(p,!0),y&&y.confirmedTargets.add(i),t.targetPrev[i]={col:h,row:d},t.targetGateCount[i]=0):t.targetPrev[i]={col:h,row:d}):(t.targetPrev[i]=null,t.targetGateCount[i]=0)}for(let s=0;s<3;s++){const o=r[s],a=n[s];if(null===o||null===a||o===a)continue;const l=t.localZoneState.get(o);if(l&&(l.confirmedTargets.delete(s),0===l.confirmedTargets.size&&l.occupied&&null===l.pendingSince)){const t=os(o,e.zoneConfigs,e.roomType,e.roomTrigger,e.roomRenew,e.roomTimeout,e.roomHandoffTimeout),{timeout:s,handoffTimeout:r}=t;l.pendingSince=i-(s-r)}}for(let s=0;s<3;s++){const o=s<e.targets.length?e.targets[s]:null,r=!o||null==o.x||null==o.y,a=!r&&null===n[s],l=t.lastZone[s];if((r||a)&&t.lastOnOverlay[s]&&null!==l){const o=t.localZoneState.get(l);if(o?.occupied){let t=0;for(const e of o.confirmedTargets)e!==s&&t++;if(0===t){const t=os(l,e.zoneConfigs,e.roomType,e.roomTrigger,e.roomRenew,e.roomTimeout,e.roomHandoffTimeout),s=i-(t.timeout-t.handoffTimeout);(null===o.pendingSince||o.pendingSince>s)&&(o.pendingSince=s)}}t.lastZone[s]=null,t.lastOnOverlay[s]=!1}}const a={},l=new Set;for(let t=0;t<e.grid.length;t++)ei(e.grid[t])&&l.add(ii(e.grid[t]));for(const o of l){let r=t.localZoneState.get(o);r||(r={occupied:!1,pendingSince:null,confirmedTargets:new Set},t.localZoneState.set(o,r));const n=os(o,e.zoneConfigs,e.roomType,e.roomTrigger,e.roomRenew,e.roomTimeout,e.roomHandoffTimeout),{timeout:l}=n,c=s.get(o)??!1;r.occupied?null===r.pendingSince?c||(r.pendingSince=i):c?r.pendingSince=null:i-r.pendingSince>=l&&(r.occupied=!1,r.pendingSince=null,r.confirmedTargets.clear()):c&&(r.occupied=!0,r.pendingSince=null),a[o]=r.occupied}for(const e of t.localZoneState.keys())l.has(e)||t.localZoneState.delete(e);const c=new Set;for(let t=0;t<3&&t<e.targets.length;t++)null!=e.targets[t].x&&null!=e.targets[t].y&&c.add(t);for(let i=0;i<3&&i<e.targets.length;i++)if(!c.has(i))for(const e of t.localZoneState.values())null===e.pendingSince&&e.confirmedTargets.delete(i);const h=e.staticPresence??!1,d=e.motionPresence??!1,A=e.staticTimeout??10,g=e.motionTimeout??10;if(h?(t.staticState="active",t.staticPendingSince=null,t.sensorsEverActive=!0):"active"===t.staticState?(t.staticState="pending",t.staticPendingSince=i):"pending"===t.staticState&&null!==t.staticPendingSince&&i-t.staticPendingSince>=A&&(t.staticState="inactive",t.staticPendingSince=null),d?(t.motionState="active",t.motionPendingSince=null,t.sensorsEverActive=!0):"active"===t.motionState?(t.motionState="pending",t.motionPendingSince=i):"pending"===t.motionState&&null!==t.motionPendingSince&&i-t.motionPendingSince>=g&&(t.motionState="inactive",t.motionPendingSince=null),t.sensorsEverActive&&"inactive"===t.staticState&&"inactive"===t.motionState){let e=!1;for(const[,i]of t.localZoneState)if(i.occupied&&null===i.pendingSince){e=!0;break}if(!e)for(const[e,i]of t.localZoneState)i.occupied&&null!==i.pendingSince&&(i.occupied=!1,i.pendingSince=null,i.confirmedTargets.clear(),a[e]=!1)}const u="inactive"!==t.staticState||"inactive"!==t.motionState||Object.values(a).some(t=>t);let _="inactive"!==t.staticState;if(!_)for(const[,e]of t.localZoneState)if(e.occupied&&null===e.pendingSince){_=!0;break}const p=[];for(let i=0;i<3&&i<e.targets.length;i++){const e=o.get(i)??0,s=null!==n[i];if(c.has(i)&&e>0&&s)p.push({status:"active"});else{let e=!1;if(!c.has(i)||!s)for(const[,s]of t.localZoneState)if(s.occupied&&null!==s.pendingSince&&s.confirmedTargets.has(i)){e=!0;break}p.push({status:e?"pending":"inactive"})}}return{occupancy:a,targets:p,staticState:t.staticState,motionState:t.motionState,sensorOccupancy:u,mmwave:_}}(this._zoneEngineState,{targets:this.host._targets,grid:this.host._grid,roomWidth:this.host._roomWidth,roomDepth:this.host._roomDepth,zoneConfigs:e.slice(1),roomType:i.type,roomTrigger:i.trigger,roomRenew:i.renew,roomTimeout:i.timeout,roomHandoffTimeout:i.handoff_timeout,staticPresence:t?.static_presence??!1,motionPresence:t?.motion_presence??!1,staticTimeout:this.host._staticTimeout,motionTimeout:this.host._motionTimeout});return this._zoneEngineState={...this._zoneEngineState,localZoneState:new Map(this._zoneEngineState.localZoneState)},this.host._showDebugLog&&this._buildFrontendDebugLog(s),s}enrichDebugLog(t){const e=this.host._localize,i=t=>{if(0===t)return e("live.debug.room");const i=this.host._zoneConfigs[t];return i&&"name"in i?i.name:e("live.debug.zone_n",{n:t})},s={A:e("live.debug.active"),P:e("live.debug.pending"),I:e("live.debug.inactive"),O:e("live.debug.occupied")},o=e("live.debug.static"),r=e("live.debug.motion"),n=e("live.debug.occ"),a=e("live.debug.on"),l=e("live.debug.off"),c=t.split("|");let h,d,A;c.length>=3?(h=c[0],d=c[1],A=c[2]):(h="",d=c[0]||"",A=c[1]||"");let g="";if(h.trim()){const t=h.trim().split(/\s+/),e=[];for(const i of t){const[t,c]=i.split(":");"S"===t?e.push(`${o}: ${s[c]??c}`):"M"===t?e.push(`${r}: ${s[c]??c}`):"Occ"===t&&e.push(`${n}: ${"1"===c?a:l}`)}g=e.join(", ")}const u=(d||"").trim().split(/\s+/).filter(Boolean).map(t=>{const[e,o,r,n]=t.split(":"),a=parseInt(o?.replace("Z","")??"0",10),l=Number.isFinite(a)?a:0;return`${e}→${i(l)}(${s[r]??r},${n})`}),_=(A||"").trim().split(/\s+/).filter(Boolean).map(t=>{const[e,o,r]=t.split(":"),n=parseInt(e?.replace("Z","")??"0",10),a=Number.isFinite(n)?n:0;return`${i(a)}: ${s[o]??o}(${r})`}),p=u.length?u.join(" "):e("live.debug.no_targets"),f=_.length?_.join(", "):e("live.debug.all_clear");return g?`${g} | ${p} | ${f}`:`${p} | ${f}`}computeHeatmapColors(){return function(t,e){const i=new Map;for(const[s,o]of Object.entries(t)){const t=Number(s);if(o<=0)continue;const r=Math.min(o,9)/9*.6;let n=100,a=180,l=255;if(t>0&&t<=7){const i=e[t-1];if(i){const t=Gi(i.color);n=t.r,a=t.g,l=t.b}}i.set(t,`rgba(${n}, ${a}, ${l}, ${r})`)}return i}(this.host._zoneState.target_counts,this.host._zoneConfigs.slice(1))}_appendLog(t,e,i,s){if(t===this.host[e])return;this.host[e]=t;const o=`${(new Date).toLocaleTimeString(this.host._localize?.lang??"en-GB",{hour12:!1,hour:"2-digit",minute:"2-digit",second:"2-digit",fractionalSecondDigits:1})} ${t}`;this.host[i].push(o),this.host[i].length>100&&(this.host[i]=this.host[i].slice(-100)),this._appendToLogContainer(s,o)}appendBackendDebugLog(t){let e=t;if(t.split("|").length<3){const i=this.host._sensorState;e=`S:${i?.static_presence?"A":"I"} M:${i?.motion_presence?"A":"I"} Occ:${i?.occupancy?"1":"0"}|${t}`}const i=this.enrichDebugLog(e);this._appendLog(i,"_backendDebugLogPrev","_backendDebugLogLines","backend-debug-log-scroll")}_appendFrontendDebugLog(t){this._appendLog(t,"_debugLogPrev","_debugLogLines","debug-log-scroll")}_appendToLogContainer(t,e){const i=this.host.shadowRoot?.getElementById(t);if(!i)return;1!==i.children.length||i.children[0].classList.contains("debug-log-line")||(i.innerHTML="");const s=document.createElement("div");for(s.className="debug-log-line",s.textContent=e,i.appendChild(s);i.children.length>100;)i.firstChild?.remove();i.scrollTop=i.scrollHeight}_computeAllZoneIds(t){const e=new Set;for(let i=0;i<t.length;i++)ei(t[i])&&e.add(ii(t[i]));return e}_getAllZoneIds(){const t=this.host._grid;if(null!==this._allZoneIdsCache&&this._allZoneIdsCacheGrid===t)return this._allZoneIdsCache;const e=this._computeAllZoneIds(t);return this._allZoneIdsCache=e,this._allZoneIdsCacheGrid=t,e}_buildFrontendDebugLog(t){const e=[null,null,null];for(let t=0;t<3&&t<this.host._targets.length;t++){const i=this.host._targets[t];if(null==i.x||null==i.y||i.signal<=0)continue;const s=Qi(i.x,i.y,this.host._roomWidth,this.host._roomDepth);if(!s)continue;const o=Math.floor(s.col),r=Math.floor(s.row);if(o<0||o>=Ve||r<0||r>=Ze)continue;const n=r*Ve+o;ei(this.host._grid[n])&&(e[t]=ii(this.host._grid[n]))}const i=new Map;for(let t=0;t<3&&t<this.host._targets.length;t++){const s=this.host._targets[t];if(null==s.x||null==s.y||s.signal<=0)continue;const o=e[t];null!==o&&i.set(o,Math.max(i.get(o)??0,s.signal))}const s=[];for(let i=0;i<3&&i<this.host._targets.length;i++){const o=this.host._targets[i];if(null==o.x||null==o.y)continue;const r=o.signal;if(r<=0)continue;const n=e[i],a="pending"===t.targets[i]?.status?"P":"A";s.push(`T${i}:Z${n??0}:${a}:${r}`)}const o=this._getAllZoneIds(),r=[];for(const t of o){const e=this._zoneEngineState.localZoneState.get(t);if(e?.occupied){const s=null!==e.pendingSince?"P":"O";r.push(`Z${t}:${s}:${i.get(t)??0}`)}}const n=`${`S:${"active"===t.staticState?"A":"pending"===t.staticState?"P":"I"} M:${"active"===t.motionState?"A":"pending"===t.motionState?"P":"I"} Occ:${t.sensorOccupancy?"1":"0"}`}|${s.join(" ")}|${r.join(" ")}`,a=this.enrichDebugLog(n);this._appendFrontendDebugLog(a)}}const Ps="https://clintongormley.github.io/everything-presence-pro-grid/",Us={live:"user-guide/live-overview/",settings:"user-guide/settings/",tutorial:"user-guide/calibration/",calibrate:"user-guide/calibration/"},Os={zones:"user-guide/detection-zones/",overlays:"user-guide/overlays/",furniture:"user-guide/furniture/"};class zs extends Error{}
/*! pako 2.1.0 https://github.com/nodeca/pako @license (MIT AND Zlib) */function Qs(t){let e=t.length;for(;--e>=0;)t[e]=0}const Hs=256,Gs=286,Ls=30,Ns=15,$s=new Uint8Array([0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0]),Ys=new Uint8Array([0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13]),Ks=new Uint8Array([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7]),Js=new Uint8Array([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]),Ws=new Array(576);Qs(Ws);const js=new Array(60);Qs(js);const Vs=new Array(512);Qs(Vs);const Zs=new Array(256);Qs(Zs);const Xs=new Array(29);Qs(Xs);const qs=new Array(Ls);function to(t,e,i,s,o){this.static_tree=t,this.extra_bits=e,this.extra_base=i,this.elems=s,this.max_length=o,this.has_stree=t&&t.length}let eo,io,so;function oo(t,e){this.dyn_tree=t,this.max_code=0,this.stat_desc=e}Qs(qs);const ro=t=>t<256?Vs[t]:Vs[256+(t>>>7)],no=(t,e)=>{t.pending_buf[t.pending++]=255&e,t.pending_buf[t.pending++]=e>>>8&255},ao=(t,e,i)=>{t.bi_valid>16-i?(t.bi_buf|=e<<t.bi_valid&65535,no(t,t.bi_buf),t.bi_buf=e>>16-t.bi_valid,t.bi_valid+=i-16):(t.bi_buf|=e<<t.bi_valid&65535,t.bi_valid+=i)},lo=(t,e,i)=>{ao(t,i[2*e],i[2*e+1])},co=(t,e)=>{let i=0;do{i|=1&t,t>>>=1,i<<=1}while(--e>0);return i>>>1},ho=(t,e,i)=>{const s=new Array(16);let o,r,n=0;for(o=1;o<=Ns;o++)n=n+i[o-1]<<1,s[o]=n;for(r=0;r<=e;r++){let e=t[2*r+1];0!==e&&(t[2*r]=co(s[e]++,e))}},Ao=t=>{let e;for(e=0;e<Gs;e++)t.dyn_ltree[2*e]=0;for(e=0;e<Ls;e++)t.dyn_dtree[2*e]=0;for(e=0;e<19;e++)t.bl_tree[2*e]=0;t.dyn_ltree[512]=1,t.opt_len=t.static_len=0,t.sym_next=t.matches=0},go=t=>{t.bi_valid>8?no(t,t.bi_buf):t.bi_valid>0&&(t.pending_buf[t.pending++]=t.bi_buf),t.bi_buf=0,t.bi_valid=0},uo=(t,e,i,s)=>{const o=2*e,r=2*i;return t[o]<t[r]||t[o]===t[r]&&s[e]<=s[i]},_o=(t,e,i)=>{const s=t.heap[i];let o=i<<1;for(;o<=t.heap_len&&(o<t.heap_len&&uo(e,t.heap[o+1],t.heap[o],t.depth)&&o++,!uo(e,s,t.heap[o],t.depth));)t.heap[i]=t.heap[o],i=o,o<<=1;t.heap[i]=s},po=(t,e,i)=>{let s,o,r,n,a=0;if(0!==t.sym_next)do{s=255&t.pending_buf[t.sym_buf+a++],s+=(255&t.pending_buf[t.sym_buf+a++])<<8,o=t.pending_buf[t.sym_buf+a++],0===s?lo(t,o,e):(r=Zs[o],lo(t,r+Hs+1,e),n=$s[r],0!==n&&(o-=Xs[r],ao(t,o,n)),s--,r=ro(s),lo(t,r,i),n=Ys[r],0!==n&&(s-=qs[r],ao(t,s,n)))}while(a<t.sym_next);lo(t,256,e)},fo=(t,e)=>{const i=e.dyn_tree,s=e.stat_desc.static_tree,o=e.stat_desc.has_stree,r=e.stat_desc.elems;let n,a,l,c=-1;for(t.heap_len=0,t.heap_max=573,n=0;n<r;n++)0!==i[2*n]?(t.heap[++t.heap_len]=c=n,t.depth[n]=0):i[2*n+1]=0;for(;t.heap_len<2;)l=t.heap[++t.heap_len]=c<2?++c:0,i[2*l]=1,t.depth[l]=0,t.opt_len--,o&&(t.static_len-=s[2*l+1]);for(e.max_code=c,n=t.heap_len>>1;n>=1;n--)_o(t,i,n);l=r;do{n=t.heap[1],t.heap[1]=t.heap[t.heap_len--],_o(t,i,1),a=t.heap[1],t.heap[--t.heap_max]=n,t.heap[--t.heap_max]=a,i[2*l]=i[2*n]+i[2*a],t.depth[l]=(t.depth[n]>=t.depth[a]?t.depth[n]:t.depth[a])+1,i[2*n+1]=i[2*a+1]=l,t.heap[1]=l++,_o(t,i,1)}while(t.heap_len>=2);t.heap[--t.heap_max]=t.heap[1],((t,e)=>{const i=e.dyn_tree,s=e.max_code,o=e.stat_desc.static_tree,r=e.stat_desc.has_stree,n=e.stat_desc.extra_bits,a=e.stat_desc.extra_base,l=e.stat_desc.max_length;let c,h,d,A,g,u,_=0;for(A=0;A<=Ns;A++)t.bl_count[A]=0;for(i[2*t.heap[t.heap_max]+1]=0,c=t.heap_max+1;c<573;c++)h=t.heap[c],A=i[2*i[2*h+1]+1]+1,A>l&&(A=l,_++),i[2*h+1]=A,h>s||(t.bl_count[A]++,g=0,h>=a&&(g=n[h-a]),u=i[2*h],t.opt_len+=u*(A+g),r&&(t.static_len+=u*(o[2*h+1]+g)));if(0!==_){do{for(A=l-1;0===t.bl_count[A];)A--;t.bl_count[A]--,t.bl_count[A+1]+=2,t.bl_count[l]--,_-=2}while(_>0);for(A=l;0!==A;A--)for(h=t.bl_count[A];0!==h;)d=t.heap[--c],d>s||(i[2*d+1]!==A&&(t.opt_len+=(A-i[2*d+1])*i[2*d],i[2*d+1]=A),h--)}})(t,e),ho(i,c,t.bl_count)},wo=(t,e,i)=>{let s,o,r=-1,n=e[1],a=0,l=7,c=4;for(0===n&&(l=138,c=3),e[2*(i+1)+1]=65535,s=0;s<=i;s++)o=n,n=e[2*(s+1)+1],++a<l&&o===n||(a<c?t.bl_tree[2*o]+=a:0!==o?(o!==r&&t.bl_tree[2*o]++,t.bl_tree[32]++):a<=10?t.bl_tree[34]++:t.bl_tree[36]++,a=0,r=o,0===n?(l=138,c=3):o===n?(l=6,c=3):(l=7,c=4))},Eo=(t,e,i)=>{let s,o,r=-1,n=e[1],a=0,l=7,c=4;for(0===n&&(l=138,c=3),s=0;s<=i;s++)if(o=n,n=e[2*(s+1)+1],!(++a<l&&o===n)){if(a<c)do{lo(t,o,t.bl_tree)}while(0!==--a);else 0!==o?(o!==r&&(lo(t,o,t.bl_tree),a--),lo(t,16,t.bl_tree),ao(t,a-3,2)):a<=10?(lo(t,17,t.bl_tree),ao(t,a-3,3)):(lo(t,18,t.bl_tree),ao(t,a-11,7));a=0,r=o,0===n?(l=138,c=3):o===n?(l=6,c=3):(l=7,c=4)}};let mo=!1;const bo=(t,e,i,s)=>{ao(t,0+(s?1:0),3),go(t),no(t,i),no(t,~i),i&&t.pending_buf.set(t.window.subarray(e,e+i),t.pending),t.pending+=i};var yo=t=>{mo||((()=>{let t,e,i,s,o;const r=new Array(16);for(i=0,s=0;s<28;s++)for(Xs[s]=i,t=0;t<1<<$s[s];t++)Zs[i++]=s;for(Zs[i-1]=s,o=0,s=0;s<16;s++)for(qs[s]=o,t=0;t<1<<Ys[s];t++)Vs[o++]=s;for(o>>=7;s<Ls;s++)for(qs[s]=o<<7,t=0;t<1<<Ys[s]-7;t++)Vs[256+o++]=s;for(e=0;e<=Ns;e++)r[e]=0;for(t=0;t<=143;)Ws[2*t+1]=8,t++,r[8]++;for(;t<=255;)Ws[2*t+1]=9,t++,r[9]++;for(;t<=279;)Ws[2*t+1]=7,t++,r[7]++;for(;t<=287;)Ws[2*t+1]=8,t++,r[8]++;for(ho(Ws,287,r),t=0;t<Ls;t++)js[2*t+1]=5,js[2*t]=co(t,5);eo=new to(Ws,$s,257,Gs,Ns),io=new to(js,Ys,0,Ls,Ns),so=new to(new Array(0),Ks,0,19,7)})(),mo=!0),t.l_desc=new oo(t.dyn_ltree,eo),t.d_desc=new oo(t.dyn_dtree,io),t.bl_desc=new oo(t.bl_tree,so),t.bi_buf=0,t.bi_valid=0,Ao(t)},vo=(t,e,i,s)=>{let o,r,n=0;t.level>0?(2===t.strm.data_type&&(t.strm.data_type=(t=>{let e,i=4093624447;for(e=0;e<=31;e++,i>>>=1)if(1&i&&0!==t.dyn_ltree[2*e])return 0;if(0!==t.dyn_ltree[18]||0!==t.dyn_ltree[20]||0!==t.dyn_ltree[26])return 1;for(e=32;e<Hs;e++)if(0!==t.dyn_ltree[2*e])return 1;return 0})(t)),fo(t,t.l_desc),fo(t,t.d_desc),n=(t=>{let e;for(wo(t,t.dyn_ltree,t.l_desc.max_code),wo(t,t.dyn_dtree,t.d_desc.max_code),fo(t,t.bl_desc),e=18;e>=3&&0===t.bl_tree[2*Js[e]+1];e--);return t.opt_len+=3*(e+1)+5+5+4,e})(t),o=t.opt_len+3+7>>>3,r=t.static_len+3+7>>>3,r<=o&&(o=r)):o=r=i+5,i+4<=o&&-1!==e?bo(t,e,i,s):4===t.strategy||r===o?(ao(t,2+(s?1:0),3),po(t,Ws,js)):(ao(t,4+(s?1:0),3),((t,e,i,s)=>{let o;for(ao(t,e-257,5),ao(t,i-1,5),ao(t,s-4,4),o=0;o<s;o++)ao(t,t.bl_tree[2*Js[o]+1],3);Eo(t,t.dyn_ltree,e-1),Eo(t,t.dyn_dtree,i-1)})(t,t.l_desc.max_code+1,t.d_desc.max_code+1,n+1),po(t,t.dyn_ltree,t.dyn_dtree)),Ao(t),s&&go(t)},Co=(t,e,i)=>(t.pending_buf[t.sym_buf+t.sym_next++]=e,t.pending_buf[t.sym_buf+t.sym_next++]=e>>8,t.pending_buf[t.sym_buf+t.sym_next++]=i,0===e?t.dyn_ltree[2*i]++:(t.matches++,e--,t.dyn_ltree[2*(Zs[i]+Hs+1)]++,t.dyn_dtree[2*ro(e)]++),t.sym_next===t.sym_end),Bo=t=>{ao(t,2,3),lo(t,256,Ws),(t=>{16===t.bi_valid?(no(t,t.bi_buf),t.bi_buf=0,t.bi_valid=0):t.bi_valid>=8&&(t.pending_buf[t.pending++]=255&t.bi_buf,t.bi_buf>>=8,t.bi_valid-=8)})(t)},So={_tr_init:yo,_tr_stored_block:bo,_tr_flush_block:vo,_tr_tally:Co,_tr_align:Bo};var Io=(t,e,i,s)=>{let o=65535&t,r=t>>>16&65535,n=0;for(;0!==i;){n=i>2e3?2e3:i,i-=n;do{o=o+e[s++]|0,r=r+o|0}while(--n);o%=65521,r%=65521}return o|r<<16};const xo=new Uint32Array((()=>{let t,e=[];for(var i=0;i<256;i++){t=i;for(var s=0;s<8;s++)t=1&t?3988292384^t>>>1:t>>>1;e[i]=t}return e})());var Do=(t,e,i,s)=>{const o=xo,r=s+i;t^=-1;for(let i=s;i<r;i++)t=t>>>8^o[255&(t^e[i])];return-1^t},Mo={2:"need dictionary",1:"stream end",0:"","-1":"file error","-2":"stream error","-3":"data error","-4":"insufficient memory","-5":"buffer error","-6":"incompatible version"},Ro={Z_NO_FLUSH:0,Z_PARTIAL_FLUSH:1,Z_SYNC_FLUSH:2,Z_FULL_FLUSH:3,Z_FINISH:4,Z_BLOCK:5,Z_TREES:6,Z_OK:0,Z_STREAM_END:1,Z_NEED_DICT:2,Z_STREAM_ERROR:-2,Z_DATA_ERROR:-3,Z_MEM_ERROR:-4,Z_BUF_ERROR:-5,Z_DEFAULT_COMPRESSION:-1,Z_FILTERED:1,Z_HUFFMAN_ONLY:2,Z_RLE:3,Z_FIXED:4,Z_DEFAULT_STRATEGY:0,Z_UNKNOWN:2,Z_DEFLATED:8};const{_tr_init:ko,_tr_stored_block:To,_tr_flush_block:Fo,_tr_tally:Po,_tr_align:Uo}=So,{Z_NO_FLUSH:Oo,Z_PARTIAL_FLUSH:zo,Z_FULL_FLUSH:Qo,Z_FINISH:Ho,Z_BLOCK:Go,Z_OK:Lo,Z_STREAM_END:No,Z_STREAM_ERROR:$o,Z_DATA_ERROR:Yo,Z_BUF_ERROR:Ko,Z_DEFAULT_COMPRESSION:Jo,Z_FILTERED:Wo,Z_HUFFMAN_ONLY:jo,Z_RLE:Vo,Z_FIXED:Zo,Z_DEFAULT_STRATEGY:Xo,Z_UNKNOWN:qo,Z_DEFLATED:tr}=Ro,er=258,ir=262,sr=42,or=113,rr=666,nr=(t,e)=>(t.msg=Mo[e],e),ar=t=>2*t-(t>4?9:0),lr=t=>{let e=t.length;for(;--e>=0;)t[e]=0},cr=t=>{let e,i,s,o=t.w_size;e=t.hash_size,s=e;do{i=t.head[--s],t.head[s]=i>=o?i-o:0}while(--e);e=o,s=e;do{i=t.prev[--s],t.prev[s]=i>=o?i-o:0}while(--e)};let hr=(t,e,i)=>(e<<t.hash_shift^i)&t.hash_mask;const dr=t=>{const e=t.state;let i=e.pending;i>t.avail_out&&(i=t.avail_out),0!==i&&(t.output.set(e.pending_buf.subarray(e.pending_out,e.pending_out+i),t.next_out),t.next_out+=i,e.pending_out+=i,t.total_out+=i,t.avail_out-=i,e.pending-=i,0===e.pending&&(e.pending_out=0))},Ar=(t,e)=>{Fo(t,t.block_start>=0?t.block_start:-1,t.strstart-t.block_start,e),t.block_start=t.strstart,dr(t.strm)},gr=(t,e)=>{t.pending_buf[t.pending++]=e},ur=(t,e)=>{t.pending_buf[t.pending++]=e>>>8&255,t.pending_buf[t.pending++]=255&e},_r=(t,e,i,s)=>{let o=t.avail_in;return o>s&&(o=s),0===o?0:(t.avail_in-=o,e.set(t.input.subarray(t.next_in,t.next_in+o),i),1===t.state.wrap?t.adler=Io(t.adler,e,o,i):2===t.state.wrap&&(t.adler=Do(t.adler,e,o,i)),t.next_in+=o,t.total_in+=o,o)},pr=(t,e)=>{let i,s,o=t.max_chain_length,r=t.strstart,n=t.prev_length,a=t.nice_match;const l=t.strstart>t.w_size-ir?t.strstart-(t.w_size-ir):0,c=t.window,h=t.w_mask,d=t.prev,A=t.strstart+er;let g=c[r+n-1],u=c[r+n];t.prev_length>=t.good_match&&(o>>=2),a>t.lookahead&&(a=t.lookahead);do{if(i=e,c[i+n]===u&&c[i+n-1]===g&&c[i]===c[r]&&c[++i]===c[r+1]){r+=2,i++;do{}while(c[++r]===c[++i]&&c[++r]===c[++i]&&c[++r]===c[++i]&&c[++r]===c[++i]&&c[++r]===c[++i]&&c[++r]===c[++i]&&c[++r]===c[++i]&&c[++r]===c[++i]&&r<A);if(s=er-(A-r),r=A-er,s>n){if(t.match_start=e,n=s,s>=a)break;g=c[r+n-1],u=c[r+n]}}}while((e=d[e&h])>l&&0!==--o);return n<=t.lookahead?n:t.lookahead},fr=t=>{const e=t.w_size;let i,s,o;do{if(s=t.window_size-t.lookahead-t.strstart,t.strstart>=e+(e-ir)&&(t.window.set(t.window.subarray(e,e+e-s),0),t.match_start-=e,t.strstart-=e,t.block_start-=e,t.insert>t.strstart&&(t.insert=t.strstart),cr(t),s+=e),0===t.strm.avail_in)break;if(i=_r(t.strm,t.window,t.strstart+t.lookahead,s),t.lookahead+=i,t.lookahead+t.insert>=3)for(o=t.strstart-t.insert,t.ins_h=t.window[o],t.ins_h=hr(t,t.ins_h,t.window[o+1]);t.insert&&(t.ins_h=hr(t,t.ins_h,t.window[o+3-1]),t.prev[o&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=o,o++,t.insert--,!(t.lookahead+t.insert<3)););}while(t.lookahead<ir&&0!==t.strm.avail_in)},wr=(t,e)=>{let i,s,o,r=t.pending_buf_size-5>t.w_size?t.w_size:t.pending_buf_size-5,n=0,a=t.strm.avail_in;do{if(i=65535,o=t.bi_valid+42>>3,t.strm.avail_out<o)break;if(o=t.strm.avail_out-o,s=t.strstart-t.block_start,i>s+t.strm.avail_in&&(i=s+t.strm.avail_in),i>o&&(i=o),i<r&&(0===i&&e!==Ho||e===Oo||i!==s+t.strm.avail_in))break;n=e===Ho&&i===s+t.strm.avail_in?1:0,To(t,0,0,n),t.pending_buf[t.pending-4]=i,t.pending_buf[t.pending-3]=i>>8,t.pending_buf[t.pending-2]=~i,t.pending_buf[t.pending-1]=~i>>8,dr(t.strm),s&&(s>i&&(s=i),t.strm.output.set(t.window.subarray(t.block_start,t.block_start+s),t.strm.next_out),t.strm.next_out+=s,t.strm.avail_out-=s,t.strm.total_out+=s,t.block_start+=s,i-=s),i&&(_r(t.strm,t.strm.output,t.strm.next_out,i),t.strm.next_out+=i,t.strm.avail_out-=i,t.strm.total_out+=i)}while(0===n);return a-=t.strm.avail_in,a&&(a>=t.w_size?(t.matches=2,t.window.set(t.strm.input.subarray(t.strm.next_in-t.w_size,t.strm.next_in),0),t.strstart=t.w_size,t.insert=t.strstart):(t.window_size-t.strstart<=a&&(t.strstart-=t.w_size,t.window.set(t.window.subarray(t.w_size,t.w_size+t.strstart),0),t.matches<2&&t.matches++,t.insert>t.strstart&&(t.insert=t.strstart)),t.window.set(t.strm.input.subarray(t.strm.next_in-a,t.strm.next_in),t.strstart),t.strstart+=a,t.insert+=a>t.w_size-t.insert?t.w_size-t.insert:a),t.block_start=t.strstart),t.high_water<t.strstart&&(t.high_water=t.strstart),n?4:e!==Oo&&e!==Ho&&0===t.strm.avail_in&&t.strstart===t.block_start?2:(o=t.window_size-t.strstart,t.strm.avail_in>o&&t.block_start>=t.w_size&&(t.block_start-=t.w_size,t.strstart-=t.w_size,t.window.set(t.window.subarray(t.w_size,t.w_size+t.strstart),0),t.matches<2&&t.matches++,o+=t.w_size,t.insert>t.strstart&&(t.insert=t.strstart)),o>t.strm.avail_in&&(o=t.strm.avail_in),o&&(_r(t.strm,t.window,t.strstart,o),t.strstart+=o,t.insert+=o>t.w_size-t.insert?t.w_size-t.insert:o),t.high_water<t.strstart&&(t.high_water=t.strstart),o=t.bi_valid+42>>3,o=t.pending_buf_size-o>65535?65535:t.pending_buf_size-o,r=o>t.w_size?t.w_size:o,s=t.strstart-t.block_start,(s>=r||(s||e===Ho)&&e!==Oo&&0===t.strm.avail_in&&s<=o)&&(i=s>o?o:s,n=e===Ho&&0===t.strm.avail_in&&i===s?1:0,To(t,t.block_start,i,n),t.block_start+=i,dr(t.strm)),n?3:1)},Er=(t,e)=>{let i,s;for(;;){if(t.lookahead<ir){if(fr(t),t.lookahead<ir&&e===Oo)return 1;if(0===t.lookahead)break}if(i=0,t.lookahead>=3&&(t.ins_h=hr(t,t.ins_h,t.window[t.strstart+3-1]),i=t.prev[t.strstart&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=t.strstart),0!==i&&t.strstart-i<=t.w_size-ir&&(t.match_length=pr(t,i)),t.match_length>=3)if(s=Po(t,t.strstart-t.match_start,t.match_length-3),t.lookahead-=t.match_length,t.match_length<=t.max_lazy_match&&t.lookahead>=3){t.match_length--;do{t.strstart++,t.ins_h=hr(t,t.ins_h,t.window[t.strstart+3-1]),i=t.prev[t.strstart&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=t.strstart}while(0!==--t.match_length);t.strstart++}else t.strstart+=t.match_length,t.match_length=0,t.ins_h=t.window[t.strstart],t.ins_h=hr(t,t.ins_h,t.window[t.strstart+1]);else s=Po(t,0,t.window[t.strstart]),t.lookahead--,t.strstart++;if(s&&(Ar(t,!1),0===t.strm.avail_out))return 1}return t.insert=t.strstart<2?t.strstart:2,e===Ho?(Ar(t,!0),0===t.strm.avail_out?3:4):t.sym_next&&(Ar(t,!1),0===t.strm.avail_out)?1:2},mr=(t,e)=>{let i,s,o;for(;;){if(t.lookahead<ir){if(fr(t),t.lookahead<ir&&e===Oo)return 1;if(0===t.lookahead)break}if(i=0,t.lookahead>=3&&(t.ins_h=hr(t,t.ins_h,t.window[t.strstart+3-1]),i=t.prev[t.strstart&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=t.strstart),t.prev_length=t.match_length,t.prev_match=t.match_start,t.match_length=2,0!==i&&t.prev_length<t.max_lazy_match&&t.strstart-i<=t.w_size-ir&&(t.match_length=pr(t,i),t.match_length<=5&&(t.strategy===Wo||3===t.match_length&&t.strstart-t.match_start>4096)&&(t.match_length=2)),t.prev_length>=3&&t.match_length<=t.prev_length){o=t.strstart+t.lookahead-3,s=Po(t,t.strstart-1-t.prev_match,t.prev_length-3),t.lookahead-=t.prev_length-1,t.prev_length-=2;do{++t.strstart<=o&&(t.ins_h=hr(t,t.ins_h,t.window[t.strstart+3-1]),i=t.prev[t.strstart&t.w_mask]=t.head[t.ins_h],t.head[t.ins_h]=t.strstart)}while(0!==--t.prev_length);if(t.match_available=0,t.match_length=2,t.strstart++,s&&(Ar(t,!1),0===t.strm.avail_out))return 1}else if(t.match_available){if(s=Po(t,0,t.window[t.strstart-1]),s&&Ar(t,!1),t.strstart++,t.lookahead--,0===t.strm.avail_out)return 1}else t.match_available=1,t.strstart++,t.lookahead--}return t.match_available&&(s=Po(t,0,t.window[t.strstart-1]),t.match_available=0),t.insert=t.strstart<2?t.strstart:2,e===Ho?(Ar(t,!0),0===t.strm.avail_out?3:4):t.sym_next&&(Ar(t,!1),0===t.strm.avail_out)?1:2};function br(t,e,i,s,o){this.good_length=t,this.max_lazy=e,this.nice_length=i,this.max_chain=s,this.func=o}const yr=[new br(0,0,0,0,wr),new br(4,4,8,4,Er),new br(4,5,16,8,Er),new br(4,6,32,32,Er),new br(4,4,16,16,mr),new br(8,16,32,32,mr),new br(8,16,128,128,mr),new br(8,32,128,256,mr),new br(32,128,258,1024,mr),new br(32,258,258,4096,mr)];function vr(){this.strm=null,this.status=0,this.pending_buf=null,this.pending_buf_size=0,this.pending_out=0,this.pending=0,this.wrap=0,this.gzhead=null,this.gzindex=0,this.method=tr,this.last_flush=-1,this.w_size=0,this.w_bits=0,this.w_mask=0,this.window=null,this.window_size=0,this.prev=null,this.head=null,this.ins_h=0,this.hash_size=0,this.hash_bits=0,this.hash_mask=0,this.hash_shift=0,this.block_start=0,this.match_length=0,this.prev_match=0,this.match_available=0,this.strstart=0,this.match_start=0,this.lookahead=0,this.prev_length=0,this.max_chain_length=0,this.max_lazy_match=0,this.level=0,this.strategy=0,this.good_match=0,this.nice_match=0,this.dyn_ltree=new Uint16Array(1146),this.dyn_dtree=new Uint16Array(122),this.bl_tree=new Uint16Array(78),lr(this.dyn_ltree),lr(this.dyn_dtree),lr(this.bl_tree),this.l_desc=null,this.d_desc=null,this.bl_desc=null,this.bl_count=new Uint16Array(16),this.heap=new Uint16Array(573),lr(this.heap),this.heap_len=0,this.heap_max=0,this.depth=new Uint16Array(573),lr(this.depth),this.sym_buf=0,this.lit_bufsize=0,this.sym_next=0,this.sym_end=0,this.opt_len=0,this.static_len=0,this.matches=0,this.insert=0,this.bi_buf=0,this.bi_valid=0}const Cr=t=>{if(!t)return 1;const e=t.state;return!e||e.strm!==t||e.status!==sr&&57!==e.status&&69!==e.status&&73!==e.status&&91!==e.status&&103!==e.status&&e.status!==or&&e.status!==rr?1:0},Br=t=>{if(Cr(t))return nr(t,$o);t.total_in=t.total_out=0,t.data_type=qo;const e=t.state;return e.pending=0,e.pending_out=0,e.wrap<0&&(e.wrap=-e.wrap),e.status=2===e.wrap?57:e.wrap?sr:or,t.adler=2===e.wrap?0:1,e.last_flush=-2,ko(e),Lo},Sr=t=>{const e=Br(t);return e===Lo&&(t=>{t.window_size=2*t.w_size,lr(t.head),t.max_lazy_match=yr[t.level].max_lazy,t.good_match=yr[t.level].good_length,t.nice_match=yr[t.level].nice_length,t.max_chain_length=yr[t.level].max_chain,t.strstart=0,t.block_start=0,t.lookahead=0,t.insert=0,t.match_length=t.prev_length=2,t.match_available=0,t.ins_h=0})(t.state),e},Ir=(t,e,i,s,o,r)=>{if(!t)return $o;let n=1;if(e===Jo&&(e=6),s<0?(n=0,s=-s):s>15&&(n=2,s-=16),o<1||o>9||i!==tr||s<8||s>15||e<0||e>9||r<0||r>Zo||8===s&&1!==n)return nr(t,$o);8===s&&(s=9);const a=new vr;return t.state=a,a.strm=t,a.status=sr,a.wrap=n,a.gzhead=null,a.w_bits=s,a.w_size=1<<a.w_bits,a.w_mask=a.w_size-1,a.hash_bits=o+7,a.hash_size=1<<a.hash_bits,a.hash_mask=a.hash_size-1,a.hash_shift=~~((a.hash_bits+3-1)/3),a.window=new Uint8Array(2*a.w_size),a.head=new Uint16Array(a.hash_size),a.prev=new Uint16Array(a.w_size),a.lit_bufsize=1<<o+6,a.pending_buf_size=4*a.lit_bufsize,a.pending_buf=new Uint8Array(a.pending_buf_size),a.sym_buf=a.lit_bufsize,a.sym_end=3*(a.lit_bufsize-1),a.level=e,a.strategy=r,a.method=i,Sr(t)};var xr=(t,e)=>{if(Cr(t)||e>Go||e<0)return t?nr(t,$o):$o;const i=t.state;if(!t.output||0!==t.avail_in&&!t.input||i.status===rr&&e!==Ho)return nr(t,0===t.avail_out?Ko:$o);const s=i.last_flush;if(i.last_flush=e,0!==i.pending){if(dr(t),0===t.avail_out)return i.last_flush=-1,Lo}else if(0===t.avail_in&&ar(e)<=ar(s)&&e!==Ho)return nr(t,Ko);if(i.status===rr&&0!==t.avail_in)return nr(t,Ko);if(i.status===sr&&0===i.wrap&&(i.status=or),i.status===sr){let e=tr+(i.w_bits-8<<4)<<8,s=-1;if(s=i.strategy>=jo||i.level<2?0:i.level<6?1:6===i.level?2:3,e|=s<<6,0!==i.strstart&&(e|=32),e+=31-e%31,ur(i,e),0!==i.strstart&&(ur(i,t.adler>>>16),ur(i,65535&t.adler)),t.adler=1,i.status=or,dr(t),0!==i.pending)return i.last_flush=-1,Lo}if(57===i.status)if(t.adler=0,gr(i,31),gr(i,139),gr(i,8),i.gzhead)gr(i,(i.gzhead.text?1:0)+(i.gzhead.hcrc?2:0)+(i.gzhead.extra?4:0)+(i.gzhead.name?8:0)+(i.gzhead.comment?16:0)),gr(i,255&i.gzhead.time),gr(i,i.gzhead.time>>8&255),gr(i,i.gzhead.time>>16&255),gr(i,i.gzhead.time>>24&255),gr(i,9===i.level?2:i.strategy>=jo||i.level<2?4:0),gr(i,255&i.gzhead.os),i.gzhead.extra&&i.gzhead.extra.length&&(gr(i,255&i.gzhead.extra.length),gr(i,i.gzhead.extra.length>>8&255)),i.gzhead.hcrc&&(t.adler=Do(t.adler,i.pending_buf,i.pending,0)),i.gzindex=0,i.status=69;else if(gr(i,0),gr(i,0),gr(i,0),gr(i,0),gr(i,0),gr(i,9===i.level?2:i.strategy>=jo||i.level<2?4:0),gr(i,3),i.status=or,dr(t),0!==i.pending)return i.last_flush=-1,Lo;if(69===i.status){if(i.gzhead.extra){let e=i.pending,s=(65535&i.gzhead.extra.length)-i.gzindex;for(;i.pending+s>i.pending_buf_size;){let o=i.pending_buf_size-i.pending;if(i.pending_buf.set(i.gzhead.extra.subarray(i.gzindex,i.gzindex+o),i.pending),i.pending=i.pending_buf_size,i.gzhead.hcrc&&i.pending>e&&(t.adler=Do(t.adler,i.pending_buf,i.pending-e,e)),i.gzindex+=o,dr(t),0!==i.pending)return i.last_flush=-1,Lo;e=0,s-=o}let o=new Uint8Array(i.gzhead.extra);i.pending_buf.set(o.subarray(i.gzindex,i.gzindex+s),i.pending),i.pending+=s,i.gzhead.hcrc&&i.pending>e&&(t.adler=Do(t.adler,i.pending_buf,i.pending-e,e)),i.gzindex=0}i.status=73}if(73===i.status){if(i.gzhead.name){let e,s=i.pending;do{if(i.pending===i.pending_buf_size){if(i.gzhead.hcrc&&i.pending>s&&(t.adler=Do(t.adler,i.pending_buf,i.pending-s,s)),dr(t),0!==i.pending)return i.last_flush=-1,Lo;s=0}e=i.gzindex<i.gzhead.name.length?255&i.gzhead.name.charCodeAt(i.gzindex++):0,gr(i,e)}while(0!==e);i.gzhead.hcrc&&i.pending>s&&(t.adler=Do(t.adler,i.pending_buf,i.pending-s,s)),i.gzindex=0}i.status=91}if(91===i.status){if(i.gzhead.comment){let e,s=i.pending;do{if(i.pending===i.pending_buf_size){if(i.gzhead.hcrc&&i.pending>s&&(t.adler=Do(t.adler,i.pending_buf,i.pending-s,s)),dr(t),0!==i.pending)return i.last_flush=-1,Lo;s=0}e=i.gzindex<i.gzhead.comment.length?255&i.gzhead.comment.charCodeAt(i.gzindex++):0,gr(i,e)}while(0!==e);i.gzhead.hcrc&&i.pending>s&&(t.adler=Do(t.adler,i.pending_buf,i.pending-s,s))}i.status=103}if(103===i.status){if(i.gzhead.hcrc){if(i.pending+2>i.pending_buf_size&&(dr(t),0!==i.pending))return i.last_flush=-1,Lo;gr(i,255&t.adler),gr(i,t.adler>>8&255),t.adler=0}if(i.status=or,dr(t),0!==i.pending)return i.last_flush=-1,Lo}if(0!==t.avail_in||0!==i.lookahead||e!==Oo&&i.status!==rr){let s=0===i.level?wr(i,e):i.strategy===jo?((t,e)=>{let i;for(;;){if(0===t.lookahead&&(fr(t),0===t.lookahead)){if(e===Oo)return 1;break}if(t.match_length=0,i=Po(t,0,t.window[t.strstart]),t.lookahead--,t.strstart++,i&&(Ar(t,!1),0===t.strm.avail_out))return 1}return t.insert=0,e===Ho?(Ar(t,!0),0===t.strm.avail_out?3:4):t.sym_next&&(Ar(t,!1),0===t.strm.avail_out)?1:2})(i,e):i.strategy===Vo?((t,e)=>{let i,s,o,r;const n=t.window;for(;;){if(t.lookahead<=er){if(fr(t),t.lookahead<=er&&e===Oo)return 1;if(0===t.lookahead)break}if(t.match_length=0,t.lookahead>=3&&t.strstart>0&&(o=t.strstart-1,s=n[o],s===n[++o]&&s===n[++o]&&s===n[++o])){r=t.strstart+er;do{}while(s===n[++o]&&s===n[++o]&&s===n[++o]&&s===n[++o]&&s===n[++o]&&s===n[++o]&&s===n[++o]&&s===n[++o]&&o<r);t.match_length=er-(r-o),t.match_length>t.lookahead&&(t.match_length=t.lookahead)}if(t.match_length>=3?(i=Po(t,1,t.match_length-3),t.lookahead-=t.match_length,t.strstart+=t.match_length,t.match_length=0):(i=Po(t,0,t.window[t.strstart]),t.lookahead--,t.strstart++),i&&(Ar(t,!1),0===t.strm.avail_out))return 1}return t.insert=0,e===Ho?(Ar(t,!0),0===t.strm.avail_out?3:4):t.sym_next&&(Ar(t,!1),0===t.strm.avail_out)?1:2})(i,e):yr[i.level].func(i,e);if(3!==s&&4!==s||(i.status=rr),1===s||3===s)return 0===t.avail_out&&(i.last_flush=-1),Lo;if(2===s&&(e===zo?Uo(i):e!==Go&&(To(i,0,0,!1),e===Qo&&(lr(i.head),0===i.lookahead&&(i.strstart=0,i.block_start=0,i.insert=0))),dr(t),0===t.avail_out))return i.last_flush=-1,Lo}return e!==Ho?Lo:i.wrap<=0?No:(2===i.wrap?(gr(i,255&t.adler),gr(i,t.adler>>8&255),gr(i,t.adler>>16&255),gr(i,t.adler>>24&255),gr(i,255&t.total_in),gr(i,t.total_in>>8&255),gr(i,t.total_in>>16&255),gr(i,t.total_in>>24&255)):(ur(i,t.adler>>>16),ur(i,65535&t.adler)),dr(t),i.wrap>0&&(i.wrap=-i.wrap),0!==i.pending?Lo:No)},Dr=(t,e)=>{let i=e.length;if(Cr(t))return $o;const s=t.state,o=s.wrap;if(2===o||1===o&&s.status!==sr||s.lookahead)return $o;if(1===o&&(t.adler=Io(t.adler,e,i,0)),s.wrap=0,i>=s.w_size){0===o&&(lr(s.head),s.strstart=0,s.block_start=0,s.insert=0);let t=new Uint8Array(s.w_size);t.set(e.subarray(i-s.w_size,i),0),e=t,i=s.w_size}const r=t.avail_in,n=t.next_in,a=t.input;for(t.avail_in=i,t.next_in=0,t.input=e,fr(s);s.lookahead>=3;){let t=s.strstart,e=s.lookahead-2;do{s.ins_h=hr(s,s.ins_h,s.window[t+3-1]),s.prev[t&s.w_mask]=s.head[s.ins_h],s.head[s.ins_h]=t,t++}while(--e);s.strstart=t,s.lookahead=2,fr(s)}return s.strstart+=s.lookahead,s.block_start=s.strstart,s.insert=s.lookahead,s.lookahead=0,s.match_length=s.prev_length=2,s.match_available=0,t.next_in=n,t.input=a,t.avail_in=r,s.wrap=o,Lo},Mr={deflateInit:(t,e)=>Ir(t,e,tr,15,8,Xo),deflateInit2:Ir,deflateReset:Sr,deflateResetKeep:Br,deflateSetHeader:(t,e)=>Cr(t)||2!==t.state.wrap?$o:(t.state.gzhead=e,Lo),deflate:xr,deflateEnd:t=>{if(Cr(t))return $o;const e=t.state.status;return t.state=null,e===or?nr(t,Yo):Lo},deflateSetDictionary:Dr,deflateInfo:"pako deflate (from Nodeca project)"};const Rr=(t,e)=>Object.prototype.hasOwnProperty.call(t,e);var kr=function(t){const e=Array.prototype.slice.call(arguments,1);for(;e.length;){const i=e.shift();if(i){if("object"!=typeof i)throw new TypeError(i+"must be non-object");for(const e in i)Rr(i,e)&&(t[e]=i[e])}}return t},Tr=t=>{let e=0;for(let i=0,s=t.length;i<s;i++)e+=t[i].length;const i=new Uint8Array(e);for(let e=0,s=0,o=t.length;e<o;e++){let o=t[e];i.set(o,s),s+=o.length}return i};let Fr=!0;try{String.fromCharCode.apply(null,new Uint8Array(1))}catch(t){Fr=!1}const Pr=new Uint8Array(256);for(let t=0;t<256;t++)Pr[t]=t>=252?6:t>=248?5:t>=240?4:t>=224?3:t>=192?2:1;Pr[254]=Pr[254]=1;var Ur=t=>{if("function"==typeof TextEncoder&&TextEncoder.prototype.encode)return(new TextEncoder).encode(t);let e,i,s,o,r,n=t.length,a=0;for(o=0;o<n;o++)i=t.charCodeAt(o),55296==(64512&i)&&o+1<n&&(s=t.charCodeAt(o+1),56320==(64512&s)&&(i=65536+(i-55296<<10)+(s-56320),o++)),a+=i<128?1:i<2048?2:i<65536?3:4;for(e=new Uint8Array(a),r=0,o=0;r<a;o++)i=t.charCodeAt(o),55296==(64512&i)&&o+1<n&&(s=t.charCodeAt(o+1),56320==(64512&s)&&(i=65536+(i-55296<<10)+(s-56320),o++)),i<128?e[r++]=i:i<2048?(e[r++]=192|i>>>6,e[r++]=128|63&i):i<65536?(e[r++]=224|i>>>12,e[r++]=128|i>>>6&63,e[r++]=128|63&i):(e[r++]=240|i>>>18,e[r++]=128|i>>>12&63,e[r++]=128|i>>>6&63,e[r++]=128|63&i);return e},Or=(t,e)=>{const i=e||t.length;if("function"==typeof TextDecoder&&TextDecoder.prototype.decode)return(new TextDecoder).decode(t.subarray(0,e));let s,o;const r=new Array(2*i);for(o=0,s=0;s<i;){let e=t[s++];if(e<128){r[o++]=e;continue}let n=Pr[e];if(n>4)r[o++]=65533,s+=n-1;else{for(e&=2===n?31:3===n?15:7;n>1&&s<i;)e=e<<6|63&t[s++],n--;n>1?r[o++]=65533:e<65536?r[o++]=e:(e-=65536,r[o++]=55296|e>>10&1023,r[o++]=56320|1023&e)}}return((t,e)=>{if(e<65534&&t.subarray&&Fr)return String.fromCharCode.apply(null,t.length===e?t:t.subarray(0,e));let i="";for(let s=0;s<e;s++)i+=String.fromCharCode(t[s]);return i})(r,o)},zr=(t,e)=>{(e=e||t.length)>t.length&&(e=t.length);let i=e-1;for(;i>=0&&128==(192&t[i]);)i--;return i<0||0===i?e:i+Pr[t[i]]>e?i:e};var Qr=function(){this.input=null,this.next_in=0,this.avail_in=0,this.total_in=0,this.output=null,this.next_out=0,this.avail_out=0,this.total_out=0,this.msg="",this.state=null,this.data_type=2,this.adler=0};const Hr=Object.prototype.toString,{Z_NO_FLUSH:Gr,Z_SYNC_FLUSH:Lr,Z_FULL_FLUSH:Nr,Z_FINISH:$r,Z_OK:Yr,Z_STREAM_END:Kr,Z_DEFAULT_COMPRESSION:Jr,Z_DEFAULT_STRATEGY:Wr,Z_DEFLATED:jr}=Ro;function Vr(t){this.options=kr({level:Jr,method:jr,chunkSize:16384,windowBits:15,memLevel:8,strategy:Wr},t||{});let e=this.options;e.raw&&e.windowBits>0?e.windowBits=-e.windowBits:e.gzip&&e.windowBits>0&&e.windowBits<16&&(e.windowBits+=16),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new Qr,this.strm.avail_out=0;let i=Mr.deflateInit2(this.strm,e.level,e.method,e.windowBits,e.memLevel,e.strategy);if(i!==Yr)throw new Error(Mo[i]);if(e.header&&Mr.deflateSetHeader(this.strm,e.header),e.dictionary){let t;if(t="string"==typeof e.dictionary?Ur(e.dictionary):"[object ArrayBuffer]"===Hr.call(e.dictionary)?new Uint8Array(e.dictionary):e.dictionary,i=Mr.deflateSetDictionary(this.strm,t),i!==Yr)throw new Error(Mo[i]);this._dict_set=!0}}Vr.prototype.push=function(t,e){const i=this.strm,s=this.options.chunkSize;let o,r;if(this.ended)return!1;for(r=e===~~e?e:!0===e?$r:Gr,"string"==typeof t?i.input=Ur(t):"[object ArrayBuffer]"===Hr.call(t)?i.input=new Uint8Array(t):i.input=t,i.next_in=0,i.avail_in=i.input.length;;)if(0===i.avail_out&&(i.output=new Uint8Array(s),i.next_out=0,i.avail_out=s),(r===Lr||r===Nr)&&i.avail_out<=6)this.onData(i.output.subarray(0,i.next_out)),i.avail_out=0;else{if(o=Mr.deflate(i,r),o===Kr)return i.next_out>0&&this.onData(i.output.subarray(0,i.next_out)),o=Mr.deflateEnd(this.strm),this.onEnd(o),this.ended=!0,o===Yr;if(0!==i.avail_out){if(r>0&&i.next_out>0)this.onData(i.output.subarray(0,i.next_out)),i.avail_out=0;else if(0===i.avail_in)break}else this.onData(i.output)}return!0},Vr.prototype.onData=function(t){this.chunks.push(t)},Vr.prototype.onEnd=function(t){t===Yr&&(this.result=Tr(this.chunks)),this.chunks=[],this.err=t,this.msg=this.strm.msg};var Zr={deflate:function(t,e){const i=new Vr(e);if(i.push(t,!0),i.err)throw i.msg||Mo[i.err];return i.result}};const Xr=16209;var qr=function(t,e){let i,s,o,r,n,a,l,c,h,d,A,g,u,_,p,f,w,E,m,b,y,v,C,B;const S=t.state;i=t.next_in,C=t.input,s=i+(t.avail_in-5),o=t.next_out,B=t.output,r=o-(e-t.avail_out),n=o+(t.avail_out-257),a=S.dmax,l=S.wsize,c=S.whave,h=S.wnext,d=S.window,A=S.hold,g=S.bits,u=S.lencode,_=S.distcode,p=(1<<S.lenbits)-1,f=(1<<S.distbits)-1;t:do{g<15&&(A+=C[i++]<<g,g+=8,A+=C[i++]<<g,g+=8),w=u[A&p];e:for(;;){if(E=w>>>24,A>>>=E,g-=E,E=w>>>16&255,0===E)B[o++]=65535&w;else{if(!(16&E)){if(64&E){if(32&E){S.mode=16191;break t}t.msg="invalid literal/length code",S.mode=Xr;break t}w=u[(65535&w)+(A&(1<<E)-1)];continue e}for(m=65535&w,E&=15,E&&(g<E&&(A+=C[i++]<<g,g+=8),m+=A&(1<<E)-1,A>>>=E,g-=E),g<15&&(A+=C[i++]<<g,g+=8,A+=C[i++]<<g,g+=8),w=_[A&f];;){if(E=w>>>24,A>>>=E,g-=E,E=w>>>16&255,16&E){if(b=65535&w,E&=15,g<E&&(A+=C[i++]<<g,g+=8,g<E&&(A+=C[i++]<<g,g+=8)),b+=A&(1<<E)-1,b>a){t.msg="invalid distance too far back",S.mode=Xr;break t}if(A>>>=E,g-=E,E=o-r,b>E){if(E=b-E,E>c&&S.sane){t.msg="invalid distance too far back",S.mode=Xr;break t}if(y=0,v=d,0===h){if(y+=l-E,E<m){m-=E;do{B[o++]=d[y++]}while(--E);y=o-b,v=B}}else if(h<E){if(y+=l+h-E,E-=h,E<m){m-=E;do{B[o++]=d[y++]}while(--E);if(y=0,h<m){E=h,m-=E;do{B[o++]=d[y++]}while(--E);y=o-b,v=B}}}else if(y+=h-E,E<m){m-=E;do{B[o++]=d[y++]}while(--E);y=o-b,v=B}for(;m>2;)B[o++]=v[y++],B[o++]=v[y++],B[o++]=v[y++],m-=3;m&&(B[o++]=v[y++],m>1&&(B[o++]=v[y++]))}else{y=o-b;do{B[o++]=B[y++],B[o++]=B[y++],B[o++]=B[y++],m-=3}while(m>2);m&&(B[o++]=B[y++],m>1&&(B[o++]=B[y++]))}break}if(64&E){t.msg="invalid distance code",S.mode=Xr;break t}w=_[(65535&w)+(A&(1<<E)-1)]}}break}}while(i<s&&o<n);m=g>>3,i-=m,g-=m<<3,A&=(1<<g)-1,t.next_in=i,t.next_out=o,t.avail_in=i<s?s-i+5:5-(i-s),t.avail_out=o<n?n-o+257:257-(o-n),S.hold=A,S.bits=g};const tn=15,en=new Uint16Array([3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,0,0]),sn=new Uint8Array([16,16,16,16,16,16,16,16,17,17,17,17,18,18,18,18,19,19,19,19,20,20,20,20,21,21,21,21,16,72,78]),on=new Uint16Array([1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577,0,0]),rn=new Uint8Array([16,16,16,16,17,17,18,18,19,19,20,20,21,21,22,22,23,23,24,24,25,25,26,26,27,27,28,28,29,29,64,64]);var nn=(t,e,i,s,o,r,n,a)=>{const l=a.bits;let c,h,d,A,g,u,_=0,p=0,f=0,w=0,E=0,m=0,b=0,y=0,v=0,C=0,B=null;const S=new Uint16Array(16),I=new Uint16Array(16);let x,D,M,R=null;for(_=0;_<=tn;_++)S[_]=0;for(p=0;p<s;p++)S[e[i+p]]++;for(E=l,w=tn;w>=1&&0===S[w];w--);if(E>w&&(E=w),0===w)return o[r++]=20971520,o[r++]=20971520,a.bits=1,0;for(f=1;f<w&&0===S[f];f++);for(E<f&&(E=f),y=1,_=1;_<=tn;_++)if(y<<=1,y-=S[_],y<0)return-1;if(y>0&&(0===t||1!==w))return-1;for(I[1]=0,_=1;_<tn;_++)I[_+1]=I[_]+S[_];for(p=0;p<s;p++)0!==e[i+p]&&(n[I[e[i+p]]++]=p);if(0===t?(B=R=n,u=20):1===t?(B=en,R=sn,u=257):(B=on,R=rn,u=0),C=0,p=0,_=f,g=r,m=E,b=0,d=-1,v=1<<E,A=v-1,1===t&&v>852||2===t&&v>592)return 1;for(;;){x=_-b,n[p]+1<u?(D=0,M=n[p]):n[p]>=u?(D=R[n[p]-u],M=B[n[p]-u]):(D=96,M=0),c=1<<_-b,h=1<<m,f=h;do{h-=c,o[g+(C>>b)+h]=x<<24|D<<16|M}while(0!==h);for(c=1<<_-1;C&c;)c>>=1;if(0!==c?(C&=c-1,C+=c):C=0,p++,0===--S[_]){if(_===w)break;_=e[i+n[p]]}if(_>E&&(C&A)!==d){for(0===b&&(b=E),g+=f,m=_-b,y=1<<m;m+b<w&&(y-=S[m+b],!(y<=0));)m++,y<<=1;if(v+=1<<m,1===t&&v>852||2===t&&v>592)return 1;d=C&A,o[d]=E<<24|m<<16|g-r}}return 0!==C&&(o[g+C]=_-b<<24|64<<16),a.bits=E,0};const{Z_FINISH:an,Z_BLOCK:ln,Z_TREES:cn,Z_OK:hn,Z_STREAM_END:dn,Z_NEED_DICT:An,Z_STREAM_ERROR:gn,Z_DATA_ERROR:un,Z_MEM_ERROR:_n,Z_BUF_ERROR:pn,Z_DEFLATED:fn}=Ro,wn=16180,En=16190,mn=16191,bn=16192,yn=16194,vn=16199,Cn=16200,Bn=16206,Sn=16209,In=t=>(t>>>24&255)+(t>>>8&65280)+((65280&t)<<8)+((255&t)<<24);function xn(){this.strm=null,this.mode=0,this.last=!1,this.wrap=0,this.havedict=!1,this.flags=0,this.dmax=0,this.check=0,this.total=0,this.head=null,this.wbits=0,this.wsize=0,this.whave=0,this.wnext=0,this.window=null,this.hold=0,this.bits=0,this.length=0,this.offset=0,this.extra=0,this.lencode=null,this.distcode=null,this.lenbits=0,this.distbits=0,this.ncode=0,this.nlen=0,this.ndist=0,this.have=0,this.next=null,this.lens=new Uint16Array(320),this.work=new Uint16Array(288),this.lendyn=null,this.distdyn=null,this.sane=0,this.back=0,this.was=0}const Dn=t=>{if(!t)return 1;const e=t.state;return!e||e.strm!==t||e.mode<wn||e.mode>16211?1:0},Mn=t=>{if(Dn(t))return gn;const e=t.state;return t.total_in=t.total_out=e.total=0,t.msg="",e.wrap&&(t.adler=1&e.wrap),e.mode=wn,e.last=0,e.havedict=0,e.flags=-1,e.dmax=32768,e.head=null,e.hold=0,e.bits=0,e.lencode=e.lendyn=new Int32Array(852),e.distcode=e.distdyn=new Int32Array(592),e.sane=1,e.back=-1,hn},Rn=t=>{if(Dn(t))return gn;const e=t.state;return e.wsize=0,e.whave=0,e.wnext=0,Mn(t)},kn=(t,e)=>{let i;if(Dn(t))return gn;const s=t.state;return e<0?(i=0,e=-e):(i=5+(e>>4),e<48&&(e&=15)),e&&(e<8||e>15)?gn:(null!==s.window&&s.wbits!==e&&(s.window=null),s.wrap=i,s.wbits=e,Rn(t))},Tn=(t,e)=>{if(!t)return gn;const i=new xn;t.state=i,i.strm=t,i.window=null,i.mode=wn;const s=kn(t,e);return s!==hn&&(t.state=null),s};let Fn,Pn,Un=!0;const On=t=>{if(Un){Fn=new Int32Array(512),Pn=new Int32Array(32);let e=0;for(;e<144;)t.lens[e++]=8;for(;e<256;)t.lens[e++]=9;for(;e<280;)t.lens[e++]=7;for(;e<288;)t.lens[e++]=8;for(nn(1,t.lens,0,288,Fn,0,t.work,{bits:9}),e=0;e<32;)t.lens[e++]=5;nn(2,t.lens,0,32,Pn,0,t.work,{bits:5}),Un=!1}t.lencode=Fn,t.lenbits=9,t.distcode=Pn,t.distbits=5},zn=(t,e,i,s)=>{let o;const r=t.state;return null===r.window&&(r.wsize=1<<r.wbits,r.wnext=0,r.whave=0,r.window=new Uint8Array(r.wsize)),s>=r.wsize?(r.window.set(e.subarray(i-r.wsize,i),0),r.wnext=0,r.whave=r.wsize):(o=r.wsize-r.wnext,o>s&&(o=s),r.window.set(e.subarray(i-s,i-s+o),r.wnext),(s-=o)?(r.window.set(e.subarray(i-s,i),0),r.wnext=s,r.whave=r.wsize):(r.wnext+=o,r.wnext===r.wsize&&(r.wnext=0),r.whave<r.wsize&&(r.whave+=o))),0};var Qn=(t,e)=>{let i,s,o,r,n,a,l,c,h,d,A,g,u,_,p,f,w,E,m,b,y,v,C=0;const B=new Uint8Array(4);let S,I;const x=new Uint8Array([16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15]);if(Dn(t)||!t.output||!t.input&&0!==t.avail_in)return gn;i=t.state,i.mode===mn&&(i.mode=bn),n=t.next_out,o=t.output,l=t.avail_out,r=t.next_in,s=t.input,a=t.avail_in,c=i.hold,h=i.bits,d=a,A=l,v=hn;t:for(;;)switch(i.mode){case wn:if(0===i.wrap){i.mode=bn;break}for(;h<16;){if(0===a)break t;a--,c+=s[r++]<<h,h+=8}if(2&i.wrap&&35615===c){0===i.wbits&&(i.wbits=15),i.check=0,B[0]=255&c,B[1]=c>>>8&255,i.check=Do(i.check,B,2,0),c=0,h=0,i.mode=16181;break}if(i.head&&(i.head.done=!1),!(1&i.wrap)||(((255&c)<<8)+(c>>8))%31){t.msg="incorrect header check",i.mode=Sn;break}if((15&c)!==fn){t.msg="unknown compression method",i.mode=Sn;break}if(c>>>=4,h-=4,y=8+(15&c),0===i.wbits&&(i.wbits=y),y>15||y>i.wbits){t.msg="invalid window size",i.mode=Sn;break}i.dmax=1<<i.wbits,i.flags=0,t.adler=i.check=1,i.mode=512&c?16189:mn,c=0,h=0;break;case 16181:for(;h<16;){if(0===a)break t;a--,c+=s[r++]<<h,h+=8}if(i.flags=c,(255&i.flags)!==fn){t.msg="unknown compression method",i.mode=Sn;break}if(57344&i.flags){t.msg="unknown header flags set",i.mode=Sn;break}i.head&&(i.head.text=c>>8&1),512&i.flags&&4&i.wrap&&(B[0]=255&c,B[1]=c>>>8&255,i.check=Do(i.check,B,2,0)),c=0,h=0,i.mode=16182;case 16182:for(;h<32;){if(0===a)break t;a--,c+=s[r++]<<h,h+=8}i.head&&(i.head.time=c),512&i.flags&&4&i.wrap&&(B[0]=255&c,B[1]=c>>>8&255,B[2]=c>>>16&255,B[3]=c>>>24&255,i.check=Do(i.check,B,4,0)),c=0,h=0,i.mode=16183;case 16183:for(;h<16;){if(0===a)break t;a--,c+=s[r++]<<h,h+=8}i.head&&(i.head.xflags=255&c,i.head.os=c>>8),512&i.flags&&4&i.wrap&&(B[0]=255&c,B[1]=c>>>8&255,i.check=Do(i.check,B,2,0)),c=0,h=0,i.mode=16184;case 16184:if(1024&i.flags){for(;h<16;){if(0===a)break t;a--,c+=s[r++]<<h,h+=8}i.length=c,i.head&&(i.head.extra_len=c),512&i.flags&&4&i.wrap&&(B[0]=255&c,B[1]=c>>>8&255,i.check=Do(i.check,B,2,0)),c=0,h=0}else i.head&&(i.head.extra=null);i.mode=16185;case 16185:if(1024&i.flags&&(g=i.length,g>a&&(g=a),g&&(i.head&&(y=i.head.extra_len-i.length,i.head.extra||(i.head.extra=new Uint8Array(i.head.extra_len)),i.head.extra.set(s.subarray(r,r+g),y)),512&i.flags&&4&i.wrap&&(i.check=Do(i.check,s,g,r)),a-=g,r+=g,i.length-=g),i.length))break t;i.length=0,i.mode=16186;case 16186:if(2048&i.flags){if(0===a)break t;g=0;do{y=s[r+g++],i.head&&y&&i.length<65536&&(i.head.name+=String.fromCharCode(y))}while(y&&g<a);if(512&i.flags&&4&i.wrap&&(i.check=Do(i.check,s,g,r)),a-=g,r+=g,y)break t}else i.head&&(i.head.name=null);i.length=0,i.mode=16187;case 16187:if(4096&i.flags){if(0===a)break t;g=0;do{y=s[r+g++],i.head&&y&&i.length<65536&&(i.head.comment+=String.fromCharCode(y))}while(y&&g<a);if(512&i.flags&&4&i.wrap&&(i.check=Do(i.check,s,g,r)),a-=g,r+=g,y)break t}else i.head&&(i.head.comment=null);i.mode=16188;case 16188:if(512&i.flags){for(;h<16;){if(0===a)break t;a--,c+=s[r++]<<h,h+=8}if(4&i.wrap&&c!==(65535&i.check)){t.msg="header crc mismatch",i.mode=Sn;break}c=0,h=0}i.head&&(i.head.hcrc=i.flags>>9&1,i.head.done=!0),t.adler=i.check=0,i.mode=mn;break;case 16189:for(;h<32;){if(0===a)break t;a--,c+=s[r++]<<h,h+=8}t.adler=i.check=In(c),c=0,h=0,i.mode=En;case En:if(0===i.havedict)return t.next_out=n,t.avail_out=l,t.next_in=r,t.avail_in=a,i.hold=c,i.bits=h,An;t.adler=i.check=1,i.mode=mn;case mn:if(e===ln||e===cn)break t;case bn:if(i.last){c>>>=7&h,h-=7&h,i.mode=Bn;break}for(;h<3;){if(0===a)break t;a--,c+=s[r++]<<h,h+=8}switch(i.last=1&c,c>>>=1,h-=1,3&c){case 0:i.mode=16193;break;case 1:if(On(i),i.mode=vn,e===cn){c>>>=2,h-=2;break t}break;case 2:i.mode=16196;break;case 3:t.msg="invalid block type",i.mode=Sn}c>>>=2,h-=2;break;case 16193:for(c>>>=7&h,h-=7&h;h<32;){if(0===a)break t;a--,c+=s[r++]<<h,h+=8}if((65535&c)!=(c>>>16^65535)){t.msg="invalid stored block lengths",i.mode=Sn;break}if(i.length=65535&c,c=0,h=0,i.mode=yn,e===cn)break t;case yn:i.mode=16195;case 16195:if(g=i.length,g){if(g>a&&(g=a),g>l&&(g=l),0===g)break t;o.set(s.subarray(r,r+g),n),a-=g,r+=g,l-=g,n+=g,i.length-=g;break}i.mode=mn;break;case 16196:for(;h<14;){if(0===a)break t;a--,c+=s[r++]<<h,h+=8}if(i.nlen=257+(31&c),c>>>=5,h-=5,i.ndist=1+(31&c),c>>>=5,h-=5,i.ncode=4+(15&c),c>>>=4,h-=4,i.nlen>286||i.ndist>30){t.msg="too many length or distance symbols",i.mode=Sn;break}i.have=0,i.mode=16197;case 16197:for(;i.have<i.ncode;){for(;h<3;){if(0===a)break t;a--,c+=s[r++]<<h,h+=8}i.lens[x[i.have++]]=7&c,c>>>=3,h-=3}for(;i.have<19;)i.lens[x[i.have++]]=0;if(i.lencode=i.lendyn,i.lenbits=7,S={bits:i.lenbits},v=nn(0,i.lens,0,19,i.lencode,0,i.work,S),i.lenbits=S.bits,v){t.msg="invalid code lengths set",i.mode=Sn;break}i.have=0,i.mode=16198;case 16198:for(;i.have<i.nlen+i.ndist;){for(;C=i.lencode[c&(1<<i.lenbits)-1],p=C>>>24,f=C>>>16&255,w=65535&C,!(p<=h);){if(0===a)break t;a--,c+=s[r++]<<h,h+=8}if(w<16)c>>>=p,h-=p,i.lens[i.have++]=w;else{if(16===w){for(I=p+2;h<I;){if(0===a)break t;a--,c+=s[r++]<<h,h+=8}if(c>>>=p,h-=p,0===i.have){t.msg="invalid bit length repeat",i.mode=Sn;break}y=i.lens[i.have-1],g=3+(3&c),c>>>=2,h-=2}else if(17===w){for(I=p+3;h<I;){if(0===a)break t;a--,c+=s[r++]<<h,h+=8}c>>>=p,h-=p,y=0,g=3+(7&c),c>>>=3,h-=3}else{for(I=p+7;h<I;){if(0===a)break t;a--,c+=s[r++]<<h,h+=8}c>>>=p,h-=p,y=0,g=11+(127&c),c>>>=7,h-=7}if(i.have+g>i.nlen+i.ndist){t.msg="invalid bit length repeat",i.mode=Sn;break}for(;g--;)i.lens[i.have++]=y}}if(i.mode===Sn)break;if(0===i.lens[256]){t.msg="invalid code -- missing end-of-block",i.mode=Sn;break}if(i.lenbits=9,S={bits:i.lenbits},v=nn(1,i.lens,0,i.nlen,i.lencode,0,i.work,S),i.lenbits=S.bits,v){t.msg="invalid literal/lengths set",i.mode=Sn;break}if(i.distbits=6,i.distcode=i.distdyn,S={bits:i.distbits},v=nn(2,i.lens,i.nlen,i.ndist,i.distcode,0,i.work,S),i.distbits=S.bits,v){t.msg="invalid distances set",i.mode=Sn;break}if(i.mode=vn,e===cn)break t;case vn:i.mode=Cn;case Cn:if(a>=6&&l>=258){t.next_out=n,t.avail_out=l,t.next_in=r,t.avail_in=a,i.hold=c,i.bits=h,qr(t,A),n=t.next_out,o=t.output,l=t.avail_out,r=t.next_in,s=t.input,a=t.avail_in,c=i.hold,h=i.bits,i.mode===mn&&(i.back=-1);break}for(i.back=0;C=i.lencode[c&(1<<i.lenbits)-1],p=C>>>24,f=C>>>16&255,w=65535&C,!(p<=h);){if(0===a)break t;a--,c+=s[r++]<<h,h+=8}if(f&&!(240&f)){for(E=p,m=f,b=w;C=i.lencode[b+((c&(1<<E+m)-1)>>E)],p=C>>>24,f=C>>>16&255,w=65535&C,!(E+p<=h);){if(0===a)break t;a--,c+=s[r++]<<h,h+=8}c>>>=E,h-=E,i.back+=E}if(c>>>=p,h-=p,i.back+=p,i.length=w,0===f){i.mode=16205;break}if(32&f){i.back=-1,i.mode=mn;break}if(64&f){t.msg="invalid literal/length code",i.mode=Sn;break}i.extra=15&f,i.mode=16201;case 16201:if(i.extra){for(I=i.extra;h<I;){if(0===a)break t;a--,c+=s[r++]<<h,h+=8}i.length+=c&(1<<i.extra)-1,c>>>=i.extra,h-=i.extra,i.back+=i.extra}i.was=i.length,i.mode=16202;case 16202:for(;C=i.distcode[c&(1<<i.distbits)-1],p=C>>>24,f=C>>>16&255,w=65535&C,!(p<=h);){if(0===a)break t;a--,c+=s[r++]<<h,h+=8}if(!(240&f)){for(E=p,m=f,b=w;C=i.distcode[b+((c&(1<<E+m)-1)>>E)],p=C>>>24,f=C>>>16&255,w=65535&C,!(E+p<=h);){if(0===a)break t;a--,c+=s[r++]<<h,h+=8}c>>>=E,h-=E,i.back+=E}if(c>>>=p,h-=p,i.back+=p,64&f){t.msg="invalid distance code",i.mode=Sn;break}i.offset=w,i.extra=15&f,i.mode=16203;case 16203:if(i.extra){for(I=i.extra;h<I;){if(0===a)break t;a--,c+=s[r++]<<h,h+=8}i.offset+=c&(1<<i.extra)-1,c>>>=i.extra,h-=i.extra,i.back+=i.extra}if(i.offset>i.dmax){t.msg="invalid distance too far back",i.mode=Sn;break}i.mode=16204;case 16204:if(0===l)break t;if(g=A-l,i.offset>g){if(g=i.offset-g,g>i.whave&&i.sane){t.msg="invalid distance too far back",i.mode=Sn;break}g>i.wnext?(g-=i.wnext,u=i.wsize-g):u=i.wnext-g,g>i.length&&(g=i.length),_=i.window}else _=o,u=n-i.offset,g=i.length;g>l&&(g=l),l-=g,i.length-=g;do{o[n++]=_[u++]}while(--g);0===i.length&&(i.mode=Cn);break;case 16205:if(0===l)break t;o[n++]=i.length,l--,i.mode=Cn;break;case Bn:if(i.wrap){for(;h<32;){if(0===a)break t;a--,c|=s[r++]<<h,h+=8}if(A-=l,t.total_out+=A,i.total+=A,4&i.wrap&&A&&(t.adler=i.check=i.flags?Do(i.check,o,A,n-A):Io(i.check,o,A,n-A)),A=l,4&i.wrap&&(i.flags?c:In(c))!==i.check){t.msg="incorrect data check",i.mode=Sn;break}c=0,h=0}i.mode=16207;case 16207:if(i.wrap&&i.flags){for(;h<32;){if(0===a)break t;a--,c+=s[r++]<<h,h+=8}if(4&i.wrap&&c!==(4294967295&i.total)){t.msg="incorrect length check",i.mode=Sn;break}c=0,h=0}i.mode=16208;case 16208:v=dn;break t;case Sn:v=un;break t;case 16210:return _n;default:return gn}return t.next_out=n,t.avail_out=l,t.next_in=r,t.avail_in=a,i.hold=c,i.bits=h,(i.wsize||A!==t.avail_out&&i.mode<Sn&&(i.mode<Bn||e!==an))&&zn(t,t.output,t.next_out,A-t.avail_out),d-=t.avail_in,A-=t.avail_out,t.total_in+=d,t.total_out+=A,i.total+=A,4&i.wrap&&A&&(t.adler=i.check=i.flags?Do(i.check,o,A,t.next_out-A):Io(i.check,o,A,t.next_out-A)),t.data_type=i.bits+(i.last?64:0)+(i.mode===mn?128:0)+(i.mode===vn||i.mode===yn?256:0),(0===d&&0===A||e===an)&&v===hn&&(v=pn),v},Hn={inflateReset:Rn,inflateReset2:kn,inflateResetKeep:Mn,inflateInit:t=>Tn(t,15),inflateInit2:Tn,inflate:Qn,inflateEnd:t=>{if(Dn(t))return gn;let e=t.state;return e.window&&(e.window=null),t.state=null,hn},inflateGetHeader:(t,e)=>{if(Dn(t))return gn;const i=t.state;return 2&i.wrap?(i.head=e,e.done=!1,hn):gn},inflateSetDictionary:(t,e)=>{const i=e.length;let s,o,r;return Dn(t)?gn:(s=t.state,0!==s.wrap&&s.mode!==En?gn:s.mode===En&&(o=1,o=Io(o,e,i,0),o!==s.check)?un:(r=zn(t,e,i,i),r?(s.mode=16210,_n):(s.havedict=1,hn)))},inflateInfo:"pako inflate (from Nodeca project)"};var Gn=function(){this.text=0,this.time=0,this.xflags=0,this.os=0,this.extra=null,this.extra_len=0,this.name="",this.comment="",this.hcrc=0,this.done=!1};const Ln=Object.prototype.toString,{Z_NO_FLUSH:Nn,Z_FINISH:$n,Z_OK:Yn,Z_STREAM_END:Kn,Z_NEED_DICT:Jn,Z_STREAM_ERROR:Wn,Z_DATA_ERROR:jn,Z_MEM_ERROR:Vn}=Ro;function Zn(t){this.options=kr({chunkSize:65536,windowBits:15,to:""},t||{});const e=this.options;e.raw&&e.windowBits>=0&&e.windowBits<16&&(e.windowBits=-e.windowBits,0===e.windowBits&&(e.windowBits=-15)),!(e.windowBits>=0&&e.windowBits<16)||t&&t.windowBits||(e.windowBits+=32),e.windowBits>15&&e.windowBits<48&&(15&e.windowBits||(e.windowBits|=15)),this.err=0,this.msg="",this.ended=!1,this.chunks=[],this.strm=new Qr,this.strm.avail_out=0;let i=Hn.inflateInit2(this.strm,e.windowBits);if(i!==Yn)throw new Error(Mo[i]);if(this.header=new Gn,Hn.inflateGetHeader(this.strm,this.header),e.dictionary&&("string"==typeof e.dictionary?e.dictionary=Ur(e.dictionary):"[object ArrayBuffer]"===Ln.call(e.dictionary)&&(e.dictionary=new Uint8Array(e.dictionary)),e.raw&&(i=Hn.inflateSetDictionary(this.strm,e.dictionary),i!==Yn)))throw new Error(Mo[i])}Zn.prototype.push=function(t,e){const i=this.strm,s=this.options.chunkSize,o=this.options.dictionary;let r,n,a;if(this.ended)return!1;for(n=e===~~e?e:!0===e?$n:Nn,"[object ArrayBuffer]"===Ln.call(t)?i.input=new Uint8Array(t):i.input=t,i.next_in=0,i.avail_in=i.input.length;;){for(0===i.avail_out&&(i.output=new Uint8Array(s),i.next_out=0,i.avail_out=s),r=Hn.inflate(i,n),r===Jn&&o&&(r=Hn.inflateSetDictionary(i,o),r===Yn?r=Hn.inflate(i,n):r===jn&&(r=Jn));i.avail_in>0&&r===Kn&&i.state.wrap>0&&0!==t[i.next_in];)Hn.inflateReset(i),r=Hn.inflate(i,n);switch(r){case Wn:case jn:case Jn:case Vn:return this.onEnd(r),this.ended=!0,!1}if(a=i.avail_out,i.next_out&&(0===i.avail_out||r===Kn))if("string"===this.options.to){let t=zr(i.output,i.next_out),e=i.next_out-t,o=Or(i.output,t);i.next_out=e,i.avail_out=s-e,e&&i.output.set(i.output.subarray(t,t+e),0),this.onData(o)}else this.onData(i.output.length===i.next_out?i.output:i.output.subarray(0,i.next_out));if(r!==Yn||0!==a){if(r===Kn)return r=Hn.inflateEnd(this.strm),this.onEnd(r),this.ended=!0,!0;if(0===i.avail_in)break}}return!0},Zn.prototype.onData=function(t){this.chunks.push(t)},Zn.prototype.onEnd=function(t){t===Yn&&("string"===this.options.to?this.result=this.chunks.join(""):this.result=Tr(this.chunks)),this.chunks=[],this.err=t,this.msg=this.strm.msg};var Xn={Inflate:Zn};const{deflate:qn}=Zr,{Inflate:ta}=Xn;var ea=qn,ia=ta;function sa(t,e,i=255){const s=t.length%e;if(0!==s){const o=new Uint8Array(e-s).fill(i),r=new Uint8Array(t.length+o.length);return r.set(t),r.set(o,t.length),r}return t}function oa(t,e=239){for(let i=0;i<t.length;i++)e^=t[i];return e}function ra(t){const e=new Uint8Array(t.length);for(let i=0;i<t.length;i++)e[i]=t.charCodeAt(i);return e}function na(t){return new Promise(e=>setTimeout(e,t))}class aa{constructor(t,e=!1,i=!0){this.device=t,this.tracing=e,this.slipReaderEnabled=!1,this.baudrate=0,this.traceLog="",this.lastTraceTime=Date.now(),this.buffer=new Uint8Array(0),this.onDeviceLostCallback=null,this.SLIP_END=192,this.SLIP_ESC=219,this.SLIP_ESC_END=220,this.SLIP_ESC_ESC=221,this._DTR_state=!1,this.slipReaderEnabled=i}setDeviceLostCallback(t){this.onDeviceLostCallback=t}updateDevice(t){this.device=t,this.trace("Device reference updated")}getInfo(){const t=this.device.getInfo();return t.usbVendorId&&t.usbProductId?`WebSerial VendorID 0x${t.usbVendorId.toString(16)} ProductID 0x${t.usbProductId.toString(16)}`:""}getPid(){return this.device.getInfo().usbProductId}trace(t){const e=`${`TRACE ${(Date.now()-this.lastTraceTime).toFixed(3)}`} ${t}`;console.log(e),this.traceLog+=e+"\n"}async returnTrace(){try{await navigator.clipboard.writeText(this.traceLog),console.log("Text copied to clipboard!")}catch(t){console.error("Failed to copy text:",t)}}hexify(t){return Array.from(t).map(t=>t.toString(16).padStart(2,"0")).join("").padEnd(16," ")}hexConvert(t,e=!0){if(e&&t.length>16){let e="",i=t;for(;i.length>0;){const t=i.slice(0,16),s=String.fromCharCode(...t).split("").map(t=>" "===t||t>=" "&&t<="~"&&"  "!==t?t:".").join("");i=i.slice(16),e+=`\n    ${this.hexify(t.slice(0,8))} ${this.hexify(t.slice(8))} | ${s}`}return e}return this.hexify(t)}slipWriter(t){const e=[];e.push(192);for(let i=0;i<t.length;i++)219===t[i]?e.push(219,221):192===t[i]?e.push(219,220):e.push(t[i]);return e.push(192),new Uint8Array(e)}async write(t){const e=this.slipWriter(t);if(this.device.writable){const t=this.device.writable.getWriter();this.tracing&&this.trace(`Write ${e.length} bytes: ${this.hexConvert(e)}`),await t.write(e),t.releaseLock()}}appendArray(t,e){const i=new Uint8Array(t.length+e.length);return i.set(t),i.set(e,t.length),i}async readLoop(){for(var t;this.device.readable;){this.reader=null===(t=this.device.readable)||void 0===t?void 0:t.getReader();try{const{value:t,done:e}=await this.reader.read();if(e){this.trace("Serial port done");break}if(t&&t.length){const e=Uint8Array.from(t);this.buffer=this.appendArray(this.buffer,e)}}catch(t){if(t instanceof Error){if(["BufferOverrunError","FramingError","BreakError","ParityError"].includes(t.name)){this.trace(`Recoverable serial port error: ${t.message}`);continue}this.trace(`Unrecoverable serial port error: ${t.message}`);break}if(t instanceof DOMException){this.onDeviceLostCallback?this.onDeviceLostCallback():this.trace(`Unrecoverable serial port error: ${t.message}`);break}this.trace(`Unrecoverable serial port error: ${t}`);break}finally{this.reader.releaseLock()}}this.trace("readLoop exited")}flushInput(){this.buffer=new Uint8Array(0)}async flushOutput(){try{if(this.device.writable){const t=this.device.writable.getWriter();await t.close(),t.releaseLock()}}catch(t){this.trace(`Error while flushing output: ${t}`)}}inWaiting(){return this.buffer.length}peek(){return this.buffer}detectPanicHandler(t){const e=new TextDecoder("utf-8").decode(t),i=e.match(/G?uru Meditation Error: (?:Core \d panic'ed \(([a-zA-Z ]*)\))?/)||e.match(/F?atal exception \(\d+\): (?:([a-zA-Z ]*)?.*epc)?/);if(i){const t=i[1]||i[2];throw new Error("Guru Meditation Error detected"+(t?` (${t})`:""))}}async read(t){let e=null,i=!1,s=null;for(;;){const o=Date.now();for(s=new Uint8Array(0);Date.now()-o<t;){if(this.buffer.length>0){s=this.buffer,this.buffer=new Uint8Array(0);break}await na(1)}if(!s||0===s.length){const t=null===e?"Serial data stream stopped: Possible serial noise or corruption.":"No serial data received.";throw this.tracing&&this.trace(t),new Error(t)}this.tracing&&this.trace(`Read ${s.length} bytes: ${this.hexConvert(s)}`);for(let t=0;t<s.length;t++){const o=s[t];if(null===e){if(o!==this.SLIP_END){this.tracing&&this.trace(`Read invalid data: ${this.hexConvert(s)}`);const t=this.buffer;throw this.tracing&&this.trace(`Remaining data in serial buffer: ${this.hexConvert(t)}`),this.detectPanicHandler(new Uint8Array([...s,...t||[]])),new Error(`Invalid head of packet (0x${o.toString(16)}): Possible serial noise or corruption.`)}e=new Uint8Array(0)}else if(i)if(i=!1,o===this.SLIP_ESC_END)e=this.appendArray(e,new Uint8Array([this.SLIP_END]));else{if(o!==this.SLIP_ESC_ESC){this.tracing&&this.trace(`Read invalid data: ${this.hexConvert(s)}`);const t=this.buffer;throw this.tracing&&this.trace(`Remaining data in serial buffer: ${this.hexConvert(t)}`),this.detectPanicHandler(new Uint8Array([...s,...t||[]])),new Error(`Invalid SLIP escape (0xdb, 0x${o.toString(16)})`)}e=this.appendArray(e,new Uint8Array([this.SLIP_ESC]))}else if(o===this.SLIP_ESC)i=!0;else{if(o===this.SLIP_END){if(this.tracing&&this.trace(`Received full packet: ${this.hexConvert(e)}`),t+1<s.length){const e=s.slice(t+1);this.buffer=this.appendArray(e,this.buffer)}return e}e=this.appendArray(e,new Uint8Array([o]))}}}}async rawRead(t,e){let i;try{if(!this.device.readable)return;for(i=this.device.readable.getReader();!e();){const{value:e,done:s}=await i.read();if(s||!e)break;this.tracing&&this.trace(`Read ${e.length} bytes: ${this.hexConvert(e)}`),t(e)}}catch(t){this.trace(`Error reading from serial port: ${t}`),t instanceof Error&&"NetworkError"===t.name&&t.message.includes("device has been lost")&&(this.trace("Device lost detected (NetworkError)"),this.onDeviceLostCallback&&this.onDeviceLostCallback())}finally{null==i||i.releaseLock()}}async setRTS(t){await this.device.setSignals({requestToSend:t}),await this.setDTR(this._DTR_state)}async setDTR(t){this._DTR_state=t,await this.device.setSignals({dataTerminalReady:t})}async connect(t=115200,e={}){await this.device.open({baudRate:t,dataBits:null==e?void 0:e.dataBits,stopBits:null==e?void 0:e.stopBits,bufferSize:null==e?void 0:e.bufferSize,parity:null==e?void 0:e.parity,flowControl:null==e?void 0:e.flowControl}),this.baudrate=t}async waitForUnlock(t){for(;this.device.readable&&this.device.readable.locked||this.device.writable&&this.device.writable.locked;)await na(t)}async disconnect(){var t,e;(null===(t=this.device.readable)||void 0===t?void 0:t.locked)&&await(null===(e=this.reader)||void 0===e?void 0:e.cancel()),await this.waitForUnlock(400),await this.device.close(),this.reader=void 0}}function la(t){return new Promise(e=>setTimeout(e,t))}class ca{constructor(t,e){this.resetDelay=e,this.transport=t}async reset(){await this.transport.setDTR(!1),await this.transport.setRTS(!0),await la(100),await this.transport.setDTR(!0),await this.transport.setRTS(!1),await la(this.resetDelay),await this.transport.setDTR(!1)}}class ha{constructor(t){this.transport=t}async reset(){await this.transport.setRTS(!1),await this.transport.setDTR(!1),await la(100),await this.transport.setDTR(!0),await this.transport.setRTS(!1),await la(100),await this.transport.setRTS(!0),await this.transport.setDTR(!1),await this.transport.setRTS(!0),await la(100),await this.transport.setRTS(!1),await this.transport.setDTR(!1)}}class da{constructor(t,e=!1){this.transport=t,this.usingUsbOtg=e,this.transport=t}async reset(){this.usingUsbOtg?(await la(200),await this.transport.setRTS(!1),await la(200)):(await la(100),await this.transport.setRTS(!1))}}class Aa{constructor(t,e){this.transport=t,this.sequenceString=e,this.transport=t}async reset(){const t={D:async t=>await this.transport.setDTR(t),R:async t=>await this.transport.setRTS(t),W:async t=>await la(t)};try{if(!function(t){const e=["D","R","W"],i=t.split("|");for(const t of i){const i=t[0],s=t.slice(1);if(!e.includes(i))return!1;if("D"===i||"R"===i){if("0"!==s&&"1"!==s)return!1}else if("W"===i){const t=parseInt(s);if(isNaN(t)||t<=0)return!1}}return!0}(this.sequenceString))return;const e=this.sequenceString.split("|");for(const i of e){const e=i[0],s=i.slice(1);"W"===e?await t.W(Number(s)):"D"!==e&&"R"!==e||await t[e]("1"===s)}}catch(t){throw new Error("Invalid custom reset sequence")}}}function ga(t){return t&&t.__esModule&&Object.prototype.hasOwnProperty.call(t,"default")?t.default:t}var ua,_a;var pa=ga(_a?ua:(_a=1,ua=function(t){return atob(t)}));async function fa(t,e){let i;switch(t){case"ESP32":i=await Promise.resolve().then(function(){return zl});break;case"ESP32-C2":i=await Promise.resolve().then(function(){return Kl});break;case"ESP32-C3":i=await Promise.resolve().then(function(){return tc});break;case"ESP32-C5":i=await Promise.resolve().then(function(){return lc});break;case"ESP32-C6":i=await Promise.resolve().then(function(){return pc});break;case"ESP32-C61":i=await Promise.resolve().then(function(){return Cc});break;case"ESP32-H2":i=await Promise.resolve().then(function(){return kc});break;case"ESP32-P4":i=e&&e<300?await Promise.resolve().then(function(){return Hc}):await Promise.resolve().then(function(){return Wc});break;case"ESP32-S2":i=await Promise.resolve().then(function(){return ih});break;case"ESP32-S3":i=await Promise.resolve().then(function(){return hh});break;case"ESP8266":i=await Promise.resolve().then(function(){return wh})}if(i)return{bss_start:i.bss_start,data:i.data,data_start:i.data_start,entry:i.entry,text:i.text,text_start:i.text_start,decodedData:wa(i.data),decodedText:wa(i.text)}}function wa(t){const e=pa(t).split("").map(function(t){return t.charCodeAt(0)});return new Uint8Array(e)}class Ea{constructor(){this.FLASH_SIZES={"1MB":0,"2MB":16,"4MB":32,"8MB":48,"16MB":64,"32MB":80,"64MB":96,"128MB":112},this.FLASH_FREQUENCY={"80m":15,"40m":0,"26m":1,"20m":2}}getEraseSize(t,e){return e}}class ma extends Ea{constructor(){super(...arguments),this.CHIP_NAME="ESP8266",this.CHIP_DETECT_MAGIC_VALUE=[4293968129],this.EFUSE_RD_REG_BASE=1072693328,this.UART_CLKDIV_REG=1610612756,this.UART_CLKDIV_MASK=1048575,this.XTAL_CLK_DIVIDER=2,this.FLASH_WRITE_SIZE=16384,this.BOOTLOADER_FLASH_OFFSET=0,this.UART_DATE_REG_ADDR=0,this.FLASH_SIZES={"512KB":0,"256KB":16,"1MB":32,"2MB":48,"4MB":64,"2MB-c1":80,"4MB-c1":96,"8MB":128,"16MB":144},this.FLASH_FREQUENCY={"80m":15,"40m":0,"26m":1,"20m":2},this.MEMORY_MAP=[[1072693248,1072693264,"DPORT"],[1073643520,1073741824,"DRAM"],[1074790400,1074823168,"IRAM"],[1075843088,1076760592,"IROM"]],this.SPI_REG_BASE=1610613248,this.SPI_USR_OFFS=28,this.SPI_USR1_OFFS=32,this.SPI_USR2_OFFS=36,this.SPI_MOSI_DLEN_OFFS=0,this.SPI_MISO_DLEN_OFFS=0,this.SPI_W0_OFFS=64,this.getChipFeatures=async t=>{const e=["WiFi"];return"ESP8285"==await this.getChipDescription(t)&&e.push("Embedded Flash"),e}}async readEfuse(t,e){const i=this.EFUSE_RD_REG_BASE+4*e;return t.debug("Read efuse "+i),await t.readReg(i)}async getChipDescription(t){const e=await this.readEfuse(t,2);return!!(16&await this.readEfuse(t,0)|65536&e)?"ESP8285":"ESP8266EX"}async getCrystalFreq(t){const e=await t.readReg(this.UART_CLKDIV_REG)&this.UART_CLKDIV_MASK,i=t.transport.baudrate*e/1e6/this.XTAL_CLK_DIVIDER;let s;return s=i>33?40:26,Math.abs(s-i)>1&&t.info("WARNING: Detected crystal freq "+i+"MHz is quite different to normalized freq "+s+"MHz. Unsupported crystal in use?"),s}_d2h(t){const e=(+t).toString(16);return 1===e.length?"0"+e:e}async readMac(t){let e=await this.readEfuse(t,0);e>>>=0;let i=await this.readEfuse(t,1);i>>>=0;let s=await this.readEfuse(t,3);s>>>=0;const o=new Uint8Array(6);return 0!=s?(o[0]=s>>16&255,o[1]=s>>8&255,o[2]=255&s):i>>16&255?1==(i>>16&255)?(o[0]=172,o[1]=208,o[2]=116):t.error("Unknown OUI"):(o[0]=24,o[1]=254,o[2]=52),o[3]=i>>8&255,o[4]=255&i,o[5]=e>>24&255,this._d2h(o[0])+":"+this._d2h(o[1])+":"+this._d2h(o[2])+":"+this._d2h(o[3])+":"+this._d2h(o[4])+":"+this._d2h(o[5])}getEraseSize(t,e){return e}}ma.IROM_MAP_START=1075838976,ma.IROM_MAP_END=1076887552;var ba=Object.freeze({__proto__:null,ESP8266ROM:ma});const ya=233;function va(t,e){return t+(e-1-t%e)}function Ca(t,e){return t[e]|t[e+1]<<8|t[e+2]<<16|t[e+3]<<24}class Ba{constructor(t,e,i=null,s=0){this.addr=t,this.data=e,this.fileOffs=i,this.flags=s,this.includeInChecksum=!0,0!==this.addr&&this.padToAlignment(4)}copyWithNewAddr(t){return new Ba(t,this.data,0)}splitImage(t){const e=new Ba(this.addr,this.data.slice(0,t),0);return this.data=this.data.slice(t),this.addr+=t,this.fileOffs=null,e}toString(){let t=`len 0x${this.data.length.toString(16).padStart(5,"0")} load 0x${this.addr.toString(16).padStart(8,"0")}`;return null!==this.fileOffs&&(t+=` file_offs 0x${this.fileOffs.toString(16).padStart(8,"0")}`),t}getMemoryType(t){return t.ROM_LOADER.MEMORY_MAP.filter(t=>t[0]<=this.addr&&this.addr<t[1]).map(t=>t[2])}padToAlignment(t){this.data=sa(this.data,t,0)}}class Sa extends Ba{constructor(t,e,i,s){super(e,i,null,s),this.name=t}toString(){return`${this.name} ${super.toString()}`}}class Ia{constructor(t){this.SEG_HEADER_LEN=8,this.SHA256_DIGEST_LEN=32,this.ELF_FLAG_WRITE=1,this.ELF_FLAG_READ=2,this.ELF_FLAG_EXEC=4,this.segments=[],this.entrypoint=0,this.elfSha256=null,this.elfSha256Offset=0,this.padToSize=0,this.flashMode=0,this.flashSizeFreq=0,this.checksum=0,this.datalength=0,this.IROM_ALIGN=0,this.MMU_PAGE_SIZE_CONF=[],this.ROM_LOADER=t}loadCommonHeader(t,e,i){const s=t[e],o=t[e+1];if(this.flashMode=t[e+2],this.flashSizeFreq=t[e+3],this.entrypoint=Ca(t,e+4),s!==i)throw new zs(`Invalid firmware image magic=0x${s.toString(16)}`);return o}verify(){if(this.segments.length>16)throw new zs(`Invalid segment count ${this.segments.length} (max 16). Usually this indicates a linker script problem.`)}loadSegment(t,e,i=!1){const s=e,o=Ca(t,e),r=Ca(t,e+4);this.warnIfUnusualSegment(o,r,i);const n=t.slice(e+8,e+8+r);if(n.length<r)throw new zs(`End of file reading segment 0x${o.toString(16)}, length ${r} (actual length ${n.length})`);const a=new Ba(o,n,s);return this.segments.push(a),a}warnIfUnusualSegment(t,e,i){i||(t>1075838976||t<1073610752||e>65536)&&console.warn(`WARNING: Suspicious segment 0x${t.toString(16)}, length ${e}`)}maybePatchSegmentData(t,e){const i=t.length;if(this.elfSha256Offset>=e&&this.elfSha256Offset<e+i){const s=this.elfSha256Offset-e;if(s<this.SEG_HEADER_LEN||s+this.SHA256_DIGEST_LEN>i)throw new zs(`Cannot place SHA256 digest on segment boundary(elf_sha256_offset=${this.elfSha256Offset}, file_pos=${e}, segment_size=${i})`);const o=s-this.SEG_HEADER_LEN;if(!t.slice(o,o+this.SHA256_DIGEST_LEN).every(t=>0===t))throw new zs(`Contents of segment at SHA256 digest offset 0x${this.elfSha256Offset.toString(16)} are not all zero. Refusing to overwrite.`);if(!this.elfSha256||this.elfSha256.length!==this.SHA256_DIGEST_LEN)throw new zs("ELF SHA256 digest is not properly initialized");const r=t.slice(0,o),n=t.slice(o+this.SHA256_DIGEST_LEN),a=r.length+this.elfSha256.length+n.length,l=new Uint8Array(a);return l.set(r,0),l.set(this.elfSha256,r.length),l.set(n,r.length+this.elfSha256.length),l}return t}saveSegment(t,e,i,s=null){const o=this.maybePatchSegmentData(i.data,e),r=new DataView(t.buffer,e);return r.setUint32(0,i.addr,!0),r.setUint32(4,o.length,!0),t.set(o,e+8),null!==s?oa(o,s):0}saveFlashSegment(t,e,i,s=null){if("ESP32"===this.ROM_LOADER.CHIP_NAME){const t=(e+i.data.length+this.SEG_HEADER_LEN)%this.IROM_ALIGN;if(t<36){const e=new Uint8Array(i.data.length+(36-t));e.set(i.data),e.fill(0,i.data.length),i.data=e}}return this.saveSegment(t,e,i,s)}readChecksum(t,e){return t[va(e,16)]}calculateChecksum(){let t=239;for(const e of this.segments)e.includeInChecksum&&(t=oa(e.data,t));return t}appendChecksum(t,e,i){t[va(e,16)]=i}writeCommonHeader(t,e,i){t[e]=ya,t[e+1]=i,t[e+2]=this.flashMode,t[e+3]=this.flashSizeFreq;new DataView(t.buffer,e+4).setUint32(0,this.entrypoint,!0)}isIromAddr(t){return ma.IROM_MAP_START<=t&&t<ma.IROM_MAP_END}getIromSegment(){const t=this.segments.filter(t=>this.isIromAddr(t.addr));if(t.length>0){if(1!==t.length)throw new zs(`Found ${t.length} segments that could be irom0. Bad ELF file?`);return t[0]}return null}getNonIromSegments(){const t=this.getIromSegment();return this.segments.filter(e=>e!==t)}sortSegments(){this.segments.length&&this.segments.sort((t,e)=>t.addr-e.addr)}mergeAdjacentSegments(){if(!this.segments.length)return;const t=[];for(let e=this.segments.length-1;e>0;e--){const i=this.segments[e-1],s=this.segments[e];if(i.getMemoryType(this).join(",")===s.getMemoryType(this).join(",")&&i.includeInChecksum===s.includeInChecksum&&s.addr===i.addr+i.data.length&&(s.flags&this.ELF_FLAG_EXEC)===(i.flags&this.ELF_FLAG_EXEC)){const t=new Uint8Array(i.data.length+s.data.length);t.set(i.data),t.set(s.data,i.data.length),i.data=t}else t.unshift(s)}t.unshift(this.segments[0]),this.segments=t}setMmuPageSize(t){if(this.MMU_PAGE_SIZE_CONF||t===this.IROM_ALIGN){if(this.MMU_PAGE_SIZE_CONF&&!this.MMU_PAGE_SIZE_CONF.includes(t)){const e=this.MMU_PAGE_SIZE_CONF.map(t=>t/1024+"KB").join(", ");throw new zs(`${t} bytes is not a valid ${this.ROM_LOADER.CHIP_NAME} page size, select from ${e}.`)}this.IROM_ALIGN=t}else console.warn(`WARNING: Changing MMU page size is not supported on ${this.ROM_LOADER.CHIP_NAME}! `+(0!==this.IROM_ALIGN?`Defaulting to ${this.IROM_ALIGN/1024}KB.`:""))}}class xa extends Ia{constructor(t,e=null,i=!0,s=!1){super(t),this.securePad=null,this.flashMode=0,this.flashSizeFreq=0,this.version=1,this.WP_PIN_DISABLED=238,this.wpPin=this.WP_PIN_DISABLED,this.clkDrv=0,this.qDrv=0,this.dDrv=0,this.csDrv=0,this.hdDrv=0,this.wpDrv=0,this.chipId=0,this.minRev=0,this.minRevFull=0,this.maxRevFull=0,this.storedDigest=null,this.calcDigest=null,this.dataLength=0,this.IROM_ALIGN=65536,this.ROM_LOADER=t,this.appendDigest=i,this.ramOnlyHeader=s,null!==e&&this.loadFromFile(e)}async loadFromFile(t){const e=t instanceof Uint8Array?t:ra(t);let i=0;const s=this.loadCommonHeader(e,i,ya);i+=8,this.loadExtendedHeader(e,i),i+=16;for(let t=0;t<s;t++){i+=8+this.loadSegment(e,i).data.length}if(this.checksum=this.readChecksum(e,i),i=va(i,16),this.appendDigest){const t=i;this.storedDigest=e.slice(i,i+this.SHA256_DIGEST_LEN);const s=await crypto.subtle.digest("SHA-256",e.slice(0,t));this.calcDigest=new Uint8Array(s),this.dataLength=t-0}this.verify()}isFlashAddr(t){return this.ROM_LOADER.IROM_MAP_START<=t&&t<this.ROM_LOADER.IROM_MAP_END||this.ROM_LOADER.DROM_MAP_START<=t&&t<this.ROM_LOADER.DROM_MAP_END}async save(){let t=0;const e=new Uint8Array(1048576);let i=0;this.writeCommonHeader(e,i,this.segments.length),i+=8,this.saveExtendedHeader(e,i),i+=16;let s=239;const o=this.segments.filter(t=>this.isFlashAddr(t.addr)).sort((t,e)=>t.addr-e.addr),r=this.segments.filter(t=>!this.isFlashAddr(t.addr)).sort((t,e)=>t.addr-e.addr);for(let t=0;t<o.length;t++){const e=o[t];if(e instanceof Sa&&".flash.appdesc"===e.name){o.splice(t,1),o.unshift(e);break}}for(let t=0;t<r.length;t++){const e=r[t];if(e instanceof Sa&&".dram0.bootdesc"===e.name){r.splice(t,1),r.unshift(e);break}}if(o.length>0){let t=o[0].addr;for(const e of o.slice(1)){if(Math.floor(e.addr/this.IROM_ALIGN)===Math.floor(t/this.IROM_ALIGN))throw new zs(`Segment loaded at 0x${e.addr.toString(16)} lands in same 64KB flash mapping as segment loaded at 0x${t.toString(16)}. Can't generate binary. Suggest changing linker script or ELF to merge sections.`);t=e.addr}}if(this.ramOnlyHeader){for(const o of r)s=this.saveSegment(e,i,o,s),i+=8+o.data.length,t++;this.appendChecksum(e,i,s),i=va(i,16);for(const r of o.reverse()){let o=this.getAlignmentDataNeeded(r,i);if(o>0){o<this.ROM_LOADER.BOOTLOADER_FLASH_OFFSET-this.SEG_HEADER_LEN&&(o+=this.IROM_ALIGN),o-=this.ROM_LOADER.BOOTLOADER_FLASH_OFFSET;const r=new Ba(0,new Uint8Array(o).fill(0),i);s=this.saveSegment(e,i,r,s),i+=8+o,t++}this.saveFlashSegment(e,i,r),i+=8+r.data.length,t++}}else{for(;o.length>0;){const n=o[0],a=this.getAlignmentDataNeeded(n,i);if(a>0){if(r.length>0&&a>this.SEG_HEADER_LEN){const t=r[0].splitImage(a);0===r[0].data.length&&r.shift(),s=this.saveSegment(e,i,t,s)}else{const t=new Ba(0,new Uint8Array(a).fill(0),i);s=this.saveSegment(e,i,t,s)}i+=8+a,t++}else{if((i+8)%this.IROM_ALIGN!==n.addr%this.IROM_ALIGN)throw new Error("Flash segment alignment mismatch");s=this.saveFlashSegment(e,i,n,s),o.shift(),i+=8+n.data.length,t++}}for(const o of r)s=this.saveSegment(e,i,o,s),i+=8+o.data.length,t++}if(this.securePad){if(!this.appendDigest)throw new Error("secure_pad only applies if a SHA-256 digest is also appended to the image");const o=(i+this.SEG_HEADER_LEN)%this.IROM_ALIGN,r=16;let n=0;"1"===this.securePad?n=112:"2"===this.securePad&&(n=32);const a=(this.IROM_ALIGN-o-r-n)%this.IROM_ALIGN,l=new Ba(0,new Uint8Array(a).fill(0),i);s=this.saveSegment(e,i,l,s),i+=8+a,t++}this.ramOnlyHeader||(this.appendChecksum(e,i,s),i=va(i,16));const n=i;if(this.ramOnlyHeader?e[1]=r.length:e[1]=t,this.appendDigest){const t=await crypto.subtle.digest("SHA-256",e.slice(0,n)),s=new Uint8Array(t);e.set(s,n),i+=32}if(this.padToSize&&i%this.padToSize!==0){const t=this.padToSize-i%this.padToSize,s=new Uint8Array(t);s.fill(255),e.set(s,i),i+=t}return e}loadExtendedHeader(t,e){const i=new DataView(t.buffer,e);this.wpPin=i.getUint8(0);const s=i.getUint8(1);[this.clkDrv,this.qDrv]=this.splitByte(s);const o=i.getUint8(2);[this.dDrv,this.csDrv]=this.splitByte(o);const r=i.getUint8(3);[this.hdDrv,this.wpDrv]=this.splitByte(r),this.chipId=i.getUint8(4),this.chipId!==this.ROM_LOADER.IMAGE_CHIP_ID&&console.warn(`Unexpected chip id in image. Expected ${this.ROM_LOADER.IMAGE_CHIP_ID} but value was ${this.chipId}. Is this image for a different chip model?`),this.minRev=i.getUint8(5),this.minRevFull=i.getUint16(6,!0),this.maxRevFull=i.getUint16(8,!0);const n=i.getUint8(15);if(0!==n&&1!==n)throw new Error(`Invalid value for append_digest field (0x${n.toString(16)}). Should be 0 or 1.`);this.appendDigest=1===n}saveExtendedHeader(t,e){const i=new ArrayBuffer(16),s=new DataView(i);s.setUint8(0,this.wpPin),s.setUint8(1,this.joinByte(this.clkDrv,this.qDrv)),s.setUint8(2,this.joinByte(this.dDrv,this.csDrv)),s.setUint8(3,this.joinByte(this.hdDrv,this.wpDrv)),s.setUint8(4,this.ROM_LOADER.IMAGE_CHIP_ID),s.setUint8(5,this.minRev),s.setUint16(6,this.minRevFull,!0),s.setUint16(8,this.maxRevFull,!0);for(let t=9;t<15;t++)s.setUint8(t,0);s.setUint8(15,this.appendDigest?1:0),t.set(new Uint8Array(i),e)}splitByte(t){return[15&t,t>>4&15]}joinByte(t,e){return 15&t|(15&e)<<4}getAlignmentDataNeeded(t,e){const i=t.addr%this.IROM_ALIGN-this.SEG_HEADER_LEN;let s=this.IROM_ALIGN-e%this.IROM_ALIGN+i;return 0===s||s===this.IROM_ALIGN?0:(s-=this.SEG_HEADER_LEN,s<0&&(s+=this.IROM_ALIGN),s)}}class Da extends Ia{constructor(t,e=null){super(t),this.version=1,this.ROM_LOADER=t,this.flashMode=0,this.flashSizeFreq=0,null!==e&&this.loadFromFile(e)}loadFromFile(t){const e=t instanceof Uint8Array?t:ra(t);let i=0;const s=this.loadCommonHeader(e,i,ya);i+=8;for(let t=0;t<s;t++){i+=8+this.loadSegment(e,i).data.length}this.checksum=this.readChecksum(e,i),this.verify()}defaultOutputName(t){return t+"-"}}class Ma extends Ia{constructor(t,e=null){super(t),this.version=2,this.ROM_LOADER=t,this.flashMode=0,this.flashSizeFreq=0,null!==e&&this.loadFromFile(e)}async loadFromFile(t){const e=t instanceof Uint8Array?t:ra(t);let i=0;const s=this.loadCommonHeader(e,i,Ma.IMAGE_V2_MAGIC);i+=8,s!==Ma.IMAGE_V2_SEGMENT&&console.warn(`Warning: V2 header has unexpected "segment" count ${s} (usually 4)`);const o=this.flashMode,r=this.flashSizeFreq,n=this.entrypoint,a=this.loadSegment(e,i,!0);a.addr=0,a.includeInChecksum=!1,i+=8+a.data.length;const l=this.loadCommonHeader(e,i,ya);i+=8,o!==this.flashMode&&console.warn(`WARNING: Flash mode value in first header (0x${o.toString(16)}) disagrees with second (0x${this.flashMode.toString(16)}). Using second value.`),r!==this.flashSizeFreq&&console.warn(`WARNING: Flash size/freq value in first header (0x${r.toString(16)}) disagrees with second (0x${this.flashSizeFreq.toString(16)}). Using second value.`),n!==this.entrypoint&&console.warn(`WARNING: Entrypoint address in first header (0x${n.toString(16)}) disagrees with second header (0x${this.entrypoint.toString(16)}). Using second value.`);for(let t=0;t<l;t++){i+=8+this.loadSegment(e,i).data.length}this.checksum=this.readChecksum(e,i),this.verify()}defaultOutputName(t){const e=this.getIromSegment();let i=0;null!==e&&(i=e.addr-ma.IROM_MAP_START);return`${t.replace(/\.[^/.]+$/,"")}-0x${(-4096&i).toString(16).padStart(5,"0")}.bin`}}Ma.IMAGE_V2_MAGIC=234,Ma.IMAGE_V2_SEGMENT=4;class Ra extends xa{constructor(t,e=null,i=!0,s=!1){super(t,e,i,s),this.ROM_LOADER=t}}class ka extends xa{constructor(t,e=null,i=!0,s=!1){super(t,e,i,s),this.ROM_LOADER=t}}class Ta extends xa{constructor(t,e=null,i=!0,s=!1){super(t,e,i,s),this.ROM_LOADER=t}}class Fa extends xa{constructor(t,e=null,i=!0,s=!1){super(t,e,i,s),this.MMU_PAGE_SIZE_CONF=[16384,32768,65536],this.ROM_LOADER=t}}class Pa extends xa{constructor(t,e=null,i=!0,s=!1){super(t,e,i,s),this.MMU_PAGE_SIZE_CONF=[8192,16384,32768,65536],this.ROM_LOADER=t}}class Ua extends Pa{constructor(t,e=null,i=!0,s=!1){super(t,e,i,s),this.ROM_LOADER=t}}class Oa extends xa{constructor(t,e=null,i=!0,s=!1){super(t,e,i,s),this.ROM_LOADER=t}}class za extends xa{constructor(t,e=null,i=!0,s=!1){super(t,e,i,s),this.ROM_LOADER=t}}class Qa extends Pa{constructor(t,e=null,i=!0,s=!1){super(t,e,i,s),this.ROM_LOADER=t}}async function Ha(t,e){const i=e instanceof Uint8Array?e:ra(e),s=t.CHIP_NAME.toLowerCase().replace(/[-()]/g,"");let o;if("esp8266"!==s)switch(s){case"esp32":o=xa;break;case"esp32s2":o=Ra;break;case"esp32s3":o=ka;break;case"esp32c3":o=Ta;break;case"esp32c2":o=Fa;break;case"esp32c6":o=Pa;break;case"esp32c61":o=Ua;break;case"esp32c5":o=Oa;break;case"esp32h2":o=Qa;break;case"esp32p4":o=za;break;default:throw new zs(`Unsupported chip name: ${s}`)}else{const t=i[0];if(t===ya)o=Da;else{if(t!==Ma.IMAGE_V2_MAGIC)throw new zs(`Invalid image magic number: ${t}`);o=Ma}}const r=new o(t),n=r;if("function"==typeof n.loadFromFile){const t=n.loadFromFile(i);t instanceof Promise&&await t}return r}class Ga{constructor(t){var e,i,s,o,r,n,a,l;this.ESP_RAM_BLOCK=6144,this.ESP_FLASH_BEGIN=2,this.ESP_FLASH_DATA=3,this.ESP_FLASH_END=4,this.ESP_MEM_BEGIN=5,this.ESP_MEM_END=6,this.ESP_MEM_DATA=7,this.ESP_WRITE_REG=9,this.ESP_READ_REG=10,this.ESP_SPI_ATTACH=13,this.ESP_CHANGE_BAUDRATE=15,this.ESP_FLASH_DEFL_BEGIN=16,this.ESP_FLASH_DEFL_DATA=17,this.ESP_FLASH_DEFL_END=18,this.ESP_SPI_FLASH_MD5=19,this.ESP_ERASE_FLASH=208,this.ESP_ERASE_REGION=209,this.ESP_READ_FLASH=210,this.ESP_RUN_USER_CODE=211,this.ESP_IMAGE_MAGIC=233,this.ESP_CHECKSUM_MAGIC=239,this.ROM_INVALID_RECV_MSG=5,this.DEFAULT_TIMEOUT=3e3,this.ERASE_REGION_TIMEOUT_PER_MB=3e4,this.ERASE_WRITE_TIMEOUT_PER_MB=4e4,this.MD5_TIMEOUT_PER_MB=8e3,this.CHIP_ERASE_TIMEOUT=12e4,this.FLASH_READ_TIMEOUT=1e5,this.MAX_TIMEOUT=2*this.CHIP_ERASE_TIMEOUT,this.SPI_ADDR_REG_MSB=!0,this.CHIP_DETECT_MAGIC_REG_ADDR=1073745920,this.DETECTED_FLASH_SIZES={18:"256KB",19:"512KB",20:"1MB",21:"2MB",22:"4MB",23:"8MB",24:"16MB",25:"32MB",26:"64MB",27:"128MB",28:"256MB",32:"64MB",33:"128MB",34:"256MB",50:"256KB",51:"512KB",52:"1MB",53:"2MB",54:"4MB",55:"8MB",56:"16MB",57:"32MB",58:"64MB"},this.USB_JTAG_SERIAL_PID=4097,this.romBaudrate=115200,this.debugLogging=!1,this.syncStubDetected=!1,this.IS_STUB=!1,this.FLASH_WRITE_SIZE=16384,this.transport=t.transport,this.baudrate=t.baudrate,this.resetConstructors={classicReset:(t,e)=>new ca(t,e),customReset:(t,e)=>new Aa(t,e),hardReset:(t,e)=>new da(t,e),usbJTAGSerialReset:t=>new ha(t)},t.serialOptions&&(this.serialOptions=t.serialOptions),t.terminal&&(this.terminal=t.terminal,this.terminal.clean()),void 0!==t.debugLogging&&(this.debugLogging=t.debugLogging),t.port&&(this.transport=new aa(t.port)),void 0!==t.enableTracing&&(this.transport.tracing=t.enableTracing),(null===(e=t.resetConstructors)||void 0===e?void 0:e.classicReset)&&(this.resetConstructors.classicReset=null===(i=t.resetConstructors)||void 0===i?void 0:i.classicReset),(null===(s=t.resetConstructors)||void 0===s?void 0:s.customReset)&&(this.resetConstructors.customReset=null===(o=t.resetConstructors)||void 0===o?void 0:o.customReset),(null===(r=t.resetConstructors)||void 0===r?void 0:r.hardReset)&&(this.resetConstructors.hardReset=null===(n=t.resetConstructors)||void 0===n?void 0:n.hardReset),(null===(a=t.resetConstructors)||void 0===a?void 0:a.usbJTAGSerialReset)&&(this.resetConstructors.usbJTAGSerialReset=null===(l=t.resetConstructors)||void 0===l?void 0:l.usbJTAGSerialReset),this.info("esptool.js"),this.info("Serial port "+this.transport.getInfo())}write(t,e=!0){this.terminal?e?this.terminal.writeLine(t):this.terminal.write(t):console.log(t)}error(t,e=!0){this.write(`Error: ${t}`,e)}info(t,e=!0){this.write(t,e)}debug(t,e=!0){this.debugLogging&&this.write(`Debug: ${t}`,e)}_shortToBytearray(t){return new Uint8Array([255&t,t>>8&255])}_intToByteArray(t){return new Uint8Array([255&t,t>>8&255,t>>16&255,t>>24&255])}_byteArrayToShort(t,e){return t|e>>8}_byteArrayToInt(t,e,i,s){return t|e<<8|i<<16|s<<24}_appendBuffer(t,e){const i=new Uint8Array(t.byteLength+e.byteLength);return i.set(new Uint8Array(t),0),i.set(new Uint8Array(e),t.byteLength),i.buffer}_appendArray(t,e){const i=new Uint8Array(t.length+e.length);return i.set(t,0),i.set(e,t.length),i}ui8ToBstr(t){let e="";for(let i=0;i<t.length;i++)e+=String.fromCharCode(t[i]);return e}bstrToUi8(t){const e=new Uint8Array(t.length);for(let i=0;i<t.length;i++)e[i]=t.charCodeAt(i);return e}async readPacket(t=null,e=this.DEFAULT_TIMEOUT){for(let i=0;i<100;i++){const i=await this.transport.read(e);if(!i||i.length<8)continue;const s=i[0];if(1!==s)continue;const o=i[1],r=this._byteArrayToInt(i[4],i[5],i[6],i[7]),n=i.slice(8);if(1==s){if(null==t||o==t)return[r,n];if(0!=n[0]&&n[1]==this.ROM_INVALID_RECV_MSG)throw this.transport.flushInput(),new zs("unsupported command error")}}throw new zs("invalid response")}async command(t=null,e=new Uint8Array(0),i=0,s=!0,o=this.DEFAULT_TIMEOUT){if(null!=t){this.transport.tracing&&this.transport.trace(`command op:0x${t.toString(16).padStart(2,"0")} data len=${e.length} wait_response=${s?1:0} timeout=${(o/1e3).toFixed(3)} data=${this.transport.hexConvert(e)}`);const r=new Uint8Array(8+e.length);let n;for(r[0]=0,r[1]=t,r[2]=this._shortToBytearray(e.length)[0],r[3]=this._shortToBytearray(e.length)[1],r[4]=this._intToByteArray(i)[0],r[5]=this._intToByteArray(i)[1],r[6]=this._intToByteArray(i)[2],r[7]=this._intToByteArray(i)[3],n=0;n<e.length;n++)r[8+n]=e[n];await this.transport.write(r)}return s?this.readPacket(t,o):[0,new Uint8Array(0)]}async readReg(t,e=this.DEFAULT_TIMEOUT){this.debug(`Read Register:${this.toHex(t)}`);const i=this._intToByteArray(t),s=await this.command(this.ESP_READ_REG,i,void 0,void 0,e);return this.debug(`Read Register Value:${s[0]}`),s[0]}async writeReg(t,e,i=4294967295,s=0,o=0){let r=this._appendArray(this._intToByteArray(t),this._intToByteArray(e));r=this._appendArray(r,this._intToByteArray(i)),r=this._appendArray(r,this._intToByteArray(s)),o>0&&(r=this._appendArray(r,this._intToByteArray(this.chip.UART_DATE_REG_ADDR)),r=this._appendArray(r,this._intToByteArray(0)),r=this._appendArray(r,this._intToByteArray(0)),r=this._appendArray(r,this._intToByteArray(o))),await this.checkCommand("write target memory",this.ESP_WRITE_REG,r)}async sync(){this.debug("Sync");const t=new Uint8Array(36);let e;for(t[0]=7,t[1]=7,t[2]=18,t[3]=32,e=0;e<32;e++)t[4+e]=85;try{let e=await this.command(8,t,void 0,void 0,100);this.syncStubDetected=0===e[0];for(let t=0;t<7;t++)e=await this.readPacket(8,100),this.syncStubDetected=this.syncStubDetected&&0===e[0];return e}catch(t){throw this.debug("Sync err "+t),t}}async _connectAttempt(t="default_reset",e){this.debug("_connect_attempt "+t),e&&await e.reset();const i=this.transport.peek(),s=Array.from(i,t=>String.fromCharCode(t)).join("").match(/boot:(0x[0-9a-fA-F]+)([\s\S]*?waiting for download)?/);let o=!1,r="",n=!1;s&&(o=!0,r=s[1],n=!!s[2]),this.debug(`bootMode:${r} downloadMode:${n}`);let a="";for(let t=0;t<5;t++)try{this.debug(`Sync connect attempt ${t}`),this.transport.flushInput();const e=await this.sync();return this.debug(e[0].toString()),"success"}catch(t){this.debug(`Error at sync ${t}`),a=t instanceof Error?t.message:"string"==typeof t?t:JSON.stringify(t)}return o&&(a=`Wrong boot mode detected (${r}).\n        This chip needs to be in download mode.`,n&&(a="Download mode successfully detected, but getting no sync reply:\n           The serial TX path seems to be down.")),a}constructResetSequence(t){if("no_reset"!==t)if("usb_reset"===t||this.transport.getPid()===this.USB_JTAG_SERIAL_PID){if(this.resetConstructors.usbJTAGSerialReset)return this.debug("using USB JTAG Serial Reset"),[this.resetConstructors.usbJTAGSerialReset(this.transport)]}else{const t=50,e=t+500;if(this.resetConstructors.classicReset)return this.debug("using Classic Serial Reset"),[this.resetConstructors.classicReset(this.transport,t),this.resetConstructors.classicReset(this.transport,e)]}return[]}async connect(t="default_reset",e=7,i=!0){let s;this.info("Connecting...",!1),await this.transport.connect(this.romBaudrate,this.serialOptions),this.transport.readLoop();const o=this.constructResetSequence(t);for(let i=0;i<e;i++){const e=o.length>0?o[i%o.length]:null;if(s=await this._connectAttempt(t,e),"success"===s)break}if("success"!==s)throw new zs("Failed to connect with the device");if(this.debug("Connect attempt successful."),this.info("\n\r",!1),i){const t=await this.readReg(this.CHIP_DETECT_MAGIC_REG_ADDR)>>>0;this.debug("Chip Magic "+t.toString(16));const e=await async function(t){switch(t){case 15736195:{const{ESP32ROM:t}=await Promise.resolve().then(function(){return mh});return new t}case 203546735:case 1867591791:case 2084675695:{const{ESP32C2ROM:t}=await Promise.resolve().then(function(){return vh});return new t}case 1763790959:case 456216687:case 1216438383:case 1130455151:{const{ESP32C3ROM:t}=await Promise.resolve().then(function(){return yh});return new t}case 752910447:{const{ESP32C6ROM:t}=await Promise.resolve().then(function(){return Bh});return new t}case 606167151:case 871374959:case 1333878895:{const{ESP32C61ROM:t}=await Promise.resolve().then(function(){return Sh});return new t}case 285294703:case 1675706479:case 1607549039:{const{ESP32C5ROM:t}=await Promise.resolve().then(function(){return Ih});return new t}case 3619110528:case 2548236392:{const{ESP32H2ROM:t}=await Promise.resolve().then(function(){return xh});return new t}case 9:{const{ESP32S3ROM:t}=await Promise.resolve().then(function(){return Dh});return new t}case 1990:{const{ESP32S2ROM:t}=await Promise.resolve().then(function(){return Mh});return new t}case 4293968129:{const{ESP8266ROM:t}=await Promise.resolve().then(function(){return ba});return new t}case 0:case 182303440:case 117676761:{const{ESP32P4ROM:t}=await Promise.resolve().then(function(){return Rh});return new t}default:return null}}(t);if(null===typeof this.chip)throw new zs(`Unexpected CHIP magic value ${t}. Failed to autodetect chip type.`);this.chip=e}}async detectChip(t="default_reset"){await this.connect(t),this.info("Detecting chip type... ",!1),null!=this.chip?this.info(this.chip.CHIP_NAME):this.info("unknown!")}async checkCommand(t="",e=null,i=new Uint8Array(0),s=0,o=0,r=this.DEFAULT_TIMEOUT){this.debug("check_command "+t);const n=await this.command(e,i,s,void 0,r);if(n&&n[1]&&n[1].length<o+2){const e=n[1].slice(0,2);throw 0!==e[0]?new zs(`Failed to ${t} failed with status ${e}`):new zs(`Failed to ${t}.\n Only got ${n[1].length} bytes of data.`)}const a=n[1].slice(o,o+2);if(0!==a[0])throw new zs(`Failed to ${t} failed with status ${a}`);return o>0?n[1].slice(0,o):n[0]}async memBegin(t,e,i,s){if(this.IS_STUB){const e=s,i=s+t,o=this.chip.getChipRevision?await this.chip.getChipRevision(this):void 0,r=await fa(this.chip.CHIP_NAME,o);if(r){const t=[[r.bss_start||r.data_start,r.data_start+r.decodedData.length],[r.text_start,r.text_start+r.decodedText.length]];for(const[s,o]of t)if(e<o&&i>s)throw new zs(`Software loader is resident at 0x${s.toString(16).padStart(8,"0")}-0x${o.toString(16).padStart(8,"0")}.\n            Can't load binary at overlapping address range 0x${e.toString(16).padStart(8,"0")}-0x${i.toString(16).padStart(8,"0")}.\n            Either change binary loading address, or use the no-stub option to disable the software loader.`)}}this.debug("mem_begin "+t+" "+e+" "+i+" "+s.toString(16));let o=this._appendArray(this._intToByteArray(t),this._intToByteArray(e));o=this._appendArray(o,this._intToByteArray(i)),o=this._appendArray(o,this._intToByteArray(s)),await this.checkCommand("enter RAM download mode",this.ESP_MEM_BEGIN,o)}checksum(t,e=this.ESP_CHECKSUM_MAGIC){for(let i=0;i<t.length;i++)e^=t[i];return e}async memBlock(t,e){let i=this._appendArray(this._intToByteArray(t.length),this._intToByteArray(e));i=this._appendArray(i,this._intToByteArray(0)),i=this._appendArray(i,this._intToByteArray(0)),i=this._appendArray(i,t);const s=this.checksum(t);await this.checkCommand("write to target RAM",this.ESP_MEM_DATA,i,s)}async memFinish(t){const e=0===t?1:0,i=this._appendArray(this._intToByteArray(e),this._intToByteArray(t));await this.checkCommand("leave RAM download mode",this.ESP_MEM_END,i,void 0,void 0,200)}async flashSpiAttach(t){const e=this._intToByteArray(t);await this.checkCommand("configure SPI flash pins",this.ESP_SPI_ATTACH,e)}timeoutPerMb(t,e){const i=t*(e/1e6);return i<3e3?3e3:i}async flashBegin(t,e){const i=Math.floor((t+this.FLASH_WRITE_SIZE-1)/this.FLASH_WRITE_SIZE),s=this.chip.getEraseSize(e,t),o=new Date,r=o.getTime();let n=3e3;0==this.IS_STUB&&(n=this.timeoutPerMb(this.ERASE_REGION_TIMEOUT_PER_MB,t)),this.debug("flash begin "+s+" "+i+" "+this.FLASH_WRITE_SIZE+" "+e+" "+t);let a=this._appendArray(this._intToByteArray(s),this._intToByteArray(i));a=this._appendArray(a,this._intToByteArray(this.FLASH_WRITE_SIZE)),a=this._appendArray(a,this._intToByteArray(e)),0==this.IS_STUB&&(a=this._appendArray(a,this._intToByteArray(0))),await this.checkCommand("enter Flash download mode",this.ESP_FLASH_BEGIN,a,void 0,void 0,n);const l=o.getTime();return 0!=t&&0==this.IS_STUB&&this.info("Took "+(l-r)/1e3+"."+(l-r)%1e3+"s to erase flash block"),i}async flashDeflBegin(t,e,i){const s=Math.floor((e+this.FLASH_WRITE_SIZE-1)/this.FLASH_WRITE_SIZE),o=Math.floor((t+this.FLASH_WRITE_SIZE-1)/this.FLASH_WRITE_SIZE),r=new Date,n=r.getTime();let a,l;this.IS_STUB?(a=t,l=this.DEFAULT_TIMEOUT):(a=o*this.FLASH_WRITE_SIZE,l=this.timeoutPerMb(this.ERASE_REGION_TIMEOUT_PER_MB,a)),this.info("Compressed "+t+" bytes to "+e+"...");let c=this._appendArray(this._intToByteArray(a),this._intToByteArray(s));c=this._appendArray(c,this._intToByteArray(this.FLASH_WRITE_SIZE)),c=this._appendArray(c,this._intToByteArray(i)),"ESP32-S2"!==this.chip.CHIP_NAME&&"ESP32-S3"!==this.chip.CHIP_NAME&&"ESP32-C3"!==this.chip.CHIP_NAME&&"ESP32-C2"!==this.chip.CHIP_NAME||!1!==this.IS_STUB||(c=this._appendArray(c,this._intToByteArray(0))),await this.checkCommand("enter compressed flash mode",this.ESP_FLASH_DEFL_BEGIN,c,void 0,void 0,l);const h=r.getTime();return 0!=t&&!1===this.IS_STUB&&this.info("Took "+(h-n)/1e3+"."+(h-n)%1e3+"s to erase flash block"),s}async flashBlock(t,e,i){let s=this._appendArray(this._intToByteArray(t.length),this._intToByteArray(e));s=this._appendArray(s,this._intToByteArray(0)),s=this._appendArray(s,this._intToByteArray(0)),s=this._appendArray(s,t);const o=this.checksum(t);await this.checkCommand("write to target Flash after seq "+e,this.ESP_FLASH_DATA,s,o,void 0,i)}async flashDeflBlock(t,e,i){let s=this._appendArray(this._intToByteArray(t.length),this._intToByteArray(e));s=this._appendArray(s,this._intToByteArray(0)),s=this._appendArray(s,this._intToByteArray(0)),s=this._appendArray(s,t);const o=this.checksum(t);this.debug("flash_defl_block "+t[0].toString(16)+" "+t[1].toString(16)),await this.checkCommand("write compressed data to flash after seq "+e,this.ESP_FLASH_DEFL_DATA,s,o,void 0,i)}async flashFinish(t=!1,e=this.DEFAULT_TIMEOUT){const i=t?0:1,s=this._intToByteArray(i);await this.checkCommand("leave Flash mode",this.ESP_FLASH_END,s,void 0,void 0,e)}async flashDeflFinish(t=!1,e=this.DEFAULT_TIMEOUT){const i=t?0:1,s=this._intToByteArray(i);await this.checkCommand("leave compressed flash mode",this.ESP_FLASH_DEFL_END,s,void 0,void 0,e)}async runSpiflashCommand(t,e,i,s=null,o=0,r=0){const n=1<<30,a=this.chip.SPI_REG_BASE,l=a+0,c=a+4,h=a+this.chip.SPI_USR_OFFS,d=a+this.chip.SPI_USR1_OFFS,A=a+this.chip.SPI_USR2_OFFS,g=a+this.chip.SPI_W0_OFFS;let u;u=null!=this.chip.SPI_MOSI_DLEN_OFFS?async(t,e)=>{const i=a+this.chip.SPI_MOSI_DLEN_OFFS,s=a+this.chip.SPI_MISO_DLEN_OFFS;t>0&&await this.writeReg(i,t-1),e>0&&await this.writeReg(s,e-1);let n=0;r>0&&(n|=r-1),o>0&&(n|=o-1<<p),n&&await this.writeReg(d,n)}:async(t,e)=>{const i=d;let s=(0===e?0:e-1)<<8|(0===t?0:t-1)<<17;r>0&&(s|=r-1),o>0&&(s|=o-1<<p),await this.writeReg(i,s)};const _=1<<18,p=26;if(i>32)throw new zs("Reading more than 32 bits back from a SPI flash operation is unsupported");if(e.length>64)throw new zs("Writing more than 64 bytes of data with one SPI command is unsupported");const f=8*e.length,w=await this.readReg(h),E=await this.readReg(A);let m=1<<31;i>0&&(m|=268435456),f>0&&(m|=134217728),o>0&&(m|=n),r>0&&(m|=536870912),await u(f,i),await this.writeReg(h,m);let b,y=7<<28|t;if(await this.writeReg(A,y),s&&o>0&&(this.SPI_ADDR_REG_MSB&&(s<<=32-o),await this.writeReg(c,s)),0==f)await this.writeReg(g,0);else{e=sa(e,4,0);const t=[];for(let i=0;i<e.length;i+=4)t.push((e[i]|e[i+1]<<8|e[i+2]<<16|e[i+3]<<24)>>>0);let i=g;for(const e of t)await this.writeReg(i,e),i+=4}for(await this.writeReg(l,_),b=0;b<10&&(y=await this.readReg(l)&_,0!=y);b++);if(10===b)throw new zs("SPI command did not complete in time");const v=await this.readReg(g);return await this.writeReg(h,w),await this.writeReg(A,E),v}async readFlashId(){const t=new Uint8Array(0);return await this.runSpiflashCommand(159,t,24)}async eraseFlash(){this.info("Erasing flash (this may take a while)...");let t=new Date;const e=t.getTime(),i=await this.checkCommand("erase flash",this.ESP_ERASE_FLASH,void 0,void 0,void 0,this.CHIP_ERASE_TIMEOUT);t=new Date;const s=t.getTime();return this.info("Chip erase completed successfully in "+(s-e)/1e3+"s"),i}toHex(t){return Array.prototype.map.call(t,t=>("00"+t.toString(16)).slice(-2)).join("")}async flashMd5sum(t,e){const i=this.timeoutPerMb(this.MD5_TIMEOUT_PER_MB,e);let s=this._appendArray(this._intToByteArray(t),this._intToByteArray(e));s=this._appendArray(s,this._intToByteArray(0)),s=this._appendArray(s,this._intToByteArray(0));const o=this.IS_STUB?16:32,r=await this.checkCommand("calculate md5sum",this.ESP_SPI_FLASH_MD5,s,void 0,o,i);return this.toHex(r)}async readFlash(t,e,i=null){let s=this._appendArray(this._intToByteArray(t),this._intToByteArray(e));s=this._appendArray(s,this._intToByteArray(4096)),s=this._appendArray(s,this._intToByteArray(1024));const o=await this.checkCommand("read flash",this.ESP_READ_FLASH,s);if(0!=o)throw new zs("Failed to read memory: "+o);let r=new Uint8Array(0);for(;r.length<e;){const t=await this.transport.read(this.FLASH_READ_TIMEOUT);if(!(t instanceof Uint8Array))throw new zs("Failed to read memory: "+t);t.length>0&&(r=this._appendArray(r,t),await this.transport.write(this._intToByteArray(r.length)),i&&i(t,r.length,e))}return r}async runStub(){if(this.syncStubDetected)return this.info("Stub is already running. No upload is necessary."),this.chip;this.info("Uploading stub...");const t=this.chip.getChipRevision?await this.chip.getChipRevision(this):void 0,e=await fa(this.chip.CHIP_NAME,t);if(void 0===e)throw this.debug("Error loading Stub json"),new Error("Error loading Stub json");const i=[e.decodedText,e.decodedData];for(let t=0;t<i.length;t++)if(i[t]){const s=0===t?e.text_start:e.data_start,o=i[t].length,r=Math.floor((o+this.ESP_RAM_BLOCK-1)/this.ESP_RAM_BLOCK);await this.memBegin(o,r,this.ESP_RAM_BLOCK,s);for(let e=0;e<r;e++){const s=e*this.ESP_RAM_BLOCK,o=s+this.ESP_RAM_BLOCK;await this.memBlock(i[t].slice(s,o),e)}}this.info("Running stub..."),await this.memFinish(e.entry);const s=await this.transport.read(this.DEFAULT_TIMEOUT),o=String.fromCharCode(...s);if("OHAI"!==o)throw new zs(`Failed to start stub. Unexpected response ${o}`);return this.info("Stub running..."),this.IS_STUB=!0,this.chip}async changeBaud(){this.info("Changing baudrate to "+this.baudrate);const t=this.IS_STUB?this.romBaudrate:0,e=this._appendArray(this._intToByteArray(this.baudrate),this._intToByteArray(t));await this.command(this.ESP_CHANGE_BAUDRATE,e),this.info("Changed"),this.info("If the chip does not respond to any further commands, consider using a lower baud rate."),await na(50),await this.transport.disconnect(),await na(50),await this.transport.connect(this.baudrate,this.serialOptions),await na(50),this.transport.readLoop()}async main(t="default_reset"){await this.detectChip(t);const e=await this.chip.getChipDescription(this);if(this.chip.getChipRevision){const t=await this.chip.getChipRevision(this);this.info("Chip Revision: "+t)}this.info("Chip is "+e),this.info("Features: "+await this.chip.getChipFeatures(this)),this.info("Crystal is "+await this.chip.getCrystalFreq(this)+"MHz"),this.info("MAC: "+await this.chip.readMac(this)),await this.chip.readMac(this),void 0!==this.chip.postConnect&&await this.chip.postConnect(this),await this.runStub(),this.romBaudrate!==this.baudrate&&await this.changeBaud();try{const t=await this.readFlashId();this.info("Flash ID: "+t.toString(16)),16777215!==t&&0!==t||this.info("WARNING: Failed to communicate with the flash chip,\nread/write operations will fail.\nTry checking the chip connections or removing\nany other hardware connected to IOs.")}catch(t){throw new zs("Unable to verify flash chip connection "+t)}return e}flashSizeBytes(t){let e=-1;return this.transport.trace(`Flash size string ${t}`),-1!==t.toString().indexOf("KB")?e=1024*parseInt(t.toString().slice(0,t.toString().indexOf("KB"))):-1!==t.toString().indexOf("MB")&&(e=1024*parseInt(t.toString().slice(0,t.toString().indexOf("MB")))*1024),this.transport.trace(`Flash size in bytes ${e}`),e}parseFlashSizeArg(t){if(void 0===this.chip.FLASH_SIZES[t])throw new zs("Flash size "+t+" is not supported by this chip type. Supported sizes: "+this.chip.FLASH_SIZES);return this.chip.FLASH_SIZES[t]}async _updateImageFlashParams(t,e,i="keep",s="keep",o="keep"){if(this.debug(`_update_image_flash_params ${o} ${i} ${s}`),t.length<8)return t;if(e!=this.chip.BOOTLOADER_FLASH_OFFSET)return t;if("keep"===o&&"keep"===i&&"keep"===s)return this.info("Not changing the image"),t;const r=t[0];let n=t[2];const a=t[3];if(r!==this.ESP_IMAGE_MAGIC)return this.info("Warning: Image file at 0x"+e.toString(16)+" doesn't look like an image file, so not changing any flash settings."),t;try{(await Ha(this.chip,t)).verify()}catch(i){return this.debug(`Warning: Image file at 0x${e.toString(16)} is not a valid ${this.chip.CHIP_NAME} image, so not changing any flash settings.`),t}const l="ESP8266"!==this.chip.CHIP_NAME&&49===t[23];if("keep"!==i){n={qio:0,qout:1,dio:2,dout:3}[i]}let c=15&a;if("keep"!==s){c={"40m":0,"26m":1,"20m":2,"80m":15}[s]}let h=240&a;if("keep"!==o)if("detect"===o){this.info("Configuring flash size...");const t=await this.detectFlashSize();this.info("Detected flash size set to "+t),h=this.parseFlashSizeArg(t)}else h=this.parseFlashSizeArg(o);const d=n<<8|c+h;this.info("Flash params set to "+d.toString(16));const A=new Uint8Array(t);if(t[2]!==n&&(A[2]=n),t[3]!==c+h&&(A[3]=c+h),l){const t=await Ha(this.chip,A),e=A.slice(0,t.datalength),i=A.slice(t.datalength+t.SHA256_DIGEST_LEN),s=await crypto.subtle.digest("SHA-256",i),o=new Uint8Array(s),r=new Uint8Array(e.length+o.length+i.length);r.set(e,0),r.set(o,e.length),r.set(i,e.length+o.length);const n=r.slice(t.datalength,t.datalength+t.SHA256_DIGEST_LEN);return this.transport.hexify(o)===this.transport.hexify(n)?this.info("SHA digest in image updated"):this.info(`WARNING: SHA recalculation for binary failed!\n\tExpected calculated SHA: ${this.transport.hexify(o)}\n\tSHA stored in binary:    ${this.transport.hexify(n)}`),r}return A}async writeFlash(t){if(this.debug("EspLoader program"),"keep"!==t.flashSize){const e=this.flashSizeBytes(t.flashSize);for(let i=0;i<t.fileArray.length;i++)if(t.fileArray[i].data.length+t.fileArray[i].address>e)throw new zs(`File ${i+1} doesn't fit in the available flash`)}let e,i;!0===this.IS_STUB&&!0===t.eraseAll&&await this.eraseFlash();for(let s=0;s<t.fileArray.length;s++){if(this.debug("Data Length "+t.fileArray[s].data.length),e=t.fileArray[s].data,this.debug("Image Length "+e.length),0===e.length){this.debug("Warning: File is empty");continue}e=sa(e,4),i=t.fileArray[s].address,e=await this._updateImageFlashParams(e,i,t.flashMode,t.flashFreq,t.flashSize);let o=null;t.calculateMD5Hash&&(o=t.calculateMD5Hash(e),this.debug("Image MD5 "+o));const r=e.length;let n;if(t.compress){e=ea(e,{level:9}),n=await this.flashDeflBegin(r,e.length,i)}else n=await this.flashBegin(r,i);let a=0,l=0;const c=e.length;t.reportProgress&&t.reportProgress(s,0,c);let h=new Date;const d=h.getTime();let A=5e3;const g=new ia({chunkSize:1});let u=0;g.onData=function(t){u+=t.byteLength};let _=0;for(;_<e.length;){this.debug("Write loop "+i+" "+a+" "+n),this.info("Writing at 0x"+(i+u).toString(16)+"... ("+Math.floor(100*(a+1)/n)+"%)");const o=Math.min(this.FLASH_WRITE_SIZE,e.length-_),r=e.slice(_,_+o),h=_+o>=e.length;if(!t.compress)throw new zs("Yet to handle Non Compressed writes");{const t=u;g.push(r,h);const e=u-t;let i=3e3;this.timeoutPerMb(this.ERASE_WRITE_TIMEOUT_PER_MB,e)>3e3&&(i=this.timeoutPerMb(this.ERASE_WRITE_TIMEOUT_PER_MB,e)),!1===this.IS_STUB&&(A=i),await this.flashDeflBlock(r,a,A),this.IS_STUB&&(A=i)}l+=r.length,_+=o,a++,t.reportProgress&&t.reportProgress(s,l,c)}this.IS_STUB&&(t.compress?await this.flashDeflFinish(!1,A):await this.flashFinish(!1,A)),h=new Date;const p=h.getTime()-d;if(t.compress&&this.info("Wrote "+r+" bytes ("+l+" compressed) at 0x"+i.toString(16)+" in "+p/1e3+" seconds."),o){this.info("File  md5: "+o);const t=await this.flashMd5sum(i,r);if(this.info("Flash md5: "+t),new String(t).valueOf()!=new String(o).valueOf())throw new zs("MD5 of file does not match data in flash!");this.info("Hash of data verified.")}}this.info("Leaving...")}async flashId(){this.debug("flash_id");const t=await this.readFlashId();this.info("Manufacturer: "+(255&t).toString(16));const e=t>>16&255;this.info("Device: "+(t>>8&255).toString(16)+e.toString(16)),this.info("Detected flash size: "+this.DETECTED_FLASH_SIZES[e])}async detectFlashSize(){this.debug("detectFlashSize");const t=await this.readFlashId()>>16&255;let e=this.DETECTED_FLASH_SIZES[t];return e?this.info("Auto-detected Flash size: "+e):(e="4MB",this.info("Could not auto-detect Flash size. defaulting to 4MB")),e}async softReset(t){if(this.IS_STUB){if("ESP8266"!=this.chip.CHIP_NAME)throw new zs("Soft resetting is currently only supported on ESP8266");t?(await this.flashBegin(0,0),await this.flashFinish(!0)):await this.command(this.ESP_RUN_USER_CODE,void 0,void 0,!1)}else{if(t)return;await this.flashBegin(0,0),await this.flashFinish(!1)}}async after(t="hard_reset",e,i){switch(t){case"hard_reset":if(this.resetConstructors.hardReset){this.info("Hard resetting via RTS pin...");const t=this.resetConstructors.hardReset(this.transport,e);await t.reset()}break;case"soft_reset":this.info("Soft resetting..."),await this.softReset(!1);break;case"no_reset_stub":this.info("Staying in flasher stub.");break;case"custom_reset":if(i||this.info("Custom reset sequence not provided, doing nothing."),this.resetConstructors.customReset||this.info("Custom reset constructor not available, doing nothing."),this.resetConstructors.customReset&&i){this.info("Custom resetting using sequence "+i);const t=this.resetConstructors.customReset(this.transport,i);await t.reset()}break;default:this.info("Staying in bootloader."),this.IS_STUB&&this.softReset(!0)}}}const La=[73,77,80,82,79,86];let Na="";const $a=new WeakMap;function Ya(t){$a.delete(t);try{t.releaseLock()}catch{}}const Ka=new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`,"g");function Ja(t,e){const i=La.length+1+1+1+e.length+1+1,s=new Uint8Array(i);let o=0;for(const t of La)s[o++]=t;s[o++]=1,s[o++]=t,s[o++]=e.length;for(const t of e)s[o++]=t;let r=0;for(let t=0;t<o;t++)r=r+s[t]&255;return s[o++]=r,s[o]=10,s}function Wa(){return Ja(3,[4,0])}function ja(){return Ja(3,[2,0])}function Va(t){switch(t.type){case 1:{const e=t.data[0];return`CURRENT_STATE ${2===e?"AUTHORIZED":4===e?"PROVISIONED":`state=0x${e?.toString(16).padStart(2,"0")}`}`}case 2:{const e=t.data[0];return`ERROR_STATE 0x${e?.toString(16).padStart(2,"0")}`}case 3:{const e=t.data[0];return`RPC_COMMAND 0x${e?.toString(16).padStart(2,"0")}`}case 4:{const e=t.data[0],i=2===e?"GET_CURRENT_STATE":3===e?"GET_DEVICE_INFO":4===e?"WIFI_SCAN":1===e?"WIFI_SETTINGS":`cmd=0x${e?.toString(16).padStart(2,"0")}`;if((2===e||1===e)&&t.data.length>=3){const e=t.data[2];if(t.data.length>=3+e){return`RPC_RESULT ${i} url="${(new TextDecoder).decode(t.data.slice(3,3+e))}"`}}return`RPC_RESULT ${i} (${t.data.length} bytes)`}default:return`type=0x${t.type.toString(16).padStart(2,"0")} (${t.data.length} bytes)`}}function Za(t){const e=[],i=La.length,s=La[0];let o=t.indexOf(s);if(o<0)return{packets:e,consumed:0};let r=0;for(;o>=0&&o<=t.length-i;){let n=!0;for(let e=0;e<i;e++)if(t[o+e]!==La[e]){n=!1;break}if(!n){o=t.indexOf(s,o+1);continue}const a=o+i;if(a+3>=t.length)break;const l=t[a+1],c=t[a+2],h=a+3+c+1;if(h>t.length)break;let d=0;for(let e=o;e<h-1;e++)d=d+t[e]&255;if(d!==t[h-1]){o=t.indexOf(s,o+1);continue}const A=t.slice(a+3,a+3+c);e.push({type:l,data:A}),o=h,o<t.length&&10===t[o]&&o++,r=o,o=t.indexOf(s,o)}return{packets:e,consumed:r}}async function Xa(t,e){await t.write(e)}async function qa(t,e,i){const s=i??[],o=Date.now()+e,r=Symbol();for(;Date.now()<o;){const e=o-Date.now();if(e<=0)break;let i,n,a=$a.get(t);a||(a=t.read(),$a.set(t,a));try{n=await Promise.race([a,new Promise(t=>{i=setTimeout(()=>t(r),e)})])}catch(e){throw $a.delete(t),e}finally{clearTimeout(i)}if(n===r)break;$a.delete(t);const l=n;if(l.value){Na+=new TextDecoder("utf-8",{fatal:!1}).decode(l.value).replace(Ka,"");const t=Na.lastIndexOf("\n");if(t>=0){const e=Na.slice(0,t);Na=Na.slice(t+1);for(const t of e.split("\n"))t.length>0&&console.debug(t)}s.push(...l.value);const{packets:e,consumed:i}=Za(new Uint8Array(s));if(e.length>0){for(const t of e)console.debug(`[improv] ${Va(t)}`);return s.splice(0,i),{packets:e,buffer:s}}}if(l.done)break}throw Object.assign(new Error("timeout"),{errorKey:"flasher.errors.timeout"})}function tl(t){if(0===t.length)return null;const e=new TextDecoder;let i=0;const s=(s=Number.POSITIVE_INFINITY)=>{if(i>=t.length)return null;const o=t[i++];if(i+o>t.length)return null;const r=Math.min(o,s),n=e.decode(t.slice(i,i+r));return i+=o,n},o=s(32);if(null===o)return null;const r=s();if(null===r)return null;const n=s();if(null===n)return null;const a=Number.parseInt(r,10);if(Number.isNaN(a))return null;return{ssid:o.replace(/[\x00-\x1f\x7f]/g,""),rssi:a,authRequired:"YES"===n}}const el=/MAC:\s*([0-9A-Fa-f:]{17})/;async function il(t,e){if(!t.readable)try{await t.open({baudRate:115200})}catch{throw Object.assign(new Error("Could not open serial port. Unplug the device, plug it back in, and try again."),{errorKey:"usb.errors.port_open_failed"})}try{await t.setSignals({dataTerminalReady:!1,requestToSend:!0}),await new Promise(t=>setTimeout(t,200)),await t.setSignals({dataTerminalReady:!1,requestToSend:!1})}catch{}const i=e?.drainDelay??200,s=t.readable.getReader();for(;;){const t=await Promise.race([s.read(),new Promise(t=>setTimeout(()=>t({value:void 0,done:!0}),i))]);if(t.done||!t.value)break}Ya(s);const o=t.writable.getWriter(),r=e?.handshakeRetryDelay??2e3,n=e?.handshakeDelay??3e3;let a=!1;for(let e=0;e<5;e++){e>0&&await new Promise(t=>setTimeout(t,r));try{await Xa(o,ja());const e=t.readable.getReader();try{await qa(e,n),a=!0}finally{Ya(e)}}catch{}if(a)break}if(!a)throw o.releaseLock(),Object.assign(new Error("No response from device — it may be flashed with ethernet firmware which does not support WiFi configuration."),{errorKey:"usb.errors.no_device_response"});return o}async function sl(t,e){const i=await il(t,e);try{const s=Ja(3,[3,0]);await Xa(i,s),await new Promise(t=>setTimeout(t,500));for(let s=0;s<3;s++){s>0&&await new Promise(t=>setTimeout(t,e?.retryDelay??3e3));const o=Wa();await Xa(i,o);const r=t.readable.getReader(),n=[],a=Date.now()+5e3,l=[];let c=!1;for(;Date.now()<a&&!c;)try{const t=await qa(r,a-Date.now(),l);for(const e of t.packets)if(4===e.type&&4===e.data[0]){const t=tl(e.data.slice(2,2+e.data[1]));if(null===t){if(c=!0,n.length>0)return{writer:i,reader:r,networks:n};break}n.push(t)}}catch{break}if(n.length>0)return{writer:i,reader:r,networks:n};Ya(r)}return{writer:i,reader:t.readable.getReader(),networks:[]}}catch(t){try{i.releaseLock()}catch{}throw t}}async function ol(t,e,i){await Xa(t,function(t,e){const i=new TextEncoder,s=i.encode(t),o=i.encode(e);return Ja(3,[1,1+s.length+1+o.length,s.length,...s,o.length,...o])}(e,i))}const rl=1e3;async function nl(t,e,i,s){const o=new TextDecoder,r=/(\d+\.\d+\.\d+\.\d+)/,n=Date.now()+i,a=s?.initialBuffer??[];let l=0,c=s?.startPolling??!1;const h=s?.signal;for(console.debug(`[detectIpAddress] enter timeout=${i}ms initialBuffer=${a.length}B startPolling=${c}`);Date.now()<n;){if(h?.aborted)throw console.debug("[detectIpAddress] aborted via signal"),Object.assign(new Error("aborted"),{errorKey:"flasher.errors.aborted"});c&&Date.now()-l>=rl&&(console.debug("[detectIpAddress] polling GET_CURRENT_STATE"),await Xa(e,ja()),l=Date.now());try{const e=Math.min(rl,n-Date.now()),i=await qa(t,e,a);for(const t of i.packets){if(2===t.type){const e=t.data[0],i={1:"Invalid command — device may need to be power-cycled",2:"Unknown command",3:"WiFi connection failed — check SSID/password and try again",4:"Not authorized"},s={1:"wifi.errors.invalid_command",2:"wifi.errors.unknown_command",3:"wifi.errors.connection_failed",4:"wifi.errors.not_authorized"}[e]??"wifi.errors.error_code";throw console.debug(`[detectIpAddress] ERROR_STATE code=${e} → ${s}`),Object.assign(new Error(i[e]??`WiFi error (code ${e})`),{errorKey:s,errorParams:"wifi.errors.error_code"===s?{code:e}:void 0})}if(4===t.type&&t.data.length>=3&&(1===t.data[0]||2===t.data[0])){const e=t.data[2];if(t.data.length<3+e){console.debug(`[detectIpAddress] truncated RPC_RESULT cmd=0x${t.data[0]?.toString(16)} urlLen=${e} dataLen=${t.data.length} — skipped`);continue}const i=o.decode(t.data.slice(3,3+e)),s=r.exec(i);if(s&&"0.0.0.0"!==s[1])return console.debug(`[detectIpAddress] exit: IP=${s[1]}`),s[1];s&&"0.0.0.0"===s[1]&&(c=!0)}}}catch(t){if(t instanceof Error&&"flasher.errors.timeout"!==t.errorKey)throw console.debug(`[detectIpAddress] exit: error "${t.message}"`),t}}throw console.debug("[detectIpAddress] exit: deadline exhausted, no IP received"),Object.assign(new Error("WiFi connection failed — check SSID/password and try again"),{errorKey:"wifi.errors.connection_failed"})}const al="zones",ll={"":{view:"live",sidebarTab:al},settings:{view:"settings",sidebarTab:al},tutorial:{view:"tutorial",sidebarTab:al},calibrate:{view:"calibrate",sidebarTab:al},zones:{view:"editor",sidebarTab:"zones"},overlays:{view:"editor",sidebarTab:"overlays"},furniture:{view:"editor",sidebarTab:"furniture"}};function cl(t){const e=t.startsWith("#")?t.slice(1):t;return ll[e]??ll[""]}function hl(t){return"live"===t.view?"":"editor"===t.view?`#${t.sidebarTab}`:`#${t.view}`}function dl(){return document.querySelector("home-assistant")?.shadowRoot?.querySelector("home-assistant-main")?.shadowRoot?.querySelector("partial-panel-resolver")??null}function Al(){const t=dl()?.querySelector("ha-panel-custom")??null;t&&"eppgrid-panel"===t.panel?.config?._panel_custom?.name&&(function(t){const e=t.panel?.config?._panel_custom?.name;return"eppgrid-panel"===e&&0===t.children.length}(t)?function(t){const e=document.querySelector("home-assistant"),i=e?.hass;if(!i)return;const s=document.createElement("eppgrid-panel");s.hass=i,s.panel=t.panel,t.appendChild(s)}(t):function(t){const e=Array.from(t.children).filter(t=>"eppgrid-panel"===t.tagName.toLowerCase());for(let t=1;t<e.length;t++)e[t].remove()}(t))}const gl=()=>{"visible"===document.visibilityState&&Al()};let ul=null,_l=null;function pl(t,e,i){if(t?.node===e)return t;t?.observer.disconnect();const s=new MutationObserver(i);return s.observe(e,{childList:!0}),{node:e,observer:s}}function fl(t){ul=pl(ul,t,()=>Al())}function wl(){const t=dl();if(!t)return;var e;_l=pl(_l,e=t,()=>{const t=e.querySelector("ha-panel-custom");t&&fl(t),Al()});const i=t.querySelector("ha-panel-custom");i&&fl(i)}const El=n`
  :host {
    display: flex;
    height: 100%;
    background: var(--primary-background-color, #fafafa);
    color: var(--primary-text-color, #212121);
    font-family: var(--ha-font-family-body, "Roboto", sans-serif);
  }
`,ml=n`
  .panel {
    padding: 24px;
    max-width: 1100px;
    margin: 0 auto;
    font-size: 14px;
  }
`,bl=n`
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
`,yl=n`
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
`,vl=n`
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
`,Cl=new Set;let Bl=null,Sl=null,Il=null,xl=null;function Dl(t){return(e,i,s)=>{for(const o of Cl)if(o.intercept(t,[e,i,s]))return;const o=location.hash;if(t(e,i,s),location.hash!==o)for(const t of Cl)t.hashMoved()}}class Ml extends ct{constructor(){super(...arguments),this._deviceCtrl=new ys(this),this._gridCtrl=new Rs(this),this._targetCtrl=new Fs(this),this._flasherCtrl=new Cs(this),this._localize=Object.assign(t=>t,{formatNumber:(t,e=1)=>t.toFixed(e),lang:"en"}),this._currentLang="",this._grid=new Uint8Array(Xe),this._zoneConfigs=qi,this._activeZone=null,this._targetAutoDistance=!0,this._targetMaxDistance=6,this._stuckTargetTimeout=300,this._staticAutoDistance=!0,this._staticMinDistance=.3,this._staticMaxDistance=16,this._temperatureOffset=0,this._humidityOffset=0,this._illuminanceOffset=0,this._motionTimeout=5,this._staticTimeout=30,this._staticTriggerThreshold=3,this._staticRenewThreshold=3,this._staticOnDelay=0,this._logLevels={},this._bluetoothEnabled=!1,this._co2Enabled=!1,this._ledMode="Manual Control",this._ledBrightness=1,this._ledPresenceColor="#CC33FF",this._relayTriggerMode="disabled",this._relayContactMode="no",this._targetUpdateRateMs=1e3,this._zoneUpdateRateMs=1e3,this._entitiesConfig={},this._sidebarTab=cl("undefined"!=typeof location?location.hash:"").sidebarTab,this._panelTab="config",this._showDeleteCalibrationDialog=!1,this._showLiveMenu=!1,this._showCustomIconPicker=!1,this._customIconValue="",this._furniture=[],this._selectedFurnitureId=null,this._furnitureClipboard=null,this._dragState=null,this._targets=[],this._rawTargets=[],this._sensorState={occupancy:!1,static_presence:!1,motion_presence:!1,target_presence:!1,mmwave:!1,illuminance:null,temperature:null,humidity:null,co2:null},this._zoneState={occupancy:{},target_counts:{},frame_count:0},this._showHitCounts=!1,this._showDebugLog=!1,this._debugLogLines=[],this._debugLogPrev=null,this._showBackendDebugLog=!1,this._backendDebugLogLines=[],this._backendDebugLogPrev=null,this._overlayMode=null,this._targetMenu=null,this._dismissedTargets=new Map,this._isPainting=!1,this._justPainted=!1,this._paintAction="set",this._frozenBounds=null,this._saving=!1,this._dirty=!1,this._showUnsavedDialog=!1,this._pendingNavigation=null,this._showConfigurationBackup=!1,this._showConfigurationRestore=!1,this._configurationName="",this._devices=[],this._selectedMac="",this._loading=!0,this._loadedConfigMac=null,this._initRetryCount=0,this._haConnected=!0,this._listeningConnection=null,this._onHaReady=()=>{const t=!this._haConnected;this._haConnected=!0,t&&this._initialize().catch(()=>{})},this._onHaDisconnected=()=>{this._haConnected=!1},this._view=cl("undefined"!=typeof location?location.hash:"").view,this._openAccordions=new Set,this._perspective=null,this._roomWidth=0,this._roomDepth=0,this._beforeUnloadHandler=t=>{this._dirty&&(t.preventDefault(),t.returnValue="")},this._originalPushState=null,this._originalReplaceState=null,this._historyInterceptor=null,this._interceptNavigation=()=>!!this._dirty&&(this._showUnsavedDialog=!0,this._pendingNavigation=null,!0),this._onKeyDown=t=>{if("editor"!==this._view||"furniture"!==this._sidebarTab)return;if(!this._selectedFurnitureId)return;if(!t.composedPath().some(t=>{if(!(t instanceof HTMLElement))return!1;const e=t.tagName;return"INPUT"===e||"TEXTAREA"===e||"SELECT"===e||t.isContentEditable}))if("Backspace"===t.key||"Delete"===t.key)t.preventDefault(),this._removeFurniture(this._selectedFurnitureId);else if("Escape"===t.key)t.preventDefault(),this._selectedFurnitureId=null;else if("c"===t.key&&(t.ctrlKey||t.metaKey)){const t=this._furniture.find(t=>t.id===this._selectedFurnitureId);t&&(this._furnitureClipboard={...t})}else if("x"===t.key&&(t.ctrlKey||t.metaKey)){const t=this._furniture.find(t=>t.id===this._selectedFurnitureId);t&&(this._furnitureClipboard={...t},this._removeFurniture(t.id))}else if("v"===t.key&&(t.ctrlKey||t.metaKey)){if(!this._furnitureClipboard)return;t.preventDefault();const e=`f_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,i=this._furnitureClipboard,s=this._getRoomBounds(),o=Math.ceil(this._roomWidth/qe),r=Math.floor((Ve-o)/2),n=(s.minCol-r)*qe,a=(s.maxCol+1-r)*qe,l=s.minRow*qe,c=(s.maxRow+1)*qe,h=300,d={...i,id:e,x:Math.max(n,Math.min(a-i.width,i.x+h)),y:Math.max(l,Math.min(c-i.height,i.y+h))};this._furniture=[...this._furniture,d],this._selectedFurnitureId=d.id,this._dirty=!0}},this._onHashChange=()=>{const t=cl(location.hash);t.view===this._view&&t.sidebarTab===this._sidebarTab||(this._dirty&&this._replaceHash(hl({view:this._view,sidebarTab:this._sidebarTab})),this._guardNavigation(()=>this._applyView(t)))},this._initializeInFlight=null,this._fovCache=null,this._fovPerspective=Ml._FOV_UNCACHED,this._maxRangeCache=null,this._maxRangeCacheGrid=null,this._maxRangeCacheAuto=null,this._maxRangeCacheMax=null,this._configurationMetricsCache=new WeakMap,this._handleUsbRetry=()=>{const t=this._flasherCtrl,e=t.usbFlashState,i=e?.lastStep,s=e?.variant;try{t._serialReader?.releaseLock()}catch{}try{t._serialWriter?.releaseLock()}catch{}t._serialReader=null,t._serialWriter=null;("connecting"===i||"flashing"===i||"wifi_check"===i)&&s?this._handleUsbFlash(s):this._handleUsbWifiConfig()}}get _zoneEngineState(){return this._targetCtrl.zoneEngineState}set _zoneEngineState(t){this._targetCtrl.zoneEngineState=t}connectedCallback(){super.connectedCallback(),wl(),this._initialize().catch(()=>{}),window.addEventListener("beforeunload",this._beforeUnloadHandler),window.addEventListener("keydown",this._onKeyDown),window.addEventListener("hashchange",this._onHashChange),this._historyInterceptor??={intercept:(t,e)=>!!this._interceptNavigation()&&(this._pendingNavigation=()=>{t(...e),window.dispatchEvent(new PopStateEvent("popstate")),this._onHashChange()},!0),hashMoved:()=>this._onHashChange()},function(t){if(Cl.add(t),Bl&&history.pushState===Bl)return;const e=window;e.__eppOriginalPushState||(e.__eppOriginalPushState=history.pushState.bind(history)),e.__eppOriginalReplaceState||(e.__eppOriginalReplaceState=history.replaceState.bind(history)),Il=e.__eppOriginalPushState,xl=e.__eppOriginalReplaceState,Bl=Dl(Il),Sl=Dl(xl),history.pushState=Bl,history.replaceState=Sl}(this._historyInterceptor);const t=window;this._originalPushState=t.__eppOriginalPushState,this._originalReplaceState=t.__eppOriginalReplaceState}disconnectedCallback(){var t;super.disconnectedCallback(),this._initRetryTimer&&(clearTimeout(this._initRetryTimer),this._initRetryTimer=void 0),this._closeDeviceSession(),this._detachConnectionListeners(),window.removeEventListener("beforeunload",this._beforeUnloadHandler),window.removeEventListener("keydown",this._onKeyDown),window.removeEventListener("hashchange",this._onHashChange),this._historyInterceptor&&(t=this._historyInterceptor,Cl.delete(t),Cl.size>0||(Il&&history.pushState===Bl&&(history.pushState=Il),xl&&history.replaceState===Sl&&(history.replaceState=xl),Bl=null,Sl=null,Il=null,xl=null))}_attachConnectionListeners(t){t&&this._listeningConnection!==t&&(this._detachConnectionListeners(),"function"==typeof t.addEventListener&&(t.addEventListener("ready",this._onHaReady),t.addEventListener("disconnected",this._onHaDisconnected),this._listeningConnection=t))}_detachConnectionListeners(){const t=this._listeningConnection;t&&"function"==typeof t.removeEventListener&&(t.removeEventListener("ready",this._onHaReady),t.removeEventListener("disconnected",this._onHaDisconnected)),this._listeningConnection=null}willUpdate(t){if(t.has("hass")){const t=this.hass?.locale?.language??this.hass?.language;t!==this._currentLang&&(this._currentLang=t,this._localize=function(t){const e=t?.locale?.language??t?.language??"en",i=e.split("-")[0],s=ke[e]?e:ke[i]?i:"en",o=ke[s],r=ke.en,n=new Map,a=new Map,l=(t,e)=>{if(n.size>=256&&!n.has(t)){const t=n.keys().next().value;void 0!==t&&n.delete(t)}n.set(t,e)},c=(t,e)=>{const i=Fe(o,t)??Fe(r,t)??t;if(!e)return i;let a;if(n.has(i)){if(a=n.get(i),null===a)return i}else{try{a=new Re(i,s)}catch{return l(i,null),i}l(i,a)}try{return a.format(e)}catch{return i}};return c.formatNumber=(t,e=1)=>{let i=a.get(e);return i||(i=new Intl.NumberFormat(s,{minimumFractionDigits:e,maximumFractionDigits:e}),a.set(e,i)),i.format(t)},c.lang=s,c}(this.hass))}t.has("_view")&&"editor"!==this._view&&(this._sidebarTab=al),(t.has("_view")||t.has("_sidebarTab"))&&this._syncHashFromState()}_replaceHash(t){if("undefined"==typeof location)return;if(t===location.hash)return;const e=`${location.pathname}${location.search}${t}`;(this._originalReplaceState??history.replaceState.bind(history))(history.state,"",e)}_syncHashFromState(){this._replaceHash(hl({view:this._view,sidebarTab:this._sidebarTab}))}_applyView(t){this._view=t.view,this._sidebarTab=t.sidebarTab,"editor"===t.view&&"overlays"!==t.sidebarTab&&(this._overlayMode=null),"editor"!==t.view&&"tutorial"!==t.view&&"calibrate"!==t.view||this._pushWidenedDistanceOverride()}updated(t){if(t.has("hass")&&this.hass){this._deviceCtrl.hass=this.hass,this._flasherCtrl.hass=this.hass;const t=this.hass.connection;if(t&&(this.isConnected&&this._attachConnectionListeners(t),"boolean"==typeof t.connected&&(this._haConnected=t.connected)),!this._haConnected)return;this._loading&&!this._devices.length?this._initialize().catch(()=>{}):this._selectedMac&&this._isSelectedDeviceAvailable()&&!this._deviceCtrl.hasDeviceSession&&!this._deviceCtrl.reconnecting&&this._ensureSession(this._selectedMac)}}_ensureSession(t){this.isConnected&&(this._loadedConfigMac===t?this._deviceCtrl.reopenSession(t).catch(()=>{}):this._loadDeviceConfig(t).catch(()=>{}))}async _initialize(){if(this._initializeInFlight)return this._initializeInFlight;const t=this._runInitialize();this._initializeInFlight=t;try{await t}finally{this._initializeInFlight===t&&(this._initializeInFlight=null)}}async _runInitialize(){if(!this.hass)return;if(!this.isConnected)return;const t=void 0!==this._initRetryTimer;if(this._initRetryTimer&&(clearTimeout(this._initRetryTimer),this._initRetryTimer=void 0),t||0!==this._devices.length||(this._loading=!0),this._deviceCtrl.hass=this.hass,await this._subscribeDevices(),this.isConnected){if(0===this._devices.length)return this._initRetryCount+=1,this._loading=!1,void(this._initRetryTimer=setTimeout(()=>{this.isConnected&&this._initialize().catch(()=>{})},2e3));this._initRetryCount=0,this._selectedMac&&this._isSelectedDeviceAvailable()&&this._ensureSession(this._selectedMac),this._loading=!1}}async _subscribeDevices(){this._deviceCtrl.hass=this.hass,this._deviceCtrl.isHostDirty=()=>this._dirty,this._deviceCtrl.onDeviceListChanged=()=>{const t=this._selectedMac;this._devices=this._deviceCtrl.devices,this._selectedMac=this._deviceCtrl.selectedMac,this._devices.length>0&&(this._initRetryCount=0),""!==t&&""!==this._selectedMac&&t!==this._selectedMac&&(bs(this._selectedMac),this._furnitureClipboard=null,this._isSelectedDeviceAvailable()&&this._loadDeviceConfig(this._selectedMac).catch(()=>{}))},this._deviceCtrl.onSelectedAvailable=t=>{this._ensureSession(t)},this._deviceCtrl.onSessionClosed=()=>{const t=this._sensorState;this._targets=[],this._rawTargets=[],this._sensorState={occupancy:!1,static_presence:!1,motion_presence:!1,target_presence:!1,mmwave:!1,illuminance:null,temperature:null,humidity:null,co2:null,temperature:t.temperature,humidity:t.humidity,illuminance:t.illuminance,co2:t.co2},this._zoneState={occupancy:{},target_counts:{},frame_count:0},this._targetCtrl.resetZoneEngineState()},await this._deviceCtrl.subscribeDeviceList(),this._devices=this._deviceCtrl.devices,this._selectedMac=this._deviceCtrl.selectedMac}_isSelectedDeviceAvailable(){const t=this._devices.find(t=>t.mac===this._selectedMac);return!!t?.available}async _loadDevices(){this._deviceCtrl.hass=this.hass,await this._deviceCtrl.loadDevices(),this._devices=this._deviceCtrl.devices,this._selectedMac=this._deviceCtrl.selectedMac}async _loadDeviceConfig(t){this._deviceCtrl.hass=this.hass,this._deviceCtrl.onTargetData=t=>{this._targetCtrl.handleTargetData(t)},this._deviceCtrl.onRawTargetData=t=>{this._targetCtrl.handleRawTargetData(t)};const e=await this._deviceCtrl.loadDeviceConfig(t);if(!this.isConnected)return void this._deviceCtrl.closeDeviceSession();if(this._selectedMac!==t)return void this._deviceCtrl.closeDeviceSession();e&&this._applyConfig(e);const i=this._devices.find(e=>e.mac===t);i&&(this._bluetoothEnabled=i.bluetooth_enabled??!1,this._co2Enabled=i.co2_enabled??!1)}_applyConfig(t){const e=ds(t);this._perspective=e.calibration.perspective,this._roomWidth=e.calibration.roomWidth,this._roomDepth=e.calibration.roomDepth,this._furniture=e.furniture,this._grid=e.grid,this._zoneConfigs=[e.zone0,...e.zoneConfigs];const i=e.settings;this._temperatureOffset=i.temperatureOffset,this._humidityOffset=i.humidityOffset,this._illuminanceOffset=i.illuminanceOffset,this._motionTimeout=i.motionTimeout,this._targetAutoDistance=i.targetAutoDistance,this._targetMaxDistance=i.targetMaxDistance,this._stuckTargetTimeout=i.stuckTargetTimeout,this._staticAutoDistance=i.staticAutoDistance,this._staticMinDistance=i.staticMinDistance,this._staticMaxDistance=i.staticMaxDistance,this._staticTriggerThreshold=i.staticTriggerThreshold,this._staticRenewThreshold=i.staticRenewThreshold,this._staticTimeout=i.staticTimeout,this._staticOnDelay=i.staticOnDelay,this._relayTriggerMode=i.relayTriggerMode,this._relayContactMode=i.relayContactMode,this._targetUpdateRateMs=i.targetUpdateRateMs,this._zoneUpdateRateMs=i.zoneUpdateRateMs,this._entitiesConfig=i.entities,this._logLevels=e.settings.logLevels,this._ledMode=e.settings.ledMode,this._ledBrightness=e.settings.ledBrightness,this._ledPresenceColor=e.settings.ledPresenceColor,this._loadedConfigMac=this._selectedMac}_closeDeviceSession(){this._deviceCtrl.closeDeviceSession(),this._targets=[],this._rawTargets=[],this._sensorState={occupancy:!1,static_presence:!1,motion_presence:!1,target_presence:!1,mmwave:!1,illuminance:null,temperature:null,humidity:null,co2:null},this._zoneState={occupancy:{},target_counts:{},frame_count:0},this._targetCtrl.resetZoneEngineState()}_onCellMouseDown(t){this._gridCtrl.onCellMouseDown(t)}_onCellMouseEnter(t){this._gridCtrl.onCellMouseEnter(t)}_onCellMouseUp(){this._gridCtrl.onCellMouseUp()}_applyPaintToCell(t){this._gridCtrl.applyPaintToCell(t)}_addZone(){this._gridCtrl.addZone()}_removeZone(t){this._gridCtrl.removeZone(t)}_addFurniture(t){this._gridCtrl.addFurniture(t)}_addCustomFurniture(t){this._gridCtrl.addCustomFurniture(t)}_removeFurniture(t){this._gridCtrl.removeFurniture(t)}_updateFurniture(t,e){this._gridCtrl.updateFurniture(t,e)}_mmToPx(t,e){return Ei(t,e)}_pxToMm(t,e){return mi(t,e)}_onFurniturePointerDown(t,e,i,s,o){this._gridCtrl.onFurniturePointerDown(t,e,i,s,o)}_onFurnitureDrag(t){this._gridCtrl.onFurnitureDrag(t)}_namedZones(){return this._zoneConfigs.slice(1)}_getRoomBounds(){return li(this._grid)}_getVisibleRoomBounds(){return Ki(this._grid,this._getSensorFov(),this._roomWidth,this._editorMaxRangeMm())}async _applyLayout(){return this._gridCtrl.applyLayout()}_buildSettingsPayload(){const t={};for(const[e,i]of xs){const s=this[i];t[e]=s??Ss[e]}return t}_buildSparseSettings(){const t=this._buildSettingsPayload(),e={};for(const[i,s]of Object.entries(t)){if("entities"===i)continue;Is(s,Ss[i])||(e[i]=s)}"target_auto_distance"in e||delete e.target_max_distance,"static_auto_distance"in e||(delete e.static_min_distance,delete e.static_max_distance),"relay_trigger_mode"in e||delete e.relay_contact_mode;const i=function(t){if(!t)return{};const e={};for(const[i,s]of Object.entries(t))s!==(Bs[i]??!1)&&(e[i]=s);return e}(t.entities);return Object.keys(i).length>0&&(e.entities=i),e}async _saveSettings(t){return this._gridCtrl.saveSettings(t||{})}async _cancelSettings(){this._dirty=!1,this._view="live",await this._loadDeviceConfig(this._selectedMac)}async _cancelEditor(){const t=this._targetAutoDistance||this._staticAutoDistance;this._dirty=!1,this._selectedFurnitureId=null,this._overlayMode=null,await this._loadDeviceConfig(this._selectedMac),this._view="live",t&&await(this.hass?.callWS({type:"eppgrid/set_distance_override",mac:this._selectedMac,target_max_distance:this._targetMaxDistance,static_min_distance:this._staticMinDistance,static_max_distance:this._staticMaxDistance})?.catch(()=>{}))}_pushWidenedDistanceOverride(){(this._targetAutoDistance||this._staticAutoDistance)&&this.hass?.callWS({type:"eppgrid/set_distance_override",mac:this._selectedMac,target_max_distance:this._targetAutoDistance?6:this._targetMaxDistance,static_min_distance:this._staticAutoDistance?.3:this._staticMinDistance,static_max_distance:this._staticAutoDistance?16:this._staticMaxDistance})?.catch(()=>{})}_enterEditor(t){this._guardNavigation(()=>this._applyView({view:"editor",sidebarTab:t}))}_getConfigurations(){return this._gridCtrl.configurations}async _saveConfiguration(){try{await this._gridCtrl.saveConfiguration()}catch(t){console.error("Failed to save configuration",t)}}async _loadConfiguration(t){try{await this._gridCtrl.loadConfiguration(t)}catch(e){console.error(`Failed to load configuration "${t}"`,e)}}async _deleteConfiguration(t){try{await this._gridCtrl.deleteConfiguration(t)}catch(e){console.error(`Failed to delete configuration "${t}"`,e)}}_initGridFromRoom(){this._grid=di(this._roomWidth,this._roomDepth)}_mapTargetToPercent(t){return function(t,e,i,s){if(i>0&&s>0)return{x:Math.max(0,Math.min(t,i))/i*100,y:Math.max(0,Math.min(e,s))/s*100};return{x:t/ti*100,y:e/ti*100}}(t.x??0,t.y??0,this._roomWidth,this._roomDepth)}_getInversePerspective(){return function(t){if(!t||t.length<8)return null;const e=[t[0],t[1],t[2],t[3],t[4],t[5],t[6],t[7],1],i=e[0]*(e[4]*e[8]-e[5]*e[7])-e[1]*(e[3]*e[8]-e[5]*e[6])+e[2]*(e[3]*e[7]-e[4]*e[6]);if(Math.abs(i)<1e-10)return null;const s=[(e[4]*e[8]-e[5]*e[7])/i,(e[2]*e[7]-e[1]*e[8])/i,(e[1]*e[5]-e[2]*e[4])/i,(e[5]*e[6]-e[3]*e[8])/i,(e[0]*e[8]-e[2]*e[6])/i,(e[2]*e[3]-e[0]*e[5])/i,(e[3]*e[7]-e[4]*e[6])/i,(e[1]*e[6]-e[0]*e[7])/i,(e[0]*e[4]-e[1]*e[3])/i],o=s[8];return Math.abs(o)<1e-10?null:[s[0]/o,s[1]/o,s[2]/o,s[3]/o,s[4]/o,s[5]/o,s[6]/o,s[7]/o]}(this._perspective)}_applyPerspective(t,e,i){return Li(t,e,i)}_getSensorFov(){return this._perspective?(this._fovPerspective===this._perspective||(this._fovCache=Ni(this._perspective),this._fovPerspective=this._perspective),this._fovCache):null}_computeMaxRangeMm(){if(null!==this._maxRangeCache&&this._maxRangeCacheGrid===this._grid&&this._maxRangeCacheAuto===this._targetAutoDistance&&this._maxRangeCacheMax===this._targetMaxDistance)return this._maxRangeCache;const t=(e=this._targetAutoDistance,i=this._targetAutoDistance?this._autoDetectionRange():0,s=this._targetMaxDistance,1e3*(e?i>0?Math.min(i,6):6:s));var e,i,s;return this._maxRangeCacheGrid=this._grid,this._maxRangeCacheAuto=this._targetAutoDistance,this._maxRangeCacheMax=this._targetMaxDistance,this._maxRangeCache=t,t}_getConfigurationMetrics(t){const e=this._perspective,i=this._computeMaxRangeMm(),s=this._configurationMetricsCache.get(t);if(s&&s.perspective===e&&s.maxRangeMm===i)return{widthM:s.widthM,depthM:s.depthM};const o=ji(new Uint8Array(t.grid),t.roomWidth,e,this._getSensorFov(),i),r=o?o.widthM:t.roomWidth/1e3,n=o?o.depthM:t.roomDepth/1e3;return this._configurationMetricsCache.set(t,{perspective:e,maxRangeMm:i,widthM:r,depthM:n}),{widthM:r,depthM:n}}_editorMaxRangeMm(){return this._targetAutoDistance?ti:1e3*this._targetMaxDistance}_getRawRoomBounds(){return ai(this._grid)}_mapTargetToGridCell(t){return null==t.x||null==t.y?null:Qi(t.x,t.y,this._roomWidth,this._roomDepth)}_guardNavigation(t){this._dirty?(this._pendingNavigation=t,this._showUnsavedDialog=!0):t()}_discardAndNavigate(){this._dirty=!1,this._showUnsavedDialog=!1,this._pendingNavigation&&(this._pendingNavigation(),this._pendingNavigation=null)}_renderGlobalDialogs(){return $`
      ${this._showConfigurationBackup?this._renderConfigurationBackupDialog():J}
      ${this._showConfigurationRestore?this._renderConfigurationRestoreDialog():J}
      ${this._showUnsavedDialog?$`
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
        `:J}
      ${this._showDeleteCalibrationDialog?$`
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
    `}_renderTabBar(){return $`
			<div class="tab-bar">
				<button class="tab ${"config"===this._panelTab?"active":""}"
					@click=${()=>{this._flasherCtrl.resetUsbState(),this._panelTab="config",this._loadDevices()}}>${this._localize("tabs.device_configuration")}</button>
				<button class="tab ${"flasher"===this._panelTab?"active":""}"
					@click=${()=>{this._flasherCtrl.resetUsbState(),this._panelTab="flasher",this._flasherCtrl.loading&&(this._flasherCtrl.hass=this.hass,this._flasherCtrl.subscribeDeviceList())}}>${this._localize("tabs.flash_firmware")}</button>
				<a class="tab-help"
					href=${function(t){if("flasher"===t.panelTab)return`${Ps}user-guide/flashing-firmware/`;const e="editor"===t.view?Os[t.sidebarTab]:Us[t.view];return`${Ps}${e}`}({panelTab:this._panelTab,view:this._view,sidebarTab:this._sidebarTab})}
					target="_blank"
					rel="noopener noreferrer"
					aria-label=${this._localize("tabs.help")}
				>
					<ha-icon icon="mdi:help-circle-outline"></ha-icon>
				</a>
			</div>
		`}render(){if("flasher"===this._panelTab)return $`<div class="tab-layout">
				${this._renderTabBar()}
				<epp-flasher-view
					.flashableDevices=${this._flasherCtrl.flashableDevices}
					.loading=${this._flasherCtrl.loading}
					.localize=${this._localize}
					.usbFlashState=${this._flasherCtrl.usbFlashState}
					.wifiNetworks=${this._flasherCtrl.wifiNetworks}
					.firmwareBaseUrl=${this._flasherCtrl.firmwareBaseUrl}
					.firmwareVersion=${this._flasherCtrl.firmwareVersion}
					.integrationVersion=${this._flasherCtrl.integrationVersion}
					.otaStates=${this._flasherCtrl.otaStates}
					.cancelledDeviceIpHint=${this._flasherCtrl.cancelledDeviceIpHint}
					@flash-complete=${()=>{this._flasherCtrl.resetUsbState(),this._loadDevices(),this._panelTab="config"}}
					@usb-flash=${t=>{this._handleUsbFlash(t.detail.variant)}}
					@usb-wifi-config=${()=>{this._handleUsbWifiConfig()}}
					@usb-retry=${this._handleUsbRetry}
					@retry-ha-add=${this._handleRetryHaAdd}
					@flasher-cancel=${this._handleFlasherCancel}
					@wifi-scan=${()=>{this._handleWifiScan()}}
					@wifi-provision=${t=>{this._handleWifiProvision(t.detail.ssid,t.detail.password)}}
					@update-firmware=${t=>{this._flasherCtrl.startOta(t.detail.mac)}}
					@retry-ota=${t=>{this._flasherCtrl.dismissOtaError(t.detail.mac),this._flasherCtrl.startOta(t.detail.mac)}}
					@wifi-complete=${()=>{this._flasherCtrl.resetUsbState(),this._loadDevices(),this._panelTab="config"}}
				></epp-flasher-view>
			</div>`;const t="settings"===this._view&&this._selectedMac,e=!1===this.hass?.connection?.connected||!this._haConnected;if(e&&!t)return $`<div class="tab-layout">
				${this._renderTabBar()}
				<div class="panel">
					<div class="protocol-fullpage protocol-fullpage-info">
						<ha-icon icon="mdi:connection"></ha-icon>
						<p>${this._localize("connection.ha_reconnecting")}</p>
					</div>
				</div>
			</div>`;if(this._loading&&!t)return $`<div class="tab-layout">
				${this._renderTabBar()}
				<div class="loading-container">${this._localize("common.loading")}</div>
			</div>`;const i=this._initRetryCount>=3;if(!this._devices.length&&(!this._selectedMac||i))return $`<div class="tab-layout">
				${this._renderTabBar()}
				<div class="empty-state">
					<p>${this._localize("flasher.no_eppgrid_devices")}</p>
					<button class="primary-btn" @click=${()=>{this._panelTab="flasher",this._flasherCtrl.hass=this.hass,this._flasherCtrl.subscribeDeviceList()}}>
							${this._localize("flasher.flash_from_tab")}
					</button>
				</div>
			</div>`;if("tutorial"===this._view||"calibrate"===this._view)return $`<div class="tab-layout">
        ${this._renderTabBar()}
        <div class="panel">
          ${this._renderHeader()}
          <epp-wizard
            .hass=${this.hass}
            .selectedMac=${this._selectedMac}
            .rawTargets=${this._rawTargets}
            .sensorState=${{occupancy:this._sensorState.occupancy}}
            .localize=${this._localize}
            .initialRoomWidth=${this._roomWidth}
            .initialRoomDepth=${this._roomDepth}
            .initialStep=${"tutorial"===this._view?"guide":"corners"}
            @dismiss-tutorial=${()=>this._onDismissTutorial()}
            @begin-corners=${()=>{this._view="calibrate"}}
            @calibration-complete=${async t=>{const{perspective:e,roomWidth:i,roomDepth:s}=t.detail;this._perspective=e,this._roomWidth=i,this._roomDepth=s,this._initGridFromRoom(),this._furniture=[],this._view="live",this._entitiesConfig={...this._entitiesConfig,zone_presence:!0},await this._gridCtrl.applyLayout().catch(t=>{console.error("Failed to apply layout after calibration",t)})}}
          @wizard-cancel=${()=>{this._view="live"}}
          ></epp-wizard>
        </div>
      </div>`;const s=this._devices.find(t=>t.mac===this._selectedMac),o=!(!this._selectedMac||s&&"unavailable"!==s.firmware_status),r=!s||"compatible"===s.firmware_status;let n=J;if(t&&(e?n=$`
					<div class="protocol-fullpage protocol-fullpage-info">
						<ha-icon icon="mdi:connection"></ha-icon>
						<p>${this._localize("connection.ha_reconnecting")}</p>
					</div>
				`:this._deviceCtrl.reconnecting?n=$`
					<div class="protocol-fullpage protocol-fullpage-info">
						<ha-icon icon="mdi:connection"></ha-icon>
						<p>${this._localize("connection.connecting")}</p>
					</div>
				`:this._deviceCtrl.connectionFailed||o?n=this._renderConnectionBanner():r||(n=this._renderProtocolBanner())),this._deviceCtrl.reconnecting&&!t)return $`<div class="tab-layout">
				${this._renderTabBar()}
				<div class="panel">
					${this._renderHeader()}
					<div class="protocol-fullpage protocol-fullpage-info">
						<ha-icon icon="mdi:connection"></ha-icon>
						<p>${this._localize("connection.connecting")}</p>
					</div>
				</div>
				${this._renderGlobalDialogs()}
			</div>`;if((this._deviceCtrl.connectionFailed||o)&&!t)return $`<div class="tab-layout">
				${this._renderTabBar()}
				<div class="panel">
					${this._renderHeader()}
					${this._renderConnectionBanner()}
				</div>
				${this._renderGlobalDialogs()}
			</div>`;if(!r&&!t)return $`<div class="tab-layout">
				${this._renderTabBar()}
				<div class="panel">
					${this._renderHeader()}
					${this._renderProtocolBanner()}
				</div>
				${this._renderGlobalDialogs()}
			</div>`;const a="settings"===this._view?this._renderSettings(n):"editor"===this._view&&this._perspective?this._renderEditor():this._renderLiveOverview();return $`<div class="tab-layout">${this._renderTabBar()}${a}${this._renderGlobalDialogs()}</div>`}async _deleteCalibration(){this._showDeleteCalibrationDialog=!1,this._perspective=null,this._roomWidth=0,this._roomDepth=0,this._grid=new Uint8Array(400),this._zoneConfigs=qi,this._furniture=[],this._entitiesConfig={...this._entitiesConfig,zone_presence:!1,target_xy:!1},this._targetAutoDistance&&(this._targetMaxDistance=6),this._staticAutoDistance&&(this._staticMinDistance=.3,this._staticMaxDistance=16);try{(this._targetAutoDistance||this._staticAutoDistance)&&await this.hass.callWS({type:"eppgrid/set_settings",mac:this._selectedMac,temperature_offset:this._temperatureOffset,humidity_offset:this._humidityOffset,illuminance_offset:this._illuminanceOffset,motion_timeout:this._motionTimeout,target_auto_distance:this._targetAutoDistance,target_max_distance:this._targetMaxDistance,stuck_target_timeout:this._stuckTargetTimeout,static_auto_distance:this._staticAutoDistance,static_min_distance:this._staticMinDistance,static_max_distance:this._staticMaxDistance,static_trigger_threshold:this._staticTriggerThreshold,static_renew_threshold:this._staticRenewThreshold,static_timeout:this._staticTimeout,static_on_delay:this._staticOnDelay,led_mode:this._ledMode,led_brightness:this._ledBrightness,led_presence_color:this._ledPresenceColor,relay_trigger_mode:this._relayTriggerMode,relay_contact_mode:this._relayContactMode,entities:this._entitiesConfig||{}}),await this.hass.callWS({type:"eppgrid/set_setup",mac:this._selectedMac,perspective:[0,0,0,0,0,0,0,0],room_width:0,room_depth:0}),await this.hass.callWS({type:"eppgrid/set_room_layout",mac:this._selectedMac,grid_bytes:Array.from(this._grid),zone_slots:this._zoneConfigs.map((t,e)=>0===e?Ms(t,0):null),furniture:[]})}catch(t){console.error("Failed to delete calibration",t)}this._dirty=!1,this._view="live"}_changePlacement(){this._guardNavigation(()=>this._applyView({view:this._deviceCtrl.showRoomCalibrationTutorial?"tutorial":"calibrate",sidebarTab:this._sidebarTab}))}async _onDismissTutorial(){const t=this._deviceCtrl.showRoomCalibrationTutorial;this._deviceCtrl.setShowRoomCalibrationTutorial(!1);try{await this.hass.callWS({type:"eppgrid/set_show_room_calibration_tutorial",value:!1})}catch(e){console.error("Failed to persist show_room_calibration_tutorial",e),this._deviceCtrl.setShowRoomCalibrationTutorial(t)}}_renderHeader(){return this._devices.length?$`
      <div class="panel-header">
        <ha-select
          .value=${this._selectedMac}
          .options=${this._devices.map(t=>({value:t.mac,label:t.area?`${t.name} (${t.area})`:t.name}))}
          @selected=${t=>{const e=t.detail.value;e&&e!==this._selectedMac&&this._guardNavigation(async()=>{this._closeDeviceSession(),this._selectedMac=e,bs(e),this._furnitureClipboard=null,await this._loadDeviceConfig(e)})}}
          @closed=${t=>t.stopPropagation()}
        ></ha-select>
      </div>
    `:$`<div class="panel-header"></div>`}_renderProtocolBanner(){const t=this._devices.find(t=>t.mac===this._selectedMac);if(!t||"compatible"===t.firmware_status)return J;const e=t.firmware_status,i="firmware_behind"===e,s="unavailable"===e?this._localize("protocol.unavailable"):i?this._localize("protocol.firmware_behind"):this._localize("protocol.firmware_ahead"),o="firmware_ahead"===e;return $`
			<div class="protocol-fullpage protocol-fullpage-${i?"warning":"info"}">
				<ha-icon icon=${i?"mdi:alert-circle-outline":"mdi:information-outline"}></ha-icon>
				<p>${s}</p>
				${i?$`<button class="wizard-btn wizard-btn-primary"
						@click=${()=>{this._panelTab="flasher",this._flasherCtrl.loading&&(this._flasherCtrl.hass=this.hass,this._flasherCtrl.subscribeDeviceList())}}
					>${this._localize("protocol.update_firmware")}</button>`:J}
				${o?$`<a href="/hacs/repository/1172848595" class="protocol-link"
					>${this._localize("protocol.open_hacs")}</a>`:J}
			</div>
		`}_renderConnectionBanner(){const t=this._devices.find(t=>t.mac===this._selectedMac),e=!(!this._selectedMac||t&&"unavailable"!==t.firmware_status);if(!this._deviceCtrl.connectionFailed&&!e)return J;if(e)return $`
				<div class="protocol-fullpage protocol-fullpage-info">
					<ha-icon icon="mdi:access-point-off"></ha-icon>
					<p>${this._localize("connection.offline")}</p>
					<button class="wizard-btn wizard-btn-primary"
						@click=${()=>this._retryConnection()}
					>${this._localize("connection.retry")}</button>
				</div>
			`;const i=t?.current_connection_count;return $`
			<div class="protocol-fullpage protocol-fullpage-warning">
				<ha-icon icon="mdi:connection"></ha-icon>
				<p>${this._localize("connection.failed")}</p>
				${null!=i?$`<p>${this._localize("connection.client_count",{count:i})}</p>`:J}
				<p style="opacity: 0.7; font-size: 0.9em">${this._localize("connection.check_connections")}</p>
				<button class="wizard-btn wizard-btn-primary"
					@click=${()=>this._retryConnection()}
				>${this._localize("connection.retry")}</button>
			</div>
		`}_retryConnection(){this._selectedMac&&this._ensureSession(this._selectedMac)}_renderLiveGrid(){for(let t=0;t<this._targets.length;t++){const e=this._targets[t];null!=e.x&&null!=e.y&&"active"===e.status&&(this._zoneEngineState.targetPrevXY[t]={x:e.x,y:e.y})}const t={};for(const[e,i]of Object.entries(this._zoneState.occupancy))t[Number(e)]=i;return $`
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
				.showHitCounts=${this._showHitCounts}
				.occupancy=${t}
				.targetPrevXY=${this._zoneEngineState.targetPrevXY}
				.heatmapColors=${this._showHitCounts?this._computeHeatmapColors():null}
				.localize=${this._localize}
				.maxGridPx=${480}
				.maxRangeMm=${this._computeMaxRangeMm()}
				@furniture-select=${t=>{this._selectedFurnitureId=t.detail}}
				@furniture-pointer-down=${t=>{const{e:e,id:i,type:s,handle:o,rotation:r}=t.detail;this._onFurniturePointerDown(e,i,s,o,r)}}
				@furniture-delete=${t=>{this._removeFurniture(t.detail)}}
				.dismissedTargets=${this._dismissedTargets}
				@target-click=${t=>{this._showTargetMenu(t.detail)}}
				@target-undismissed=${t=>{this._handleTargetUndismissed(t.detail.targetIndex)}}
			></epp-grid>
		`}_showTargetMenu(t){this._targetMenu=t}_closeTargetMenu(){this._targetMenu=null}_targetCellIndex(t,e){const i=Qi(t,e,this._roomWidth,this._roomDepth);if(!i)return-1;const s=Math.floor(i.col),o=Math.floor(i.row);return s<0||s>=Ve||o<0||o>=Ze?-1:o*Ve+s}_handleTargetUndismissed(t){this._dismissedTargets.has(t)&&(this._dismissedTargets=new Map(this._dismissedTargets),this._dismissedTargets.delete(t))}async _dismissTarget(){if(!this._targetMenu)return;const{targetIndex:t,x:e,y:i}=this._targetMenu,s=this._targetCellIndex(e,i);if(s>=0){this._dismissedTargets=new Map(this._dismissedTargets),this._dismissedTargets.set(t,s);try{await this.hass.callWS({type:"eppgrid/dismiss_target",mac:this._selectedMac,target_index:t,cell_index:s})}catch(t){console.error("Failed to dismiss target:",t)}}this._closeTargetMenu()}async _setOverlay(t){if(!this._targetMenu)return;const e=this._targetCellIndex(this._targetMenu.x,this._targetMenu.y);if(e<0||!ei(this._grid[e]))return void this._closeTargetMenu();const i=this._grid[e],s=ri(this._grid[e],t),o=new Uint8Array(this._grid);o[e]=s,this._grid=o,this._closeTargetMenu();try{await this.hass.callWS({type:"eppgrid/set_room_layout",mac:this._selectedMac,grid_bytes:Array.from(this._grid),zone_slots:this._zoneConfigs.map((t,e)=>Ms(t,e)),furniture:this._furniture.map(t=>({type:t.type,icon:t.icon,label:t.label,x:t.x,y:t.y,width:t.width,height:t.height,rotation:t.rotation,lockAspect:t.lockAspect}))})}catch(t){if(this._grid[e]===s){const t=new Uint8Array(this._grid);t[e]=i,this._grid=t}console.warn("[eppgrid] set overlay cell failed",t)}}_renderTargetMenu(){if(!this._targetMenu)return J;const{pctX:t,pctY:e}=this._targetMenu;return $`
			<div class="target-menu-backdrop" @click=${()=>this._closeTargetMenu()}></div>
			<div class="target-menu" style="left: ${t}%; top: ${e}%;">
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
		`}_renderSaveCancelButtons(){const t="settings"===this._view?this._saveSettings:this._applyLayout;return $`
      <div class="save-cancel-bar">
        <button class="wizard-btn wizard-btn-back"
          @click=${()=>{"editor"===this._view?this._cancelEditor():this._cancelSettings()}}
        >${this._localize("common.cancel")}</button>
        <button class="wizard-btn wizard-btn-primary"
          ?disabled=${this._saving||!this._dirty}
          @click=${t}
        >${this._saving?this._localize("common.saving"):this._localize("common.save")}</button>
      </div>
    `}_renderLiveOverview(){const t=this._perspective?this._renderLiveGrid():$`<epp-wizard
            mode="uncalibrated-fov"
            .rawTargets=${this._rawTargets}
            .sensorState=${{occupancy:this._sensorState.occupancy}}
            .localize=${this._localize}
            @start-calibration=${()=>this._changePlacement()}
          ></epp-wizard>`;return $`
      <div class="panel" @click=${t=>{t.target instanceof Element&&(this._showLiveMenu&&!t.target.closest(".sidebar-menu-wrapper")&&(this._showLiveMenu=!1),this._targetMenu&&!t.target.closest(".target-menu")&&this._closeTargetMenu())}}>
        ${this._renderHeader()}
        <div class="editor-layout">
          <div class="grid-column">
            <div class="grid-container" style="position: relative;">
              ${t}
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
                ${this._showLiveMenu?$`
                  <div class="sidebar-menu" @click=${()=>{this._showLiveMenu=!1}}>
                    ${this._perspective?$`
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
                    <button class="sidebar-menu-item" @click=${()=>{this._guardNavigation(()=>this._applyView({view:"settings",sidebarTab:this._sidebarTab}))}}>
                      <ha-icon icon="mdi:cog" style="--mdc-icon-size: 18px;"></ha-icon> ${this._localize("menu.settings")}
                    </button>
                    <hr style="border: none; border-top: 1px solid var(--divider-color, #eee); margin: 4px 0;"/>
                    <button class="sidebar-menu-item" @click=${()=>this._changePlacement()}>
                      <ha-icon icon="mdi:target" style="--mdc-icon-size: 18px;"></ha-icon> ${this._localize("menu.room_calibration")}
                    </button>
                    ${this._perspective?$`
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
                @view-change=${t=>{this._guardNavigation(()=>this._applyView({view:t.detail.view,sidebarTab:t.detail.sidebarTab??this._sidebarTab}))}}
              ></epp-live-sidebar>
            </div>
          </div>
        </div>
      </div>
    `}_toggleAccordion(t){this._openAccordions=this._openAccordions.has(t)?new Set:new Set([t])}_getSensorRoomPosition(){return $i(this._perspective)}_autoDetectionRange(){return Ji(this._roomWidth,this._roomDepth,this._perspective,this._grid)}_renderSettings(t=J){return $`
      <div class="panel">
        ${this._renderHeader()}
        ${t}
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
          @accordion-toggle=${t=>{this._openAccordions=t.detail}}
          @setting-change=${t=>{const{key:e,value:i}=t.detail;this[`_${e}`]=i}}
          @dirty=${()=>{this._dirty=!0}}
          @save=${t=>this._saveSettings(t.detail)}
          @cancel=${()=>this._cancelSettings()}
        ></epp-settings-view>
      </div>
    `}_renderEditor(){const t=this._runLocalZoneEngine(),e=t.occupancy,i=this._targets.map((e,i)=>({...e,status:t.targets[i]?.status??e.status}));return $`
      <div class="panel" @click=${t=>{const e=t.target;e.closest(".grid")||e.closest(".zone-sidebar")||this._justPainted||(this._activeZone=null)}}>
        ${this._renderHeader()}
        <div class="editor-layout">
          <div class="grid-column">
            <div class="grid-container" @click=${t=>{t.composedPath().some(t=>t instanceof HTMLElement&&t.classList.contains("furniture-item"))||(this._selectedFurnitureId=null)}}>
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
                .showHitCounts=${this._showHitCounts}
                .occupancy=${e}
                .targetPrevXY=${this._zoneEngineState.targetPrevXY}
                .heatmapColors=${this._showHitCounts?this._computeHeatmapColors():null}
                .localize=${this._localize}
                .maxGridPx=${480}
                .maxRangeMm=${this._editorMaxRangeMm()}
                .frozenBounds=${this._frozenBounds}
                .dismissedTargets=${this._dismissedTargets}
                @cell-paint=${t=>{const{index:e,action:i}=t.detail;"down"===i?this._onCellMouseDown(e):"enter"===i?this._onCellMouseEnter(e):"up"===i&&this._onCellMouseUp()}}
                @furniture-select=${t=>{this._selectedFurnitureId=t.detail}}
                @furniture-pointer-down=${t=>{const{e:e,id:i,type:s,handle:o,rotation:r}=t.detail;this._onFurniturePointerDown(e,i,s,o,r)}}
                @furniture-delete=${t=>{this._removeFurniture(t.detail)}}
                @target-undismissed=${t=>{this._handleTargetUndismissed(t.detail.targetIndex)}}
              ></epp-grid>
            </div>
            ${"zones"===this._sidebarTab||"overlays"===this._sidebarTab?this._renderDebugLog():J}
          </div>
          <div class="zone-sidebar scrollable">
            <div class="sidebar-title">${"furniture"===this._sidebarTab?this._localize("sidebar.furniture"):"overlays"===this._sidebarTab?this._localize("sidebar.overlays"):this._localize("sidebar.detection_zones")}</div>
            <div class="sidebar-scroll">
            ${"zones"===this._sidebarTab?$`<epp-zone-sidebar
                    .zoneConfigs=${this._namedZones()}
                    .activeZone=${this._activeZone}
                    .zone0=${this._zoneConfigs[0]}
                    .localZoneState=${this._zoneEngineState.localZoneState}
                    .localize=${this._localize}
                    @zone-select=${t=>{this._activeZone=t.detail.zone,this._overlayMode=null}}
                    @zone-add=${()=>{this._addZone()}}
                    @zone-remove=${t=>{this._removeZone(t.detail.slot)}}
                    @zone-config-change=${t=>{const{index:e,updates:i}=t.detail,s=e+1;if(s<1||s>=this._zoneConfigs.length)return;const o=this._zoneConfigs[s];if(null===o)return;const r=[...this._zoneConfigs];r[s]={...o,...i},this._zoneConfigs=r,this._dirty=!0}}
                    @zone0-change=${t=>{const e=this._zoneConfigs[0],i=[...this._zoneConfigs];i[0]={...e,...t.detail},this._zoneConfigs=i,this._dirty=!0}}
                  ></epp-zone-sidebar>`:"overlays"===this._sidebarTab?$`<epp-overlay-sidebar
                    .overlayMode=${this._overlayMode}
                    .localize=${this._localize}
                    @overlay-select=${t=>{this._overlayMode=t.detail.mode}}
                  ></epp-overlay-sidebar>`:$`<epp-furniture-sidebar
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
                    @furniture-select=${t=>{this._selectedFurnitureId=t.detail}}
                    @custom-icon-toggle=${()=>{this._showCustomIconPicker=!this._showCustomIconPicker}}
                    @custom-icon-change=${t=>{this._customIconValue=t.detail}}
                    @dirty=${()=>{this._dirty=!0}}
                  ></epp-furniture-sidebar>`}
            </div>
            ${this._renderSaveCancelButtons()}
          </div>
        </div>
      </div>
    `}_renderConfigurationBackupDialog(){return $`
      <div class="template-dialog">
        <div class="template-dialog-card">
          <h3>${this._localize("dialogs.backup_configuration")}</h3>
          <input
            type="text"
            class="configuration-name-input"
            placeholder="${this._localize("dialogs.configuration_name")}"
            .value=${this._configurationName}
            @input=${t=>{this._configurationName=t.target.value}}
          />
          <div class="template-dialog-actions">
            <button
              class="wizard-btn wizard-btn-back"
              @click=${()=>{this._showConfigurationBackup=!1}}
            >${this._localize("common.cancel")}</button>
            <button
              class="wizard-btn wizard-btn-primary"
              ?disabled=${!this._configurationName.trim()}
              @click=${()=>this._saveConfiguration()}
            >${this._localize("common.save")}</button>
          </div>
        </div>
      </div>
    `}_renderConfigurationRestoreDialog(){const t=this._getConfigurations().filter(t=>Array.isArray(t.zones)&&8===t.zones.length);return $`
      <div class="template-dialog">
        <div class="template-dialog-card">
          <h3>${this._localize("dialogs.restore_configuration")}</h3>
          ${0===t.length?$`<p class="overlay-help">${this._localize("dialogs.no_configurations")}</p>`:$`<div class="configuration-card-grid">
                  ${t.map(t=>$`
                    <div class="configuration-card"
                      role="button"
                      tabindex="0"
                      @click=${()=>this._loadConfiguration(t.name)}
                      @keydown=${e=>{"Enter"!==e.key&&" "!==e.key||(e.preventDefault(),this._loadConfiguration(t.name))}}
                    >
                      <button class="configuration-card-delete"
                        type="button"
                        aria-label="${this._localize("common.delete")}"
                        @click=${e=>{e.stopPropagation(),this._deleteConfiguration(t.name)}}
                        @keydown=${t=>{t.stopPropagation()}}
                      >
                        <ha-icon icon="mdi:close"></ha-icon>
                      </button>
                      <div class="configuration-card-thumbnail">
                        ${function(t,e,i,s,o){const r=t instanceof Uint8Array?t:new Uint8Array(t),n=li(r);if(n.minCol>n.maxCol||n.minRow>n.maxRow)return Y`<svg viewBox="0 0 1 1" preserveAspectRatio="xMidYMid meet"></svg>`;const{minCol:a,maxCol:l,minRow:c,maxRow:h}=n,d=l-a+1,A=h-c+1,g=[],u=[],_=new Set;for(let t=c;t<=h;t++)for(let i=a;i<=l;i++){const s=r[t*Ve+i];if(!ei(s))continue;const o=Hi(s,e);g.push(Y`<rect x="${i-a}" y="${t-c}" width="1" height="1" fill="${o}" />`);const n=i-a,l=t-c,h=oi(s);1===h?(_.add("entry"),u.push(Y`<rect x="${n}" y="${l}" width="1" height="1" fill="url(#overlay-entry)" />`)):2===h?(_.add("interference"),u.push(Y`<rect x="${n}" y="${l}" width="1" height="1" fill="url(#overlay-interference)" />`)):3===h&&(_.add("suppress"),u.push(Y`<rect x="${n}" y="${l}" width="1" height="1" fill="url(#overlay-suppress)" />`))}const p=_.size>0?Y`<defs>
			${_.has("entry")?Y`<pattern id="overlay-entry" width="0.25" height="0.25" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
				<line x1="0" y1="0" x2="0" y2="0.25" stroke="rgba(80,80,80,0.5)" stroke-width="0.08" />
			</pattern>`:""}
			${_.has("interference")?Y`<pattern id="overlay-interference" width="0.25" height="0.25" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
				<line x1="0" y1="0" x2="0" y2="0.25" stroke="rgba(244,67,54,0.5)" stroke-width="0.08" />
			</pattern>`:""}
			${_.has("suppress")?Y`<pattern id="overlay-suppress" width="0.25" height="0.25" patternUnits="userSpaceOnUse">
				<line x1="0" y1="0" x2="0.25" y2="0.25" stroke="rgba(244,67,54,0.5)" stroke-width="0.06" />
				<line x1="0.25" y1="0" x2="0" y2="0.25" stroke="rgba(244,67,54,0.5)" stroke-width="0.06" />
			</pattern>`:""}
		</defs>`:"",f=Math.ceil(i/qe),w=Math.floor((Ve-f)/2),E=[];for(const t of o){const e=t.x/qe+w-a,i=t.y/qe-c,s=t.width/qe,o=t.height/qe,r=e+s/2,n=i+o/2,l="svg"===t.type?Ai[t.icon]:void 0;if(l){const[a,c,h,d]=l.viewBox.split(" ").map(Number),A=s/h,g=o/d,u=[t.rotation?`rotate(${t.rotation}, ${r}, ${n})`:"",`translate(${e}, ${i})`,`scale(${A}, ${g})`,`translate(${-a}, ${-c})`].filter(Boolean);E.push(Y`<g transform="${u.join(" ")}">
					${Ke(l.content)}
				</g>`)}else{const a=t.rotation?`rotate(${t.rotation}, ${r}, ${n})`:"";E.push(Y`<rect x="${e}" y="${i}" width="${s}" height="${o}"
					fill="none" stroke="rgba(0,0,0,0.4)" stroke-width="0.15"
					rx="0.1" transform="${a}" />`)}}return Y`<svg viewBox="0 0 ${d} ${A}" preserveAspectRatio="xMidYMid meet">
    ${p}
    ${g}
    ${u}
    ${E}
  </svg>`}(t.grid,t.zones?.slice(1)??new Array(7).fill(null),t.roomWidth,t.roomDepth,t.furniture??[])}
                      </div>
                      <div class="configuration-card-info">
                        <div class="configuration-card-name">${t.name}</div>
                        <div class="configuration-card-size">${(()=>{const{widthM:e,depthM:i}=this._getConfigurationMetrics(t);return`${this._localize.formatNumber(e,1)}m × ${this._localize.formatNumber(i,1)}m`})()}</div>
                      </div>
                    </div>
                  `)}
                </div>`}
          <div class="template-dialog-actions">
            <button
              class="wizard-btn wizard-btn-back"
              @click=${()=>{this._showConfigurationRestore=!1}}
            >${this._localize("common.close")}</button>
          </div>
        </div>
      </div>
    `}_runLocalZoneEngine(){return this._targetCtrl.runLocalZoneEngine()}_enrichDebugLog(t){return this._targetCtrl.enrichDebugLog(t)}_computeHeatmapColors(){return this._targetCtrl.computeHeatmapColors()}_getZoneThresholds(t){const e=ss(this._zoneConfigs[0]);return os(t,this._namedZones(),e.type,e.trigger,e.renew,e.timeout,e.handoff_timeout)}_renderBackendDebugLog(){return $`
      <div style="margin-top: 8px; min-width: 0;">
        <div style="display: flex; align-items: center; gap: 4px;">
          <button
            class="live-section-header live-section-link"
            style="font-size: 12px; gap: 4px; min-width: 0; overflow: hidden;"
            @click=${()=>{this._showBackendDebugLog=!this._showBackendDebugLog,this._showBackendDebugLog||(this._backendDebugLogLines=[],this._backendDebugLogPrev=null)}}
          >
            <ha-icon icon=${this._showBackendDebugLog?"mdi:chevron-down":"mdi:chevron-right"} style="--mdc-icon-size: 14px;"></ha-icon>
            ${this._localize("live.debug.detection_events")}
          </button>
          ${this._showBackendDebugLog?$`
            <div style="margin-left: auto; display: flex; gap: 4px;">
              <button
                class="debug-log-btn"
                @click=${()=>{navigator.clipboard.writeText(this._backendDebugLogLines.join("\n")).catch(t=>console.warn("Clipboard write failed",t))}}
              >${this._localize("live.debug.copy_all")}</button>
              <button
                class="debug-log-btn"
                @click=${()=>{this._backendDebugLogLines=[],this._backendDebugLogPrev=null;const t=this.shadowRoot?.getElementById("backend-debug-log-scroll");if(t){t.innerHTML="";const e=document.createElement("div");e.style.cssText="color: var(--secondary-text-color, #999); font-style: italic;",e.textContent=this._localize("live.debug.waiting_for_events"),t.appendChild(e)}}}
              >${this._localize("live.debug.clear")}</button>
            </div>
          `:J}
        </div>
        ${this._showBackendDebugLog?$`
          <div class="debug-log-container" id="backend-debug-log-scroll">
            <div style="color: var(--secondary-text-color, #999); font-style: italic;">${this._localize("live.debug.waiting_for_events")}</div>
          </div>
        `:J}
      </div>
    `}_renderDebugLog(){return $`
      <div style="margin-top: 8px; min-width: 0;">
        <div style="display: flex; align-items: center; gap: 4px;">
          <button
            class="live-section-header live-section-link"
            style="font-size: 12px; gap: 4px; min-width: 0; overflow: hidden;"
            @click=${()=>{this._showDebugLog=!this._showDebugLog,this._showDebugLog||(this._debugLogLines=[],this._debugLogPrev=null)}}
          >
            <ha-icon icon=${this._showDebugLog?"mdi:chevron-down":"mdi:chevron-right"} style="--mdc-icon-size: 14px;"></ha-icon>
            ${this._localize("live.debug.detection_events")}
          </button>
          ${this._showDebugLog?$`
            <div style="margin-left: auto; display: flex; gap: 4px;">
              <button
                class="debug-log-btn"
                @click=${()=>{navigator.clipboard.writeText(this._debugLogLines.join("\n")).catch(t=>console.warn("Clipboard write failed",t))}}
              >${this._localize("live.debug.copy_all")}</button>
              <button
                class="debug-log-btn"
                @click=${()=>{this._debugLogLines=[],this._debugLogPrev=null;const t=this.shadowRoot?.getElementById("debug-log-scroll");if(t){t.innerHTML="";const e=document.createElement("div");e.style.cssText="color: var(--secondary-text-color, #999); font-style: italic;",e.textContent=this._localize("live.debug.waiting_for_events"),t.appendChild(e)}}}
              >${this._localize("live.debug.clear")}</button>
            </div>
          `:J}
        </div>
        ${this._showDebugLog?$`
          <div class="debug-log-container" id="debug-log-scroll">
            <div style="color: var(--secondary-text-color, #999); font-style: italic;">${this._localize("live.debug.waiting_for_events")}</div>
          </div>
        `:J}
      </div>
    `}_renderFurnitureOverlay(t,e,i,s,o){return this._furniture.length?$`
			<epp-furniture-overlay
				.furniture=${this._furniture}
				.selectedFurnitureId=${this._selectedFurnitureId}
				.roomWidth=${this._roomWidth}
				.cellPx=${t}
				.minCol=${e}
				.minRow=${i}
				.visCols=${s}
				.visRows=${o}
				.sidebarTab=${this._sidebarTab}
				.localize=${this._localize}
				@furniture-select=${t=>{this._selectedFurnitureId=t.detail}}
				@furniture-pointer-down=${t=>{const{e:e,id:i,type:s,handle:o,rotation:r}=t.detail;this._onFurniturePointerDown(e,i,s,o,r)}}
				@furniture-delete=${t=>{this._removeFurniture(t.detail)}}
			></epp-furniture-overlay>
		`:J}async _handleUsbWifiConfig(){const t=this._flasherCtrl;if(t.opRunning)return void t.updateUsbState({step:"error",errorKey:"usb.errors.serial_port_busy",fatal:!0});const e=t.opId;t.opRunning=!0;try{if(t.serialPort||(t.updateUsbState({step:"connecting"}),t.serialPort=await navigator.serial.requestPort()),t.opId!==e)return void(t.opRunning=!1);t.updateUsbState({step:"wifi_scan"});const{writer:i,reader:s,networks:o}=await sl(t.serialPort);if(t.opId!==e)return void(t.opRunning=!1);t.wifiNetworks=o,t.updateUsbState({step:"wifi_provision"}),t._serialWriter=i,t._serialReader=s,t.opRunning=!1}catch(i){if(t.opRunning=!1,t.opId!==e)return;if("NotFoundError"===i?.name)return void t.resetUsbState();const s=t.usbFlashState?.step,o=i;t.updateUsbState({step:"error",lastStep:s,errorKey:o.errorKey??"wifi.errors.scan_failed",errorParams:o.errorParams})}}async _handleUsbFlash(t){const e=this._flasherCtrl;if(e.opRunning)return void e.updateUsbState({step:"error",errorKey:"usb.errors.serial_port_busy",fatal:!0});const i=e.opId;e.opRunning=!0;try{e.updateUsbState({step:"connecting"});const s=await navigator.serial.requestPort();if(e.opId!==i)return void(e.opRunning=!1);if(e.serialPort=s,e.updateUsbState({step:"flashing",progress:0}),await async function(t,e,i,s){const o=s?.accessToken?{headers:{Authorization:`Bearer ${s.accessToken}`}}:void 0,r=t.close.bind(t);t.close=async()=>{};const n=new aa(t);try{let t;const r={clean:()=>{},writeLine:e=>{const i=el.exec(e);i&&(t=i[1].toUpperCase(),s?.onMac?.(t))},write:t=>{}},a=new Ga({transport:n,baudrate:115200,terminal:r});if(await a.main("default_reset"),s?.beforeFlash&&await s.beforeFlash(t),!s?.baseUrl)throw Object.assign(new Error("baseUrl is required for firmware download"),{errorKey:"usb.errors.base_url_required"});const l=`${s.baseUrl}/everything-presence-pro-${e}-manifest.json`,c=await fetch(l,o);if(!c.ok)throw Object.assign(new Error("Failed to download firmware manifest"),{errorKey:"usb.errors.manifest_download_failed"});const h=await c.json(),d=l.substring(0,l.lastIndexOf("/")+1),A=h.builds[0].parts,g=[];for(const t of A){const e=await fetch(`${d}${t.path}`,o);if(!e.ok)throw Object.assign(new Error(`Failed to download firmware file: ${t.path}`),{errorKey:"usb.errors.file_download_failed",errorParams:{file:t.path}});const i=new Uint8Array(await e.arrayBuffer());g.push({data:i,address:t.offset})}const u=new Uint8Array(8192);u.fill(255),g.push({data:u,address:36864}),await a.writeFlash({fileArray:g,flashSize:"keep",flashMode:"keep",flashFreq:"keep",eraseAll:!1,compress:!0,reportProgress:(t,e,s)=>{i(Math.round(e/s*100))}}),await a.after("hard_reset")}finally{try{await n.disconnect()}finally{t.close=r}}}(s,t,t=>{e.updateUsbState({step:"flashing",progress:t})},{baseUrl:e.firmwareBaseUrl,accessToken:this.hass?.auth?.accessToken,beforeFlash:async t=>{if(!t)return;const i=e.flashableDevices.find(e=>e.mac.toUpperCase()===t);if("original"===i?.firmware_type&&i?.esphome_config_entry_id){if(!window.confirm(this._localize("flasher.confirm_delete_message")))throw Object.assign(new Error("Flash cancelled"),{errorKey:"flasher.errors.flash_cancelled"});await e.deleteEsphomeDevice(i.esphome_config_entry_id)}}}),e.opId!==i)return void(e.opRunning=!1);if(t.startsWith("ethernet"))return await s.close().catch(()=>{}),e.serialPort=null,e.opRunning=!1,void e.updateUsbState({step:"complete",variant:t});e.updateUsbState({step:"wifi_check"});let o=null,r=null,n=null;try{const t=new AbortController;e._wifiCheckAbort=t;const i=async function(t,e,i){const s=await il(t,e),o=t.readable.getReader(),r=i?.signal;try{console.debug("[queryImprovState] sending GET_CURRENT_STATE"),await Xa(s,ja());const t=e?.readDelay??3e3,i=Date.now(),n=[];let a;const l=i+Math.min(t,3e3);for(;Date.now()<l&&void 0===a&&!r?.aborted;){const t=l-Date.now();if(t<=0)break;try{const e=await qa(o,Math.min(t,500),n);for(const t of e.packets)1===t.type&&t.data.length>=1&&(a=t.data[0])}catch{}}if(r?.aborted)throw Object.assign(new Error("aborted"),{errorKey:"flasher.errors.aborted"});if(void 0===a)throw Object.assign(new Error("No Improv state received"),{errorKey:"usb.errors.no_device_response"});let c;if(4===a){const e=Math.max(0,i+t-Date.now());if(e>0){console.debug(`[queryImprovState] PROVISIONED — delegating to detectIpAddress (budget=${e}ms)`);try{c=await nl(o,s,e,{initialBuffer:n,startPolling:!0,signal:r})}catch(t){console.debug(`[queryImprovState] detectIpAddress gave up: ${t.message}`),c="0.0.0.0"}}}return console.debug(`[queryImprovState] exit: elapsed=${Date.now()-i}ms, stateByte=${a}, ip=${c}`),{state:4===a?"PROVISIONED":"AUTHORIZED",ip:c,writer:s,reader:o}}catch(t){try{s.releaseLock()}catch{}throw Ya(o),t}}(s,{readDelay:3e4},{signal:t.signal});e._wifiCheckPromise=i;const a=await i;if(e._wifiCheckAbort=null,e._wifiCheckPromise=null,"PROVISIONED"===a.state&&a.ip&&"0.0.0.0"!==a.ip)o=a.ip,r=a.writer,n=a.reader;else{try{a.writer.releaseLock()}catch{}try{a.reader.releaseLock()}catch{}}}catch{}if(e.opId!==i)return void(e.opRunning=!1);if(o&&r&&n){try{n.releaseLock()}catch{}try{r.releaseLock()}catch{}return e.updateUsbState({step:"wifi_configured",ip:o,autoSkipped:!0}),e.opRunning=!1,void await this._addToHa(o)}e.updateUsbState({step:"wifi_scan"});const{writer:a,reader:l,networks:c}=await sl(s);if(e.opId!==i)return void(e.opRunning=!1);e.wifiNetworks=c,e.updateUsbState({step:"wifi_provision"}),e._serialWriter=a,e._serialReader=l,e.opRunning=!1}catch(s){if(e.opId!==i)return void(e.opRunning=!1);if("NotFoundError"===s?.name)return void e.resetUsbState();const o=s;if("flasher.errors.flash_cancelled"===o.errorKey){if(e.serialPort){try{await e.serialPort.close().catch(()=>{})}catch{}e.serialPort=null}return e.opRunning=!1,void e.resetUsbState()}const r=e.usbFlashState?.step;if(e.serialPort){try{await e.serialPort.close().catch(()=>{})}catch{}e.serialPort=null}const n=o.message??"Unknown error",a=/already open|already closed/i.test(n),l=/stream stopped|NetworkError|disconnected|break|lost|No response from device/i.test(n),c=a?"usb.errors.serial_port_busy":l?"usb.errors.device_disconnected":"usb.errors.flash_failed";e.opRunning=!1,e.updateUsbState({step:"error",lastStep:r,variant:t,errorKey:o.errorKey??c,errorParams:o.errorParams,fatal:a||"usb.errors.serial_port_busy"===o.errorKey})}}async _handleWifiProvision(t,e){const i=this._flasherCtrl,s=i.opId,o=i.serialPort;if(!o?.writable||!o?.readable)return void i.updateUsbState({step:"error",errorKey:"usb.errors.serial_port_unavailable"});try{i._serialReader?.releaseLock()}catch{}try{i._serialWriter?.releaseLock()}catch{}const r=o.writable.getWriter(),n=o.readable.getReader();i._serialWriter=r,i._serialReader=n;try{if(i.updateUsbState({step:"wifi_connecting"}),console.debug(`[wifi-provision] sending WIFI_SETTINGS ssid="${t}"`),await ol(r,t,e),i.opId!==s)return;i.updateUsbState({step:"reading_ip"});const a=await nl(n,r,6e4);if(i.opId!==s)return;n.releaseLock(),r.releaseLock(),i._serialReader=null,i._serialWriter=null,await o.close().catch(()=>{}),i.serialPort=null,i.updateUsbState({step:"wifi_configured",ip:a}),await this._addToHa(a)}catch(t){try{i._serialReader?.releaseLock()}catch{}try{i._serialWriter?.releaseLock()}catch{}if(i._serialReader=null,i._serialWriter=null,i.opId!==s)return;const e=i.usbFlashState?.step,o=t;i.updateUsbState({step:"error",lastStep:e,errorKey:o.errorKey??"wifi.errors.provisioning_failed",errorParams:o.errorParams})}}async _addToHaWithRetry(t){const e=this._flasherCtrl,i=e.opId,s=Ml.HA_ADD_MAX_ATTEMPTS,o=Ml.HA_ADD_RETRY_DELAY_MS;for(let r=1;r<=s;r++){if(r>1){e.updateUsbState({step:"wifi_configured",ip:t,haAddAttempt:r,haAddMaxAttempts:s});if(await this._sleepUntilOpChanges(o,i))return{type:"cannot_connect"}}let n;try{n=await e.addEsphomeDevice(t)}catch(t){const e=t?.message;return{type:"failed",reason:e??"unknown"}}if(e.opId!==i)return n;if("cannot_connect"!==n.type)return n}return{type:"cannot_connect"}}async _sleepUntilOpChanges(t,e){const i=this._flasherCtrl;let s=t;for(;s>0;){if(i.opId!==e)return!0;const t=Math.min(s,250);await new Promise(e=>setTimeout(e,t)),s-=t}return i.opId!==e}async _addToHa(t){const e=this._flasherCtrl,i=e.opId,s=await this._addToHaWithRetry(t);e.opId===i&&e.updateUsbState({step:"complete",ip:t,haAdd:s})}async _handleRetryHaAdd(){const t=this._flasherCtrl,e=t.usbFlashState;if("complete"!==e?.step||!e.ip)return;const i=e.ip,s=t.opId;t.updateUsbState({step:"wifi_configured",ip:i});const o=await this._addToHaWithRetry(i);t.opId===s&&t.updateUsbState({step:"complete",ip:i,haAdd:o})}async _handleFlasherCancel(){const t=this._flasherCtrl,e=t.usbFlashState;"wifi_configured"===e?.step&&e.ip&&t.setCancelledDeviceIpHint(e.ip),t.opRunning=!1,await t.resetUsbState()}async _handleWifiScan(){const t=this._flasherCtrl;if(!t.serialPort)return;t.bumpOpId();const e=t.opId;try{t.updateUsbState({step:"wifi_scan"});const i=t._serialWriter,s=t._serialReader;try{s?.releaseLock()}catch{}try{i?.releaseLock()}catch{}const o=await sl(t.serialPort);if(t.opId!==e){try{o.reader.releaseLock()}catch{}try{o.writer.releaseLock()}catch{}return}t._serialWriter=o.writer,t._serialReader=o.reader,t.wifiNetworks=o.networks,t.updateUsbState({step:"wifi_provision"})}catch(i){if(t.opId!==e)return;console.error("WiFi scan failed:",i);const s=t.usbFlashState?.step,o=i;t.updateUsbState({step:"error",lastStep:s,errorKey:o.errorKey??"wifi.errors.scan_failed",errorParams:o.errorParams})}}}Ml._FOV_UNCACHED={},Ml.styles=[El,ml,vi,Ci,Ii,bl,yl,vl,n`
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

  `],Ml.HA_ADD_RETRY_DELAY_MS=1e4,Ml.HA_ADD_MAX_ATTEMPTS=6,t([gt({attribute:!1})],Ml.prototype,"hass",void 0),t([ut()],Ml.prototype,"_grid",void 0),t([ut()],Ml.prototype,"_zoneConfigs",void 0),t([ut()],Ml.prototype,"_activeZone",void 0),t([ut()],Ml.prototype,"_targetAutoDistance",void 0),t([ut()],Ml.prototype,"_targetMaxDistance",void 0),t([ut()],Ml.prototype,"_stuckTargetTimeout",void 0),t([ut()],Ml.prototype,"_staticAutoDistance",void 0),t([ut()],Ml.prototype,"_staticMinDistance",void 0),t([ut()],Ml.prototype,"_staticMaxDistance",void 0),t([ut()],Ml.prototype,"_temperatureOffset",void 0),t([ut()],Ml.prototype,"_humidityOffset",void 0),t([ut()],Ml.prototype,"_illuminanceOffset",void 0),t([ut()],Ml.prototype,"_motionTimeout",void 0),t([ut()],Ml.prototype,"_staticTimeout",void 0),t([ut()],Ml.prototype,"_staticTriggerThreshold",void 0),t([ut()],Ml.prototype,"_staticRenewThreshold",void 0),t([ut()],Ml.prototype,"_staticOnDelay",void 0),t([ut()],Ml.prototype,"_logLevels",void 0),t([ut()],Ml.prototype,"_bluetoothEnabled",void 0),t([ut()],Ml.prototype,"_co2Enabled",void 0),t([ut()],Ml.prototype,"_ledMode",void 0),t([ut()],Ml.prototype,"_ledBrightness",void 0),t([ut()],Ml.prototype,"_ledPresenceColor",void 0),t([ut()],Ml.prototype,"_relayTriggerMode",void 0),t([ut()],Ml.prototype,"_relayContactMode",void 0),t([ut()],Ml.prototype,"_targetUpdateRateMs",void 0),t([ut()],Ml.prototype,"_zoneUpdateRateMs",void 0),t([ut()],Ml.prototype,"_entitiesConfig",void 0),t([ut()],Ml.prototype,"_sidebarTab",void 0),t([ut()],Ml.prototype,"_panelTab",void 0),t([ut()],Ml.prototype,"_showDeleteCalibrationDialog",void 0),t([ut()],Ml.prototype,"_showLiveMenu",void 0),t([ut()],Ml.prototype,"_showCustomIconPicker",void 0),t([ut()],Ml.prototype,"_customIconValue",void 0),t([ut()],Ml.prototype,"_furniture",void 0),t([ut()],Ml.prototype,"_selectedFurnitureId",void 0),t([ut()],Ml.prototype,"_targets",void 0),t([ut()],Ml.prototype,"_rawTargets",void 0),t([ut()],Ml.prototype,"_sensorState",void 0),t([ut()],Ml.prototype,"_zoneState",void 0),t([ut()],Ml.prototype,"_showHitCounts",void 0),t([ut()],Ml.prototype,"_showDebugLog",void 0),t([ut()],Ml.prototype,"_showBackendDebugLog",void 0),t([ut()],Ml.prototype,"_overlayMode",void 0),t([ut()],Ml.prototype,"_targetMenu",void 0),t([ut()],Ml.prototype,"_dismissedTargets",void 0),t([ut()],Ml.prototype,"_isPainting",void 0),t([ut()],Ml.prototype,"_paintAction",void 0),t([ut()],Ml.prototype,"_saving",void 0),t([ut()],Ml.prototype,"_dirty",void 0),t([ut()],Ml.prototype,"_showUnsavedDialog",void 0),t([ut()],Ml.prototype,"_showConfigurationBackup",void 0),t([ut()],Ml.prototype,"_showConfigurationRestore",void 0),t([ut()],Ml.prototype,"_configurationName",void 0),t([ut()],Ml.prototype,"_devices",void 0),t([ut()],Ml.prototype,"_selectedMac",void 0),t([ut()],Ml.prototype,"_loading",void 0),t([ut()],Ml.prototype,"_initRetryCount",void 0),t([ut()],Ml.prototype,"_haConnected",void 0),t([ut()],Ml.prototype,"_view",void 0),t([ut()],Ml.prototype,"_openAccordions",void 0),t([ut()],Ml.prototype,"_perspective",void 0),t([ut()],Ml.prototype,"_roomWidth",void 0),t([ut()],Ml.prototype,"_roomDepth",void 0),customElements.get("eppgrid-panel")||customElements.define("eppgrid-panel",Ml),function(){const t=window;if(t.__eppGridMountGuardTeardown)try{t.__eppGridMountGuardTeardown()}catch{}t.__eppGridMountGuardInstalled=!0,document.addEventListener("visibilitychange",gl),wl(),t.__eppGridMountGuardTeardown=()=>{document.removeEventListener("visibilitychange",gl),ul?.observer.disconnect(),_l?.observer.disconnect(),ul=null,_l=null}}();var Rl=1074521580,kl="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",Tl=1074520064,Fl="DMD8P+znC0B/6AtAZ+0LQAbpC0Cf6AtABukLQGXpC0CC6gtA9OoLQJ3qC0CV5wtAGuoLQHTqC0CI6QtAGOsLQLDpC0AY6wtAbegLQMroC0AG6QtAZekLQIXoC0DI6wtAKe0LQLjmC0BL7QtAuOYLQLjmC0C45gtAuOYLQLjmC0C45gtAuOYLQLjmC0Bv6wtAuOYLQEnsC0Ap7QtA",Pl=1073605544,Ul=1073528832,Ol={entry:Rl,text:kl,text_start:Tl,data:Fl,data_start:Pl,bss_start:Ul},zl=Object.freeze({__proto__:null,bss_start:Ul,data:Fl,data_start:Pl,default:Ol,entry:Rl,text:kl,text_start:Tl}),Ql=1077413304,Hl="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",Gl=1077411840,Ll="DEDKP+AIOEAsCThAhAk4QFIKOEC+CjhAbAo4QKgHOEAOCjhATgo4QJgJOEBYBzhAzAk4QFgHOEC6CDhA/gg4QCwJOECECThAzAg4QBIIOEBCCDhAyAg4QBYNOEAsCThA1gs4QMoMOECkBjhA9Aw4QKQGOECkBjhApAY4QKQGOECkBjhApAY4QKQGOECkBjhAcgs4QKQGOEDyCzhAygw4QA==",Nl=1070295976,$l=1070219264,Yl={entry:Ql,text:Hl,text_start:Gl,data:Ll,data_start:Nl,bss_start:$l},Kl=Object.freeze({__proto__:null,bss_start:$l,data:Ll,data_start:Nl,default:Yl,entry:Ql,text:Hl,text_start:Gl}),Jl=1077413584,Wl="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",jl=1077411840,Vl="GEDIP8AKOEAQCzhAaAs4QDYMOECiDDhAUAw4QHIJOEDyCzhAMgw4QHwLOEAiCThAsAs4QCIJOECaCjhA4Ao4QBALOEBoCzhArAo4QNYJOEAgCjhAqAo4QPoOOEAQCzhAug04QLIOOEBiCDhA2g44QGIIOEBiCDhAYgg4QGIIOEBiCDhAYgg4QGIIOEBiCDhAVg04QGIIOEDYDThAsg44QA==",Zl=1070164916,Xl=1070088192,ql={entry:Jl,text:Wl,text_start:jl,data:Vl,data_start:Zl,bss_start:Xl},tc=Object.freeze({__proto__:null,bss_start:Xl,data:Vl,data_start:Zl,default:ql,entry:Jl,text:Wl,text_start:jl}),ec=1082133128,ic="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",sc=1082130432,oc="GACEQOYOgEBQD4BA5A+AQLgQgEAgEYBAzhCAQEINgEB0EIBAtBCAQAAQgEDyDIBAKBCAQPIMgEDEDoBADg+AQFAPgEDkD4BA1g6AQGoNgECYDYBA0g6AQBoTgEBQD4BA3BGAQNYSgEAwDIBA/BKAQDAMgEAwDIBAMAyAQDAMgEAwDIBAMAyAQDAMgEAwDIBAghGAQDAMgED0EYBA1hKAQA==",rc=1082469304,nc=1082392576,ac={entry:ec,text:ic,text_start:sc,data:oc,data_start:rc,bss_start:nc},lc=Object.freeze({__proto__:null,bss_start:nc,data:oc,data_start:rc,default:ac,entry:ec,text:ic,text_start:sc}),cc=1082132164,hc="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",dc=1082130432,Ac="FACEQHIKgEDCCoBAGguAQOgLgEBUDIBAAgyAQD4JgECkC4BA5AuAQC4LgEDuCIBAYguAQO4IgEBMCoBAkgqAQMIKgEAaC4BAXgqAQKIJgEDSCYBAWgqAQKwOgEDCCoBAbA2AQGQOgEAuCIBAjA6AQC4IgEAuCIBALgiAQC4IgEAuCIBALgiAQC4IgEAuCIBACA2AQC4IgECKDYBAZA6AQA==",gc=1082469296,uc=1082392576,_c={entry:cc,text:hc,text_start:dc,data:Ac,data_start:gc,bss_start:uc},pc=Object.freeze({__proto__:null,bss_start:uc,data:Ac,data_start:gc,default:_c,entry:cc,text:hc,text_start:dc}),fc=1082132164,wc="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",Ec=1082130432,mc="FECAQHQKgEDECoBAHAuAQOoLgEBWDIBABAyAQEAJgECmC4BA5guAQDALgEDwCIBAZAuAQPAIgEBOCoBAlAqAQMQKgEAcC4BAYAqAQKQJgEDUCYBAXAqAQK4OgEDECoBAbg2AQGYOgEAwCIBAjg6AQDAIgEAwCIBAMAiAQDAIgEAwCIBAMAiAQDAIgEAwCIBACg2AQDAIgECMDYBAZg6AQA==",bc=1082223536,yc=1082146816,vc={entry:fc,text:wc,text_start:Ec,data:mc,data_start:bc,bss_start:yc},Cc=Object.freeze({__proto__:null,bss_start:yc,data:mc,data_start:bc,default:vc,entry:fc,text:wc,text_start:Ec}),Bc=1082132164,Sc="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",Ic=1082130432,xc="FACDQHIKgEDCCoBAGguAQOgLgEBUDIBAAgyAQD4JgECkC4BA5AuAQC4LgEDuCIBAYguAQO4IgEBMCoBAkgqAQMIKgEAaC4BAXgqAQKIJgEDSCYBAWgqAQKwOgEDCCoBAbA2AQGQOgEAuCIBAjA6AQC4IgEAuCIBALgiAQC4IgEAuCIBALgiAQC4IgEAuCIBACA2AQC4IgECKDYBAZA6AQA==",Dc=1082403760,Mc=1082327040,Rc={entry:Bc,text:Sc,text_start:Ic,data:xc,data_start:Dc,bss_start:Mc},kc=Object.freeze({__proto__:null,bss_start:Mc,data:xc,data_start:Dc,default:Rc,entry:Bc,text:Sc,text_start:Ic}),Tc=1341196642,Fc="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",Pc=1341194240,Uc="YAD1T3gO8U/GDvFPZA/xT0oQ8U+kEPFPXBDxT8oM8U/+D/FPRhDxT4IP8U96DPFPqg/xT3oM8U9UDvFPkg7xT8YO8U9kD/FPZg7xT/QM8U8oDfFPYg7xT3YU8U/GDvFPGBLxTzYU8U8eC/FPWhTxTx4L8U8eC/FPHgvxTx4L8U8eC/FPHgvxTx4L8U8eC/FPthHxTx4L8U9SE/FPNhTxTw==",Oc=1341533180,zc=1341456384,Qc={entry:Tc,text:Fc,text_start:Pc,data:Uc,data_start:Oc,bss_start:zc},Hc=Object.freeze({__proto__:null,bss_start:zc,data:Uc,data_start:Oc,default:Qc,entry:Tc,text:Fc,text_start:Pc}),Gc=1341459344,Lc="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",Nc=1341456384,$c="YAD2T8oQ9U80EfVP0BH1T6wS9U8UE/VPwhL1TwQP9U9oEvVPqBL1T+wR9U+0DvVPFBL1T7QO9U+mEPVP8hD1TzQR9U/QEfVPuBD1TywP9U9gD/VPtBD1TxIV9U80EfVP2BP1T9IU9U9YDfVP9hT1T1gN9U9YDfVPWA31T1gN9U9YDfVPWA31T1gN9U9YDfVPdhP1T1gN9U/wE/VP0hT1Tw==",Yc=1341598720,Kc=1341521920,Jc={entry:Gc,text:Lc,text_start:Nc,data:$c,data_start:Yc,bss_start:Kc},Wc=Object.freeze({__proto__:null,bss_start:Kc,data:$c,data_start:Yc,default:Jc,entry:Gc,text:Lc,text_start:Nc}),jc=1073907716,Vc="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",Zc=1073905664,Xc="WAD9P0uLAkDdiwJA8pACQGaMAkD+iwJAZowCQMWMAkDejQJAUY4CQPmNAkDVigJAd40CQNCNAkDojAJAdI4CQBCNAkB0jgJAy4sCQCqMAkBmjAJAxYwCQOOLAkAXiwJAN48CQKqQAkDqiQJA0ZACQOqJAkDqiQJA6okCQOqJAkDqiQJA6okCQOqJAkDqiQJA1I4CQOqJAkDJjwJAqpACQA==",qc=1073622012,th=1073545216,eh={entry:jc,text:Vc,text_start:Zc,data:Xc,data_start:qc,bss_start:th},ih=Object.freeze({__proto__:null,bss_start:th,data:Xc,data_start:qc,default:eh,entry:jc,text:Vc,text_start:Zc}),sh=1077381760,oh="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",rh=1077379072,nh="XADKP16ON0AzjzdAR5Q3QL2PN0BTjzdAvY83QB2QN0A6kTdArJE3QFWRN0DpjTdA0JA3QCyRN0BAkDdA0JE3QGiQN0DQkTdAIY83QH6PN0C9jzdAHZA3QDmPN0AqjjdAkJI3QA2UN0AAjTdALZQ3QACNN0AAjTdAAI03QACNN0AAjTdAAI03QACNN0AAjTdAKpI3QACNN0AlkzdADZQ3QAQInwAAAAAAAAAYAQQIBQAAAAAAAAAIAQQIBgAAAAAAAAAAAQQIIQAAAAAAIAAAEQQI3AAAAAAAIAAAEQQIDAAAAAAAIAAAAQQIEgAAAAAAIAAAESAoDAAQAQAA",ah=1070279676,lh=1070202880,ch={entry:sh,text:oh,text_start:rh,data:nh,data_start:ah,bss_start:lh},hh=Object.freeze({__proto__:null,bss_start:lh,data:nh,data_start:ah,default:ch,entry:sh,text:oh,text_start:rh}),dh=1074843652,Ah="qBAAQAH//0ZzAAAAkIH/PwgB/z+AgAAAhIAAAEBAAABIQf8/lIH/PzH5/xLB8CAgdAJhA4XwATKv/pZyA1H0/0H2/zH0/yAgdDA1gEpVwCAAaANCFQBAMPQbQ0BA9MAgAEJVADo2wCAAIkMAIhUAMev/ICD0N5I/Ieb/Meb/Qen/OjLAIABoA1Hm/yeWEoYAAAAAAMAgACkEwCAAWQNGAgDAIABZBMAgACkDMdv/OiIMA8AgADJSAAgxEsEQDfAAoA0AAJiB/z8Agf4/T0hBSais/z+krP8/KNAQQFzqEEAMAABg//8AAAAQAAAAAAEAAAAAAYyAAAAQQAAAAAD//wBAAAAAgf4/BIH+PxAnAAAUAABg//8PAKis/z8Igf4/uKz/PwCAAAA4KQAAkI//PwiD/z8Qg/8/rKz/P5yv/z8wnf8/iK//P5gbAAAACAAAYAkAAFAOAABQEgAAPCkAALCs/z+0rP8/1Kr/PzspAADwgf8/DK//P5Cu/z+ACwAAEK7/P5Ct/z8BAAAAAAAAALAVAADx/wAAmKz/P7wPAECIDwBAqA8AQFg/AEBERgBALEwAQHhIAEAASgBAtEkAQMwuAEDYOQBASN8AQJDhAEBMJgBAhEkAQCG9/5KhEJARwCJhIyKgAAJhQ8JhQtJhQeJhQPJhPwHp/8AAACGz/zG0/wwEBgEAAEkCSyI3MvjFtgEioIwMQyohBakBxbUBIX3/wXv/Maz/KizAIADJAiGp/wwEOQIxqf8MUgHZ/8AAADGn/yKhAcAgAEgDICQgwCAAKQMioCAB0//AAAAB0v/AAAAB0v/AAABxnv9Rn/9Bn/8xn/9ioQAMAgHN/8AAACGd/zFj/yojwCAAOAIWc//AIADYAgwDwCAAOQIMEiJBhCINAQwkIkGFQlFDMmEiJpIJHDM3EiCGCAAAACINAzINAoAiETAiIGZCESgtwCAAKAIiYSIGAQAcIiJRQ8WpASKghAyDGiJFnAEiDQMyDQKAIhEwMiAhgP83shMioMAFlwEioO6FlgEFpwFG3P8AACINAQy0R5ICBpkAJzRDZmICxssA9nIgZjIChnEA9kIIZiICxlYARsoAZkICBocAZlICxqsAhsYAJoJ59oIChqsADJRHkgKGjwBmkgIGowAGwAAcJEeSAkZ8ACc0Jwz0R5IChj4AJzQLDNRHkgKGgwDGtwAAZrICRksAHBRHkgJGWABGswBCoNFHEmgnNBEcNEeSAkY4AEKg0EcST8asAABCoNJHkgKGLwAyoNM3kgJGnAVGpwAsQgwOJ5MCBnEFRisAIqAAhYkBIqAARYkBxZkBhZkBIqCEMqAIGiILzMWLAVbc/QwOzQ5GmwAAzBOGZgVGlQAmgwLGkwAGZwUBaf/AAAD6zJwixo8AAAAgLEEBZv/AAABWEiPy3/DwLMDML4ZwBQAgMPRWE/7hLP+GAwAgIPUBXv/AAABW0iDg/8DwLMD3PuqGAwAgLEEBV//AAABWUh/y3/DwLMBWr/5GYQUmg4DGAQAAAGazAkbd/wwOwqDAhngAAABmswJGSwUGcgAAwqABJrMCBnAAIi0EMRj/4qAAwqDCJ7MCxm4AOF0oLYV3AUZDBQDCoAEmswKGZgAyLQQhD//ioADCoMI3sgJGZQAoPQwcIOOCOF0oLcV0ATH4/gwESWMy0yvpIyDEgwZaAAAh9P4MDkICAMKgxueUAsZYAMhSKC0yw/AwIsBCoMAgxJMizRhNAmKg78YBAFIEABtEUGYwIFTANyXxMg0FUg0EIg0GgDMRACIRUEMgQDIgIg0HDA6AIgEwIiAgJsAyoMEgw5OGQwAAACHa/gwOMgIAwqDG55MCxj4AODLCoMjnEwIGPADiQgDIUgY6AByCDA4MHCcTAgY3AAYQBWZDAoYWBUYwADAgNAwOwqDA5xIChjAAMPRBi+3NAnzzxgwAKD4yYTEBAv/AAABILigeYi4AICQQMiExJgQOwCAAUiYAQEMwUEQQQCIgwCAAKQYbzOLOEPc8yMaB/2ZDAkaA/wai/2azAgYABcYWAAAAYcH+DA5IBgwVMsPwLQ5AJYMwXoNQIhDCoMbnkktxuv7tAogHwqDJNzg+MFAUwqDAos0YjNUGDABaKigCS1UpBEtEDBJQmMA3Ne0WYtpJBpkHxmf/ZoMChuwEDBwMDsYBAAAA4qAAwqD/wCB0BWAB4CB0xV8BRXABVkzAIg0BDPM3EjEnMxVmQgIGtgRmYgLGugQmMgLG+f4GGQAAHCM3kgIGsAQyoNI3EkUcEzcSAkbz/sYYACGV/ug90i0CAcD+wAAAIZP+wCAAOAIhkv4gIxDgIoLQPSAFjAE9Ai0MAbn+wAAAIqPoAbb+wAAAxuP+WF1ITTg9Ii0CxWsBBuD+ADINAyINAoAzESAzIDLD8CLNGEVKAcbZ/gAiDQMyDQKAIhEwIiAxZ/4iwvAiYSkoMwwUIMSDwMB0jExSISn2VQvSzRjSYSQMH8Z3BAAioMkpU8bK/iFx/nGQ/rIiAGEs/oKgAyInApIhKYJhJ7DGwCc5BAwaomEnsmE2BTkBsiE2cWf+UiEkYiEpcEvAykRqVQuEUmElgmErhwQCxk4Ed7sCRk0EkUj+PFOo6VIpEGIpFShpomEoUmEmYmEqyHniKRT4+SezAsbuAzFV/jAioCgCoAIAMTz+DA4MEumT6YMp0ymj4mEm/Q7iYSjNDoYGAHIhJwwTcGEEfMRgQ5NtBDliXQtyISSG4AMAAIIhJJIhJSEs/pe42DIIABt4OYKGBgCiIScMIzBqEHzFDBRgRYNtBDliXQuG1ANyISRSISUhIf5Xt9tSBwD4glmSgC8RHPNaIkJhMVJhNLJhNhvXRXgBDBNCITFSITSyITZWEgEioCAgVRBWhQDwIDQiwvggNYPw9EGL/wwSYSf+AB9AAFKhVzYPAA9AQPCRDAbwYoMwZiCcJgwfhgAA0iEkIQb+LEM5Yl0LhpwAXQu2PCAGDwByISd8w3BhBAwSYCODbQIMMwYWAAAAXQvSISRGAAD9BoIhJYe92RvdCy0iAgAAHEAAIqGLzCDuILY85G0PcfH94CAkKbcgIUEpx+DjQcLM/VYiIMAgJCc8KEYRAJIhJ3zDkGEEDBJgI4NtAgxTIeX9OWJ9DQaVAwAAAF0L0iEkRgAA/QaiISWnvdEb3QstIgIAABxAACKhi8wg7iDAICQnPOHAICQAAkDg4JEir/ggzBDyoAAWnAaGDAAAAHIhJ3zDcGEEDBJgI4NtAgxjBuf/0iEkXQuCISWHveAb3QstIgIAABxAACKhIO4gi8y2jOQhxf3CzPj6MiHc/Soj4kIA4OhBhgwAAACSIScME5BhBHzEYDSDbQMMc8bU/9IhJF0LoiElIbj9p73dQc/9Mg0A+iJKIjJCABvdG//2TwKG3P8hsP189iLSKfISHCISHSBmMGBg9GefBwYeANIhJF0LLHMGQAC2jCFGDwAAciEnfMNwYQQMEmAjg20CPDMGu/8AAF0L0iEkRgAA/QaCISWHvdkb3QstIgIAABxAACKhi8wg7iC2jORtD+CQdJJhKODoQcLM+P0GRgIAPEOG0wLSISRdCyFj/Se176IhKAtvokUAG1UWhgdWrPiGHAAMk8bKAl0L0iEkRgAA/QYhWf0ntepGBgByISd8w3BhBAwSYCODbQIsY8aY/9IhJLBbIIIhJYe935FO/dBowFApwGeyAiBiIGe/AW0PTQbQPSBQJSBSYTRiYTWyYTYBs/3AAABiITVSITSyITZq3WpVYG/AVmb5Rs8C/QYmMgjGBAAA0iEkXQsMoyFn/TlifQ1GFgMAAAwPJhICRiAAIqEgImcRLAQhev1CZxIyoAVSYTRiYTVyYTOyYTYBnf3AAAByITOyITZiITVSITQ9ByKgkEKgCEJDWAsiGzNWUv8ioHAMkzJH6AsiG3dWUv8clHKhWJFN/Qx4RgIAAHoimiKCQgAtAxsyR5PxIWL9MWL9DIQGAQBCQgAbIjeS90ZgASFf/foiIgIAJzwdRg8AAACiISd8w6BhBAwSYCODbQIMswZT/9IhJF0LIVT9+iJiISVnvdsb3Qs9MgMAABxAADOhMO4gMgIAi8w3POEhTP1BTP36IjICAAwSABNAACKhQE+gCyLgIhAwzMAAA0Dg4JFIBDEl/SokMD+gImMRG//2PwKG3v8hP/1CoSAMA1JhNLJhNgFf/cAAAH0NDA9SITSyITZGFQAAAIIhJ3zDgGEEDBJgI4NtAgzjBrMCciEkXQuSISWXt+AbdwsnIgIAABxAACKhIO4gi8y2POQhK/1BCv36IiICAOAwJCpEISj9wsz9KiQyQgDg40Eb/yED/TIiEzc/0xwzMmIT3QdtDwYcAUwEDAMiwURSYTRiYTWyYTZyYTMBO/3AAAByITOB9fwioWCAh4JBFv0qKPoiMqAAIsIYgmEyATL9wAAAgiEyIRH9QqSAKij6IgwDIsIYASz9wAAAqM+CITLwKqAiIhGK/6JhLSJhLk0PUiE0YiE1ciEzsiE2BgQAACIPWBv/ECKgMiIRGzMyYhEyIS5AL8A3MuYMAikRKQGtAgwT4EMRksFESvmYD0pBKinwIhEbMykUmqpms+Ux3vw6IowS9iorIc78QqbQQEeCgshYKogioLwqJIJhLAwJfPNCYTkiYTDGQwAAXQvSISRGAAD9BiwzxpgAAKIhLIIKAIJhNxaIDhAooHgCG/f5Av0IDALwIhEiYThCIThwIAQiYS8L/0AiIHBxQVZf/gynhzc7cHgRkHcgAHcRcHAxQiEwcmEvDBpxrvwAGEAAqqEqhHCIkPD6EXKj/4YCAABCIS+qIkJYAPqIJ7fyBiAAciE5IICUioeioLBBofyqiECIkHKYDMxnMlgMfQMyw/4gKUGhm/zypLDGCgAggASAh8BCITl894CHMIqE8IiAoIiQcpgMzHcyWAwwcyAyw/6CITcLiIJhN0IhNwy4ICFBh5TIICAEIHfAfPoiITlwejB6ciKksCp3IYb8IHeQklcMQiEsG5kbREJhLHIhLpcXAsa9/4IhLSYoAsaYAEaBAAzix7ICxi8AkiEl0CnApiICBiUAIZv84DCUQXX8KiNAIpAiEgwAMhEwIDGW8gAwKTEWEgUnPAJGIwAGEgAADKPHs0KRkPx8+AADQOBgkWBgBCAoMCommiJAIpAikgwbc9ZCBitjPQdnvN0GBgCiISd8w6BhBAwSYCODbQIcA8Z1/tIhJF0LYiElZ73gIg0AGz0AHEAAIqEg7iCLzAzi3QPHMgJG2/+GBwAiDQGLPAATQAAyoSINACvdABxAACKhICMgIO4gwswQIW784DCUYUj8KiNgIpAyEgwAMxEwIDGWogAwOTEgIIRGCQAAAIFl/AykfPcbNAAEQOBAkUBABCAnMCokiiJgIpAikgxNA5Yi/gADQODgkTDMwCJhKAzzJyMVITP8ciEo+jIhV/wb/yojckIABjQAAIIhKGa4Gtx/HAmSYSgGAQDSISRdCxwTISj8fPY5YgZB/jFM/CojIsLwIgIAImEmJzwdBg4AoiEnfMOgYQQMEmAjg20CHCPGNf4AANIhJF0LYiElZ73eG90LLSICAHIhJgAcQAAioYvMIO4gdzzhgiEmMTn8kiEoDBYAGEAAZqGaMwtmMsPw4CYQYgMAAAhA4OCRKmYhMvyAzMAqLwwDZrkMMQX8+kMxLvw6NDIDAE0GUmE0YmE1smE2AUH8wAAAYiE1UiE0av+yITaGAAAADA9x+vtCJxFiJxJqZGe/AoZ5//eWB4YCANIhJF0LHFNGyf8A8Rr8IRv8PQ9SYTRiYTWyYTZyYTMBLfzAAAByITMhBPwyJxFCJxI6PwEo/MAAALIhNmIhNVIhNDHj+yjDCyIpw/Hh+3jP1me4hj4BYiElDOLQNsCmQw9Br/tQNMCmIwJGTQDGMQIAx7ICRi4ApiMCBiUAQdX74CCUQCKQIhK8ADIRMCAxlgIBMCkxFkIFJzwChiQAxhIAAAAMo8ezRHz4kqSwAANA4GCRYGAEICgwKiaaIkAikCKSDBtz1oIGK2M9B2e83YYGAHIhJ3zDcGEEDBJgI4NtAhxzxtT9AADSISRdC4IhJYe93iINABs9ABxAACKhIO4gi8wM4t0DxzICxtv/BggAAAAiDQGLPAATQAAyoSINACvdABxAACKhICMgIO4gwswQQaj74CCUQCKQIhK8ACIRIPAxlo8AICkx8PCExggADKN892KksBsjAANA4DCRMDAE8Pcw+vNq/0D/kPKfDD0Cli/+AAJA4OCRIMzAIqD/96ICxkAAhgIAAByDBtMA0iEkXQshYvsnte/yRQBtDxtVRusADOLHMhkyDQEiDQCAMxEgIyAAHEAAIqEg7iAr3cLMEDGD++AglKoiMCKQIhIMACIRIDAxICkx1hMCDKQbJAAEQOBAkUBABDA5MDo0QXj7ijNAM5AykwxNApbz/f0DAAJA4OCRIMzAd4N8YqAOxzYaQg0BIg0AgEQRICQgABxAACKhIO4g0s0CwswQQWn74CCUqiJAIpBCEgwARBFAIDFASTHWEgIMphtGAAZA4GCRYGAEICkwKiZhXvuKImAikCKSDG0ElvL9MkUAAARA4OCRQMzAdwIIG1X9AkYCAAAAIkUBK1UGc//wYIRm9gKGswAirv8qZiF6++BmEWoiKAIiYSYhePtyISZqYvgGFpcFdzwdBg4AAACCISd8w4BhBAwSYCODbQIckwZb/dIhJF0LkiEll73gG90LLSICAKIhJgAcQAAioYvMIO4gpzzhYiEmDBIAFkAAIqELIuAiEGDMwAAGQODgkSr/DOLHsgJGMAByISXQJ8CmIgKGJQBBLPvgIJRAIpAi0g8iEgwAMhEwIDGW8gAwKTEWMgUnPAJGJACGEgAADKPHs0SRT/t8+AADQOBgkWBgBCAoMCommiJAIpAikgwbc9aCBitjPQdnvN2GBgCCISd8w4BhBAwSYCODbQIco8Yr/QAA0iEkXQuSISWXvd4iDQAbPQAcQAAioSDuIIvMDOLdA8cyAkbb/wYIAAAAIg0BizwAE0AAMqEiDQAr3QAcQAAioSAjICDuIMLMEGH/+uAglGAikCLSDzISDAAzETAgMZaCADA5MSAghMYIAIEk+wykfPcbNAAEQOBAkUBABCAnMCokiiJgIpAikgxNA5Yi/gADQODgkTDMwDEa++AiESozOAMyYSYxGPuiISYqIygCImEoFgoGpzweRg4AciEnfMNwYQQMEmAjg20CHLPG9/wAAADSISRdC4IhJYe93RvdCy0iAgCSISYAHEAAIqGLzCDuIJc84aIhJgwSABpAACKhYiEoCyLgIhAqZgAKQODgkaDMwGJhKHHi+oIhKHB1wJIhKzHf+oAnwJAiEDoicmEqPQUntQE9AkGW+vozbQ83tG0GEgAhwPosUzliBm4APFMhvfp9DTliDCZGbABdC9IhJEYAAP0GIYv6J7XhoiEqYiEociErYCrAMcn6cCIQKiMiAgAbqiJFAKJhKhtVC29WH/0GDAAAMgIAYsb9MkUAMgIBMkUBMgICOyIyRQI7VfY24xYGATICADJFAGYmBSICASJFAWpV/QaioLB8+YKksHKhAAa9/iGc+iiyB+IChpb8wCAkJzwgRg8AgiEnfMOAYQQMEmAjg20CLAMGrPwAAF0L0iEkRgAA/QaSISWXvdkb3QstIgIAABxAACKhi8wg7iDAICQnPOHAICQAAkDg4JF8giDMEH0NRgEAAAt3wsz4oiEkd7oC9ozxIbD6MbD6TQxSYTRyYTOyYTZFlAALIrIhNnIhM1IhNCDuEAwPFkwGhgwAAACCISd8w4BhBAwSYCODbQIskwYPAHIhJF0LkiEll7fgG3cLJyICAAAcQAAioSDuIIvMtozk4DB0wsz44OhBhgoAoiEnfMOgYQQMEmAjg20CLKMhX/o5YoYPAAAAciEkXQtiISVnt9kyBwAbd0FZ+hv/KKSAIhEwIiAppPZPB8bd/3IhJF0LIVL6LCM5YgwGhgEAciEkXQt89iYWFEsmzGJGAwALd8LM+IIhJHe4AvaM8YFI+iF4+jF4+sl4TQxSYTRiYTVyYTOCYTKyYTbFhQCCITKSISiiISYLIpnokiEq4OIQomgQciEzoiEkUiE0siE2YiE1+fjiaBSSaBWg18CwxcD9BpZWDjFl+vjYLQwFfgDw4PRNAvDw9X0MDHhiITWyITZGJQAAAJICAKICAurpkgIB6pma7vr+4gIDmpqa/5qe4gIEmv+anuICBZr/mp7iAgaa/5qe4gIHmv+a7ur/iyI6kkc5wEAjQbAisLCQYEYCAAAyAgAbIjru6v8qOb0CRzPvMUf6LQ5CYTFiYTVyYTOCYTKyYTZFdQAxQfrtAi0PxXQAQiExciEzsiE2QHfAgiEyQTr6YiE1/QKMhy0LsDjAxub/AAAA/xEhAfrq7+nS/QbcVvii8O7AfO/g94NGAgAAAAAMDN0M8q/9MS36UiEpKCNiISTQIsDQVcDaZtEJ+ikjOA1xCPpSYSnKU1kNcDXADAIMFfAlg2JhJCAgdFaCAELTgEAlgxaSAMH++S0MBSkAyQ2CISmcKJHl+Sg5FrIA8C8x8CLA1iIAxoP7MqDHId/5li8BjB9GS/oh3PkyIgPME4ZI+jKgyDlShkb6KC2MEsZE+iHo+QEU+sAAAAEW+sAAAEZA+sg9zByGPvoio+gBDvrAAADADADGOvriYSIMfEaN+gEO+sAAAAwcDAMGCAAAyC34PfAsICAgtMwSxpT6Rif7Mi0DIi0CxTIAMqAADBwgw4PGIvt4fWhtWF1ITTg9KC0MDAH0+cAAAO0CDBLgwpOGHvsAAAHu+cAAAAwMBhj7ACHC+UhdOC1JAiHA+TkCBvr/Qb75DAI4BMKgyDDCgykEQbr5PQwMHCkEMMKDBgz7xzICxvT9xvv9AiFDkqEQwiFC0iFB4iFA8iE/mhEN8AAACAAAYBwAAGAAAABgEAAAYCH8/xLB8OkBwCAA6AIJMckh2REh+P/AIADIAsDAdJzs0Zb5RgQAAAAx9P/AIAAoAzgNICB0wAMAC8xmDOqG9P8h7/8IMcAgAOkCyCHYEegBEsEQDfAAAAD4AgBgEAIAYAACAGAAAAAIIfz/wCAAOAIwMCRWQ/8h+f9B+v/AIAA5AjH3/8AgAEkDwCAASANWdP/AIAAoAgwTICAEMCIwDfAAAIAAAAAAQP///wAEAgBgEsHwySHBbPkJMShM2REWgghF+v8WIggoTAzzDA0nowwoLDAiEAwTINOD0NB0EBEgRfj/FmL/Id7/Me7/wCAAOQLAIAAyIgBWY/8x1//AIAAoAyAgJFZC/ygsMeX/QEIRIWH50DKDIeT/ICQQQeT/wCAAKQQhz//AIAA5AsAgADgCVnP/DBIcA9Ajk90CKEzQIsApTCgs2tLZLAgxyCHYERLBEA3wAAAATEoAQBLB4MlhwUH5+TH4POlBCXHZUe0C97MB/QMWHwTYHNrf0NxBBgEAAACF8v8oTKYSBCgsJ63yRe3/FpL/KBxNDz0OAe7/wAAAICB0jDIioMQpXCgcSDz6IvBEwCkcSTwIcchh2FHoQfgxEsEgDfAAAAD/DwAAUSb5EsHwCTEMFEJFADBMQUklQfr/ORUpNTAwtEoiKiMgLEEpRQwCImUFAVf5wAAACDEyoMUgI5MSwRAN8AAAADA7AEASwfAJMTKgwDeSESKg2wH7/8AAACKg3EYEAAAAADKg2zeSCAH2/8AAACKg3QH0/8AAAAgxEsEQDfAAAAASwfDJIdkRCTHNAjrSRgIAACIMAMLMAcX6/9ec8wIhA8IhAtgREsEQDfAAAFgQAABwEAAAGJgAQBxLAEA0mABAAJkAQJH7/xLB4Mlh6UH5MQlx2VGQEcDtAiLREM0DAfX/wAAA8fb4hgoA3QzHvwHdD00NPQEtDgHw/8AAACAgdPxCTQ09ASLREAHs/8AAANDugNDMwFYc/SHl/zLREBAigAHn/8AAACHh/xwDGiIF9f8tDAYBAAAAIqBjkd3/mhEIcchh2FHoQfgxEsEgDfAAEsHwIqDACTEBuv/AAAAIMRLBEA3wAAAAbBAAAGgQAAB0EAAAeBAAAHwQAACAEAAAkBAAAJgPAECMOwBAEsHgkfz/+TH9AiHG/8lh2VEJcelBkBHAGiI5AjHy/ywCGjNJA0Hw/9LREBpEwqAAUmQAwm0aAfD/wAAAYer/Ibz4GmZoBmeyAsZJAC0NAbb/wAAAIbP/MeX/KkEaM0kDRj4AAABhr/8x3/8aZmgGGjPoA8AmwOeyAiDiIGHd/z0BGmZZBk0O8C8gAaj/wAAAMdj/ICB0GjNYA4yyDARCbRbtBMYSAAAAAEHR/+r/GkRZBAXx/z0OLQGF4/9F8P9NDj0B0C0gAZr/wAAAYcn/6swaZlgGIZP/GiIoAie8vDHC/1AswBozOAM3sgJG3f9G6v9CoABCTWwhuf8QIoABv//AAABWAv9huf8iDWwQZoA4BkUHAPfiEfZODkGx/xpE6jQiQwAb7sbx/zKv/jeSwSZOKSF7/9A9IBAigAF+/8AAAAXo/yF2/xwDGiJF2v9F5/8sAgGm+MAAAIYFAGFx/1ItGhpmaAZntchXPAIG2f/G7/8AkaD/mhEIcchh2FHoQfgxEsEgDfBdAkKgwCgDR5UOzDIMEoYGAAwCKQN84g3wJhIFJiIRxgsAQqDbLQVHlSkMIikDBggAIqDcJ5UIDBIpAy0EDfAAQqDdfPJHlQsMEikDIqDbDfAAfPIN8AAAtiMwbQJQ9kBA80BHtSlQRMAAFEAAM6EMAjc2BDBmwBsi8CIRMDFBC0RWxP43NgEbIg3wAIyTDfA3NgwMEg3wAAAAAABESVYwDAIN8LYjKFDyQEDzQEe1F1BEwAAUQAAzoTcyAjAiwDAxQULE/1YE/zcyAjAiwA3wzFMAAABESVYwDAIN8AAAAAAUQObECSAzgQAioQ3wAAAAMqEMAg3wAA==",gh=1074843648,uh="CIH+PwUFBAACAwcAAwMLANTXEEAL2BBAOdgQQNbYEECF5xBAOtkQQJDZEEDc2RBAhecQQKLaEEAf2xBA4NsQQIXnEECF5xBAeNwQQIXnEEBV3xBAHOAQQFfgEECF5xBAhecQQPPgEECF5xBA2+EQQIHiEEDA4xBAf+QQQFDlEECF5xBAhecQQIXnEECF5xBAfuYQQIXnEEB05xBAsN0QQKnYEEDC5RBAydoQQBvaEECF5xBACOcQQE/nEECF5xBAhecQQIXnEECF5xBAhecQQIXnEECF5xBAhecQQELaEEB/2hBA2uUQQAEAAAACAAAAAwAAAAQAAAAFAAAABwAAAAkAAAANAAAAEQAAABkAAAAhAAAAMQAAAEEAAABhAAAAgQAAAMEAAAABAQAAgQEAAAECAAABAwAAAQQAAAEGAAABCAAAAQwAAAEQAAABGAAAASAAAAEwAAABQAAAAWAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAABAAAAAgAAAAIAAAADAAAAAwAAAAQAAAAEAAAABQAAAAUAAAAGAAAABgAAAAcAAAAHAAAACAAAAAgAAAAJAAAACQAAAAoAAAAKAAAACwAAAAsAAAAMAAAADAAAAA0AAAANAAAAAAAAAAAAAAADAAAABAAAAAUAAAAGAAAABwAAAAgAAAAJAAAACgAAAAsAAAANAAAADwAAABEAAAATAAAAFwAAABsAAAAfAAAAIwAAACsAAAAzAAAAOwAAAEMAAABTAAAAYwAAAHMAAACDAAAAowAAAMMAAADjAAAAAgEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAQAAAAEAAAABAAAAAgAAAAIAAAACAAAAAgAAAAMAAAADAAAAAwAAAAMAAAAEAAAABAAAAAQAAAAEAAAABQAAAAUAAAAFAAAABQAAAAAAAAAAAAAAAAAAABAREgAIBwkGCgULBAwDDQIOAQ8AAQEAAAEAAAAEAAAA",_h=1073720488,ph=1073643776,fh={entry:dh,text:Ah,text_start:gh,data:uh,data_start:_h,bss_start:ph},wh=Object.freeze({__proto__:null,bss_start:ph,data:uh,data_start:_h,default:fh,entry:dh,text:Ah,text_start:gh});class Eh extends Ea{constructor(){super(...arguments),this.CHIP_NAME="ESP32",this.IMAGE_CHIP_ID=0,this.EFUSE_RD_REG_BASE=1073061888,this.DR_REG_SYSCON_BASE=1073111040,this.UART_CLKDIV_REG=1072955412,this.UART_CLKDIV_MASK=1048575,this.UART_DATE_REG_ADDR=1610612856,this.XTAL_CLK_DIVIDER=1,this.IROM_MAP_START=1074593792,this.IROM_MAP_END=1077936128,this.DROM_MAP_START=1061158912,this.DROM_MAP_END=1065353216,this.MEMORY_MAP=[[0,65536,"PADDING"],[1061158912,1065353216,"DROM"],[1065353216,1069547520,"EXTRAM_DATA"],[1073217536,1073225728,"RTC_DRAM"],[1073283072,1073741824,"BYTE_ACCESSIBLE"],[1073405952,1073741824,"DRAM"],[1073610752,1073741820,"DIRAM_DRAM"],[1073741824,1074200576,"IROM"],[1074200576,1074233344,"CACHE_PRO"],[1074233344,1074266112,"CACHE_APP"],[1074266112,1074397184,"IRAM"],[1074397184,1074528252,"DIRAM_IRAM"],[1074528256,1074536448,"RTC_IRAM"],[1074593792,1077936128,"IROM"],[1342177280,1342185472,"RTC_DATA"]],this.FLASH_SIZES={"1MB":0,"2MB":16,"4MB":32,"8MB":48,"16MB":64,"32MB":80,"64MB":96,"128MB":112},this.FLASH_FREQUENCY={"80m":15,"40m":0,"26m":1,"20m":2},this.FLASH_WRITE_SIZE=1024,this.BOOTLOADER_FLASH_OFFSET=4096,this.SPI_REG_BASE=1072963584,this.SPI_USR_OFFS=28,this.SPI_USR1_OFFS=32,this.SPI_USR2_OFFS=36,this.SPI_W0_OFFS=128,this.SPI_MOSI_DLEN_OFFS=40,this.SPI_MISO_DLEN_OFFS=44}async readEfuse(t,e){const i=this.EFUSE_RD_REG_BASE+4*e;return t.debug("Read efuse "+i),await t.readReg(i)}async getPkgVersion(t){const e=await this.readEfuse(t,3);let i=e>>9&7;return i+=(e>>2&1)<<3,i}async getChipRevision(t){const e=await this.readEfuse(t,3),i=await this.readEfuse(t,5),s=await t.readReg(this.DR_REG_SYSCON_BASE+124);return 0!=(e>>15&1)?0!=(i>>20&1)?0!=(s>>31&1)?3:2:1:0}async getChipDescription(t){const e=["ESP32-D0WDQ6","ESP32-D0WD","ESP32-D2WD","","ESP32-U4WDH","ESP32-PICO-D4","ESP32-PICO-V3-02"];let i="";const s=await this.getPkgVersion(t),o=await this.getChipRevision(t),r=3==o;return 0!=(1&await this.readEfuse(t,3))&&(e[0]="ESP32-S0WDQ6",e[1]="ESP32-S0WD"),r&&(e[5]="ESP32-PICO-V3"),i=s>=0&&s<=6?e[s]:"Unknown ESP32",!r||0!==s&&1!==s||(i+="-V3"),i+" (revision "+o+")"}async getChipFeatures(t){const e=["Wi-Fi"],i=await this.readEfuse(t,3);0===(2&i)&&e.push(" BT");0!==(1&i)?e.push(" Single Core"):e.push(" Dual Core");if(0!==(8192&i)){0!==(4096&i)?e.push(" 160MHz"):e.push(" 240MHz")}const s=await this.getPkgVersion(t);-1!==[2,4,5,6].indexOf(s)&&e.push(" Embedded Flash"),6===s&&e.push(" Embedded PSRAM");0!==(await this.readEfuse(t,4)>>8&31)&&e.push(" VRef calibration in efuse");0!==(i>>14&1)&&e.push(" BLK3 partially reserved");const o=3&await this.readEfuse(t,6);return e.push(" Coding Scheme "+["None","3/4","Repeat (UNSUPPORTED)","Invalid"][o]),e}async getCrystalFreq(t){const e=await t.readReg(this.UART_CLKDIV_REG)&this.UART_CLKDIV_MASK,i=t.transport.baudrate*e/1e6/this.XTAL_CLK_DIVIDER;let s;return s=i>33?40:26,Math.abs(s-i)>1&&t.info("WARNING: Unsupported crystal in use"),s}_d2h(t){const e=(+t).toString(16);return 1===e.length?"0"+e:e}async readMac(t){let e=await this.readEfuse(t,1);e>>>=0;let i=await this.readEfuse(t,2);i>>>=0;const s=new Uint8Array(6);return s[0]=i>>8&255,s[1]=255&i,s[2]=e>>24&255,s[3]=e>>16&255,s[4]=e>>8&255,s[5]=255&e,this._d2h(s[0])+":"+this._d2h(s[1])+":"+this._d2h(s[2])+":"+this._d2h(s[3])+":"+this._d2h(s[4])+":"+this._d2h(s[5])}}var mh=Object.freeze({__proto__:null,ESP32ROM:Eh});class bh extends Eh{constructor(){super(...arguments),this.CHIP_NAME="ESP32-C3",this.IMAGE_CHIP_ID=5,this.EFUSE_BASE=1610647552,this.MAC_EFUSE_REG=this.EFUSE_BASE+68,this.UART_CLKDIV_REG=1072955412,this.UART_CLKDIV_MASK=1048575,this.UART_DATE_REG_ADDR=1610612860,this.FLASH_WRITE_SIZE=1024,this.BOOTLOADER_FLASH_OFFSET=0,this.SPI_REG_BASE=1610620928,this.SPI_USR_OFFS=24,this.SPI_USR1_OFFS=28,this.SPI_USR2_OFFS=32,this.SPI_MOSI_DLEN_OFFS=36,this.SPI_MISO_DLEN_OFFS=40,this.SPI_W0_OFFS=88,this.IROM_MAP_START=1107296256,this.IROM_MAP_END=1115684864,this.MEMORY_MAP=[[0,65536,"PADDING"],[1006632960,1015021568,"DROM"],[1070071808,1070465024,"DRAM"],[1070104576,1070596096,"BYTE_ACCESSIBLE"],[1072693248,1072824320,"DROM_MASK"],[1073741824,1074135040,"IROM_MASK"],[1107296256,1115684864,"IROM"],[1077395456,1077805056,"IRAM"],[1342177280,1342185472,"RTC_IRAM"],[1342177280,1342185472,"RTC_DRAM"],[1611653120,1611661312,"MEM_INTERNAL2"]]}async getPkgVersion(t){const e=this.EFUSE_BASE+68+12;return await t.readReg(e)>>21&7}async getChipRevision(t){const e=this.EFUSE_BASE+68+12;return(await t.readReg(e)&7<<18)>>18}async getMinorChipVersion(t){const e=this.EFUSE_BASE+68+20,i=await t.readReg(e)>>23&1,s=this.EFUSE_BASE+68+12;return(i<<3)+(await t.readReg(s)>>18&7)}async getMajorChipVersion(t){const e=this.EFUSE_BASE+68+20;return await t.readReg(e)>>24&3}async getChipDescription(t){const e=await this.getPkgVersion(t),i=await this.getMajorChipVersion(t),s=await this.getMinorChipVersion(t);return`${{0:"ESP32-C3 (QFN32)",1:"ESP8685 (QFN28)",2:"ESP32-C3 AZ (QFN32)",3:"ESP8686 (QFN24)"}[e]||"Unknown ESP32-C3"} (revision v${i}.${s})`}async getFlashCap(t){const e=this.EFUSE_BASE+68+12;return await t.readReg(e)>>27&7}async getFlashVendor(t){const e=this.EFUSE_BASE+68+16;return{1:"XMC",2:"GD",3:"FM",4:"TT",5:"ZBIT"}[7&await t.readReg(e)]||""}async getChipFeatures(t){const e=["Wi-Fi","BLE"],i=await this.getFlashCap(t),s=await this.getFlashVendor(t),o={0:null,1:"Embedded Flash 4MB",2:"Embedded Flash 2MB",3:"Embedded Flash 1MB",4:"Embedded Flash 8MB"}[i],r=void 0!==o?o:"Unknown Embedded Flash";return null!==o&&e.push(`${r} (${s})`),e}async getCrystalFreq(t){return 40}_d2h(t){const e=(+t).toString(16);return 1===e.length?"0"+e:e}async readMac(t){let e=await t.readReg(this.MAC_EFUSE_REG);e>>>=0;let i=await t.readReg(this.MAC_EFUSE_REG+4);i=i>>>0&65535;const s=new Uint8Array(6);return s[0]=i>>8&255,s[1]=255&i,s[2]=e>>24&255,s[3]=e>>16&255,s[4]=e>>8&255,s[5]=255&e,this._d2h(s[0])+":"+this._d2h(s[1])+":"+this._d2h(s[2])+":"+this._d2h(s[3])+":"+this._d2h(s[4])+":"+this._d2h(s[5])}getEraseSize(t,e){return e}}var yh=Object.freeze({__proto__:null,ESP32C3ROM:bh});var vh=Object.freeze({__proto__:null,ESP32C2ROM:class extends bh{constructor(){super(...arguments),this.CHIP_NAME="ESP32-C2",this.IMAGE_CHIP_ID=12,this.EFUSE_BASE=1610647552,this.MAC_EFUSE_REG=this.EFUSE_BASE+64,this.UART_CLKDIV_REG=1610612756,this.UART_CLKDIV_MASK=1048575,this.UART_DATE_REG_ADDR=1610612860,this.XTAL_CLK_DIVIDER=1,this.FLASH_WRITE_SIZE=1024,this.BOOTLOADER_FLASH_OFFSET=0,this.SPI_REG_BASE=1610620928,this.SPI_USR_OFFS=24,this.SPI_USR1_OFFS=28,this.SPI_USR2_OFFS=32,this.SPI_MOSI_DLEN_OFFS=36,this.SPI_MISO_DLEN_OFFS=40,this.SPI_W0_OFFS=88,this.IROM_MAP_START=1107296256,this.IROM_MAP_END=1111490560,this.MEMORY_MAP=[[0,65536,"PADDING"],[1006632960,1010827264,"DROM"],[1070202880,1070465024,"DRAM"],[1070104576,1070596096,"BYTE_ACCESSIBLE"],[1072693248,1073020928,"DROM_MASK"],[1073741824,1074331648,"IROM_MASK"],[1107296256,1111490560,"IROM"],[1077395456,1077673984,"IRAM"]]}async getPkgVersion(t){const e=this.EFUSE_BASE+64+4;return await t.readReg(e)>>22&7}async getChipRevision(t){const e=this.EFUSE_BASE+64+4;return(await t.readReg(e)&3<<20)>>20}async getChipDescription(t){let e;const i=await this.getPkgVersion(t);e=0===i||1===i?"ESP32-C2":"unknown ESP32-C2";return e+=" (revision "+await this.getChipRevision(t)+")",e}async getChipFeatures(t){return["Wi-Fi","BLE"]}async getCrystalFreq(t){const e=await t.readReg(this.UART_CLKDIV_REG)&this.UART_CLKDIV_MASK,i=t.transport.baudrate*e/1e6/this.XTAL_CLK_DIVIDER;let s;return s=i>33?40:26,Math.abs(s-i)>1&&t.info("WARNING: Unsupported crystal in use"),s}async changeBaudRate(t){26===await this.getCrystalFreq(t)&&t.changeBaud()}_d2h(t){const e=(+t).toString(16);return 1===e.length?"0"+e:e}async readMac(t){let e=await t.readReg(this.MAC_EFUSE_REG);e>>>=0;let i=await t.readReg(this.MAC_EFUSE_REG+4);i=i>>>0&65535;const s=new Uint8Array(6);return s[0]=i>>8&255,s[1]=255&i,s[2]=e>>24&255,s[3]=e>>16&255,s[4]=e>>8&255,s[5]=255&e,this._d2h(s[0])+":"+this._d2h(s[1])+":"+this._d2h(s[2])+":"+this._d2h(s[3])+":"+this._d2h(s[4])+":"+this._d2h(s[5])}getEraseSize(t,e){return e}}});class Ch extends bh{constructor(){super(...arguments),this.CHIP_NAME="ESP32-C6",this.IMAGE_CHIP_ID=13,this.EFUSE_BASE=1611335680,this.EFUSE_BLOCK1_ADDR=this.EFUSE_BASE+68,this.MAC_EFUSE_REG=this.EFUSE_BASE+68,this.UART_CLKDIV_REG=1072955412,this.UART_CLKDIV_MASK=1048575,this.UART_DATE_REG_ADDR=1610612860,this.FLASH_WRITE_SIZE=1024,this.BOOTLOADER_FLASH_OFFSET=0,this.SPI_REG_BASE=1610620928,this.SPI_USR_OFFS=24,this.SPI_USR1_OFFS=28,this.SPI_USR2_OFFS=32,this.SPI_MOSI_DLEN_OFFS=36,this.SPI_MISO_DLEN_OFFS=40,this.SPI_W0_OFFS=88,this.IROM_MAP_START=1107296256,this.IROM_MAP_END=1115684864,this.MEMORY_MAP=[[0,65536,"PADDING"],[1107296256,1124073472,"DROM"],[1082130432,1082654720,"DRAM"],[1082130432,1082654720,"BYTE_ACCESSIBLE"],[1074048e3,1074069504,"DROM_MASK"],[1073741824,1074048e3,"IROM_MASK"],[1107296256,1124073472,"IROM"],[1082130432,1082654720,"IRAM"],[1342177280,1342193664,"RTC_IRAM"],[1342177280,1342193664,"RTC_DRAM"],[1611653120,1611661312,"MEM_INTERNAL2"]]}async getPkgVersion(t){const e=this.EFUSE_BASE+68+12;return await t.readReg(e)>>21&7}async getChipRevision(t){const e=this.EFUSE_BASE+68+12;return(await t.readReg(e)&7<<18)>>18}async getChipDescription(t){let e;e=0===await this.getPkgVersion(t)?"ESP32-C6":"unknown ESP32-C6";return e+=" (revision "+await this.getChipRevision(t)+")",e}async getChipFeatures(t){return["Wi-Fi 6","BT 5","IEEE802.15.4"]}async getCrystalFreq(t){return 40}_d2h(t){const e=(+t).toString(16);return 1===e.length?"0"+e:e}async readMac(t){let e=await t.readReg(this.MAC_EFUSE_REG);e>>>=0;let i=await t.readReg(this.MAC_EFUSE_REG+4);i=i>>>0&65535;const s=new Uint8Array(6);return s[0]=i>>8&255,s[1]=255&i,s[2]=e>>24&255,s[3]=e>>16&255,s[4]=e>>8&255,s[5]=255&e,this._d2h(s[0])+":"+this._d2h(s[1])+":"+this._d2h(s[2])+":"+this._d2h(s[3])+":"+this._d2h(s[4])+":"+this._d2h(s[5])}getEraseSize(t,e){return e}}var Bh=Object.freeze({__proto__:null,ESP32C6ROM:Ch});var Sh=Object.freeze({__proto__:null,ESP32C61ROM:class extends Ch{constructor(){super(...arguments),this.CHIP_NAME="ESP32-C61",this.IMAGE_CHIP_ID=20,this.CHIP_DETECT_MAGIC_VALUE=[871374959,606167151],this.UART_DATE_REG_ADDR=1610612860,this.EFUSE_BASE=1611352064,this.EFUSE_BLOCK1_ADDR=this.EFUSE_BASE+68,this.MAC_EFUSE_REG=this.EFUSE_BASE+68,this.EFUSE_RD_REG_BASE=this.EFUSE_BASE+48,this.EFUSE_PURPOSE_KEY0_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY0_SHIFT=0,this.EFUSE_PURPOSE_KEY1_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY1_SHIFT=4,this.EFUSE_PURPOSE_KEY2_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY2_SHIFT=8,this.EFUSE_PURPOSE_KEY3_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY3_SHIFT=12,this.EFUSE_PURPOSE_KEY4_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY4_SHIFT=16,this.EFUSE_PURPOSE_KEY5_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY5_SHIFT=20,this.EFUSE_DIS_DOWNLOAD_MANUAL_ENCRYPT_REG=this.EFUSE_RD_REG_BASE,this.EFUSE_DIS_DOWNLOAD_MANUAL_ENCRYPT=1<<20,this.EFUSE_SPI_BOOT_CRYPT_CNT_REG=this.EFUSE_BASE+48,this.EFUSE_SPI_BOOT_CRYPT_CNT_MASK=7<<23,this.EFUSE_SECURE_BOOT_EN_REG=this.EFUSE_BASE+52,this.EFUSE_SECURE_BOOT_EN_MASK=1<<26,this.FLASH_FREQUENCY={"80m":15,"40m":0,"20m":2},this.IROM_MAP_START=1107296256,this.IROM_MAP_END=1115684864,this.MEMORY_MAP=[[0,65536,"PADDING"],[1098907648,1107296256,"DROM"],[1082130432,1082523648,"DRAM"],[1082130432,1082523648,"BYTE_ACCESSIBLE"],[1074048e3,1074069504,"DROM_MASK"],[1073741824,1074048e3,"IROM_MASK"],[1090519040,1098907648,"IROM"],[1082130432,1082523648,"IRAM"],[1342177280,1342193664,"RTC_IRAM"],[1342177280,1342193664,"RTC_DRAM"],[1611653120,1611661312,"MEM_INTERNAL2"]],this.UF2_FAMILY_ID=2010665156,this.EFUSE_MAX_KEY=5,this.KEY_PURPOSES={0:"USER/EMPTY",1:"ECDSA_KEY",2:"XTS_AES_256_KEY_1",3:"XTS_AES_256_KEY_2",4:"XTS_AES_128_KEY",5:"HMAC_DOWN_ALL",6:"HMAC_DOWN_JTAG",7:"HMAC_DOWN_DIGITAL_SIGNATURE",8:"HMAC_UP",9:"SECURE_BOOT_DIGEST0",10:"SECURE_BOOT_DIGEST1",11:"SECURE_BOOT_DIGEST2",12:"KM_INIT_KEY",13:"XTS_AES_256_KEY_1_PSRAM",14:"XTS_AES_256_KEY_2_PSRAM",15:"XTS_AES_128_KEY_PSRAM"}}async getPkgVersion(t){return await t.readReg(this.EFUSE_BLOCK1_ADDR+8)>>26&7}async getMinorChipVersion(t){return 15&await t.readReg(this.EFUSE_BLOCK1_ADDR+8)}async getMajorChipVersion(t){return await t.readReg(this.EFUSE_BLOCK1_ADDR+8)>>4&3}async getChipDescription(t){let e;e=0===await this.getPkgVersion(t)?"ESP32-C61":"unknown ESP32-C61";return`${e} (revision v${await this.getMajorChipVersion(t)}.${await this.getMinorChipVersion(t)})`}async getChipFeatures(t){return["WiFi 6","BT 5"]}async readMac(t){let e=await t.readReg(this.MAC_EFUSE_REG);e>>>=0;let i=await t.readReg(this.MAC_EFUSE_REG+4);i=i>>>0&65535;const s=new Uint8Array(6);return s[0]=i>>8&255,s[1]=255&i,s[2]=e>>24&255,s[3]=e>>16&255,s[4]=e>>8&255,s[5]=255&e,this._d2h(s[0])+":"+this._d2h(s[1])+":"+this._d2h(s[2])+":"+this._d2h(s[3])+":"+this._d2h(s[4])+":"+this._d2h(s[5])}}});var Ih=Object.freeze({__proto__:null,ESP32C5ROM:class extends Ch{constructor(){super(...arguments),this.CHIP_NAME="ESP32-C5",this.IMAGE_CHIP_ID=23,this.BOOTLOADER_FLASH_OFFSET=8192,this.EFUSE_BASE=1611352064,this.EFUSE_BLOCK1_ADDR=this.EFUSE_BASE+68,this.MAC_EFUSE_REG=this.EFUSE_BASE+68,this.UART_CLKDIV_REG=1610612756,this.EFUSE_RD_REG_BASE=this.EFUSE_BASE+48,this.EFUSE_FORCE_USE_KEY_MANAGER_KEY_REG=this.EFUSE_BASE+52,this.EFUSE_FORCE_USE_KEY_MANAGER_KEY_SHIFT=10,this.FORCE_USE_KEY_MANAGER_VAL_XTS_AES_KEY=2,this.EFUSE_PURPOSE_KEY0_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY0_SHIFT=22,this.EFUSE_PURPOSE_KEY1_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY1_SHIFT=27,this.EFUSE_PURPOSE_KEY2_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY2_SHIFT=0,this.EFUSE_PURPOSE_KEY3_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY3_SHIFT=5,this.EFUSE_PURPOSE_KEY4_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY4_SHIFT=10,this.EFUSE_PURPOSE_KEY5_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY5_SHIFT=15,this.EFUSE_DIS_DOWNLOAD_MANUAL_ENCRYPT_REG=this.EFUSE_RD_REG_BASE,this.EFUSE_DIS_DOWNLOAD_MANUAL_ENCRYPT=1<<20,this.EFUSE_SPI_BOOT_CRYPT_CNT_REG=this.EFUSE_BASE+52,this.EFUSE_SPI_BOOT_CRYPT_CNT_MASK=7<<18,this.EFUSE_SECURE_BOOT_EN_REG=this.EFUSE_BASE+56,this.EFUSE_SECURE_BOOT_EN_MASK=1<<20,this.IROM_MAP_START=1107296256,this.IROM_MAP_END=1140850688,this.DROM_MAP_START=1107296256,this.DROM_MAP_END=1140850688,this.PCR_SYSCLK_CONF_REG=1611227408,this.PCR_SYSCLK_XTAL_FREQ_V=127<<24,this.PCR_SYSCLK_XTAL_FREQ_S=24,this.XTAL_CLK_DIVIDER=1,this.UARTDEV_BUF_NO=1082520852,this.CHIP_DETECT_MAGIC_VALUE=[285294703,1675706479,1607549039],this.FLASH_FREQUENCY={"80m":15,"40m":0,"20m":2},this.MEMORY_MAP=[[0,65536,"PADDING"],[1107296256,1140850688,"DROM"],[1082130432,1082523648,"DRAM"],[1082130432,1082523648,"BYTE_ACCESSIBLE"],[1073979392,1074003968,"DROM_MASK"],[1073741824,1073979392,"IROM_MASK"],[1107296256,1140850688,"IROM"],[1082130432,1082523648,"IRAM"],[1342177280,1342193664,"RTC_IRAM"],[1342177280,1342193664,"RTC_DRAM"],[1611653120,1611661312,"MEM_INTERNAL2"]],this.UF2_FAMILY_ID=4145808195,this.EFUSE_MAX_KEY=5,this.PURPOSE_VAL_XTS_AES128_KEY=4,this.KEY_PURPOSES={0:"USER/EMPTY",1:"ECDSA_KEY",4:"XTS_AES_128_KEY",5:"HMAC_DOWN_ALL",6:"HMAC_DOWN_JTAG",7:"HMAC_DOWN_DIGITAL_SIGNATURE",8:"HMAC_UP",9:"SECURE_BOOT_DIGEST0",10:"SECURE_BOOT_DIGEST1",11:"SECURE_BOOT_DIGEST2",12:"KM_INIT_KEY",15:"XTS_AES_128_PSRAM_KEY",16:"ECDSA_KEY_P192",17:"ECDSA_KEY_P384_L",18:"ECDSA_KEY_P384_H"}}async getPkgVersion(t){return await t.readReg(this.EFUSE_BLOCK1_ADDR+8)>>26&7}async getMinorChipVersion(t){return 15&await t.readReg(this.EFUSE_BLOCK1_ADDR+8)}async getMajorChipVersion(t){return await t.readReg(this.EFUSE_BLOCK1_ADDR+8)>>4&3}async getChipDescription(t){let e;e=0===await this.getPkgVersion(t)?"ESP32-C5":"unknown ESP32-C5";return`${e} (revision v${await this.getMajorChipVersion(t)}.${await this.getMinorChipVersion(t)})`}async getChipFeatures(t){return["Wi-Fi 6 (dual-band)","BT 5 (LE)","IEEE802.15.4","Single Core + LP Core","240MHz"]}async getCrystalFreq(t){const e=await t.readReg(this.UART_CLKDIV_REG)&this.UART_CLKDIV_MASK,i=t.transport.baudrate*e/1e6/this.XTAL_CLK_DIVIDER;let s;return s=i>45?48:i>33?40:26,Math.abs(s-i)>1&&t.info("WARNING: Unsupported crystal in use"),s}async getCrystalFreqRomExpect(t){return(await t.readReg(this.PCR_SYSCLK_CONF_REG)&this.PCR_SYSCLK_XTAL_FREQ_V)>>this.PCR_SYSCLK_XTAL_FREQ_S}async getKeyBlockPurpose(t,e){if(e<0||e>this.EFUSE_MAX_KEY)throw new Error(`Valid key block numbers must be in range 0-${this.EFUSE_MAX_KEY}`);const i=[[this.EFUSE_PURPOSE_KEY0_REG,this.EFUSE_PURPOSE_KEY0_SHIFT],[this.EFUSE_PURPOSE_KEY1_REG,this.EFUSE_PURPOSE_KEY1_SHIFT],[this.EFUSE_PURPOSE_KEY2_REG,this.EFUSE_PURPOSE_KEY2_SHIFT],[this.EFUSE_PURPOSE_KEY3_REG,this.EFUSE_PURPOSE_KEY3_SHIFT],[this.EFUSE_PURPOSE_KEY4_REG,this.EFUSE_PURPOSE_KEY4_SHIFT],[this.EFUSE_PURPOSE_KEY5_REG,this.EFUSE_PURPOSE_KEY5_SHIFT]],[s,o]=i[e];return await t.readReg(s)>>o&31}async isFlashEncryptionKeyValid(t){const e=[];for(let i=0;i<=this.EFUSE_MAX_KEY;i++){const s=await this.getKeyBlockPurpose(t,i);e.push(s)}if(e.some(t=>t===this.PURPOSE_VAL_XTS_AES128_KEY))return!0;return 0!==(await t.readReg(this.EFUSE_FORCE_USE_KEY_MANAGER_KEY_REG)>>this.EFUSE_FORCE_USE_KEY_MANAGER_KEY_SHIFT&this.FORCE_USE_KEY_MANAGER_VAL_XTS_AES_KEY)}checkSpiConnection(t,e){if(!e.every(t=>t>=0&&t<=28))throw new Error("SPI Pin numbers must be in the range 0-28.");e.some(t=>13===t||14===t)&&t.info("GPIO pins 13 and 14 are used by USB-Serial/JTAG, consider using other pins for SPI flash connection.")}async usesUsbJtagSerial(t){const e=this.UARTDEV_BUF_NO;return 3===(255&await t.readReg(e))}async watchdogReset(t){throw t.info("Hard resetting with a watchdog..."),new Error("watchdogReset not yet implemented for ESP32-C5")}async changeBaud(t){if(!t.IS_STUB){const e=await this.getCrystalFreqRomExpect(t),i=await this.getCrystalFreq(t);t.info(`ROM expects crystal freq: ${e} MHz, detected ${i} MHz.`),(48===i&&40===e||40===i&&48===e)&&t.info("Crystal frequency mismatch detected. Baud rate adjustment may be needed but is not fully implemented in this version.")}await t.changeBaud()}}});var xh=Object.freeze({__proto__:null,ESP32H2ROM:class extends Ch{constructor(){super(...arguments),this.CHIP_NAME="ESP32-H2",this.IMAGE_CHIP_ID=16,this.EFUSE_BASE=1611335680,this.EFUSE_BLOCK1_ADDR=this.EFUSE_BASE+68,this.MAC_EFUSE_REG=this.EFUSE_BASE+68,this.UART_CLKDIV_REG=1072955412,this.UART_CLKDIV_MASK=1048575,this.UART_DATE_REG_ADDR=1610612860,this.FLASH_WRITE_SIZE=1024,this.BOOTLOADER_FLASH_OFFSET=0,this.SPI_REG_BASE=1610620928,this.SPI_USR_OFFS=24,this.SPI_USR1_OFFS=28,this.SPI_USR2_OFFS=32,this.SPI_MOSI_DLEN_OFFS=36,this.SPI_MISO_DLEN_OFFS=40,this.SPI_W0_OFFS=88,this.USB_RAM_BLOCK=2048,this.UARTDEV_BUF_NO_USB=3,this.UARTDEV_BUF_NO=1070526796,this.IROM_MAP_START=1107296256,this.IROM_MAP_END=1115684864,this.MEMORY_MAP=[[0,65536,"PADDING"],[1107296256,1124073472,"DROM"],[1082130432,1082654720,"DRAM"],[1082130432,1082654720,"BYTE_ACCESSIBLE"],[1074048e3,1074069504,"DROM_MASK"],[1073741824,1074048e3,"IROM_MASK"],[1107296256,1124073472,"IROM"],[1082130432,1082654720,"IRAM"],[1342177280,1342193664,"RTC_IRAM"],[1342177280,1342193664,"RTC_DRAM"],[1611653120,1611661312,"MEM_INTERNAL2"]]}async getPkgVersion(t){return 7&await t.readReg(this.EFUSE_BLOCK1_ADDR+16)}async getMinorChipVersion(t){return await t.readReg(this.EFUSE_BLOCK1_ADDR+12)>>18&7}async getMajorChipVersion(t){return await t.readReg(this.EFUSE_BLOCK1_ADDR+12)>>21&3}async getChipDescription(t){let e;e=0===await this.getPkgVersion(t)?"ESP32-H2":"unknown ESP32-H2";return`${e} (revision v${await this.getMajorChipVersion(t)}.${await this.getMinorChipVersion(t)})`}async getChipFeatures(t){return["BT 5 (LE)","IEEE802.15.4","Single Core","96MHz"]}async getCrystalFreq(t){return 32}_d2h(t){const e=(+t).toString(16);return 1===e.length?"0"+e:e}async postConnect(t){const e=255&await t.readReg(this.UARTDEV_BUF_NO);t.debug("In _post_connect "+e),e==this.UARTDEV_BUF_NO_USB&&(t.ESP_RAM_BLOCK=this.USB_RAM_BLOCK)}async readMac(t){let e=await t.readReg(this.MAC_EFUSE_REG);e>>>=0;let i=await t.readReg(this.MAC_EFUSE_REG+4);i=i>>>0&65535;const s=new Uint8Array(6);return s[0]=i>>8&255,s[1]=255&i,s[2]=e>>24&255,s[3]=e>>16&255,s[4]=e>>8&255,s[5]=255&e,this._d2h(s[0])+":"+this._d2h(s[1])+":"+this._d2h(s[2])+":"+this._d2h(s[3])+":"+this._d2h(s[4])+":"+this._d2h(s[5])}getEraseSize(t,e){return e}}});var Dh=Object.freeze({__proto__:null,ESP32S3ROM:class extends Eh{constructor(){super(...arguments),this.CHIP_NAME="ESP32-S3",this.IMAGE_CHIP_ID=9,this.EFUSE_BASE=1610641408,this.MAC_EFUSE_REG=this.EFUSE_BASE+68,this.EFUSE_BLOCK1_ADDR=this.EFUSE_BASE+68,this.EFUSE_BLOCK2_ADDR=this.EFUSE_BASE+92,this.UART_CLKDIV_REG=1610612756,this.UART_CLKDIV_MASK=1048575,this.UART_DATE_REG_ADDR=1610612864,this.FLASH_WRITE_SIZE=1024,this.BOOTLOADER_FLASH_OFFSET=0,this.SPI_REG_BASE=1610620928,this.SPI_USR_OFFS=24,this.SPI_USR1_OFFS=28,this.SPI_USR2_OFFS=32,this.SPI_MOSI_DLEN_OFFS=36,this.SPI_MISO_DLEN_OFFS=40,this.SPI_W0_OFFS=88,this.USB_RAM_BLOCK=2048,this.UARTDEV_BUF_NO_USB=3,this.UARTDEV_BUF_NO=1070526796,this.IROM_MAP_START=1107296256,this.IROM_MAP_END=1140850688,this.MEMORY_MAP=[[0,65536,"PADDING"],[1006632960,1023410176,"DROM"],[1023410176,1040187392,"EXTRAM_DATA"],[1611653120,1611661312,"RTC_DRAM"],[1070104576,1070596096,"BYTE_ACCESSIBLE"],[1070104576,1077813248,"MEM_INTERNAL"],[1070104576,1070596096,"DRAM"],[1073741824,1073848576,"IROM_MASK"],[1077346304,1077805056,"IRAM"],[1611653120,1611661312,"RTC_IRAM"],[1107296256,1115684864,"IROM"],[1342177280,1342185472,"RTC_DATA"]]}async getChipDescription(t){const e=await this.getMajorChipVersion(t),i=await this.getMinorChipVersion(t);return`${{0:"ESP32-S3 (QFN56)",1:"ESP32-S3-PICO-1 (LGA56)"}[await this.getPkgVersion(t)]||"unknown ESP32-S3"} (revision v${e}.${i})`}async getPkgVersion(t){return await t.readReg(this.EFUSE_BLOCK1_ADDR+12)>>21&7}async getRawMinorChipVersion(t){return((await t.readReg(this.EFUSE_BLOCK1_ADDR+20)>>23&1)<<3)+(await t.readReg(this.EFUSE_BLOCK1_ADDR+12)>>18&7)}async getMinorChipVersion(t){const e=await this.getRawMinorChipVersion(t);return await this.isEco0(t,e)?0:this.getRawMinorChipVersion(t)}async getRawMajorChipVersion(t){return await t.readReg(this.EFUSE_BLOCK1_ADDR+20)>>24&3}async getMajorChipVersion(t){const e=await this.getRawMinorChipVersion(t);return await this.isEco0(t,e)?0:this.getRawMajorChipVersion(t)}async getBlkVersionMajor(t){return 3&await t.readReg(this.EFUSE_BLOCK2_ADDR+16)}async getBlkVersionMinor(t){return await t.readReg(this.EFUSE_BLOCK1_ADDR+12)>>24&7}async isEco0(t,e){return!(7&e)&&1===await this.getBlkVersionMajor(t)&&1===await this.getBlkVersionMinor(t)}async getFlashCap(t){const e=this.EFUSE_BASE+68+12;return await t.readReg(e)>>27&7}async getFlashVendor(t){const e=this.EFUSE_BASE+68+16;return{1:"XMC",2:"GD",3:"FM",4:"TT",5:"BY"}[7&await t.readReg(e)]||""}async getPsramCap(t){const e=this.EFUSE_BASE+68+16;return await t.readReg(e)>>3&3}async getPsramVendor(t){const e=this.EFUSE_BASE+68+16;return{1:"AP_3v3",2:"AP_1v8"}[await t.readReg(e)>>7&3]||""}async getChipFeatures(t){const e=["Wi-Fi","BLE"],i=await this.getFlashCap(t),s=await this.getFlashVendor(t),o={0:null,1:"Embedded Flash 8MB",2:"Embedded Flash 4MB"}[i],r=void 0!==o?o:"Unknown Embedded Flash";null!==o&&e.push(`${r} (${s})`);const n=await this.getPsramCap(t),a=await this.getPsramVendor(t),l={0:null,1:"Embedded PSRAM 8MB",2:"Embedded PSRAM 2MB"}[n],c=void 0!==l?l:"Unknown Embedded PSRAM";return null!==l&&e.push(`${c} (${a})`),e}async getCrystalFreq(t){return 40}_d2h(t){const e=(+t).toString(16);return 1===e.length?"0"+e:e}async postConnect(t){const e=255&await t.readReg(this.UARTDEV_BUF_NO);t.debug("In _post_connect "+e),e==this.UARTDEV_BUF_NO_USB&&(t.ESP_RAM_BLOCK=this.USB_RAM_BLOCK)}async readMac(t){let e=await t.readReg(this.MAC_EFUSE_REG);e>>>=0;let i=await t.readReg(this.MAC_EFUSE_REG+4);i=i>>>0&65535;const s=new Uint8Array(6);return s[0]=i>>8&255,s[1]=255&i,s[2]=e>>24&255,s[3]=e>>16&255,s[4]=e>>8&255,s[5]=255&e,this._d2h(s[0])+":"+this._d2h(s[1])+":"+this._d2h(s[2])+":"+this._d2h(s[3])+":"+this._d2h(s[4])+":"+this._d2h(s[5])}getEraseSize(t,e){return e}}});var Mh=Object.freeze({__proto__:null,ESP32S2ROM:class extends Eh{constructor(){super(...arguments),this.CHIP_NAME="ESP32-S2",this.IMAGE_CHIP_ID=2,this.IROM_MAP_START=1074266112,this.IROM_MAP_END=1085800448,this.DROM_MAP_START=1056964608,this.DROM_MAP_END=1061093376,this.CHIP_DETECT_MAGIC_VALUE=[1990],this.SPI_REG_BASE=1061167104,this.SPI_USR_OFFS=24,this.SPI_USR1_OFFS=28,this.SPI_USR2_OFFS=32,this.SPI_MOSI_DLEN_OFFS=36,this.SPI_MISO_DLEN_OFFS=40,this.SPI_W0_OFFS=88,this.SPI_ADDR_REG_MSB=!1,this.MAC_EFUSE_REG=1061265476,this.UART_CLKDIV_REG=1061158932,this.SUPPORTS_ENCRYPTED_FLASH=!0,this.FLASH_ENCRYPTED_WRITE_ALIGN=16,this.EFUSE_BASE=1061265408,this.EFUSE_RD_REG_BASE=this.EFUSE_BASE+48,this.EFUSE_BLOCK1_ADDR=this.EFUSE_BASE+68,this.EFUSE_BLOCK2_ADDR=this.EFUSE_BASE+92,this.EFUSE_PURPOSE_KEY0_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY0_SHIFT=24,this.EFUSE_PURPOSE_KEY1_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY1_SHIFT=28,this.EFUSE_PURPOSE_KEY2_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY2_SHIFT=0,this.EFUSE_PURPOSE_KEY3_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY3_SHIFT=4,this.EFUSE_PURPOSE_KEY4_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY4_SHIFT=8,this.EFUSE_PURPOSE_KEY5_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY5_SHIFT=12,this.EFUSE_DIS_DOWNLOAD_MANUAL_ENCRYPT_REG=this.EFUSE_RD_REG_BASE,this.EFUSE_DIS_DOWNLOAD_MANUAL_ENCRYPT=1<<19,this.EFUSE_SPI_BOOT_CRYPT_CNT_REG=this.EFUSE_BASE+52,this.EFUSE_SPI_BOOT_CRYPT_CNT_MASK=7<<18,this.EFUSE_SECURE_BOOT_EN_REG=this.EFUSE_BASE+56,this.EFUSE_SECURE_BOOT_EN_MASK=1<<20,this.EFUSE_RD_REPEAT_DATA3_REG=this.EFUSE_BASE+60,this.EFUSE_RD_REPEAT_DATA3_REG_FLASH_TYPE_MASK=512,this.PURPOSE_VAL_XTS_AES256_KEY_1=2,this.PURPOSE_VAL_XTS_AES256_KEY_2=3,this.PURPOSE_VAL_XTS_AES128_KEY=4,this.UARTDEV_BUF_NO=1073741076,this.UARTDEV_BUF_NO_USB_OTG=2,this.USB_RAM_BLOCK=2048,this.GPIO_STRAP_REG=1061175352,this.GPIO_STRAP_SPI_BOOT_MASK=8,this.GPIO_STRAP_VDDSPI_MASK=16,this.RTC_CNTL_OPTION1_REG=1061191976,this.RTC_CNTL_FORCE_DOWNLOAD_BOOT_MASK=1,this.RTCCNTL_BASE_REG=1061191680,this.RTC_CNTL_WDTCONFIG0_REG=this.RTCCNTL_BASE_REG+148,this.RTC_CNTL_WDTCONFIG1_REG=this.RTCCNTL_BASE_REG+152,this.RTC_CNTL_WDTWPROTECT_REG=this.RTCCNTL_BASE_REG+172,this.RTC_CNTL_WDT_WKEY=1356348065,this.MEMORY_MAP=[[0,65536,"PADDING"],[1056964608,1073217536,"DROM"],[1062207488,1073217536,"EXTRAM_DATA"],[1073340416,1073348608,"RTC_DRAM"],[1073340416,1073741824,"BYTE_ACCESSIBLE"],[1073340416,1074208768,"MEM_INTERNAL"],[1073414144,1073741824,"DRAM"],[1073741824,1073848576,"IROM_MASK"],[1073872896,1074200576,"IRAM"],[1074200576,1074208768,"RTC_IRAM"],[1074266112,1082130432,"IROM"],[1342177280,1342185472,"RTC_DATA"]],this.EFUSE_VDD_SPI_REG=this.EFUSE_BASE+52,this.VDD_SPI_XPD=16,this.VDD_SPI_TIEH=32,this.VDD_SPI_FORCE=64,this.UF2_FAMILY_ID=3218951918,this.EFUSE_MAX_KEY=5,this.KEY_PURPOSES={0:"USER/EMPTY",1:"RESERVED",2:"XTS_AES_256_KEY_1",3:"XTS_AES_256_KEY_2",4:"XTS_AES_128_KEY",5:"HMAC_DOWN_ALL",6:"HMAC_DOWN_JTAG",7:"HMAC_DOWN_DIGITAL_SIGNATURE",8:"HMAC_UP",9:"SECURE_BOOT_DIGEST0",10:"SECURE_BOOT_DIGEST1",11:"SECURE_BOOT_DIGEST2"},this.UART_CLKDIV_MASK=1048575,this.UART_DATE_REG_ADDR=1610612856,this.FLASH_WRITE_SIZE=1024,this.BOOTLOADER_FLASH_OFFSET=4096}async getPkgVersion(t){const e=this.EFUSE_BLOCK1_ADDR+16;return 15&await t.readReg(e)}async getMinorChipVersion(t){return((await t.readReg(this.EFUSE_BLOCK1_ADDR+12)>>20&1)<<3)+(await t.readReg(this.EFUSE_BLOCK1_ADDR+16)>>4&7)}async getMajorChipVersion(t){return await t.readReg(this.EFUSE_BLOCK1_ADDR+12)>>18&3}async getFlashVersion(t){return await t.readReg(this.EFUSE_BLOCK1_ADDR+12)>>21&15}async getChipDescription(t){const e=await this.getFlashCap(t)+100*await this.getPsramCap(t),i=await this.getMajorChipVersion(t),s=await this.getMinorChipVersion(t);return`${{0:"ESP32-S2",1:"ESP32-S2FH2",2:"ESP32-S2FH4",102:"ESP32-S2FNR2",100:"ESP32-S2R2"}[e]||"unknown ESP32-S2"} (revision v${i}.${s})`}async getFlashCap(t){return await this.getFlashVersion(t)}async getPsramVersion(t){const e=this.EFUSE_BLOCK1_ADDR+12;return await t.readReg(e)>>28&15}async getPsramCap(t){return await this.getPsramVersion(t)}async getBlock2Version(t){const e=this.EFUSE_BLOCK2_ADDR+16;return await t.readReg(e)>>4&7}async getChipFeatures(t){const e=["Wi-Fi"],i={0:"No Embedded Flash",1:"Embedded Flash 2MB",2:"Embedded Flash 4MB"}[await this.getFlashCap(t)]||"Unknown Embedded Flash";e.push(i);const s={0:"No Embedded Flash",1:"Embedded PSRAM 2MB",2:"Embedded PSRAM 4MB"}[await this.getPsramCap(t)]||"Unknown Embedded PSRAM";e.push(s);const o={0:"No calibration in BLK2 of efuse",1:"ADC and temperature sensor calibration in BLK2 of efuse V1",2:"ADC and temperature sensor calibration in BLK2 of efuse V2"}[await this.getBlock2Version(t)]||"Unknown Calibration in BLK2";return e.push(o),e}async getCrystalFreq(t){return 40}_d2h(t){const e=(+t).toString(16);return 1===e.length?"0"+e:e}async readMac(t){let e=await t.readReg(this.MAC_EFUSE_REG);e>>>=0;let i=await t.readReg(this.MAC_EFUSE_REG+4);i=i>>>0&65535;const s=new Uint8Array(6);return s[0]=i>>8&255,s[1]=255&i,s[2]=e>>24&255,s[3]=e>>16&255,s[4]=e>>8&255,s[5]=255&e,this._d2h(s[0])+":"+this._d2h(s[1])+":"+this._d2h(s[2])+":"+this._d2h(s[3])+":"+this._d2h(s[4])+":"+this._d2h(s[5])}getEraseSize(t,e){return e}async usingUsbOtg(t){return(255&await t.readReg(this.UARTDEV_BUF_NO))===this.UARTDEV_BUF_NO_USB_OTG}async postConnect(t){const e=await this.usingUsbOtg(t);t.debug("In _post_connect using USB OTG ?"+e),e&&(t.ESP_RAM_BLOCK=this.USB_RAM_BLOCK)}}});var Rh=Object.freeze({__proto__:null,ESP32P4ROM:class extends Eh{constructor(){super(...arguments),this.CHIP_NAME="ESP32-P4",this.IMAGE_CHIP_ID=18,this.IROM_MAP_START=1073741824,this.IROM_MAP_END=1275068416,this.DROM_MAP_START=1073741824,this.DROM_MAP_END=1275068416,this.BOOTLOADER_FLASH_OFFSET=8192,this.CHIP_DETECT_MAGIC_VALUE=[0,182303440],this.UART_DATE_REG_ADDR=1343004812,this.EFUSE_BASE=1343410176,this.EFUSE_BLOCK1_ADDR=this.EFUSE_BASE+68,this.MAC_EFUSE_REG=this.EFUSE_BASE+68,this.SPI_REG_BASE=1342754816,this.SPI_USR_OFFS=24,this.SPI_USR1_OFFS=28,this.SPI_USR2_OFFS=32,this.SPI_MOSI_DLEN_OFFS=36,this.SPI_MISO_DLEN_OFFS=40,this.SPI_W0_OFFS=88,this.SPI_ADDR_REG_MSB=!1,this.USES_MAGIC_VALUE=!1,this.EFUSE_RD_REG_BASE=this.EFUSE_BASE+48,this.EFUSE_FORCE_USE_KEY_MANAGER_KEY_REG=this.EFUSE_BASE+52,this.EFUSE_FORCE_USE_KEY_MANAGER_KEY_SHIFT=9,this.FORCE_USE_KEY_MANAGER_VAL_XTS_AES_KEY=2,this.EFUSE_PURPOSE_KEY0_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY0_SHIFT=24,this.EFUSE_PURPOSE_KEY1_REG=this.EFUSE_BASE+52,this.EFUSE_PURPOSE_KEY1_SHIFT=28,this.EFUSE_PURPOSE_KEY2_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY2_SHIFT=0,this.EFUSE_PURPOSE_KEY3_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY3_SHIFT=4,this.EFUSE_PURPOSE_KEY4_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY4_SHIFT=8,this.EFUSE_PURPOSE_KEY5_REG=this.EFUSE_BASE+56,this.EFUSE_PURPOSE_KEY5_SHIFT=12,this.EFUSE_DIS_DOWNLOAD_MANUAL_ENCRYPT_REG=this.EFUSE_RD_REG_BASE,this.EFUSE_DIS_DOWNLOAD_MANUAL_ENCRYPT=1<<20,this.EFUSE_SPI_BOOT_CRYPT_CNT_REG=this.EFUSE_BASE+52,this.EFUSE_SPI_BOOT_CRYPT_CNT_MASK=7<<18,this.EFUSE_SECURE_BOOT_EN_REG=this.EFUSE_BASE+56,this.EFUSE_SECURE_BOOT_EN_MASK=1<<20,this.PURPOSE_VAL_XTS_AES256_KEY_1=2,this.PURPOSE_VAL_XTS_AES256_KEY_2=3,this.PURPOSE_VAL_XTS_AES128_KEY=4,this.SUPPORTS_ENCRYPTED_FLASH=!0,this.FLASH_ENCRYPTED_WRITE_ALIGN=16,this.USB_RAM_BLOCK=2048,this.GPIO_STRAP_REG=1343094840,this.GPIO_STRAP_SPI_BOOT_MASK=8,this.RTC_CNTL_OPTION1_REG=1343291400,this.RTC_CNTL_FORCE_DOWNLOAD_BOOT_MASK=4,this.DR_REG_LPAON_BASE=1343291392,this.DR_REG_PMU_BASE=this.DR_REG_LPAON_BASE+20480,this.DR_REG_LP_SYS_BASE=this.DR_REG_LPAON_BASE+0,this.LP_SYSTEM_REG_ANA_XPD_PAD_GROUP_REG=this.DR_REG_LP_SYS_BASE+268,this.PMU_EXT_LDO_P0_0P1A_ANA_REG=this.DR_REG_PMU_BASE+444,this.PMU_ANA_0P1A_EN_CUR_LIM_0=1<<27,this.PMU_EXT_LDO_P0_0P1A_REG=this.DR_REG_PMU_BASE+440,this.PMU_0P1A_TARGET0_0=255<<23,this.PMU_0P1A_FORCE_TIEH_SEL_0=128,this.PMU_DATE_REG=this.DR_REG_PMU_BASE+1020,this.UARTDEV_BUF_NO_USB_OTG=5,this.UARTDEV_BUF_NO_USB_JTAG_SERIAL=6,this.DR_REG_LP_WDT_BASE=1343315968,this.RTC_CNTL_WDTCONFIG0_REG=this.DR_REG_LP_WDT_BASE+0,this.RTC_CNTL_WDTCONFIG1_REG=this.DR_REG_LP_WDT_BASE+4,this.RTC_CNTL_WDTWPROTECT_REG=this.DR_REG_LP_WDT_BASE+24,this.RTC_CNTL_WDT_WKEY=1356348065,this.RTC_CNTL_SWD_CONF_REG=this.DR_REG_LP_WDT_BASE+28,this.RTC_CNTL_SWD_AUTO_FEED_EN=1<<18,this.RTC_CNTL_SWD_WPROTECT_REG=this.DR_REG_LP_WDT_BASE+32,this.RTC_CNTL_SWD_WKEY=1356348065,this.MEMORY_MAP=[[0,65536,"PADDING"],[1073741824,1275068416,"DROM"],[1341128704,1341784064,"DRAM"],[1341128704,1341784064,"BYTE_ACCESSIBLE"],[1337982976,1338114048,"DROM_MASK"],[1337982976,1338114048,"IROM_MASK"],[1073741824,1275068416,"IROM"],[1341128704,1341784064,"IRAM"],[1343258624,1343291392,"RTC_IRAM"],[1343258624,1343291392,"RTC_DRAM"],[1611653120,1611661312,"MEM_INTERNAL2"]],this.UF2_FAMILY_ID=1026592404,this.EFUSE_MAX_KEY=5,this.KEY_PURPOSES={0:"USER/EMPTY",1:"ECDSA_KEY",2:"XTS_AES_256_KEY_1",3:"XTS_AES_256_KEY_2",4:"XTS_AES_128_KEY",5:"HMAC_DOWN_ALL",6:"HMAC_DOWN_JTAG",7:"HMAC_DOWN_DIGITAL_SIGNATURE",8:"HMAC_UP",9:"SECURE_BOOT_DIGEST0",10:"SECURE_BOOT_DIGEST1",11:"SECURE_BOOT_DIGEST2",12:"KM_INIT_KEY"}}async getPkgVersion(t){const e=this.EFUSE_BLOCK1_ADDR+8;return await t.readReg(e)>>20&7}async getMinorChipVersion(t){const e=this.EFUSE_BLOCK1_ADDR+8;return 15&await t.readReg(e)}async getMajorChipVersion(t){const e=this.EFUSE_BLOCK1_ADDR+8,i=await t.readReg(e);return(i>>23&1)<<2|i>>4&3}async getChipRevision(t){return 100*await this.getMajorChipVersion(t)+await this.getMinorChipVersion(t)}async getStubJsonPath(t){return await this.getChipRevision(t)<300?"./targets/stub_flasher/stub_flasher_32p4rc1.json":"./targets/stub_flasher/stub_flasher_32p4.json"}async getChipDescription(t){return`${{0:"ESP32-P4"}[await this.getPkgVersion(t)]||"Unknown ESP32-P4"} (revision v${await this.getMajorChipVersion(t)}.${await this.getMinorChipVersion(t)})`}async getChipFeatures(t){return["High-Performance MCU"]}async getCrystalFreq(t){return 40}async getFlashVoltage(t){}async overrideVddsdio(t){t.debug("VDD_SDIO overrides are not supported for ESP32-P4")}async readMac(t){let e=await t.readReg(this.MAC_EFUSE_REG);e>>>=0;let i=await t.readReg(this.MAC_EFUSE_REG+4);i=i>>>0&65535;const s=new Uint8Array(6);return s[0]=i>>8&255,s[1]=255&i,s[2]=e>>24&255,s[3]=e>>16&255,s[4]=e>>8&255,s[5]=255&e,this._d2h(s[0])+":"+this._d2h(s[1])+":"+this._d2h(s[2])+":"+this._d2h(s[3])+":"+this._d2h(s[4])+":"+this._d2h(s[5])}async getFlashCryptConfig(t){}async getSecureBootEnabled(t){return 0!==(await t.readReg(this.EFUSE_SECURE_BOOT_EN_REG)&this.EFUSE_SECURE_BOOT_EN_MASK)}async getUartdevBufNo(t){return(await this.getChipRevision(t)<300?1341390512:1341914800)+24}async usesUsbOtg(t){const e=await this.getUartdevBufNo(t);return(255&await t.readReg(e))===this.UARTDEV_BUF_NO_USB_OTG}async usesUsbJtagSerial(t){const e=await this.getUartdevBufNo(t);return(255&await t.readReg(e))===this.UARTDEV_BUF_NO_USB_JTAG_SERIAL}async getKeyBlockPurpose(t,e){if(e<0||e>this.EFUSE_MAX_KEY)return void t.debug(`Valid key block numbers must be in range 0-${this.EFUSE_MAX_KEY}`);const i=[[this.EFUSE_PURPOSE_KEY0_REG,this.EFUSE_PURPOSE_KEY0_SHIFT],[this.EFUSE_PURPOSE_KEY1_REG,this.EFUSE_PURPOSE_KEY1_SHIFT],[this.EFUSE_PURPOSE_KEY2_REG,this.EFUSE_PURPOSE_KEY2_SHIFT],[this.EFUSE_PURPOSE_KEY3_REG,this.EFUSE_PURPOSE_KEY3_SHIFT],[this.EFUSE_PURPOSE_KEY4_REG,this.EFUSE_PURPOSE_KEY4_SHIFT],[this.EFUSE_PURPOSE_KEY5_REG,this.EFUSE_PURPOSE_KEY5_SHIFT]],[s,o]=i[e];return await t.readReg(s)>>o&15}async isFlashEncryptionKeyValid(t){const e=[];for(let i=0;i<=this.EFUSE_MAX_KEY;i++){const s=await this.getKeyBlockPurpose(t,i);e.push(s)}if(e.some(t=>t===this.PURPOSE_VAL_XTS_AES128_KEY))return!0;if(e.some(t=>t===this.PURPOSE_VAL_XTS_AES256_KEY_1)&&e.some(t=>t===this.PURPOSE_VAL_XTS_AES256_KEY_2))return!0;return 0!==(await t.readReg(this.EFUSE_FORCE_USE_KEY_MANAGER_KEY_REG)>>this.EFUSE_FORCE_USE_KEY_MANAGER_KEY_SHIFT&this.FORCE_USE_KEY_MANAGER_VAL_XTS_AES_KEY)}async postConnect(t){await this.usesUsbOtg(t)&&(t.ESP_RAM_BLOCK=this.USB_RAM_BLOCK),t.IS_STUB||await this.disableWatchdogs(t)}async disableWatchdogs(t){if(await this.usesUsbJtagSerial(t)){await t.writeReg(this.RTC_CNTL_WDTWPROTECT_REG,this.RTC_CNTL_WDT_WKEY),await t.writeReg(this.RTC_CNTL_WDTCONFIG0_REG,0),await t.writeReg(this.RTC_CNTL_WDTWPROTECT_REG,0),await t.writeReg(this.RTC_CNTL_SWD_WPROTECT_REG,this.RTC_CNTL_SWD_WKEY);const e=await t.readReg(this.RTC_CNTL_SWD_CONF_REG);await t.writeReg(this.RTC_CNTL_SWD_CONF_REG,e|this.RTC_CNTL_SWD_AUTO_FEED_EN),await t.writeReg(this.RTC_CNTL_SWD_WPROTECT_REG,0)}}checkSpiConnection(t,e){if(!e.every(t=>t>=0&&t<=54))throw new Error("SPI Pin numbers must be in the range 0-54.");e.some(t=>24===t||25===t)&&t.debug("GPIO pins 24 and 25 are used by USB-Serial/JTAG, consider using other pins for SPI flash connection.")}async watchdogReset(t){t.info("Hard resetting with a watchdog..."),await t.writeReg(this.RTC_CNTL_WDTWPROTECT_REG,this.RTC_CNTL_WDT_WKEY),await t.writeReg(this.RTC_CNTL_WDTCONFIG1_REG,2e3),await t.writeReg(this.RTC_CNTL_WDTCONFIG0_REG,-805306110),await t.writeReg(this.RTC_CNTL_WDTWPROTECT_REG,0),await new Promise(t=>setTimeout(t,500))}async powerOnFlash(t){if(await this.getChipRevision(t)<=300)return;await t.writeReg(this.LP_SYSTEM_REG_ANA_XPD_PAD_GROUP_REG,1),await new Promise(t=>setTimeout(t,10));let e=await t.readReg(this.PMU_EXT_LDO_P0_0P1A_ANA_REG);await t.writeReg(this.PMU_EXT_LDO_P0_0P1A_ANA_REG,e|this.PMU_ANA_0P1A_EN_CUR_LIM_0),e=await t.readReg(this.PMU_EXT_LDO_P0_0P1A_REG),await t.writeReg(this.PMU_EXT_LDO_P0_0P1A_REG,e|this.PMU_0P1A_FORCE_TIEH_SEL_0),e=await t.readReg(this.PMU_DATE_REG),await t.writeReg(this.PMU_DATE_REG,3|e),await new Promise(t=>setTimeout(t,50)),e=await t.readReg(this.PMU_EXT_LDO_P0_0P1A_ANA_REG),await t.writeReg(this.PMU_EXT_LDO_P0_0P1A_ANA_REG,e&~this.PMU_ANA_0P1A_EN_CUR_LIM_0),e=await t.readReg(this.PMU_EXT_LDO_P0_0P1A_REG),await t.writeReg(this.PMU_EXT_LDO_P0_0P1A_REG,e&~this.PMU_0P1A_TARGET0_0),e=await t.readReg(this.PMU_EXT_LDO_P0_0P1A_REG),await t.writeReg(this.PMU_EXT_LDO_P0_0P1A_REG,128|e),e=await t.readReg(this.PMU_EXT_LDO_P0_0P1A_REG),await t.writeReg(this.PMU_EXT_LDO_P0_0P1A_REG,e&~this.PMU_0P1A_FORCE_TIEH_SEL_0),await new Promise(t=>setTimeout(t,1800))}}});export{Ml as EPPGridPanel};
