restaurant.Sale.Loading = class {
    constructor({wrapper}) {
        this.wrapper = wrapper;
        this.init_component();
    }

    init_component() {
        this.prepare_dom();
    }

    prepare_dom() {
        $(frappe.render_template('sale_loading')).appendTo(this.wrapper);
    }


}
