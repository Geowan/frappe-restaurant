import frappe
from erpnext.accounts.doctype.pos_invoice.pos_invoice import get_stock_availability
from erpnext.selling.page.point_of_sale.point_of_sale import search_by_term, get_item_group_condition, get_conditions
from frappe import cint
from frappe.utils.nestedset import get_root_of


@frappe.whitelist()
def restaurant_settings():
    settings = frappe.get_doc("Advance Restaurant Settings")
    return settings


@frappe.whitelist()
def location_query():
    return []


@frappe.whitelist()
def available_open_shifts(**kwargs):
    if not kwargs.get('location'):
        return []
    pos_profiles = frappe.get_all("POS Profile", fields=["*"], filters={"Warehouse": kwargs.get('location')})
    if not pos_profiles:
        return []
    warehouses = [profile.get("name") for profile in pos_profiles]

    open_shifts = frappe.get_all("POS Opening Entry",
                                 fields=["name", 'company', 'pos_profile', 'user', 'period_start_date'],
                                 filters={"status": "Open", "docstatus": 1, "pos_profile": ['in', warehouses]})
    return open_shifts


@frappe.whitelist()
def unique_opening_shift(**kwargs):
    shift = frappe.get_all("POS Opening Entry", filters={"pos_profile": kwargs.get('pos_profile'), "status": "Open"})
    if shift:
        frappe.throw("{} already has an open entry on this location".format(kwargs.get('pos_profile')))
    return {"valid": True}


@frappe.whitelist()
def opening_entry_details(**kwargs):
    if not kwargs.get('name'):
        return {}
    details = frappe.get_all("POS Opening Entry", fields=["*"],
                             filters={"name": kwargs.get("name"), "status": "Open"})
    if not details:
        return {}
    return details[0]


@frappe.whitelist()
def available_waiters(**kwargs):
    waiters = frappe.get_all("Waiter Shift", fields=["*"],
                             filters={"pos_opening_entry": kwargs.get("opening_entry"), "status": "Open"})
    return waiters


@frappe.whitelist()
def open_waiter_shift(**kwargs):
    existing = frappe.get_all("Waiter Shift", fields=["*"], filters={"user": frappe.session.user, "status": "Open",
                                                                     "pos_opening_entry": kwargs.get(
                                                                         "pos_opening_entry")})
    if existing:
        return existing[0]
    else:
        doc = frappe.new_doc("Waiter Shift")
        doc.shift_start = frappe.utils.now()
        doc.pos_opening_entry = kwargs.get("pos_opening_entry")
        doc.user = frappe.session.user
        doc.status = "Open"
        doc.save()
        return doc


@frappe.whitelist()
def close_all_waiter_shift(**kwargs):
    shifts = frappe.get_all("Waiter Shift", fields=["*"],
                            filters={"status": "Open", "pos_opening_entry": kwargs.get("pos_opening_entry")})
    for shift in shifts:
        doc = frappe.get_doc("Waiter Shift", shift.name)
        doc.status = "Closed"
        doc.shift_end = frappe.utils.now()
        doc.save()


@frappe.whitelist()
def waiter_shift_details(**kwargs):
    waiters = frappe.get_all("Waiter Shift", fields=["*"], filters={"name": kwargs.get("name")})
    if not waiters:
        return {}
    return waiters[0]


@frappe.whitelist()
def available_tables(**kwargs):
    if not kwargs.get("location"):
        return []
    tables = frappe.get_all("Table", fields=["*"], filters={"warehouse": kwargs.get("location")})
    return tables


@frappe.whitelist()
def close_my_shifts():
    shifts = frappe.get_all("Waiter Shift", fields=["*"], filters={"user": frappe.session.user})
    for shift in shifts:
        doc = frappe.get_doc("Waiter Shift", shift.name)
        doc.status = "Closed"
        doc.shift_end = frappe.utils.now()
        doc.save()


@frappe.whitelist()
def check_opening_entry(**kwargs):
    open_vouchers = frappe.db.get_all(
        "POS Opening Entry",
        filters={"name": kwargs.get("name"), "pos_closing_entry": ["in", ["", None]], "docstatus": 1},
        fields=["name", "company", "pos_profile", "period_start_date"],
        order_by="period_start_date desc",
    )

    return open_vouchers




@frappe.whitelist()
def get_items(start, page_length, price_list, item_group, pos_profile, search_term=""):
	warehouse, hide_unavailable_items = frappe.db.get_value(
		"POS Profile", pos_profile, ["warehouse", "hide_unavailable_items"]
	)

	result = []

	if search_term:
		result = search_by_term(search_term, warehouse, price_list) or []
		if result:
			return result

	if not frappe.db.exists("Item Group", item_group):
		item_group = get_root_of("Item Group")

	condition = get_conditions(search_term)
	condition += get_item_group_condition(pos_profile)

	lft, rgt = frappe.db.get_value("Item Group", item_group, ["lft", "rgt"])

	bin_join_selection, bin_join_condition = "", ""
	if hide_unavailable_items:
		bin_join_selection = ", `tabBin` bin"
		bin_join_condition = (
			"AND bin.warehouse = %(warehouse)s AND bin.item_code = item.name AND bin.actual_qty > 0"
		)

	items_data = frappe.db.sql(
		"""
		SELECT
			item.name AS item_code,
			item.item_name,
			item.description,
			item.stock_uom,
			item.image AS item_image,
			item.is_stock_item
		FROM
			`tabItem` item {bin_join_selection}
		WHERE
			item.disabled = 0
			AND item.has_variants = 0
			AND item.is_sales_item = 1
			AND item.is_fixed_asset = 0
			AND item.item_group in (SELECT name FROM `tabItem Group` WHERE lft >= {lft} AND rgt <= {rgt})
			AND {condition}
			{bin_join_condition}
		ORDER BY
			item.name asc
		LIMIT
			{page_length} offset {start}""".format(
			start=cint(start),
			page_length=cint(page_length),
			lft=cint(lft),
			rgt=cint(rgt),
			condition=condition,
			bin_join_selection=bin_join_selection,
			bin_join_condition=bin_join_condition,
		),
		{"warehouse": warehouse},
		as_dict=1,
	)

	# return (empty) list if there are no results
	if not items_data:
		return result

	for item in items_data:
		uoms = frappe.get_doc("Item", item.item_code).get("uoms", [])

		item.actual_qty, _ = get_stock_availability(item.item_code, warehouse)
		item.uom = item.stock_uom

		item_price = frappe.get_all(
			"Item Price",
			fields=["price_list_rate", "currency", "uom", "batch_no"],
			filters={
				"price_list": price_list,
				"item_code": item.item_code,
				"selling": True,
			},
		)

		if not item_price:
			result.append(item)

		for price in item_price:
			uom = next(filter(lambda x: x.uom == price.uom, uoms), {})

			if price.uom != item.stock_uom and uom and uom.conversion_factor:
				item.actual_qty = item.actual_qty // uom.conversion_factor

			result.append(
				{
					**item,
					"price_list_rate": price.get("price_list_rate"),
					"currency": price.get("currency"),
					"uom": price.uom or item.uom,
					"batch_no": price.batch_no,
				}
			)
	return {"items": result}