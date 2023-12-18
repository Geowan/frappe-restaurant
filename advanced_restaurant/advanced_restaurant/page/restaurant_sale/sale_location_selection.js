restaurant.Sale.LocationSelection = class {

    //here we get the open shifts
    //and return it when clicked back to the
    constructor({wrapper, page, events}) {
        this.wrapper = wrapper;
        this.page = page;
        this.events = events;


        this.init_component();
        this.fetch_available_locations();
    }

    fetch_available_locations() {
        const me = this;
        frappe.call({
                method: "advanced_restaurant.advanced_restaurant.page.restaurant_sale.sale.restaurant_settings",
                freeze: true,
                callback: (res) => {
                    me.available_locations = res.message.locations
                },
                error: (err) => {
                    // on error
                    $(me.wrapper).empty();
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
        $(frappe.render_template('sale_location_selection')).appendTo(this.wrapper);
        this.$component = this.wrapper.find('#location_selection');
    }

    init_child_components() {
        this.init_new_shift_button();
    }

    init_new_shift_button() {
        this.$newshiftbtn_component = this.$component.find('button#new_shift');
    }


    prepare_menu() {
        this.page.clear_menu();
        this.page.clear_indicator()
        this.page.set_indicator('Location not selected', 'orange')

    }


    bind_events() {
        const me = this;
        this.$newshiftbtn_component.click(function (event) {
            frappe.utils.play_sound("click")
            console.log("its ", me.available_locations)
            me.open_location_selection_dialog();
        })
    }

    open_location_selection_dialog() {
        const me = this;

        const dialog = new frappe.ui.Dialog({
            title: __('Select location'),
            static: false,
            fields: [
                {
                    fieldtype: 'Link', label: __('Select Location'),
                    options: 'Warehouse', fieldname: 'location', reqd: 1,
                },

            ],
            primary_action: async function ({location}) {
                frappe.utils.play_sound("submit")
                me.events.location_selected(location)
                dialog.hide();
            },
            primary_action_label: __('Set')
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
