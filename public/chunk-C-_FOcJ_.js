import{t as v}from"./main-3ZPUG237.js";import{n as m,t as h}from"./chunk-BHvieJ1K.js";import{t as z}from"./chunk-UHdRzFlA.js";import{a as Ur,d as ma,f as no,i as Sn,l as io,n as Kt,s as ca}from"./chunk-BPiby5AT.js";import{n as _,t as I}from"./chunk-C-avUsCR.js";import{a as Ue$1,u as jn}from"./chunk-vcexdm0N.js";import{D as fr,M as pr,N as sn,S as Zi,T as bi,a as G,i as Fn,s as In,t as $i}from"./chunk-W8oLwk83.js";import{i as Fr,o as Mn}from"./chunk-CObxukjg.js";import{$ as Nc,At as WI,B as Jl,Dt as Vp,E as Fv,Hn as oD,Ht as ZE,It as Xl,J as Lp,Jn as pp,On as jp,Ot as Vv,Q as NE,Ut as ZI,V as KE,Vt as Yy,X as Mp,Zt as aI,an as ci,at as OI,bt as Sp,ct as Pp,fn as eI,gn as fp,hr as wc,ht as SE,i as A,j as I$1,kn as ke,kt as W,ln as dp,lr as ur,m as DP,or as tI,pr as wI,qt as _a,sn as dD,tn as bc,tr as sD,tt as Nl,u as Cc,ut as Q,w as Fp,wn as hp,wr as yP,wt as U$1,x as Ep,xn as hI,xr as xo}from"./chunk-D-OOpif3.js";var Ne=new A(`MAT_PROGRESS_BAR_DEFAULT_OPTIONS`);var Te=(()=>{class o{_elementRef=I$1(ur);_ngZone=I$1(Q);_changeDetectorRef=I$1(yP);_renderer=I$1(_a);_cleanupTransitionEnd;constructor(){let e=In(),t=I$1(Ne,{optional:!0});this._isNoopAnimation=e===`di-disabled`,e===`reduced-motion`&&this._elementRef.nativeElement.classList.add(`mat-progress-bar-reduced-motion`),t&&(t.color&&(this.color=this._defaultColor=t.color),this.mode=t.mode||this.mode)}_isNoopAnimation;get color(){return this._color||this._defaultColor}set color(e){this._color=e}_color;_defaultColor=`primary`;get value(){return this._value}set value(e){this._value=De(e||0),this._changeDetectorRef.markForCheck()}_value=0;get bufferValue(){return this._bufferValue||0}set bufferValue(e){this._bufferValue=De(e||0),this._changeDetectorRef.markForCheck()}_bufferValue=0;animationEnd=new ke;get mode(){return this._mode}set mode(e){this._mode=e,this._changeDetectorRef.markForCheck()}_mode=`determinate`;ngAfterViewInit(){this._ngZone.runOutsideAngular(()=>{this._cleanupTransitionEnd=this._renderer.listen(this._elementRef.nativeElement,`transitionend`,this._transitionendHandler)})}ngOnDestroy(){this._cleanupTransitionEnd?.()}_getPrimaryBarTransform(){return`scaleX(${this._isIndeterminate()?1:this.value/100})`}_getBufferBarFlexBasis(){return`${this.mode===`buffer`?this.bufferValue:100}%`}_isIndeterminate(){return this.mode===`indeterminate`||this.mode===`query`}_transitionendHandler=e=>{this.animationEnd.observers.length===0||!e.target||!e.target.classList.contains(`mdc-linear-progress__primary-bar`)||(this.mode===`determinate`||this.mode===`buffer`)&&this._ngZone.run(()=>this.animationEnd.next({value:this.value}))};static ɵfac=function(t){return new(t||o)};static ɵcmp=(function(){function e(t,i){t&1&&hp(0,`div`,2)}return NE({type:o,selectors:[[`mat-progress-bar`]],hostAttrs:[`role`,`progressbar`,`aria-valuemin`,`0`,`aria-valuemax`,`100`,`tabindex`,`-1`,1,`mat-mdc-progress-bar`,`mdc-linear-progress`],hostVars:10,hostBindings:function(i,s){i&2&&(dp(`aria-valuenow`,s._isIndeterminate()?null:s.value)(`mode`,s.mode),OI(`mat-`+s.color),Sp(`_mat-animation-noopable`,s._isNoopAnimation)(`mdc-linear-progress--animation-ready`,!s._isNoopAnimation)(`mdc-linear-progress--indeterminate`,s._isIndeterminate()))},inputs:{color:`color`,value:[2,`value`,`value`,DP],bufferValue:[2,`bufferValue`,`bufferValue`,DP],mode:`mode`},outputs:{animationEnd:`animationEnd`},exportAs:[`matProgressBar`],decls:7,vars:5,consts:[[`aria-hidden`,`true`,1,`mdc-linear-progress__buffer`],[1,`mdc-linear-progress__buffer-bar`],[1,`mdc-linear-progress__buffer-dots`],[`aria-hidden`,`true`,1,`mdc-linear-progress__bar`,`mdc-linear-progress__primary-bar`],[1,`mdc-linear-progress__bar-inner`],[`aria-hidden`,`true`,1,`mdc-linear-progress__bar`,`mdc-linear-progress__secondary-bar`]],template:function(i,s){i&1&&(bc(0,`div`,0),hp(1,`div`,1),ZE(2,e,1,0,`div`,2),Cc(),bc(3,`div`,3),hp(4,`span`,4),Cc(),bc(5,`div`,5),hp(6,`span`,4),Cc()),i&2&&(Yy(),Mp(`flex-basis`,s._getBufferBarFlexBasis()),Yy(),KE(s.mode===`buffer`?2:-1),Yy(),Mp(`transform`,s._getPrimaryBarTransform()))},styles:[`.mat-mdc-progress-bar {
  --%NS%mat-progress-bar-animation-multiplier: 1;
  display: block;
  text-align: start;
}
.mat-mdc-progress-bar[mode=query] {
  transform: scaleX(-1);
}
.mat-mdc-progress-bar._mat-animation-noopable .mdc-linear-progress__buffer-dots,
.mat-mdc-progress-bar._mat-animation-noopable .mdc-linear-progress__primary-bar,
.mat-mdc-progress-bar._mat-animation-noopable .mdc-linear-progress__secondary-bar,
.mat-mdc-progress-bar._mat-animation-noopable .mdc-linear-progress__bar-inner.mdc-linear-progress__bar-inner {
  animation: none;
}
.mat-mdc-progress-bar._mat-animation-noopable .mdc-linear-progress__primary-bar,
.mat-mdc-progress-bar._mat-animation-noopable .mdc-linear-progress__buffer-bar {
  transition: transform 1ms;
}

.mat-progress-bar-reduced-motion {
  --%NS%mat-progress-bar-animation-multiplier: 2;
}

.mdc-linear-progress {
  position: relative;
  width: 100%;
  transform: translateZ(0);
  outline: 1px solid transparent;
  overflow-x: hidden;
  transition: opacity 250ms 0ms cubic-bezier(0.4, 0, 0.6, 1);
  height: max(var(--%NS%mat-progress-bar-track-height, 4px), var(--%NS%mat-progress-bar-active-indicator-height, 4px));
}
@media (forced-colors: active) {
  .mdc-linear-progress {
    outline-color: CanvasText;
  }
}

.mdc-linear-progress__bar {
  position: absolute;
  top: 0;
  bottom: 0;
  margin: auto 0;
  width: 100%;
  animation: none;
  transform-origin: top left;
  transition: transform 250ms 0ms cubic-bezier(0.4, 0, 0.6, 1);
  height: var(--%NS%mat-progress-bar-active-indicator-height, 4px);
}
.mdc-linear-progress--indeterminate .mdc-linear-progress__bar {
  transition: none;
}
[dir=rtl] .mdc-linear-progress__bar {
  right: 0;
  transform-origin: center right;
}

.mdc-linear-progress__bar-inner {
  display: inline-block;
  position: absolute;
  width: 100%;
  animation: none;
  border-top-style: solid;
  border-color: var(--%NS%mat-progress-bar-active-indicator-color, var(--%NS%mat-sys-primary));
  border-top-width: var(--%NS%mat-progress-bar-active-indicator-height, 4px);
}

.mdc-linear-progress__buffer {
  display: flex;
  position: absolute;
  top: 0;
  bottom: 0;
  margin: auto 0;
  width: 100%;
  overflow: hidden;
  height: var(--%NS%mat-progress-bar-track-height, 4px);
  border-radius: var(--%NS%mat-progress-bar-track-shape, var(--%NS%mat-sys-corner-none));
}

.mdc-linear-progress__buffer-dots {
  background-image: radial-gradient(circle, var(--%NS%mat-progress-bar-track-color, var(--%NS%mat-sys-surface-variant)) calc(var(--%NS%mat-progress-bar-track-height, 4px) / 2), transparent 0);
  background-repeat: repeat-x;
  background-size: calc(calc(var(--%NS%mat-progress-bar-track-height, 4px) / 2) * 5);
  background-position: left;
  flex: auto;
  transform: rotate(180deg);
  animation: mdc-linear-progress-buffering calc(250ms * var(--%NS%mat-progress-bar-animation-multiplier)) infinite linear;
}
@media (forced-colors: active) {
  .mdc-linear-progress__buffer-dots {
    background-color: ButtonBorder;
  }
}
[dir=rtl] .mdc-linear-progress__buffer-dots {
  animation: mdc-linear-progress-buffering-reverse calc(250ms * var(--%NS%mat-progress-bar-animation-multiplier)) infinite linear;
  transform: rotate(0);
}

.mdc-linear-progress__buffer-bar {
  flex: 0 1 100%;
  transition: flex-basis 250ms 0ms cubic-bezier(0.4, 0, 0.6, 1);
  background-color: var(--%NS%mat-progress-bar-track-color, var(--%NS%mat-sys-surface-variant));
}

.mdc-linear-progress__primary-bar {
  transform: scaleX(0);
}
.mdc-linear-progress--indeterminate .mdc-linear-progress__primary-bar {
  left: -145.166611%;
}
.mdc-linear-progress--indeterminate.mdc-linear-progress--animation-ready .mdc-linear-progress__primary-bar {
  animation: mdc-linear-progress-primary-indeterminate-translate calc(2s * var(--%NS%mat-progress-bar-animation-multiplier)) infinite linear;
}
.mdc-linear-progress--indeterminate.mdc-linear-progress--animation-ready .mdc-linear-progress__primary-bar > .mdc-linear-progress__bar-inner {
  animation: mdc-linear-progress-primary-indeterminate-scale calc(2s * var(--%NS%mat-progress-bar-animation-multiplier)) infinite linear;
}
[dir=rtl] .mdc-linear-progress.mdc-linear-progress--animation-ready .mdc-linear-progress__primary-bar {
  animation-name: mdc-linear-progress-primary-indeterminate-translate-reverse;
}
[dir=rtl] .mdc-linear-progress.mdc-linear-progress--indeterminate .mdc-linear-progress__primary-bar {
  right: -145.166611%;
  left: auto;
}

.mdc-linear-progress__secondary-bar {
  display: none;
}
.mdc-linear-progress--indeterminate .mdc-linear-progress__secondary-bar {
  left: -54.888891%;
  display: block;
}
.mdc-linear-progress--indeterminate.mdc-linear-progress--animation-ready .mdc-linear-progress__secondary-bar {
  animation: mdc-linear-progress-secondary-indeterminate-translate calc(2s * var(--%NS%mat-progress-bar-animation-multiplier)) infinite linear;
}
.mdc-linear-progress--indeterminate.mdc-linear-progress--animation-ready .mdc-linear-progress__secondary-bar > .mdc-linear-progress__bar-inner {
  animation: mdc-linear-progress-secondary-indeterminate-scale calc(2s * var(--%NS%mat-progress-bar-animation-multiplier)) infinite linear;
}
[dir=rtl] .mdc-linear-progress.mdc-linear-progress--animation-ready .mdc-linear-progress__secondary-bar {
  animation-name: mdc-linear-progress-secondary-indeterminate-translate-reverse;
}
[dir=rtl] .mdc-linear-progress.mdc-linear-progress--indeterminate .mdc-linear-progress__secondary-bar {
  right: -54.888891%;
  left: auto;
}

@keyframes mdc-linear-progress-buffering {
  from {
    transform: rotate(180deg) translateX(calc(var(--%NS%mat-progress-bar-track-height, 4px) * -2.5));
  }
}
@keyframes mdc-linear-progress-primary-indeterminate-translate {
  0% {
    transform: translateX(0);
  }
  20% {
    animation-timing-function: cubic-bezier(0.5, 0, 0.701732, 0.495819);
    transform: translateX(0);
  }
  59.15% {
    animation-timing-function: cubic-bezier(0.302435, 0.381352, 0.55, 0.956352);
    transform: translateX(83.67142%);
  }
  100% {
    transform: translateX(200.611057%);
  }
}
@keyframes mdc-linear-progress-primary-indeterminate-scale {
  0% {
    transform: scaleX(0.08);
  }
  36.65% {
    animation-timing-function: cubic-bezier(0.334731, 0.12482, 0.785844, 1);
    transform: scaleX(0.08);
  }
  69.15% {
    animation-timing-function: cubic-bezier(0.06, 0.11, 0.6, 1);
    transform: scaleX(0.661479);
  }
  100% {
    transform: scaleX(0.08);
  }
}
@keyframes mdc-linear-progress-secondary-indeterminate-translate {
  0% {
    animation-timing-function: cubic-bezier(0.15, 0, 0.515058, 0.409685);
    transform: translateX(0);
  }
  25% {
    animation-timing-function: cubic-bezier(0.31033, 0.284058, 0.8, 0.733712);
    transform: translateX(37.651913%);
  }
  48.35% {
    animation-timing-function: cubic-bezier(0.4, 0.627035, 0.6, 0.902026);
    transform: translateX(84.386165%);
  }
  100% {
    transform: translateX(160.277782%);
  }
}
@keyframes mdc-linear-progress-secondary-indeterminate-scale {
  0% {
    animation-timing-function: cubic-bezier(0.205028, 0.057051, 0.57661, 0.453971);
    transform: scaleX(0.08);
  }
  19.15% {
    animation-timing-function: cubic-bezier(0.152313, 0.196432, 0.648374, 1.004315);
    transform: scaleX(0.457104);
  }
  44.15% {
    animation-timing-function: cubic-bezier(0.257759, -0.003163, 0.211762, 1.38179);
    transform: scaleX(0.72796);
  }
  100% {
    transform: scaleX(0.08);
  }
}
@keyframes mdc-linear-progress-primary-indeterminate-translate-reverse {
  0% {
    transform: translateX(0);
  }
  20% {
    animation-timing-function: cubic-bezier(0.5, 0, 0.701732, 0.495819);
    transform: translateX(0);
  }
  59.15% {
    animation-timing-function: cubic-bezier(0.302435, 0.381352, 0.55, 0.956352);
    transform: translateX(-83.67142%);
  }
  100% {
    transform: translateX(-200.611057%);
  }
}
@keyframes mdc-linear-progress-secondary-indeterminate-translate-reverse {
  0% {
    animation-timing-function: cubic-bezier(0.15, 0, 0.515058, 0.409685);
    transform: translateX(0);
  }
  25% {
    animation-timing-function: cubic-bezier(0.31033, 0.284058, 0.8, 0.733712);
    transform: translateX(-37.651913%);
  }
  48.35% {
    animation-timing-function: cubic-bezier(0.4, 0.627035, 0.6, 0.902026);
    transform: translateX(-84.386165%);
  }
  100% {
    transform: translateX(-160.277782%);
  }
}
@keyframes mdc-linear-progress-buffering-reverse {
  from {
    transform: translateX(-10px);
  }
}
`],encapsulation:2})})()}return o})();function De(o,c=0,e=100){return Math.max(c,Math.min(e,o))}var Pe=(()=>{class o{static ɵfac=function(t){return new(t||o)};static ɵmod=SE({type:o});static ɵinj=Nl({imports:[G]})}return o})();var U=(o,c)=>c.id;var Ae=(o,c)=>c.key;function Xe(o,c){if(o&1){let e=aI();ci(0,`div`,9)(1,`span`,22)(2,`mat-icon`,23),WI(3,`check_circle`),wc(),WI(4),wc(),ci(5,`button`,24),Ep(`click`,function(){Jl(e);let i=hI();return Xl(i.successMessage.set(null))}),WI(6,`✕`),wc()()}if(o&2){let e=hI();Yy(4),Nc(` `,e.successMessage())}}function je(o,c){if(o&1){let e=aI();ci(0,`div`,10)(1,`span`,22)(2,`mat-icon`,25),WI(3,`error`),wc(),WI(4),wc(),ci(5,`button`,26),Ep(`click`,function(){Jl(e);let i=hI();return Xl(i.errorMessage.set(null))}),WI(6,`✕`),wc()()}if(o&2){let e=hI();Yy(4),Nc(` `,e.errorMessage())}}function Re(o,c){o&1&&(ci(0,`div`,17),pp(1,`mat-spinner`,27),ci(2,`span`),WI(3,`Načítání řešení PBŘ...`),wc()())}function Oe(o,c){if(o&1){let e=aI();ci(0,`div`,18)(1,`mat-icon`,28),WI(2,`local_fire_department`),wc(),ci(3,`p`,29),WI(4,`Žádná řešení PBŘ nebyla nalezena`),wc(),ci(5,`p`,30),WI(6,`Vytvořte své první požárně bezpečnostní řešení a využijte AI pro vyplnění technických částí posouzení.`),wc(),ci(7,`button`,31),Ep(`click`,function(){Jl(e);let i=hI();return Xl(i.openCreateModal())}),ci(8,`mat-icon`,32),WI(9,`add`),wc(),WI(10,` Vytvořit první PBŘ `),wc()()}}function Ue(o,c){o&1&&(ci(0,`span`,22),pp(1,`mat-spinner`,51),ci(2,`span`),WI(3,`Exportuji...`),wc()())}function $e(o,c){o&1&&(ci(0,`span`,46)(1,`mat-icon`,52),WI(2,`description`),wc(),ci(3,`span`),WI(4,`DOCX`),wc()())}function Ze(o,c){if(o&1){let e=aI();ci(0,`mat-card`,33)(1,`div`,34)(2,`div`,35)(3,`div`)(4,`h3`,36),WI(5),wc()()(),ci(6,`div`,37)(7,`div`,38),Ep(`click`,function(){let i=Jl(e).$implicit,s=hI(2);return Xl(s.openEditModal(i,`files`))}),ci(8,`div`,39)(9,`span`,40),WI(10,`Přílohy`),wc(),ci(11,`mat-icon`,41),WI(12,`open_in_new`),wc()(),ci(13,`span`,42),WI(14),wc()(),ci(15,`div`)(16,`span`,40),WI(17,`AI Generování`),wc(),ci(18,`span`,43),WI(19),wc()()()(),ci(20,`div`,44)(21,`button`,45),Ep(`click`,function(){let i=Jl(e).$implicit,s=hI(2);return Xl(s.exportDocx(i))}),ZE(22,Ue,4,0,`span`,22)(23,$e,5,0,`span`,46),wc(),ci(24,`div`,47)(25,`button`,48),Ep(`click`,function(){let i=Jl(e).$implicit,s=hI(2);return Xl(s.openEditModal(i,`files`))}),ci(26,`mat-icon`),WI(27,`attach_file`),wc()(),ci(28,`button`,49),Ep(`click`,function(){let i=Jl(e).$implicit,s=hI(2);return Xl(s.openEditModal(i))}),ci(29,`mat-icon`),WI(30,`edit`),wc()(),ci(31,`button`,50),Ep(`click`,function(){let i=Jl(e).$implicit,s=hI(2);return Xl(s.deleteSolution(i.id))}),ci(32,`mat-icon`),WI(33,`delete`),wc()()()()()}if(o&2){let e=c.$implicit,t=hI(2);Yy(5),Nc(` `,e.title||e.nazevStavby||`Nepojmenované PBŘ`,` `),Yy(9),Nc(`📁 `,e.files?.length||0,` souborů`),Yy(5),Fp(`⚡ `,e.generationCount||0,`x (`,e.totalTokens||0,` tok. • `,t.formatCost(e.totalCostUsd),`)`),Yy(2),fp(`disabled`,t.isExporting()===e.id),Yy(),KE(t.isExporting()===e.id?22:23),Yy(3),fp(`matTooltip`,`Nahrát a spravovat soubory (`+(e.files?.length||0)+`)`)}}function Ge(o,c){if(o&1&&(ci(0,`div`,19),eI(1,Ze,34,8,`mat-card`,33,U),wc()),o&2){let e=hI();Yy(),tI(e.filteredSolutions())}}function We(o,c){o&1&&(ci(0,`span`,22),pp(1,`mat-spinner`,51),ci(2,`span`),WI(3,`Generování všech polí...`),wc()())}function He(o,c){o&1&&(ci(0,`span`,46)(1,`mat-icon`,32),WI(2,`auto_awesome`),wc(),ci(3,`span`),WI(4,`AI Vygenerovat celé PBŘ`),wc()())}function Ke(o,c){o&1&&pp(0,`mat-progress-bar`,63)}function qe(o,c){if(o&1&&(ci(0,`span`,78),WI(1),wc()),o&2){let e=hI(3);Yy(),Nc(` `,e.modalFiles().length,` `)}}function Qe(o,c){if(o&1){let e=aI();ci(0,`button`,77),Ep(`click`,function(){let i=Jl(e).$implicit,s=hI(2);return Xl(s.setActiveCategory(i.id))}),ci(1,`span`),WI(2),wc(),ZE(3,qe,2,1,`span`,78),wc()}if(o&2){let e=c.$implicit,t=hI(2);OI(t.activeCategory()===e.id?`bg-indigo-600 text-white shadow-sm`:`text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60`),Yy(2),Lp(e.label),Yy(),KE(e.id===`files`&&t.modalFiles().length>0?3:-1)}}function Je(o,c){o&1&&(ci(0,`span`,84),WI(1,`Pro nejpřesnější generování PBŘ nahrajte výkresy, situace nebo technické zprávy.`),wc())}function Ye(o,c){if(o&1){let e=aI();ci(0,`div`,67)(1,`div`,79)(2,`div`,80)(3,`mat-icon`,81),WI(4,`attach_file`),wc()(),ci(5,`div`)(6,`span`,82),WI(7,`Podklady a výkresová dokumentace: `),wc(),ci(8,`span`,83),WI(9),wc(),ZE(10,Je,2,0,`span`,84),wc()(),ci(11,`button`,85),Ep(`click`,function(){Jl(e);let i=hI(2);return Xl(i.activeCategory.set(`files`))}),ci(12,`mat-icon`,52),WI(13,`upload_file`),wc(),WI(14),wc()()}if(o&2){let e=hI(2);Yy(9),Nc(``,e.modalFiles().length,` souborů přiloženo`),Yy(),KE(e.modalFiles().length===0?10:-1),Yy(4),Nc(` `,e.modalFiles().length===0?`Nahrát soubory k posouzení`:`Spravovat / nahrát soubory`,` `)}}function et(o,c){if(o&1){let e=aI();ci(0,`div`,95)(1,`div`,96)(2,`span`,97),WI(3),wc(),ci(4,`div`,98)(5,`p`,99),WI(6),wc(),ci(7,`p`,100),WI(8),oD(9,`date`),wc()()(),ci(10,`div`,47)(11,`button`,101),Ep(`click`,function(){let i=Jl(e).$implicit,s=hI(4);return Xl(s.downloadFile(i))}),ci(12,`mat-icon`),WI(13,`download`),wc()(),ci(14,`button`,102),Ep(`click`,function(){let i=Jl(e).$implicit,s=hI(4);return Xl(s.removeFile(i.id))}),ci(15,`mat-icon`),WI(16,`delete`),wc()()()()}if(o&2){let e=c.$implicit,t=hI(4);Yy(3),Lp(t.getFileIcon(e.name)),Yy(3),Lp(e.name),Yy(2),Pp(``,t.formatBytes(e.size),` • `,sD(9,4,e.uploadedAt,`short`))}}function tt(o,c){if(o&1&&(ci(0,`div`,92)(1,`h4`,93),WI(2),wc(),ci(3,`div`,94),eI(4,et,17,7,`div`,95,U),wc()()),o&2){let e=hI(3);Yy(2),Nc(`Přiložené technické soubory (`,e.modalFiles().length,`)`),Yy(2),tI(e.modalFiles())}}function nt(o,c){if(o&1){let e=aI();ci(0,`div`,72)(1,`div`,86)(2,`mat-icon`,87),WI(3,`folder_open`),wc(),ci(4,`div`)(5,`p`,88),WI(6,`Nahrajte technickou dokumentaci k posouzení`),wc(),ci(7,`p`,89),WI(8,`Podporované formáty: PDF, DWG, DXF, DOCX, PNG, JPG situací stavby`),wc()(),ci(9,`input`,90,0),Ep(`change`,function(i){Jl(e);let s=hI(2);return Xl(s.handleFileUpload(i))}),wc(),ci(11,`button`,91),Ep(`click`,function(){Jl(e);let i=wI(10);return Xl(i.click())}),ci(12,`mat-icon`,32),WI(13,`attach_file`),wc(),ci(14,`span`),WI(15),wc()()(),ZE(16,tt,6,1,`div`,92),wc()}if(o&2){let e=hI(2);Yy(11),fp(`disabled`,e.isUploadingFiles()),Yy(4),Lp(e.isUploadingFiles()?`Nahrávání...`:`Vybrat soubory k nahrání`),Yy(),KE(e.modalFiles().length>0?16:-1)}}function it(o,c){o&1&&pp(0,`mat-progress-bar`,104)}function rt(o,c){o&1&&(ci(0,`span`,22),pp(1,`mat-spinner`,115),ci(2,`span`),WI(3,`Generuji...`),wc()())}function ot(o,c){o&1&&(ci(0,`span`,46)(1,`mat-icon`,116),WI(2,`bolt`),wc(),ci(3,`span`),WI(4,`AI Vygenerovat`),wc()())}function at(o,c){if(o&1&&(ci(0,`p`,111),WI(1),wc()),o&2){let e=hI().$implicit;Yy(),Lp(e.description)}}function st(o,c){if(o&1){let e=aI();ci(0,`textarea`,117),Fv(),Vp(`ngModelChange`,function(i){Jl(e);let s=hI().$implicit,f=hI(3);return ZI(f.formData[s.key],i)||(f.formData[s.key]=i),Xl(i)}),wc()}if(o&2){let e=hI().$implicit,t=hI(3);fp(`autoResize`,t.formData[e.key]),jp(`ngModel`,t.formData[e.key]),fp(`placeholder`,`Zadejte `+e.label.toLowerCase()+`...`),Vv()}}function lt(o,c){if(o&1){let e=aI();ci(0,`input`,118),Fv(),Vp(`ngModelChange`,function(i){Jl(e);let s=hI().$implicit,f=hI(3);return ZI(f.formData[s.key],i)||(f.formData[s.key]=i),Xl(i)}),wc()}if(o&2){let e=hI().$implicit,t=hI(3);jp(`ngModel`,t.formData[e.key]),Vv()}}function dt(o,c){if(o&1){let e=aI();ci(0,`input`,119),Fv(),Vp(`ngModelChange`,function(i){Jl(e);let s=hI().$implicit,f=hI(3);return ZI(f.formData[s.key],i)||(f.formData[s.key]=i),Xl(i)}),wc()}if(o&2){let e=hI().$implicit,t=hI(3);jp(`ngModel`,t.formData[e.key]),fp(`placeholder`,`Zadejte `+e.label.toLowerCase()+`...`),Vv()}}function ct(o,c){if(o&1){let e=aI();ci(0,`div`,103),ZE(1,it,1,0,`mat-progress-bar`,104),ci(2,`div`,105)(3,`div`)(4,`label`,106),WI(5),wc(),ci(6,`span`,107),WI(7),wc()(),ci(8,`div`,58)(9,`button`,108),Ep(`click`,function(){let i=Jl(e).$implicit,s=hI(3);return Xl(s.previewPromptForField(i.key))}),ci(10,`mat-icon`,109),WI(11,`search`),wc(),WI(12,` Prompt `),wc(),ci(13,`button`,110),Ep(`click`,function(){let i=Jl(e).$implicit,s=hI(3);return Xl(s.generateFieldWithAi(i.key))}),ZE(14,rt,4,0,`span`,22)(15,ot,5,0,`span`,46),wc()()(),ZE(16,at,2,1,`p`,111),ZE(17,st,1,3,`textarea`,112)(18,lt,1,1,`input`,113)(19,dt,1,2,`input`,114),wc()}if(o&2){let e=c.$implicit,t=hI(3);Yy(),KE(t.generatingField()===e.key||t.isGeneratingBatch()?1:-1),Yy(4),Nc(` `,e.label,` `),Yy(2),Lp(e.placeholder),Yy(6),fp(`disabled`,t.generatingField()===e.key||t.isGeneratingBatch()),Yy(),KE(t.generatingField()===e.key?14:15),Yy(2),KE(e.description?16:-1),Yy(),KE(e.type===`textarea`?17:e.type===`date`?18:19)}}function mt(o,c){if(o&1&&(ci(0,`div`,72),eI(1,ct,20,7,`div`,103,Ae),wc()),o&2){let e=hI(2);Yy(),tI(e.visibleFields())}}function pt(o,c){o&1&&(ci(0,`span`,22),pp(1,`mat-spinner`,51),ci(2,`span`),WI(3,`Ukládání...`),wc()())}function ut(o,c){if(o&1&&(ci(0,`span`,46)(1,`mat-icon`,32),WI(2,`save`),wc(),ci(3,`span`),WI(4),wc()()),o&2){let e=hI(2);Yy(4),Lp(e.editingId()?`Uložit změny`:`Vytvořit řešení PBŘ`)}}function gt(o,c){if(o&1){let e=aI();ci(0,`div`,20)(1,`mat-card`,53)(2,`div`,54)(3,`div`,6)(4,`div`,55)(5,`mat-icon`,4),WI(6,`local_fire_department`),wc()(),ci(7,`div`)(8,`h2`,56),WI(9),wc(),ci(10,`p`,57),WI(11,`Vyplňte údaje stavby, přiložte projektové podklady a použijte AI pro technická posouzení.`),wc()()(),ci(12,`div`,58)(13,`button`,59),Ep(`click`,function(){Jl(e);let i=hI();return Xl(i.activeCategory.set(`files`))}),ci(14,`mat-icon`,60),WI(15,`attach_file`),wc(),ci(16,`span`),WI(17),wc()(),ci(18,`button`,61),Ep(`click`,function(){Jl(e);let i=hI();return Xl(i.triggerBatchGeneration())}),ZE(19,We,4,0,`span`,22)(20,He,5,0,`span`,46),wc(),ci(21,`button`,62),Ep(`click`,function(){Jl(e);let i=hI();return Xl(i.closeModal())}),WI(22,` ✕ `),wc()()(),ZE(23,Ke,1,0,`mat-progress-bar`,63),ci(24,`div`,64),eI(25,Qe,4,4,`button`,65,U),wc(),ci(27,`div`,66),ZE(28,Ye,15,3,`div`,67),ci(29,`div`,68)(30,`div`,69)(31,`label`,70),WI(32,`Interní název projektu / Zakázky`),wc(),ci(33,`input`,71),Fv(),Vp(`ngModelChange`,function(i){Jl(e);let s=hI();return ZI(s.customTitle,i)||(s.customTitle=i),Xl(i)}),wc()()(),ZE(34,nt,17,3,`div`,72)(35,mt,3,0,`div`,72),wc(),ci(36,`div`,73)(37,`div`,58)(38,`button`,74),Ep(`click`,function(){Jl(e);let i=hI();return Xl(i.closeModal())}),WI(39,` Zrušit `),wc(),ci(40,`button`,75),Ep(`click`,function(){Jl(e);let i=hI();return Xl(i.exportCurrentDocx())}),ci(41,`mat-icon`,52),WI(42,`description`),wc(),WI(43,` Exportovat DOCX `),wc()(),ci(44,`div`,6)(45,`button`,76),Ep(`click`,function(){Jl(e);let i=hI();return Xl(i.saveSolution())}),ZE(46,pt,4,0,`span`,22)(47,ut,5,1,`span`,46),wc()()()()()}if(o&2){let e=hI();Yy(9),Nc(` `,e.editingId()?`Upravit řešení PBŘ & AI Posouzení`:`Nové řešení PBŘ`,` `),Yy(4),OI(e.activeCategory()===`files`?`!text-sky-300 !border-sky-500/40 !bg-sky-600/10`:`!text-zinc-300 !border-zinc-700`),Yy(4),Nc(`Přílohy (`,e.modalFiles().length,`)`),Yy(),fp(`disabled`,e.isGeneratingBatch()||!!e.generatingField()),Yy(),KE(e.isGeneratingBatch()?19:20),Yy(4),KE(e.isGeneratingAi()?23:-1),Yy(2),tI(e.formCategories),Yy(3),KE(e.activeCategory()!==`files`?28:-1),Yy(5),jp(`ngModel`,e.customTitle),Vv(),Yy(),KE(e.activeCategory()===`files`?34:35),Yy(11),fp(`disabled`,e.isSaving()||e.isGeneratingBatch()),Yy(),KE(e.isSaving()?46:47)}}function _t(o,c){if(o&1){let e=aI();ci(0,`div`,21)(1,`mat-card`,120)(2,`div`,121)(3,`div`)(4,`h3`,122)(5,`mat-icon`,123),WI(6,`square_foot`),wc(),ci(7,`span`),WI(8,`Prompt šablona:`),wc(),ci(9,`span`,124),WI(10),wc()(),ci(11,`p`,57),WI(12),wc()(),ci(13,`button`,125),Ep(`click`,function(){Jl(e);let i=hI();return Xl(i.inspectingPrompt.set(null))}),WI(14,` ✕ `),wc()(),ci(15,`div`,126)(16,`div`,127)(17,`span`,128),WI(18,`Systémový prompt:`),wc(),ci(19,`div`,129),WI(20),wc()(),ci(21,`div`,127)(22,`span`,128),WI(23,`Uživatelský prompt:`),wc(),ci(24,`div`,129),WI(25),wc()(),ci(26,`div`,130)(27,`div`),WI(28,`Zahrnout soubory: `),ci(29,`strong`,16),WI(30),wc()(),ci(31,`div`),WI(32,`Teplota modelu: `),ci(33,`strong`,16),WI(34),wc()()()(),ci(35,`div`,131)(36,`button`,132),Ep(`click`,function(){Jl(e);let i=hI();return Xl(i.inspectingPrompt.set(null))}),WI(37,` Zavřít `),wc()()()()}if(o&2){let e=c;Yy(10),Lp(e.propertyName||e.fieldKey),Yy(2),Pp(``,e.placeholderKey,` • `,e.category),Yy(8),Nc(` `,e.systemPrompt,` `),Yy(5),Nc(` `,e.userPrompt,` `),Yy(5),Lp(e.includeFiles?`Ano`:`Ne`),Yy(4),Lp(e.temperature??.2)}}var Be={nazevStavby:``,investorName:``,mistoStavby:``,stupenDokumentace:`DSP - Dokumentace pro stavební povolení`,datum:(/* @__PURE__ */ new Date()).toISOString().split(`T`)[0],zhodnoceniTechnickychZarizeniStavby:``,seznamPriloh:``,seznamPodkladu:``,uvod:``,kategorizaceStavbyZHlediskaPozarniBezpecnosti:``,konstrukcniReseniStavby:``,posouzeniPozarniBezpecnostiStaveb:``,pozarniOdolnostStavebnichKonstrukci:``,evakuaceADruhyAKapacityUnikovychCest:``,pozarneNebezpecnyProstorOdstupoveVzdalenosti:``,zabezpeceniPozarniVodouNeboJinymiHasebnimiLatkami:``,pozadavkyNaPozarneBezpecnostniZarizeniAZnaceni:``,pozadavkyProHaseniPozaruAZachrannePrace:``};var qt=(()=>{class o{constructor(){this.fssService=I$1(h),this.authService=I$1(v),this.solutions=xo([]),this.isLoading=xo(!0),this.errorMessage=xo(null),this.successMessage=xo(null),this.searchQuery=xo(``),this.isModalOpen=xo(!1),this.editingId=xo(null),this.isSaving=xo(!1),this.isExporting=xo(null),this.generatingField=xo(null),this.isGeneratingBatch=xo(!1),this.isGeneratingAi=dD(()=>this.isGeneratingBatch()||!!this.generatingField()),this.isUploadingFiles=xo(!1),this.activeCategory=xo(`all`),this.modalFiles=xo([]),this.inspectingPrompt=xo(null),this.customTitle=``,this.formData=U$1({},Be),this.formCategories=[{id:`all`,label:`Všechna pole (18)`},{id:`identification`,label:`1. Identifikace & Údaje`},{id:`documents`,label:`2. Podklady & Úvod`},{id:`assessment`,label:`3. Posouzení PBŘ`},{id:`evacuation`,label:`4. Únikové cesty & Odstupy`},{id:`extinguishing`,label:`5. Zabezpečení & Hašení`},{id:`files`,label:`📁 Přílohy dokumentace`}],this.filteredSolutions=dD(()=>{let e=this.searchQuery().toLowerCase().trim();return e?this.solutions().filter(t=>t.title&&t.title.toLowerCase().includes(e)||t.nazevStavby&&t.nazevStavby.toLowerCase().includes(e)||t.investorName&&t.investorName.toLowerCase().includes(e)||t.mistoStavby&&t.mistoStavby.toLowerCase().includes(e)):this.solutions()}),this.visibleFields=dD(()=>{let e=this.activeCategory();return e===`all`?m:m.filter(t=>t.category===e)})}ngOnInit(){this.loadSolutions()}loadSolutions(){this.isLoading.set(!0),this.fssService.getSolutions().subscribe({next:e=>{this.solutions.set(e.solutions||[]),this.isLoading.set(!1)},error:e=>{this.errorMessage.set(e.message||`Nepodařilo se načíst řešení PBŘ.`),this.isLoading.set(!1)}})}setActiveCategory(e){this.activeCategory.set(e),this.adjustAllTextareas()}adjustAllTextareas(){setTimeout(()=>{typeof document<`u`&&document.querySelectorAll(`textarea`).forEach(t=>{t.style.height=`auto`,t.style.overflowY=`hidden`,t.scrollHeight>0&&(t.style.height=`${t.scrollHeight}px`)})},0)}openCreateModal(e=`all`){this.editingId.set(null),this.customTitle=``,this.formData=W(U$1({},Be),{datum:(/* @__PURE__ */ new Date()).toISOString().split(`T`)[0]}),this.modalFiles.set([]),this.activeCategory.set(e),this.isModalOpen.set(!0),this.adjustAllTextareas()}openEditModal(e,t=`all`){this.editingId.set(e.id),this.customTitle=e.title||e.nazevStavby||``,this.formData={nazevStavby:e.nazevStavby||``,investorName:e.investorName||``,mistoStavby:e.mistoStavby||``,stupenDokumentace:e.stupenDokumentace||`DSP`,datum:e.datum||``,zhodnoceniTechnickychZarizeniStavby:e.zhodnoceniTechnickychZarizeniStavby||``,seznamPriloh:e.seznamPriloh||``,seznamPodkladu:e.seznamPodkladu||``,uvod:e.uvod||``,kategorizaceStavbyZHlediskaPozarniBezpecnosti:e.kategorizaceStavbyZHlediskaPozarniBezpecnosti||``,konstrukcniReseniStavby:e.konstrukcniReseniStavby||``,posouzeniPozarniBezpecnostiStaveb:e.posouzeniPozarniBezpecnostiStaveb||``,pozarniOdolnostStavebnichKonstrukci:e.pozarniOdolnostStavebnichKonstrukci||``,evakuaceADruhyAKapacityUnikovychCest:e.evakuaceADruhyAKapacityUnikovychCest||``,pozarneNebezpecnyProstorOdstupoveVzdalenosti:e.pozarneNebezpecnyProstorOdstupoveVzdalenosti||``,zabezpeceniPozarniVodouNeboJinymiHasebnimiLatkami:e.zabezpeceniPozarniVodouNeboJinymiHasebnimiLatkami||``,pozadavkyNaPozarneBezpecnostniZarizeniAZnaceni:e.pozadavkyNaPozarneBezpecnostniZarizeniAZnaceni||``,pozadavkyProHaseniPozaruAZachrannePrace:e.pozadavkyProHaseniPozaruAZachrannePrace||``},this.modalFiles.set(e.files||[]),this.activeCategory.set(t),this.isModalOpen.set(!0),this.adjustAllTextareas()}closeModal(){this.isModalOpen.set(!1),this.editingId.set(null)}saveSolution(){this.isSaving.set(!0),this.errorMessage.set(null);let e=W(U$1({},this.formData),{title:this.customTitle||this.formData.nazevStavby||`PBŘ Řešení`,files:this.modalFiles()}),t=this.editingId();t?this.fssService.updateSolution(t,e).subscribe({next:()=>{this.successMessage.set(`Řešení PBŘ bylo úspěšně aktualizováno.`),this.isSaving.set(!1),this.closeModal(),this.loadSolutions()},error:i=>{this.errorMessage.set(i.message||`Chyba při ukládání PBŘ.`),this.isSaving.set(!1)}}):this.fssService.createSolution(e).subscribe({next:()=>{this.successMessage.set(`Nové řešení PBŘ bylo úspěšně vytvořeno.`),this.isSaving.set(!1),this.closeModal(),this.loadSolutions()},error:i=>{this.errorMessage.set(i.message||`Chyba při vytváření PBŘ.`),this.isSaving.set(!1)}})}deleteSolution(e){confirm(`Opravdu chcete toto řešení PBŘ smazat?`)&&this.fssService.deleteSolution(e).subscribe({next:()=>{this.successMessage.set(`Řešení PBŘ bylo smazáno.`),this.solutions.update(t=>t.filter(i=>i.id!==e)),this.loadSolutions()},error:t=>{this.errorMessage.set(t.message||`Chyba při mazání PBŘ.`)}})}previewPromptForField(e){this.fssService.getPrompt(e).subscribe({next:t=>{t.prompt&&this.inspectingPrompt.set(t.prompt)},error:t=>{this.errorMessage.set(t.message||`Nepodařilo se načíst prompt.`)}})}generateFieldWithAi(e){this.generatingField.set(e),this.errorMessage.set(null),this.fssService.generateField(e,{fssId:this.editingId()||void 0,properties:this.formData,files:this.modalFiles()}).subscribe({next:t=>{let i=t.value||t.result?.value||t.generatedText;if(t.success&&i){this.formData[e]=i;let s=t.tokens||t.totalTokens?` (${t.tokens||t.totalTokens} token\u016F)`:``;this.successMessage.set(`Pole '${e}' bylo \xFAsp\u011B\u0161n\u011B vygenerov\xE1no pomoc\xED AI${s}.`),this.editingId()&&this.loadSolutions(),this.adjustAllTextareas()}else t.error&&this.errorMessage.set(t.error);this.generatingField.set(null)},error:t=>{this.errorMessage.set(t.message||`Chyba při generování AI pole.`),this.generatingField.set(null)}})}triggerBatchGeneration(){this.isGeneratingBatch.set(!0),this.errorMessage.set(null);let e=m.map(t=>t.key);this.fssService.generateBatch({fieldKeys:e,fssId:this.editingId()||void 0,properties:this.formData,files:this.modalFiles()}).subscribe({next:t=>{if(t.success&&t.results){for(let[s,f]of Object.entries(t.results)){let Le=s,$=typeof f==`string`?f:f?.value;$&&(this.formData[Le]=$)}let i=t.totalTokens||t.tokens?` (${t.totalTokens||t.tokens} token\u016F)`:``;this.successMessage.set(`V\u0161echna pole PB\u0158 byla vygenerov\xE1na p\u0159es AI${i}.`),this.editingId()&&this.loadSolutions(),this.adjustAllTextareas()}else t.errors&&this.errorMessage.set(`Některá pole se nepodařilo vygenerovat.`);this.isGeneratingBatch.set(!1)},error:t=>{this.errorMessage.set(t.message||`Chyba při hromadném generování PBŘ.`),this.isGeneratingBatch.set(!1)}})}handleFileUpload(e){let t=e.target;if(!t.files||t.files.length===0)return;this.isUploadingFiles.set(!0),this.errorMessage.set(null);let i=new FormData;for(let s=0;s<t.files.length;s++)i.append(`files`,t.files[s]);this.fssService.uploadFiles(this.editingId()||void 0,i).subscribe({next:s=>{s.success&&s.files&&(this.modalFiles.set([...this.modalFiles(),...s.files]),this.successMessage.set(`${s.files.length} soubor\u016F bylo nahr\xE1no k posouzen\xED.`)),this.isUploadingFiles.set(!1),t.value=``},error:s=>{this.errorMessage.set(s.message||`Chyba při nahrávání souborů.`),this.isUploadingFiles.set(!1),t.value=``}})}removeFile(e){let t=this.editingId();t?this.fssService.deleteFile(t,e).subscribe({next:()=>{this.modalFiles.set(this.modalFiles().filter(i=>i.id!==e)),this.successMessage.set(`Soubor byl odstraněn.`)},error:i=>{this.errorMessage.set(i.message||`Chyba při mazání souboru.`)}}):this.modalFiles.set(this.modalFiles().filter(i=>i.id!==e))}downloadFile(e){this.fssService.downloadFile(this.editingId()||void 0,e.id).subscribe({next:t=>{let i=window.URL.createObjectURL(t),s=document.createElement(`a`);s.href=i,s.download=e.name,document.body.appendChild(s),s.click(),document.body.removeChild(s),window.URL.revokeObjectURL(i)},error:t=>{this.errorMessage.set(t.message||`Nepodařilo se stáhnout soubor.`)}})}exportDocx(e){this.isExporting.set(e.id),this.fssService.exportDocx(e.id).subscribe({next:t=>{let i=window.URL.createObjectURL(t),s=document.createElement(`a`);s.href=i;s.download=`${e.title||e.nazevStavby||`PBR`}.docx`.replace(/\s+/g,`_`),document.body.appendChild(s),s.click(),document.body.removeChild(s),window.URL.revokeObjectURL(i),this.isExporting.set(null)},error:t=>{this.errorMessage.set(t.message||`Chyba při exportu do DOCX.`),this.isExporting.set(null)}})}exportCurrentDocx(){let e=this.editingId();e?this.exportDocx(W(U$1({},this.formData),{id:e,title:this.customTitle,userId:``,createdAt:``,updatedAt:``})):this.fssService.exportDraftDocx(W(U$1({},this.formData),{title:this.customTitle})).subscribe({next:t=>{let i=window.URL.createObjectURL(t),s=document.createElement(`a`);s.href=i;s.download=`${this.customTitle||this.formData.nazevStavby||`PBR_navrh`}_posouzeni.docx`.replace(/\s+/g,`_`),document.body.appendChild(s),s.click(),document.body.removeChild(s),window.URL.revokeObjectURL(i)},error:t=>{this.errorMessage.set(t.message||`Chyba při exportu DOCX.`)}})}formatCost(e){return!e||e===0?`$0.00`:e<.01?`$${e.toFixed(4)}`:`$${e.toFixed(2)}`}formatBytes(e){if(e===0)return`0 B`;let t=1024,i=[`B`,`KB`,`MB`,`GB`],s=Math.floor(Math.log(e)/Math.log(t));return parseFloat((e/Math.pow(t,s)).toFixed(1))+` `+i[s]}getFileIcon(e){switch(e.split(`.`).pop()?.toLowerCase()){case`pdf`:return`📕`;case`dwg`:case`dxf`:return`📐`;case`doc`:case`docx`:return`📘`;case`png`:case`jpg`:case`jpeg`:return`🖼️`;default:return`📄`}}static{this.ɵfac=function(t){return new(t||o)}}static{this.ɵcmp=NE({type:o,selectors:[[`app-fss-list`]],decls:33,vars:7,consts:[[`fileInput`,``],[1,`space-y-6`],[1,`flex`,`flex-col`,`sm:flex-row`,`sm:items-center`,`sm:justify-between`,`gap-4`],[1,`text-xl`,`sm:text-2xl`,`font-bold`,`tracking-tight`,`text-white`,`flex`,`items-center`,`gap-2.5`],[1,`!text-amber-500`],[1,`text-xs`,`sm:text-sm`,`text-zinc-400`,`mt-1`],[1,`flex`,`items-center`,`gap-3`],[`mat-flat-button`,``,`color`,`primary`,`type`,`button`,1,`!rounded-xl`,`!text-xs`,`sm:!text-sm`,`!font-medium`,3,`click`],[1,`!text-base`,`!w-4`,`!h-4`,`!mr-1`],[1,`p-3.5`,`rounded-xl`,`bg-emerald-950/40`,`border`,`border-emerald-500/30`,`text-emerald-200`,`text-xs`,`flex`,`items-center`,`justify-between`,`animate-in`,`fade-in`],[1,`p-3.5`,`rounded-xl`,`bg-rose-950/40`,`border`,`border-rose-500/30`,`text-rose-200`,`text-xs`,`flex`,`items-center`,`justify-between`,`animate-in`,`fade-in`],[1,`flex`,`flex-col`,`sm:flex-row`,`sm:items-center`,`justify-between`,`gap-3`,`p-4`,`rounded-2xl`,`bg-zinc-900/60`,`border`,`border-zinc-800`],[1,`relative`,`flex-1`,`max-w-md`],[`type`,`text`,`placeholder`,`Hledat v názvu stavby, investorovi, lokalitě...`,1,`w-full`,`pl-9`,`pr-4`,`py-2`,`rounded-xl`,`bg-zinc-800/80`,`border`,`border-zinc-700/60`,`text-xs`,`text-white`,`placeholder-zinc-400`,`focus:outline-none`,`focus:border-indigo-500`,3,`ngModelChange`,`ngModel`],[1,`!text-zinc-400`,`!text-sm`,`!w-4`,`!h-4`,`absolute`,`left-3`,`top-2.5`],[1,`text-xs`,`text-zinc-400`,`flex`,`items-center`,`gap-3`],[1,`text-zinc-200`],[1,`py-16`,`text-center`,`text-zinc-400`,`text-sm`,`flex`,`flex-col`,`items-center`,`justify-center`,`gap-3`],[1,`py-16`,`text-center`,`rounded-2xl`,`border`,`border-dashed`,`border-zinc-800`,`bg-zinc-900/30`,`text-zinc-400`,`space-y-3`],[1,`grid`,`grid-cols-1`,`md:grid-cols-2`,`lg:grid-cols-3`,`gap-4`],[1,`fixed`,`inset-0`,`z-50`,`overflow-y-auto`,`bg-zinc-950/80`,`backdrop-blur-sm`,`flex`,`justify-center`,`p-2`,`sm:p-4`,`md:p-6`,`animate-in`,`fade-in`],[1,`fixed`,`inset-0`,`z-50`,`overflow-y-auto`,`bg-zinc-950/80`,`backdrop-blur-sm`,`flex`,`justify-center`,`p-3`,`sm:p-6`,`animate-in`,`fade-in`],[1,`flex`,`items-center`,`gap-1.5`],[1,`!text-sm`,`!w-4`,`!h-4`,`text-emerald-400`],[`type`,`button`,1,`text-emerald-400`,`hover:text-white`,3,`click`],[1,`!text-sm`,`!w-4`,`!h-4`,`text-rose-400`],[`type`,`button`,1,`text-rose-400`,`hover:text-white`,3,`click`],[`diameter`,`32`],[1,`!text-4xl`,`!w-10`,`!h-10`,`text-amber-500`,`mx-auto`],[1,`text-sm`,`font-medium`,`text-zinc-300`],[1,`text-xs`,`text-zinc-500`,`max-w-sm`,`mx-auto`],[`mat-flat-button`,``,`color`,`primary`,`type`,`button`,1,`!rounded-xl`,`!text-xs`,`!font-semibold`,3,`click`],[1,`!text-sm`,`!w-4`,`!h-4`,`!mr-1`],[1,`flex`,`flex-col`,`justify-between`,`!p-5`,`!rounded-2xl`,`!bg-zinc-900/80`,`!border`,`!border-zinc-800`,`hover:!border-zinc-700`,`transition-all`,`!shadow-lg`,`space-y-4`,`group`],[1,`space-y-3`],[1,`flex`,`items-start`,`justify-between`,`gap-2`],[1,`text-sm`,`font-bold`,`text-white`,`group-hover:text-indigo-300`,`transition-colors`,`line-clamp-1`],[1,`grid`,`grid-cols-2`,`gap-2`,`text-[11px]`,`text-zinc-400`,`bg-zinc-950/60`,`p-2.5`,`rounded-xl`,`border`,`border-zinc-800/80`],[`matTooltip`,`Spravovat a nahrát podklady k posouzení`,1,`cursor-pointer`,`hover:bg-zinc-800/50`,`p-1`,`-m-1`,`rounded-lg`,`transition-colors`,`group/files`,`flex`,`flex-col`,`justify-center`,3,`click`],[1,`flex`,`items-center`,`justify-between`],[1,`text-zinc-500`,`block`,`text-[10px]`],[1,`!text-[12px]`,`!w-3`,`!h-3`,`text-zinc-500`,`group-hover/files:text-sky-400`,`transition-colors`],[1,`text-zinc-200`,`font-medium`,`group-hover/files:text-sky-300`,`transition-colors`],[1,`text-zinc-200`,`font-medium`],[1,`flex`,`items-center`,`justify-between`,`pt-3`,`border-t`,`border-zinc-800/80`],[`mat-stroked-button`,``,`type`,`button`,`matTooltip`,`Stáhnout jako Microsoft Word dokument (.docx)`,1,`!rounded-lg`,`!text-xs`,`!font-medium`,3,`click`,`disabled`],[1,`flex`,`items-center`],[1,`flex`,`items-center`,`gap-1`],[`mat-icon-button`,``,`type`,`button`,1,`!text-zinc-400`,`hover:!text-sky-400`,3,`click`,`matTooltip`],[`mat-icon-button`,``,`type`,`button`,`matTooltip`,`Upravit PBŘ`,1,`!text-zinc-400`,`hover:!text-indigo-400`,3,`click`],[`mat-icon-button`,``,`type`,`button`,`matTooltip`,`Smazat řešení`,1,`!text-zinc-500`,`hover:!text-rose-400`,3,`click`],[`diameter`,`14`],[1,`!text-xs`,`!w-3.5`,`!h-3.5`,`!mr-1`,`text-sky-400`],[1,`relative`,`w-full`,`max-w-5xl`,`!bg-zinc-900`,`!border`,`!border-zinc-800`,`!rounded-2xl`,`!shadow-2xl`,`overflow-hidden`,`flex`,`flex-col`,`max-h-[92vh]`,`!p-0`],[1,`px-6`,`py-4`,`border-b`,`border-zinc-800`,`flex`,`items-center`,`justify-between`,`bg-zinc-900/90`],[1,`p-2`,`rounded-xl`,`bg-indigo-600/20`,`text-indigo-400`,`text-lg`,`flex`,`items-center`,`justify-center`],[1,`text-base`,`sm:text-lg`,`font-bold`,`text-white`],[1,`text-xs`,`text-zinc-400`],[1,`flex`,`items-center`,`gap-2`],[`mat-stroked-button`,``,`type`,`button`,`matTooltip`,`Nahrát a spravovat přiložené soubory`,1,`!rounded-xl`,`!text-xs`,`!font-medium`,3,`click`],[1,`!text-sm`,`!w-4`,`!h-4`,`!mr-1`,`text-sky-400`],[`mat-flat-button`,``,`type`,`button`,1,`!rounded-xl`,`!text-xs`,`!font-semibold`,`!bg-indigo-600`,`hover:!bg-indigo-500`,`!text-white`,`disabled:!opacity-60`,`disabled:!bg-indigo-600`,`disabled:!text-white`,`shadow-md`,`cursor-pointer`,`shrink-0`,3,`click`,`disabled`],[`type`,`button`,1,`p-2`,`rounded-xl`,`text-zinc-400`,`hover:text-white`,`hover:bg-zinc-800`,`cursor-pointer`,3,`click`],[`mode`,`indeterminate`,1,`!h-1`],[1,`flex`,`items-center`,`gap-1`,`px-6`,`py-2.5`,`bg-zinc-950/60`,`border-b`,`border-zinc-800`,`overflow-x-auto`,`text-xs`],[`matRipple`,``,`type`,`button`,1,`px-3`,`py-1.5`,`rounded-lg`,`whitespace-nowrap`,`font-medium`,`transition-all`,`cursor-pointer`,`flex`,`items-center`,`gap-1.5`,3,`class`],[1,`flex-1`,`overflow-y-auto`,`p-6`,`space-y-6`],[1,`flex`,`flex-col`,`sm:flex-row`,`sm:items-center`,`justify-between`,`gap-3`,`p-3.5`,`rounded-xl`,`bg-sky-950/20`,`border`,`border-sky-500/30`,`text-xs`],[1,`grid`,`grid-cols-1`,`sm:grid-cols-2`,`gap-4`],[1,`space-y-1.5`],[1,`block`,`text-xs`,`font-semibold`,`text-zinc-300`],[`type`,`text`,`placeholder`,`např. PBŘ - Polyfunkční dům Nová Waltrovka`,1,`w-full`,`px-3.5`,`py-2`,`rounded-xl`,`bg-zinc-800/90`,`border`,`border-zinc-700/80`,`text-xs`,`text-white`,`placeholder-zinc-500`,`focus:outline-none`,`focus:border-indigo-500`,3,`ngModelChange`,`ngModel`],[1,`space-y-4`],[1,`px-6`,`py-4`,`border-t`,`border-zinc-800`,`bg-zinc-900/90`,`flex`,`flex-col`,`sm:flex-row`,`items-center`,`justify-between`,`gap-3`],[`mat-button`,``,`type`,`button`,1,`!rounded-xl`,`!text-zinc-300`,`!text-xs`,3,`click`],[`mat-stroked-button`,``,`type`,`button`,1,`!rounded-xl`,`!text-xs`,`!font-medium`,3,`click`],[`mat-flat-button`,``,`type`,`button`,1,`!rounded-xl`,`!text-xs`,`!font-semibold`,`!bg-indigo-600`,`hover:!bg-indigo-500`,`!text-white`,`disabled:!opacity-60`,`disabled:!bg-indigo-600`,`disabled:!text-white`,`shadow-md`,`cursor-pointer`,3,`click`,`disabled`],[`matRipple`,``,`type`,`button`,1,`px-3`,`py-1.5`,`rounded-lg`,`whitespace-nowrap`,`font-medium`,`transition-all`,`cursor-pointer`,`flex`,`items-center`,`gap-1.5`,3,`click`],[1,`px-1.5`,`py-0.2`,`rounded-full`,`text-[10px]`,`bg-indigo-400/20`,`text-indigo-200`,`font-bold`],[1,`flex`,`items-center`,`gap-2.5`,`text-zinc-300`],[1,`p-1.5`,`rounded-lg`,`bg-sky-500/10`,`text-sky-400`,`flex`,`items-center`,`justify-center`],[1,`!text-base`,`!w-4`,`!h-4`],[1,`font-medium`,`text-white`],[1,`text-zinc-300`],[1,`text-zinc-400`,`block`,`text-[11px]`],[`mat-stroked-button`,``,`type`,`button`,1,`!rounded-lg`,`!text-xs`,`!font-medium`,`!text-sky-300`,`!border-sky-500/30`,`!bg-sky-600/10`,`shrink-0`,3,`click`],[1,`p-6`,`rounded-2xl`,`border-2`,`border-dashed`,`border-zinc-700`,`bg-zinc-950/40`,`text-center`,`space-y-3`],[1,`!text-4xl`,`!w-10`,`!h-10`,`text-indigo-400`,`mx-auto`],[1,`text-xs`,`font-semibold`,`text-zinc-200`],[1,`text-[11px]`,`text-zinc-400`,`mt-0.5`],[`type`,`file`,`multiple`,``,1,`hidden`,3,`change`],[`mat-flat-button`,``,`color`,`primary`,`type`,`button`,1,`!rounded-xl`,`!text-xs`,`!font-medium`,3,`click`,`disabled`],[1,`space-y-2`],[1,`text-xs`,`font-semibold`,`text-zinc-300`],[1,`divide-y`,`divide-zinc-800/80`,`border`,`border-zinc-800`,`rounded-xl`,`bg-zinc-950/40`,`overflow-hidden`],[1,`flex`,`items-center`,`justify-between`,`p-3`,`text-xs`],[1,`flex`,`items-center`,`gap-2.5`,`min-w-0`],[1,`text-base`],[1,`truncate`],[1,`text-zinc-200`,`font-medium`,`truncate`],[1,`text-[10px]`,`text-zinc-500`],[`mat-icon-button`,``,`type`,`button`,`matTooltip`,`Stáhnout soubor`,1,`!text-zinc-400`,`hover:!text-white`,3,`click`],[`mat-icon-button`,``,`type`,`button`,`matTooltip`,`Odstranit soubor`,1,`!text-zinc-500`,`hover:!text-rose-400`,3,`click`],[1,`p-4`,`rounded-xl`,`bg-zinc-950/40`,`border`,`border-zinc-800/80`,`space-y-2`,`hover:border-zinc-700/80`,`transition-colors`,`relative`,`overflow-hidden`],[`mode`,`indeterminate`,1,`!h-1`,`-mt-4`,`-mx-4`,`mb-2`],[1,`flex`,`flex-col`,`sm:flex-row`,`sm:items-center`,`justify-between`,`gap-2`],[1,`block`,`text-xs`,`font-semibold`,`text-zinc-200`],[1,`text-[10px]`,`font-mono`,`text-indigo-400`],[`mat-stroked-button`,``,`type`,`button`,`matTooltip`,`Zobrazit prompt šablonu`,1,`!rounded-lg`,`!text-[11px]`,`!font-medium`,3,`click`],[1,`!text-xs`,`!w-3.5`,`!h-3.5`,`!mr-1`],[`mat-stroked-button`,``,`type`,`button`,`matTooltip`,`Vygenerovat obsah pole pomocí AI`,1,`!rounded-lg`,`!text-[11px]`,`!font-medium`,`!text-indigo-300`,`!border-indigo-500/30`,`!bg-indigo-600/10`,`disabled:!opacity-60`,3,`click`,`disabled`],[1,`text-[11px]`,`text-zinc-400`],[`autoResize`,``,`rows`,`4`,1,`w-full`,`px-3`,`py-2`,`rounded-xl`,`bg-zinc-900`,`border`,`border-zinc-700/80`,`text-xs`,`text-white`,`placeholder-zinc-500`,`focus:outline-none`,`focus:border-indigo-500`,`font-sans`,`leading-relaxed`,`resize-none`,`overflow-hidden`,3,`autoResize`,`ngModel`,`placeholder`],[`type`,`date`,1,`w-full`,`px-3`,`py-2`,`rounded-xl`,`bg-zinc-900`,`border`,`border-zinc-700/80`,`text-xs`,`text-white`,`focus:outline-none`,`focus:border-indigo-500`,3,`ngModel`],[`type`,`text`,1,`w-full`,`px-3`,`py-2`,`rounded-xl`,`bg-zinc-900`,`border`,`border-zinc-700/80`,`text-xs`,`text-white`,`placeholder-zinc-500`,`focus:outline-none`,`focus:border-indigo-500`,3,`ngModel`,`placeholder`],[`diameter`,`12`],[1,`!text-xs`,`!w-3.5`,`!h-3.5`,`!mr-1`,`text-amber-400`],[`autoResize`,``,`rows`,`4`,1,`w-full`,`px-3`,`py-2`,`rounded-xl`,`bg-zinc-900`,`border`,`border-zinc-700/80`,`text-xs`,`text-white`,`placeholder-zinc-500`,`focus:outline-none`,`focus:border-indigo-500`,`font-sans`,`leading-relaxed`,`resize-none`,`overflow-hidden`,3,`ngModelChange`,`autoResize`,`ngModel`,`placeholder`],[`type`,`date`,1,`w-full`,`px-3`,`py-2`,`rounded-xl`,`bg-zinc-900`,`border`,`border-zinc-700/80`,`text-xs`,`text-white`,`focus:outline-none`,`focus:border-indigo-500`,3,`ngModelChange`,`ngModel`],[`type`,`text`,1,`w-full`,`px-3`,`py-2`,`rounded-xl`,`bg-zinc-900`,`border`,`border-zinc-700/80`,`text-xs`,`text-white`,`placeholder-zinc-500`,`focus:outline-none`,`focus:border-indigo-500`,3,`ngModelChange`,`ngModel`,`placeholder`],[1,`relative`,`w-full`,`max-w-2xl`,`!bg-zinc-900`,`!border`,`!border-zinc-800`,`!rounded-2xl`,`!shadow-2xl`,`!p-6`,`space-y-4`],[1,`flex`,`items-center`,`justify-between`,`border-b`,`border-zinc-800`,`pb-3`],[1,`text-sm`,`font-bold`,`text-white`,`flex`,`items-center`,`gap-2`],[1,`!text-indigo-400`],[1,`text-indigo-400`,`font-mono`],[`type`,`button`,1,`p-1.5`,`rounded-lg`,`text-zinc-400`,`hover:text-white`,`cursor-pointer`,3,`click`],[1,`space-y-3`,`text-xs`],[1,`space-y-1`],[1,`text-zinc-400`,`font-semibold`,`block`],[1,`p-3`,`rounded-xl`,`bg-zinc-950`,`border`,`border-zinc-800`,`font-mono`,`text-[11px]`,`text-zinc-300`,`whitespace-pre-wrap`],[1,`grid`,`grid-cols-2`,`gap-2`,`text-[11px]`,`text-zinc-400`,`pt-2`],[1,`flex`,`justify-end`,`pt-3`,`border-t`,`border-zinc-800`],[`mat-stroked-button`,``,`type`,`button`,1,`!rounded-xl`,`!text-xs`,3,`click`]],template:function(t,i){if(t&1&&(ci(0,`div`,1)(1,`div`,2)(2,`div`)(3,`h1`,3)(4,`mat-icon`,4),WI(5,`local_fire_department`),wc(),ci(6,`span`),WI(7,`Fire Safety Solutions (PBŘ)`),wc()(),ci(8,`p`,5),WI(9,` Požárně bezpečnostní řešení staveb, AI generování technických posouzení z projektové dokumentace a export do formátu DOCX. `),wc()(),ci(10,`div`,6)(11,`button`,7),Ep(`click`,function(){return i.openCreateModal()}),ci(12,`mat-icon`,8),WI(13,`add`),wc(),ci(14,`span`),WI(15,`Nové řešení PBŘ`),wc()()()(),ZE(16,Xe,7,1,`div`,9),ZE(17,je,7,1,`div`,10),ci(18,`div`,11)(19,`div`,12)(20,`input`,13),Fv(),Ep(`ngModelChange`,function(f){return i.searchQuery.set(f)}),wc(),ci(21,`mat-icon`,14),WI(22,`search`),wc()(),ci(23,`div`,15)(24,`span`),WI(25,`Celkem projektů: `),ci(26,`strong`,16),WI(27),wc()()()(),ZE(28,Re,4,0,`div`,17)(29,Oe,11,0,`div`,18)(30,Ge,3,0,`div`,19),ZE(31,gt,48,12,`div`,20),ZE(32,_t,38,7,`div`,21),wc()),t&2){let s;Yy(16),KE(i.successMessage()?16:-1),Yy(),KE(i.errorMessage()?17:-1),Yy(3),fp(`ngModel`,i.searchQuery()),Vv(),Yy(7),Lp(i.filteredSolutions().length),Yy(),KE(i.isLoading()?28:i.filteredSolutions().length===0?29:30),Yy(3),KE(i.isModalOpen()?31:-1),Yy(),KE((s=i.inspectingPrompt())?32:-1,s)}},dependencies:[Mn,ma,Kt,ca,Sn,_,I,Zi,$i,Fn,fr,pr,Ur,jn,Ue$1,no,io,Pe,Te,sn,bi,z,Fr],encapsulation:2})}}return o})();export{qt as FssListComponent};