restaurant.Sale.TableSelection = class {

    //here we get the open shifts
    //and return it when clicked back to the
    constructor({wrapper, page, events, location, waiter_shift}) {
        this.wrapper = wrapper;
        this.page = page;
        this.events = events;
        this.location = location;
        this.waiter_shift = waiter_shift;

        this.init_component();
        this.fetch_available_tables();
    }

    fetch_available_tables() {
        frappe.call({
                method: "advanced_restaurant.advanced_restaurant.page.restaurant_sale.sale.available_tables",
                args: {
                    location: this.location
                },
                freeze: true,
                callback: (res) => {
                    this.available_tables = res.message
                    this.setup_tables_handler();
                },
                error: (err) => {
                    // on error
                    $(this.wrapper).empty();
                    frappe.throw(__('Unable to load available tables, refresh the page and try again'))

                }
            }
        )
    }

    init_component() {
        this.prepare_dom();
        this.init_child_components();
        this.prepare_menu();
        this.bind_events();
        this.setup_initial_views();
    }

    prepare_dom() {
        $(this.wrapper).empty();
        $(frappe.render_template('sale_table_selection')).appendTo(this.wrapper);
        this.$component = this.wrapper.find('#table_selection');
    }

    init_child_components() {
        this.$tableselection_component = this.$component.find('div#table_selection_tables');
        this.$waiter_name = this.$component.find('span#waiter_name');
        this.$shift_start_time = this.$component.find('span#shift_start');
        this.$close_shift_btn = this.$component.find('button#close_shift');
        $(this.$tableselection_component).empty()
        this.init_my_orders_view();
    }


    init_my_orders_view() {
        //  this.$myorders_component = this.$component.find('div#existing_shift')
        ///this.$exisingshift_table = this.$exisingshift_component.find('tbody');
        // $(this.$exisingshift_table).empty()

        // if (this.open_shifts && this.open_shifts.length > 0) {
        //     $(this.$exisingshift_table).empty()
        //     const rows = this.open_shifts.map((el, index) => ({
        //         html: `<tr>
        //                  <td>${index + 1}</td>
        //                  <td>${el.name}</td>
        //                  <td>${el.company}</td>
        //                  <td>${el.pos_profile}</td>
        //                  <td>${frappe.format(el.period_start_date, {fieldtype: 'Datetime'})}</td>
        //                  <td><button class="btn btn-sm btn-primary open_shift" data-shift='${el.name}'>Open</button></td>
        //               </tr> `
        //     }))
        //     rows.forEach(row => $(this.$exisingshift_table).append(row.html))
        //
        //
        // }

    }

    prepare_menu() {
        this.page.clear_menu();
        this.page.clear_indicator()
        this.page.set_indicator('Shift open', 'green')

    }


    bind_events() {
        const me = this;
        this.$tableselection_component.on('click', 'button.select_table', function (event) {
            const table = $(this).attr('data-id');
            frappe.utils.play_sound("click")
            frappe.confirm('Select table ' + table,
                () => {
                    // action to perform if Yes is selected
                    frappe.utils.play_sound("submit")
                    me.events.open_table(table);
                }, () => {
                    // action to perform if No is selected
                })

        })
        this.$close_shift_btn.click(function (event) {
            frappe.utils.play_sound("click")
            frappe.confirm('Are you sure you want to close this shift? ',
                () => {
                    // action to perform if Yes is selected
                    frappe.call({
                        method: "advanced_restaurant.advanced_restaurant.page.restaurant_sale.sale.close_my_shifts",
                        freeze: true,
                        callback: (res) => {
                              me.events.close_shift();
                        },
                    })
                    frappe.utils.play_sound("submit")
                }, () => {
                    // action to perform if No is selected
                })
        })

    }

    setup_tables_handler() {
        $(this.$tableselection_component).empty()
        $(this.$tableselection_component).append('<div class="row">')
        this.available_tables.forEach(table => {
            $(this.$tableselection_component).append(`
                <div class="col-md-2">
                    <div class="alert alert-success bg-success ">
                        <h3 class="text-center text-white">Table ${table.name}</h3>
                        <p class="text-white text-center">Seats ${table.seats}</p>
                        <button class="select_table w-100 btn btn-danger" data-id="${table.name}">Select table</button>
                    </div>
                </div>
             
             `)


        })
        $(this.$tableselection_component).append('</div>')
    }

    setup_initial_views() {
        $(this.$waiter_name).text(this.waiter_shift.user);
        $(this.$shift_start_time).text(this.waiter_shift.shift_start);
    }
}
