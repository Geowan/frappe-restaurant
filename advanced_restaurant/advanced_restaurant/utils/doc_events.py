import frappe;

def closed_pos(*args, **kwargs):
    frappe.publish_realtime('close_pos')
