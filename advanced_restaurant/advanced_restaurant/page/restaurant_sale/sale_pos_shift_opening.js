restaurant.Sale.PosShiftOpening = class {

    //here we get the open shifts
    //and return it when clicked back to the
    constructor({wrapper, page, location, events}) {
        this.wrapper = wrapper;
        this.page = page;
        this.events = events;
        this.selected_location = location;


        $(frappe.render_template('sale_loading')).appendTo(this.wrapper);
        //first check for open pos profile
        //and also check to ensure the redirrect was not by mistake

        this.init_component();
        this.fetch_available_profiles();
    }

    fetch_available_profiles() {
        $(this.$exisingshift_table).empty();
        frappe.call({
                method: "advanced_restaurant.advanced_restaurant.page.restaurant_sale.sale.available_open_shifts",
                args: {
                    location: this.selected_location
                },
                freeze: true,
                callback: (res) => {
                    this.open_shifts = res.message
                    this.init_select_exising_shift();
                    this.prepare_menu();
                },
                error: (err) => {
                    // on error
                    frappe.throw(__('Unable to load opening shifts, refresh the page and try again'))

                }
            }
        )
    }

    init_component() {
        this.prepare_dom();
        this.init_child_components();
        this.prepare_menu();
        this.bind_events();
    }

    prepare_dom() {
        $(this.wrapper).empty();
        $(frappe.render_template('sale_pos_shift_opening')).appendTo(this.wrapper);
        this.$component = this.wrapper.find('#sale_shift_not_open');
    }

    init_child_components() {
        this.init_buttons();
        this.init_select_exising_shift();
        this.$location_selected_component = this.$component.find('span#location_selected')
        $(this.$location_selected_component).text(this.selected_location)
    }

    init_buttons() {
        this.$newshiftbtn_component = this.$component.find('button#new_shift');
        this.$change_location_btn_component = this.$component.find('button#change_location');
    }

    init_select_exising_shift() {
        this.$exisingshift_component = this.$component.find('div#existing_shift')
        this.$exisingshift_table = this.$exisingshift_component.find('tbody');
        $(this.$exisingshift_table).empty()

        if (this.open_shifts && this.open_shifts.length > 0) {
            $(this.$exisingshift_table).empty()
            const rows = this.open_shifts.map((el, index) => ({
                html: `<tr>
                         <td>${index + 1}</td>
                         <td>${el.name}</td>
                         <td>${el.company}</td>
                         <td>${el.pos_profile}</td>
                         <td>${frappe.format(el.period_start_date, {fieldtype: 'Datetime'})}</td>
                         <td><button class="btn btn-sm btn-primary open_shift" data-shift='${el.name}'>Open</button></td> 
                      </tr> `
            }))
            rows.forEach(row => $(this.$exisingshift_table).append(row.html))


        }

    }

    prepare_menu() {
        this.page.clear_menu();
        this.page.clear_indicator()
        if (this.open_shifts && this.open_shifts.length > 0) {
            this.page.set_indicator(this.open_shifts.length + ' open pos shifts', 'green')
        } else {
            this.page.set_indicator('Shift closed', 'orange')
        }


        this.page.add_menu_item(__("Open Form View"), this.open_form_view.bind(this), false, 'Ctrl+F');

        // this.page.add_menu_item(__("Toggle Recent Orders"), this.toggle_recent_order.bind(this), false, 'Ctrl+O');
        //
        // this.page.add_menu_item(__("Save as Draft"), this.save_draft_invoice.bind(this), false, 'Ctrl+S');
        //
        // this.page.add_menu_item(__('Close the POS'), this.close_pos.bind(this), false, 'Shift+Ctrl+C');
    }


    open_form_view() {
        frappe.model.sync(this.frm.doc);
        frappe.set_route("Form", this.frm.doc.doctype, this.frm.doc.name);
    }


    bind_events() {
        const me = this;
        this.$newshiftbtn_component.click(function (event) {
            frappe.utils.play_sound("click")
            me.create_opening_voucher();
        })
        this.$change_location_btn_component.click(function (event) {
            frappe.utils.play_sound("click")
            frappe.confirm('Are you sure you want to change the location?',
                () => {
                    // action to perform if Yes is selected
                    frappe.utils.play_sound("delete")
                    me.events.change_location();
                }, () => {
                    // action to perform if No is selected
                })

        })
        this.$exisingshift_table.on('click', 'button.open_shift', function (event) {
            const shift = $(this).attr('data-shift');
            frappe.utils.play_sound("click")
            frappe.confirm('Open shift ' + shift,
                () => {
                    // action to perform if Yes is selected
                    frappe.utils.play_sound("submit")
                    me.events.open_shift(shift);
                }, () => {
                    // action to perform if No is selected
                })

        })


        // this.$customer_section.on('click', '.customer-display', function (e) {
        //     if ($(e.target).closest('.reset-customer-btn').length) return;
        //
        //     const show = me.$cart_container.is(':visible');
        //     me.toggle_customer_info(show);
        // });


    }

    create_opening_voucher() {
        const me = this;
        const table_fields = [
            {
                fieldname: "mode_of_payment", fieldtype: "Link",
                in_list_view: 1, label: "Mode of Payment",
                options: "Mode of Payment", reqd: 1
            },
            {
                fieldname: "opening_amount", fieldtype: "Currency",
                in_list_view: 1, label: "Opening Amount",
                options: "company:company_currency",
                change: function () {
                    dialog.fields_dict.balance_details.df.data.some(d => {
                        if (d.idx == this.doc.idx) {
                            d.opening_amount = this.value;
                            dialog.fields_dict.balance_details.grid.refresh();
                            return true;
                        }
                    });
                }
            }
        ];
        const fetch_pos_payment_methods = () => {
            const pos_profile = dialog.fields_dict.pos_profile.get_value();
            if (!pos_profile) return;
            frappe.db.get_doc("POS Profile", pos_profile).then(({payments}) => {
                dialog.fields_dict.balance_details.df.data = [];
                payments.forEach(pay => {
                    const {mode_of_payment} = pay;
                    dialog.fields_dict.balance_details.df.data.push({mode_of_payment, opening_amount: '0'});
                });
                dialog.fields_dict.balance_details.grid.refresh();
            });
        }
        const dialog = new frappe.ui.Dialog({
            title: __('Create POS Opening Entry'),
            static: false,
            fields: [
                {
                    fieldtype: 'Link', label: __('Company'), default: frappe.defaults.get_default('company'),
                    options: 'Company', fieldname: 'company', reqd: 1
                },
                {
                    fieldtype: 'Link', label: __('POS Profile'),
                    options: 'POS Profile', fieldname: 'pos_profile', reqd: 1,
                    get_query: () => pos_profile_query(),
                    onchange: () => fetch_pos_payment_methods()
                },
                {
                    fieldname: "balance_details",
                    fieldtype: "Table",
                    label: "Opening Balance Details",
                    cannot_add_rows: false,
                    in_place_edit: true,
                    reqd: 1,
                    data: [],
                    fields: table_fields
                }
            ],
            primary_action: async function ({company, pos_profile, balance_details}) {
                if (!balance_details.length) {
                    frappe.show_alert({
                        message: __("Please add Mode of payments and opening balance details."),
                        indicator: 'red'
                    })
                    return frappe.utils.play_sound("error");
                }

                // filter balance details for empty rows
                balance_details = balance_details.filter(d => d.mode_of_payment);

                //check that there is no open pos profile
                frappe.call({
                    method: "advanced_restaurant.advanced_restaurant.page.restaurant_sale.sale.unique_opening_shift",
                    args: {pos_profile},
                    freeze: true,
                    callback: async (r) => {
                        const method = "erpnext.selling.page.point_of_sale.point_of_sale.create_opening_voucher";
                        const res = await frappe.call({
                            method,
                            args: {pos_profile, company, balance_details},
                            freeze: true,
                            callback: (r) => {
                                frappe.utils.play_sound("submit")
                                me.fetch_available_profiles();
                            },
                            error: (err) => {

                                frappe.utils.play_sound("error")
                                frappe.throw(err)
                            }
                        });
                    },
                    error: (err) => {
                        frappe.utils.play_sound("error")
                        frappe.throw(err)
                    }

                })


                dialog.hide();
            },
            primary_action_label: __('Submit')
        });
        dialog.show();
        const pos_profile_query = () => {
            return {
                query: 'erpnext.accounts.doctype.pos_profile.pos_profile.pos_profile_query',
                filters: {company: dialog.fields_dict.company.get_value()}
            }
        };
    }


}
