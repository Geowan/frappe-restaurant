frappe.provide('restaurant.Sale');
frappe.pages['restaurant-sale'].on_page_load = function (wrapper) {
    frappe.ui.make_app_page({
        parent: wrapper,
        title: 'Restaurant Sale',
        single_column: true
    });

    frappe.require('restaurant-sale.bundle.js', function () {
        wrapper.sale = new restaurant.Sale.Controller(wrapper);
        window.cur_pos = wrapper.pos;
    });
};

frappe.pages['restaurant-sale'].refresh = function (wrapper) {
    console.log("we have  refresh")
    //wrapper.sale.wrapper.html("");
    console.log("wrapper is ", window.cur_pos);
    return
    wrapper.sale.check_opening_entry();
};
