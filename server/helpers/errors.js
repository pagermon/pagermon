class NotAuthorizedError extends Error {
        constructor(message, options) {
                super(message || 'You are not authorized to access this resource', options);
                this.name = this.constructor.name;
                this.status = 403;
                Error.captureStackTrace(this, this.constructor);
        }
}

class NotAuthenticatedError extends Error {
        constructor(message, options) {
                super(message || 'Not authorized', options);
                this.name = this.constructor.name;
                this.status = 401;
                Error.captureStackTrace(this, this.constructor);
        }
}

class InvalidRequestError extends Error {
        constructor(message, options) {
                super(message || 'Invalid request', options);
                this.name = this.constructor.name;
                this.status = 400;
                Error.captureStackTrace(this, this.constructor);
        }
}
class ResourceNotFoundError extends Error {
        constructor(message, options) {
                super(message || 'Resource not found', options);
                this.name = this.constructor.name;
                this.status = 404;
                Error.captureStackTrace(this, this.constructor);
        }
}

class RequiredFieldMissingError extends InvalidRequestError {
        constructor(message, options) {
                super(message ? `Required field ${message} is missing` : 'Required field missing', options);
                this.name = this.constructor.name;
                Error.captureStackTrace(this, this.constructor);
        }
}

module.exports = {
        NotAuthorizedError,
        NotAuthenticatedError,
        InvalidRequestError,
        ResourceNotFoundError,
        RequiredFieldMissingError,
};
