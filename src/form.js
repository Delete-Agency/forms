import $ from 'jquery';
import Parsley from 'parsleyjs';
import axios from 'axios';
import constants from './constants';

const ENCTYPE_URLENCODED = 'application/x-www-form-urlencoded';
const ENCTYPE_MULTIPART = 'multipart/form-data';

export const PARSLEY_SERVER_CONSTRAINT_NAME = 'server';
const PARSLEY_SERVER_ERROR_KEY = 'serverErrorValue';

export default class Form {
    constructor(element, options = {}) {
        this.element = element;

        if (this.element.nodeName !== 'FORM') {
            throw new Error('element must be a form');
        }

        this.action = this.element.action;
        this.enctype = this.element.enctype || ENCTYPE_URLENCODED;
        this._isSubmiting = false;
        this._parsleyForm = null;

        this._applyOptions(options);

        this._onSubmit = this._onSubmit.bind(this);
        this._onFieldError = this._onFieldError.bind(this);
        this._onFormError = this._onFormError.bind(this);

        // todo server errors
        if (this._isAsync()) {
            this.getParsleyForm().on('form:submit', this._onSubmit);
        }

        this.getParsleyForm().on('field:error', this._onFieldError);
        this.getParsleyForm().on('form:error', this._onFormError);
    }

    _getDefaultOptions() {
        return {
            async: true,
            errorsSummaryElement: null,
            submitElement: null,
            axiosInstance: axios,
            /**
             * @see sendRequest method
             */
            sendRequest: null,
            /**
             * @see extractValidationErrors method
             */
            extractValidationErrors: null,
            /**
             * @see errorsSummaryTemplate method
             */
            errorsSummaryTemplate: null,
            /**
             * @see beforeSubmitPromise method
             */
            beforeSubmitPromise: null,
            /**
             * @see onBeforeSubmit method
             */
            onBeforeSubmit: null,
            /**
             * @see onAfterSubmit method
             */
            onAfterSubmit: null,
            /**
             * @see onSuccessfulSubmit method
             */
            onSuccessfulSubmit: null,
            /**
             * @see onFailedSubmit method
             */
            onFailedSubmit: null,
            /**
             * @see onError method
             */
            onError: null,
            //todo transform data
            transformData: () => {
            },
            /**
             * Excludes hidden inputs ($.is(':hidden')) from the validation process
             */
            validateVisibleOnly: true,
            parsley: {
                errorClass: 'is-invalid',
                successClass: 'is-valid',
                errorsWrapper: '<ul aria-live="assertive"></ul>',
                errorTemplate: '<li></li>',
                excluded: (index, element) => {
                    const excludedDefault = Parsley.options.excluded;
                    let defaultExclude = element.matches(excludedDefault);
                    if (defaultExclude) {
                        return true;
                    }

                    // ignore all .is(':hidden') if validateVisibleOnly option is set
                    return this.options.validateVisibleOnly && $(element).is(':hidden');
                }
            },
            /**
             * In order to be able to apply some custom validation rule to the collection of fields
             * you can mark their DOM parent with specific attribute and add it as a custom validator like here:
             * https://parsleyjs.org/doc/examples/custom-validator-events.html (see data-parsley-check-children)
             * But if you want to be able to return a server error for the same validator via server errors
             * and apply the error to the particular DOM element this collection of fields must have proper name.
             * This attribute is used for that exact purpose. For example set data-form-control-custom="dateTime" (data-form-control-custom is the default value)
             * and you will be able to send server errors like the following which will be applied to the specified element:
             * {dateTimeEnd: 'Please enter valid date'}
             * TODO excluded from docs for the time being (need to think carefully)
             */
            formControlAttributeCustom: 'data-form-control-custom',
        }
    }

    _applyOptions(options) {
        const { parsley: passedParsleyOptions, ...rest } = options || {};
        const parsleyOptions = { ...this._getDefaultOptions().parsley, ...passedParsleyOptions, };
        this.options = { ...this._getDefaultOptions(), ...rest, parsley: parsleyOptions };

        this.errorsSummaryElement = this.options.errorsSummaryElement;
        this.submitElement = this.options.submitElement;
    }

    /**
     * Returns Object where keys are inputs names and values are errors
     * By default returns response.data.errors
     * @param response
     * @return {Object<string,string>}
     * @protected
     */
    extractValidationErrors(response) {
        return response && response.data && response.data.errors ? response.data.errors : {};
    }

    _extractValidationErrors(response) {
        return this.options.extractValidationErrors ? this.options.extractValidationErrors.call(this, response) : this.extractValidationErrors(response);
    }

    /**
     * @param errors
     * @returns {string}
     * @protected
     */
    errorsSummaryTemplate(errors) {
        return `Please correct the following errors: ${errors.join(', ')}.`
    }

    _errorsSummaryTemplate(errors) {
        return this.options.errorsSummaryTemplate ? this.options.errorsSummaryTemplate.call(this, errors) : this.errorsSummaryTemplate(errors);
    }

