from app.routes.auth import auth_bp
from app.routes.admin import admin_bp
from app.routes.enrolment import enrolment_bp
from app.routes.attendance import attendance_bp
from app.routes.reports import reports_bp
from app.routes.sync import sync_bp


def register_blueprints(app):
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(enrolment_bp)
    app.register_blueprint(attendance_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(sync_bp)
