from frappe import exceptions
from werkzeug import Response


def throw_api_error(message):
    response = Response('{"message": "' + message + '"}', content_type='application/json', status=500)
    return response