    /**
     * @returns {Promise<void>}
     * @protected
     */
    beforeSubmitPromise() {
        return Promise.resolve();
    }

    _getBeforeSubmitPromise() {
        return this.options.beforeSubmitPromise ? this.options.beforeSubmitPromise.call(this) : this.beforeSubmitPromise();
    }

    /**
     * Executed before each request is sent
     * @protected
     */
    onBeforeSubmit() {
    }

    _onBeforeSubmit(preRequestData) {
        return this.options.onBeforeSubmit ? this.options.onBeforeSubmit.call(this, preRequestData) : this.onBeforeSubmit(preRequestData);
    }

    /**
     * Executed after response is received despite of its status
     * @protected
     */
    onAfterSubmit() {
    }

    _onAfterSubmit() {
        return this.options.onAfterSubmit ? this.options.onAfterSubmit.call(this) : this.onAfterSubmit();
    }

    /**
     * Executed when 2 preconditions is true:
     * - Successful response is received  (axios default is: "status >= 200 && status < 300", you can customize that
     *  with "validateStatus" option, read here https://github.com/axios/axios)
     * - extractValidationErrors callback returns falsy value or empty object
     * @param response
     * @protected
     */
    onSuccessfulSubmit(response) {
    }

    _onSuccessfulSubmit(response) {
        return this.options.onSuccessfulSubmit ? this.options.onSuccessfulSubmit.call(this, response) : this.onSuccessfulSubmit(response);
    }

    /**
     * Executed in case response from the server is treated as error
     * @param response
     * @protected
     */
    onFailedSubmit(response) {
    }

    _onFailedSubmit(response) {
        return this.options.onFailedSubmit ? this.options.onFailedSubmit.call(this, response) : this.onFailedSubmit(response);
    }

    /**
     * Executed in case some js error is happened
     * @param error
     * @protected
     */
    onError(error) {
    }

    _onError(error) {
        return this.options.onError ? this.options.onError.call(this, error) : this.onError(error);
    }

    /**
     * @param preRequestData
     * @returns {Promise<AxiosResponse<T>>}
     * @protected
     */
    sendRequest(preRequestData) {
        return this.options.axiosInstance.post(this._getUrl(), this._getRequestData());
    }

    _sendRequest(preRequestData) {
        return this.options.sendRequest ? this.options.sendRequest.call(this, preRequestData) : this.sendRequest(preRequestData);
    }

    submit() {
        this._submit();
    }

    _submit() {
        // prevent from multiple submission at the same time
        if (!this._isSubmiting) {
            this._isSubmiting = true;
            this._getBeforeSubmitPromise().then(
                preRequestData => {
                    try {
                        this._beforeSubmit(preRequestData);
                        this._sendRequest(preRequestData).then(
                            response => {
                                this._isSubmiting = false;
                                this._afterSubmit();
                                this._handleSuccessSubmit(response);
                            },
                            error => {
                                this._isSubmiting = false;
                                this._afterSubmit();
                                this._handleErrorSubmit(error);
                            }
                        );
                    } catch (err) {
                        this._isSubmiting = false;
                        this._onError(err);
                    }
                },
                error => {
                    this._isSubmiting = false;
                    // todo any additional logic here?
                }
            );
        }
    }

    _onSubmit() {
        this._submit();

        // prevent default form submit
        return false;
    };

    _areValidationErrorsEmpty(validationErrors) {
        return !validationErrors || Object.keys(validationErrors).length === 0;
    }

    _handleSuccessSubmit(response) {
        const validationErrors = this._extractValidationErrors(response);
        this._renderValidationErrors(validationErrors);

        if (this._areValidationErrorsEmpty(validationErrors)) {
            this._onSuccessfulSubmit(response);
        }
    }

    _handleErrorSubmit(error) {
        const response = error.response;
        const validationErrors = this._extractValidationErrors(response);
        this._renderValidationErrors(validationErrors);
        this._onFailedSubmit(response);
    }

    _renderValidationErrors(validationErrors) {
        const fieldsErrors = this._getFieldsConnectedErrors(validationErrors);
        if (Object.keys(fieldsErrors).length > 0) {
            this._applyFieldsErrors(fieldsErrors);
        }

        const restErrors = Object.keys(validationErrors).reduce((result, fieldName) => {
            if (!(fieldName in fieldsErrors)) {
                result.push(validationErrors[fieldName]);
            }
            return result;
        }, []);
        this._applyErrorsSummary(restErrors);
    }

    _getFieldsConnectedErrors(allServerErrors) {
        return Object.keys(allServerErrors).reduce((result, fieldName) => {
            if (this._getFieldByName(fieldName)) {
                result[fieldName] = allServerErrors[fieldName];
            }
            return result;
        }, {});
    }

    _getFieldByName(fieldName) {
        return this.getParsleyForm().fields.filter((field) => this._getParsleyFieldName(field) === fieldName)[0];
    }

    _getParsleyFieldName(field) {
        const element = field.$element[0];
        return element.name ? element.name : element.getAttribute(this.options.formControlAttributeCustom);
    }

