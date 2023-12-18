// Copyright (c) 2023, Soradius solutions and contributors
// For license information, please see license.txt
let form;
frappe.ui.form.on("Table", {
    refresh(frm) {
        form = frm;
        add_qrcode_btn();
    },
});


function add_qrcode_btn() {
    form.add_custom_button(__("Generate Qr Code"), () => {
        console.log(this)
        frappe.call({
            method: "advanced_restaurant.advanced_restaurant.doctype.table.table.generate_qrcode",
            args: {
                table:form.doc.name
            },
            // disable the button until the request is completed
            btn: $('button.btn-secondary'),
            // freeze the screen until the request is completed
            callback: (r) => {
                // on success
            },
            error: (error) => {
                // on error
            }
        })
    });
    form.change_custom_button_type('Generate Qr Code', null, 'secondary');

}