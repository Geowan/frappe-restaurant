import frappe
from advanced_restaurant.api.error import throw_api_error


@frappe.whitelist(allow_guest=True)
def email_auth(**kwargs):
    if not kwargs.get("email"):
        return throw_api_error("Email is required")
    email = kwargs.get("email")

    settings = frappe.get_doc("Advance Restaurant Settings")
    if not settings:
        return throw_api_error("Check for connected app on advanced settings section")
    if not settings.authorization_app:
        return throw_api_error("Check for connected app on advanced settings section")
    authorizedApp = frappe.get_doc("OAuth Client", settings.authorization_app)

    user = frappe.get_doc("User", kwargs.get("email"))
    if not user:
        return throw_api_error("Email not found")

    # delete previous tokens
    user = frappe.db.get_value("User", {"email": email}, "name")
    otoken = frappe.new_doc("OAuth Bearer Token")
    otoken.access_token = frappe.generate_hash(length=30)
    otoken.refresh_token = frappe.generate_hash(length=30)
    otoken.user = user
    otoken.scopes = "all"
    otoken.client = authorizedApp.client_id
    otoken.redirect_uri = frappe.db.get_value("OAuth Client", authorizedApp.client_id, "default_redirect_uri")
    otoken.expires_in = 30 * 186400
    otoken.save(ignore_permissions=True)
    frappe.db.commit()

    return {"token": otoken}


@frappe.whitelist(allow_guest=True)
def app_data():
    products = frappe.get_all("Item", fields=["*"], filters=[])
    tables = frappe.get_all("Table", fields=["*"])

    return {
        "products": products,
        "tables": tables
    }


@frappe.whitelist(allow_guest=True)
def waiter_shifts(**kwargs):
    shifts = frappe.get_all("Waiter Shift", fields=["*"],
                            filters={"status": "Open", "warehouse": kwargs.get("warehouse")})
    return {
        "shifts": shifts
    }


@frappe.whitelist(allow_guest=True)
def add_waiter_shift(**kwargs):
    user = frappe.get_doc("User", kwargs.get("email"))
    if not user:
        return throw_api_error("User not found")
    # check if user has an open entry

    exisiting = frappe.get_all("Waiter Shift",
                               filters={"user": user.name, "warehouse": kwargs.get("warehouse"), "status": "Open"})
    if exisiting:
        return True

    shift = frappe.new_doc("Waiter Shift")
    shift.user = user.name
    shift.shift_start = frappe.utils.now()
    shift.status = "Open"
    shift.warehouse = kwargs.get("warehouse")
    shift.save()

    return True


@frappe.whitelist(allow_guest=True)
def create_pos_opening_entry(**kwargs):
    # check if already exists
    existing = frappe.get_all("POS Opening Entry", fields=["*"],
                              filters={"user": kwargs.get("user"), "pos_profile": kwargs.get("pos_profile"),
                                       "status": "Open"})
    if existing:
        return existing[0]
    doc = frappe.new_doc("POS Opening Entry")
    doc.user = kwargs.get("user")
    doc.company = kwargs.get("company")
    doc.status = "Open"
    doc.pos_profile = kwargs.get("pos_profile")
    doc.period_start_date = kwargs.get("period_start_date")
    doc.set("balance_details", kwargs.get("balance_details"))
    doc.submit()
    return doc


@frappe.whitelist(allow_guest=True)
def close_shift(**kwargs):
    exisiting = frappe.get_all("Waiter Shift",
                               filters={"user": kwargs.get("waiter"), "warehouse": kwargs.get("warehouse")})
    for item in exisiting:
        shift = frappe.get_doc("Waiter Shift", item.name)
        shift.status = "Closed"
        shift.shift_end = frappe.utils.now()
        shift.save()
    return True


@frappe.whitelist(allow_guest=True)
def submit_order(**kwargs):
    cart = kwargs.get("cart")
    centers = kwargs.get("center")
    for center in centers:
        centerDoc = frappe.new_doc("Production Center Orders")
        centerDoc.production_center = center["name"]
        centerDoc.table = cart["table"]
        centerDoc.warehouse = kwargs.get("warehouse")
        for child in center["items"]:
            childItem = frappe.new_doc("Production Center Order Items")
            childItem.item = child["item_code"]
            childItem.quantity = child["qty"]
            centerDoc.append("items", childItem)
        centerDoc.save(ignore_permissions=True)

    # add cart stuff
    cartDoc = frappe.new_doc("Advanced Table Order")
    cartDoc.table = cart["table"]
    cartDoc.customer = cart["customer"]
    cartDoc.order_type = cart["order_type"]
    cartDoc.status ="submitted"
    cartDoc.waiter =cart["waiter"]
    for item in cart["items"]:
        childDoc = frappe.new_doc("Advanced Table Order Items")
        childDoc.item = item["item_code"]
        childDoc.quantity = item["qty"]
        childDoc.price = item["rate"]
        cartDoc.append("items", childDoc)
    cartDoc.save(ignore_permissions=True)

    return True