    _applyFieldsErrors(fieldsErrors) {
        for (let fieldName in fieldsErrors) {
            const error = fieldsErrors[fieldName];
            const field = this._getFieldByName(fieldName);
            if (field) {
                field.$element.attr(`${this.getParsleyForm().options.namespace}${PARSLEY_SERVER_CONSTRAINT_NAME}`, 'true');
                // programmatically set constraint error text
                field.options.serverMessage = error;
                // refresh stored value
                delete field[PARSLEY_SERVER_ERROR_KEY];
                field.options.validateIfEmpty = true;
            } else {
                throw new Error(`Field with name «${fieldName}» is expected within the Form but no such field was found`);
            }
        }
        // validate to show field errors from server
        this.getParsleyForm().validate();
    }

    _applyErrorsSummary(errors) {
        if (this.errorsSummaryElement) {
            if (errors.length > 0) {
                this.errorsSummaryElement.innerHTML = this._errorsSummaryTemplate(errors);
            } else {
                this.errorsSummaryElement.innerHTML = ''
            }
        }
    }

    _hideErrorsSummary() {
        if (this.errorsSummaryElement) {
            this.errorsSummaryElement.innerHTML = ''
        }
    }

    getParsleyForm() {
        if (this._parsleyForm === null) {
            this._parsleyForm = $(this.element).parsley(this.options.parsley);
        }
        return this._parsleyForm;
    }

    _isAsync() {
        return this.options.async;
    }

    _getRequestData() {
        if (this.enctype === ENCTYPE_URLENCODED) {
            return this._getUrlencodedFormData();
        }
        return this._getFormData();
    }

    _getFormData() {
        return new FormData(this.element);
    }

    /**
     * @return {Array<[string, string]>}
     * @private
     */
    _getFormDataEntries() {
        return $(this.element)
            .serializeArray()
            .map(({ name, value }) => [name, value]);
    }

    _getUrlencodedFormData() {
        const parts = this._getFormDataEntries().map(
            ([name, value]) =>
                encodeURIComponent(name) + '=' + encodeURIComponent(value == null ? '' : value)
        );
        return parts.join('&');
    }

    _getFormDataObject() {
        const result = {};
        const entries = this._getFormDataEntries();
        entries.forEach(([key, value]) => {
            // add key to the entries only if there is no such key in there
            // this was done on purpose, basically, because of the way how MVC renders checkbox
            // because hidden (fallback) input goes second
            // we want to ignore it's value if the actual checkbox is checked
            if (!(key in result)) {
                result[key] = value;
            }
        });

        return result;
    }

    _getUrl() {
        return this.action;
    }

    _afterSubmit() {
        if (this.submitElement) {
            this.submitElement.disabled = false;
        }
        this._onAfterSubmit();
    }

    _beforeSubmit(preRequestData) {
        if (this.submitElement) {
            this.submitElement.disabled = true;
        }
        this._onBeforeSubmit(preRequestData);
    }

    destroy() {
        this.getParsleyForm().destroy();
    }

    _onFieldError(field) {
        // a11y fix
        field.$element.attr('aria-describedby', field._ui.errorsWrapperId);
        // global event to notify other components
        let errorEvent = createEvent(constants.EVENT_FIELD_VALIDATION_FAILED);
        errorEvent.failedValidators = field.validationResult.map(res => res.assert.name);
        field.element.dispatchEvent(errorEvent);
    };

    _onFormError(form) {
        let event = createEvent(constants.EVENT_FORM_VALIDATION_FAILED);
        event.failedElements = form.fields
            .filter(field => field.validationResult !== true)
            .map(field => field.element);
        this.element.dispatchEvent(event);
    };
}

function createEvent(name) {
    if (typeof Event === 'function') {
        return new Event(name, { bubbles: true });
    }
    const event = document.createEvent('Event');
    event.initEvent(name, true, true);
    return event;
}

function isPossibleToStoreFieldValue(field) {
    return (
        (field.element.tagName === 'INPUT' && field.element.type !== 'file') ||
        field.element.tagName === 'TEXTAREA' ||
        field.element.tagName === 'SELECT'
    );
}

function validateFieldOnce(field) {
    if (field[PARSLEY_SERVER_ERROR_KEY] === true) {
        return true;
    }

    field[PARSLEY_SERVER_ERROR_KEY] = true;
    return false;
}

Parsley.addValidator(PARSLEY_SERVER_CONSTRAINT_NAME, {
    validateString: (value, c, field) => {
        // if we can't store previous field value as a string - we show error just once
        if (!isPossibleToStoreFieldValue(field)) {
            return validateFieldOnce(field)
        }

        // otherwise field is valid only if new value do not matches old one
        if (PARSLEY_SERVER_ERROR_KEY in field) {
            return field[PARSLEY_SERVER_ERROR_KEY] !== field.getValue();
        }

        field[PARSLEY_SERVER_ERROR_KEY] = field.getValue();
        return false;
    },
    validateMultiple: (values, c, field) => {
        return validateFieldOnce(field);
    },
    priority: 1024
});
