import { Directive, ElementRef, Renderer2, HostBinding, HostListener } from '@angular/core'

@Directive({
    selector: '[appDropdown]'
})
export class DropdownDirective {

    constructor(
        private el: ElementRef,
        private renderer: Renderer2
    ) { }

    @HostBinding('class.show') isOpen = false

    @HostListener('click')
    // @HostListener('mouseenter')
    toggleOpen() {
        this.isOpen = !this.isOpen
        let part = this.el.nativeElement.querySelector('.dropdown-menu')
        if (this.isOpen) {
            this.renderer.addClass(part, 'show')
        }
        else {
            this.renderer.removeClass(part, 'show')
        }
    }

    @HostListener('mouseleave')
    onMouseLeave(event: any) {
        this.isOpen = false
        let part = this.el.nativeElement.querySelector('.dropdown-menu')
        this.renderer.removeClass(part, 'show')
    }
}
