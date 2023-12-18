restaurant.Sale.Controller = class {
    opening_shift_token = "opening_shift_token"
    opening_waiter_shift_token = "opening_waiter_shift_token"
    selected_location_token = "selected_location_token"
    selected_table_token = "selected_table_token"

    constructor(wrapper) {
        this.wrapper = $(wrapper).find('.layout-main-section');
        this.page = wrapper.page;

        this.make_app();
        this.check_opening_entry();
    }

    check_opening_entry() {
        $(this.$components_wrapper).empty();
        const selected_loc = localStorage.getItem(this.selected_location_token);
        if (selected_loc) {
            this.selected_location = selected_loc;
            //check if there is a pos open shift and its not closed
            const open_shift = localStorage.getItem(this.opening_shift_token);
            if (open_shift) {

                //check if a table exists
                this.verify_open_shift_handler(open_shift)

            } else {
                this.init_pos_shift_opening();
            }

        } else {
            this.init_location_selection()
        }

    }

    make_app() {
        this.prepare_dom();
    }


    prepare_dom() {
        this.wrapper.append(
            `<div class="sale-app py-3 px-3" style="height:85vh;border-radius:10px"></div>`
        );
        this.$components_wrapper = this.wrapper.find('.sale-app');
    }


    //INIT ITEM VIEWS
    init_item_loading() {
        this.loading = new restaurant.Sale.Loading({
            wrapper: this.$components_wrapper,
        })
    }

    init_location_selection() {
        this.location_selection = new restaurant.Sale.LocationSelection({
            wrapper: this.$components_wrapper,
            page: this.page,
            events: {
                location_selected: name => {
                    localStorage.setItem(this.selected_location_token, name)
                    this.check_opening_entry();
                },
            }
        })
    }


    init_pos_shift_opening() {
        this.loading = new restaurant.Sale.PosShiftOpening({
            wrapper: this.$components_wrapper,
            page: this.page,
            location: this.selected_location,
            events: {
                open_shift: name => {
                    this.verify_open_shift_handler(name)
                },
                change_location: () => {
                    localStorage.removeItem(this.selected_location_token);
                    this.selected_location = null;
                    this.check_opening_entry();

                }
            }
        })
    }

    init_pos_shift_details() {
        new restaurant.Sale.PosShiftOpeningDetails({
            wrapper: this.$components_wrapper,
            page: this.page,
            opening_entry: this.opening_shift_details,
            location: this.selected_location,
            events: {
                open_waiter_shift: shift => {
                    this.open_waiter_shift = shift;
                    localStorage.setItem(this.opening_waiter_shift_token, shift.name)
                    this.init_table_selection()
                },
                close_pos: () => {
                    // localStorage.removeItem(this.opening_shift_token)
                    // this.init_pos_shift_opening()
                    this.close_pos_handler()
                }
            }
        })
    }

    init_table_selection() {
        new restaurant.Sale.TableSelection({
            wrapper: this.$components_wrapper,
            page: this.page,

            opening_entry: this.opening_shift_details,
            waiter_shift: this.open_waiter_shift,
            location: this.selected_location,
            events: {
                close_shift: () => {
                    localStorage.removeItem(this.opening_waiter_shift_token)
                    this.init_pos_shift_details();
                },
                open_table: (table) => {
                    localStorage.setItem(this.selected_table_token, table)
                    this.selected_pos_table = table;
                    this.init_pos();
                    window.location.reload();
                },
            }
        })
    }


    verify_open_shift_handler(shift_name) {
        frappe.call({
            method: "advanced_restaurant.advanced_restaurant.page.restaurant_sale.sale.opening_entry_details",
            args: {
                name: shift_name
            },
            freeze: true,
            callback: (res) => {
                if (Object.keys(res.message).length > 0) {
                    localStorage.setItem(this.opening_shift_token, shift_name)
                    this.opening_shift_details = res.message;

                    const available_waiter_shift = localStorage.getItem(this.opening_waiter_shift_token);
                    if (available_waiter_shift) {
                        this.verify_open_waiter_shift_handler(available_waiter_shift);
                    } else {
                        this.init_pos_shift_details();
                    }


                } else {
                    localStorage.removeItem(this.opening_shift_token);
                    this.init_pos_shift_opening()
                }

            },
            error: (e) => {
                localStorage.removeItem(this.opening_shift_token)
            }
        })
    }

    verify_open_waiter_shift_handler(shift_name) {

        frappe.call({
            method: "advanced_restaurant.advanced_restaurant.page.restaurant_sale.sale.waiter_shift_details",
            args: {
                name: shift_name
            },
            freeze: true,
            callback: (res) => {
                console.log("we have a callback")
                if (Object.keys(res.message).length > 0) {
                    localStorage.setItem(this.opening_waiter_shift_token, shift_name)
                    this.open_waiter_shift = res.message;
                    const tableSelected = localStorage.getItem(this.selected_table_token);
                    if (tableSelected) {
                        this.selected_pos_table = tableSelected;
                        this.init_pos();
                    } else {
                        this.init_table_selection();

                    }
                } else {
                    localStorage.removeItem(this.opening_waiter_shift_token);
                    this.check_opening_entry()
                }

            },
            error: (e) => {
                localStorage.removeItem(this.opening_waiter_shift_token)
                this.check_opening_entry();
            }
        })

    }

    close_pos_handler() {
        this.init_pos_shift_opening()
        let voucher = frappe.model.get_new_doc('POS Closing Entry');
        voucher.pos_profile = this.opening_shift_details.pos_profile;
        voucher.user = frappe.session.user;
        voucher.company = this.opening_shift_details.company;
        voucher.pos_opening_entry = this.opening_shift_details.name;
        voucher.period_end_date = frappe.datetime.now_datetime();
        voucher.posting_date = frappe.datetime.now_date();
        voucher.posting_time = frappe.datetime.now_time();
        frappe.set_route('Form', 'POS Closing Entry', voucher.name);
    }


    /**
     * Actual pos transactions here
     */

    init_pos() {
        new restaurant.Sale.PosSale({
            wrapper: this.$components_wrapper,
            page: this.page,
            opening_entry: this.opening_shift_details,
            table: this.selected_pos_table,
            sale_events: {
                change_table: () => {
                    localStorage.removeItem(this.selected_table_token)
                    this.init_table_selection();
                }
            }
        })
    }
};
