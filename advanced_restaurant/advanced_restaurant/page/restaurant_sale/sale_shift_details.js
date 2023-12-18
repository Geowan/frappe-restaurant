restaurant.Sale.PosShiftOpeningDetails = class {

    //here we get the open shifts
    //and return it when clicked back to the
    constructor({wrapper, page, location, opening_entry, events}) {
        this.wrapper = wrapper;
        this.page = page;
        this.events = events;
        this.selected_location = location;
        this.opening_entry = opening_entry;

        $(frappe.render_template('sale_loading')).appendTo(this.wrapper);
        //first check for open pos profile
        //and also check to ensure the redirrect was not by mistake

        this.init_component();
        this.fetch_available_waiters();
    }

    fetch_available_waiters() {
        //$(this.$exisingshift_waiters).empty();
        frappe.call({
                method: "advanced_restaurant.advanced_restaurant.page.restaurant_sale.sale.available_waiters",
                args: {
                    opening_entry: this.opening_entry.name
                },
                freeze: true,
                callback: (res) => {
                    this.available_waiters = res.message

                    $(this.$waiter_list_table).empty();
                    res.message.forEach((item, index) => {
                        $(this.$waiter_list_table).append(`<tr>
                         <td>${index += 1} </td>
                         <td>${item.user} </td>
                         <td>${item.shift_start} </td>
                         <td>${item.status} </td>
                         
                         </tr>`)
                    })


                    this.prepare_menu();
                },
                error: (err) => {
                    // on error
                    frappe.throw(__('Unable to load waiters, refresh the page and try again'))

                }
            }
        )
    }

    init_component() {
        this.prepare_dom();
        this.init_child_components();
        this.prepare_menu();
        this.bind_events();
        this.prepare_init_data();
    }

    prepare_dom() {
        $(this.wrapper).empty();
        $(frappe.render_template('sale_shift_details')).appendTo(this.wrapper);
        this.$component = this.wrapper.find('#sale_shift_details');
    }

    init_child_components() {
        this.$shift_detail_table = this.$component.find("table#pos_shift_details tbody")
        this.$waiter_list_table = this.$component.find("table#waiter_List tbody")
        this.$open_waiter_pos_btn = this.$component.find("button#open_waiter_pos_btn")
    }


    prepare_menu() {
        this.page.clear_menu();
        this.page.clear_indicator()
        if (this.available_waiters) {
            this.page.set_indicator(this.available_waiters.length + ' waiters', 'green')
        }

        this.page.add_menu_item(__("Close POS Shift"), this.init_close.bind(this), false);
    }


    init_close() {
        frappe.utils.play_sound("click")
        frappe.confirm('This will also close any open waiter pos shift. Would you like to continue?',
            () => {
                // action to perform if Yes is selected
                frappe.utils.play_sound("submit")

                frappe.call({
                    method: "advanced_restaurant.advanced_restaurant.page.restaurant_sale.sale.close_all_waiter_shift",
                    args: {
                        pos_opening_entry: this.opening_entry.name
                    },
                    freeze: true,
                    callback: (res) => {
                        this.events.close_pos()

                    }
                })

            }, () => {
                // action to perform if No is selected
            })
    }


    bind_events() {
        const me = this;
        this.$open_waiter_pos_btn.click(function (event) {
            frappe.utils.play_sound("click")
            frappe.confirm('Are you sure you want to open waiter pos?',
                () => {
                    // action to perform if Yes is selected
                    frappe.utils.play_sound("submit")

                    frappe.call({
                        method: "advanced_restaurant.advanced_restaurant.page.restaurant_sale.sale.open_waiter_shift",
                        args: {
                            pos_opening_entry: me.opening_entry.name
                        },
                        freeze: true,
                        btn: $("btn.btn-primary"),
                        callback: (res) => {
                            me.events.open_waiter_shift(res.message)
                        }
                    })

                }, () => {
                    // action to perform if No is selected
                })
        })
    }

    prepare_init_data() {
        $(this.$shift_detail_table).empty()
        $(this.$shift_detail_table).append(`<tr><td> <strong class="mr-2">Name:</strong> ${this.opening_entry.name}</td></tr>`)
        $(this.$shift_detail_table).append(`<tr><td><strong class="mr-2">Start date:</strong> ${this.opening_entry.period_start_date}</td></tr>`)
        $(this.$shift_detail_table).append(`<tr><td><strong class="mr-2">Pos profile:</strong> ${this.opening_entry.pos_profile}</td></tr>`)
        $(this.$shift_detail_table).append(`<tr><td><strong class="mr-2">Status:</strong> ${this.opening_entry.status}</td></tr>`)

    }

}
