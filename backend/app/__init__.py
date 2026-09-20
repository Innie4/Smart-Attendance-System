from flask import Flask, jsonify

from app.config import Config
from app.extensions import db, jwt, bcrypt, cors
from app.routes import register_blueprints
from app.cli import register_cli


def create_app(config_object=Config):
    app = Flask(__name__)
    app.config.from_object(config_object)

    db.init_app(app)
    jwt.init_app(app)
    bcrypt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})

    register_blueprints(app)
    register_cli(app)
    register_error_handlers(app)

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok"})

    return app


def register_error_handlers(app):
    @jwt.unauthorized_loader
    def missing_token(reason):
        return jsonify({"error": "Authorization token required"}), 401

    @jwt.invalid_token_loader
    def invalid_token(reason):
        return jsonify({"error": "Invalid or expired token"}), 422

    @jwt.expired_token_loader
    def expired_token(header, payload):
        return jsonify({"error": "Token has expired"}), 401

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Resource not found"}), 404

    @app.errorhandler(500)
    def server_error(error):
        return jsonify({"error": "Internal server error"}), 500
