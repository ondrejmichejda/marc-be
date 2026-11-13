import {
  Directive,
  ElementRef,
  HostListener,
  Input,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
  OnDestroy,
  inject,
  NgZone,
} from '@angular/core';

@Directive({
  selector: 'textarea[autoResize], textarea[cdkTextareaAutosize]',
  standalone: true,
})
export class AutoResizeDirective implements AfterViewInit, OnChanges, OnDestroy {
  private el = inject(ElementRef<HTMLTextAreaElement>);
  private ngZone = inject(NgZone);
  private resizeObserver?: ResizeObserver;

  @Input() minRows = 4;
  @Input('autoResize') autoResizeValue?: unknown;

  ngAfterViewInit(): void {
    this.setupObserver();
    this.scheduleAdjust();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['autoResizeValue']) {
      this.scheduleAdjust();
    }
  }

  @HostListener('input')
  onInput(): void {
    this.adjust();
  }

  @HostListener('change')
  onChange(): void {
    this.adjust();
  }

  @HostListener('focus')
  onFocus(): void {
    this.adjust();
  }

  public adjust(): void {
    const textarea = this.el.nativeElement;
    if (!textarea) return;

    // Reset height to auto first so scrollHeight shrinks if text is deleted
    textarea.style.height = 'auto';
    textarea.style.overflowY = 'hidden';

    const scrollHeight = textarea.scrollHeight;
    if (scrollHeight > 0) {
      textarea.style.height = `${scrollHeight}px`;
    }
  }

  public scheduleAdjust(): void {
    this.ngZone.runOutsideAngular(() => {
      requestAnimationFrame(() => {
        this.adjust();
      });
      // Fallback timeout to ensure DOM layout / font rendering is complete
      setTimeout(() => {
        this.adjust();
      }, 0);
    });
  }

  private setupObserver(): void {
    if (typeof ResizeObserver !== 'undefined' && this.el.nativeElement) {
      this.resizeObserver = new ResizeObserver(() => {
        this.adjust();
      });
      this.resizeObserver.observe(this.el.nativeElement);
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }
}
