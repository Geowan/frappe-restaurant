# Copyright (c) 2023, Soradius solutions and contributors
# For license information, please see license.txt

# import frappe
import json

import frappe
import pyqrcode
from frappe.model.document import Document
from frappe.utils import get_url


class Table(Document):
    def on_update(self):
        print("\n\n\n")
        print("we have an insertion or update")
        print("\n\n\n")
        frappe.publish_realtime('table_change')


@frappe.whitelist()
def generate_qrcode(table):
    doc = frappe.get_doc("Table", table)
    if not doc:
        frappe.throw("Table not found")
    site_url = get_url()
    url = pyqrcode.create('http://uca.edu')
    return url.text()

