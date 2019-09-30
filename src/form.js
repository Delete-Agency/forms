import $ from 'jquery';
import Parsley from 'parsleyjs';
import axios from 'axios';
import constants from './constants';
import { getParent, createEvent } from '@deleteagency/dom-helper';

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
        this.isSubmiting = false;
        this._parsleyForm = null;

        this._applyOptions(options);

        // todo server errors
        if (this._isAsync()) {
            this.getParsleyForm().on('form:submit', this.onSubmit);
        }

        this.getParsleyForm().on('field:error', this._onFieldError);
        this.getParsleyForm().on('form:error', this._onFormError);
    }

    _getDefaultOptions() {
        return {
            /**
             * @property (boolean)
             */
            async: true,
            errorsSummaryElement: null,
            submitElement: null,
            axiosInstance: axios,
            formControlAttribute: 'data-form-control',
            formControlAttributeCustom: 'data-form-control-custom',
            validateAlwaysAttribute: 'data-validate-always',
            parsley: {
                errorClass: 'is-invalid',
                successClass: 'is-valid',
                errorsWrapper: '<ul aria-live="assertive"></ul>',
                errorTemplate: '<li></li>',
            },
            /**
             * @see extractValidationErrors method
             * @
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
        }
    }

    _applyOptions(options) {
        const { parsley: passedParsleyOptions, ...rest } = options || {};
        const parsleyOptions = { ...this._getDefaultOptions().parsley, ...passedParsleyOptions, };
        this.options = { ...this._getDefaultOptions(), ...rest, parsley: parsleyOptions };

        this.errorsSummaryElement = this.options.errorsSummaryElement;
        this.submitElement = this.options.submitElement;
        this.formControlSelector = `[${this.options.formControlAttribute}]`;
    }

    /**
     * @param response
     * @return {Object<string,string>}
     */
    extractValidationErrors(response) {
        return response && response.data && response.data.errors ? response.data.errors : [];
    }

    _extractValidationErrors(response) {
        return this.options.extractValidationErrors ? this.options.extractValidationErrors.call(this, response) : this.extractValidationErrors(response);
    }

    errorsSummaryTemplate(errors) {
        return `Please correct the following errors: ${errors.join(', ')}.`
    }

    _errorsSummaryTemplate(errors) {
        return this.options.errorsSummaryTemplate ? this.options.errorsSummaryTemplate.call(this, errors) : this.errorsSummaryTemplate(errors);
    }

    beforeSubmitPromise() {
        return Promise.resolve();
    }

    _getBeforeSubmitPromise() {
        return this.options.beforeSubmitPromise ? this.options.beforeSubmitPromise.call(this) : this.beforeSubmitPromise();
    }

    onBeforeSubmit() {
    }

    _onBeforeSubmit() {
        return this.options.onBeforeSubmit ? this.options.onBeforeSubmit.call(this) : this.onBeforeSubmit();
    }

    onAfterSubmit() {
    }

    _onAfterSubmit() {
        return this.options.onAfterSubmit ? this.options.onAfterSubmit.call(this) : this.onAfterSubmit();
    }

    onSuccessfulSubmit(response) {
    }

    _onSuccessfulSubmit(response) {
        return this.options.onSuccessfulSubmit ? this.options.onSuccessfulSubmit.call(this, response) : this.onSuccessfulSubmit(response);
    }

    onFailedSubmit(response) {
    }

    _onFailedSubmit(response) {
        return this.options.onFailedSubmit ? this.options.onFailedSubmit.call(this, response) : this.onFailedSubmit(response);
    }

    onError(error) {
    }

    _onError(error) {
        return this.options.onError ? this.options.onError.call(this, error) : this.onError(error);
    }

    onSubmit = () => {
        this._getBeforeSubmitPromise().then(() => {
                if (!this.isSubmiting) {
                    try {
                        this._beforeSubmit();
                        this.options.axiosInstance.post(this._getUrl(), this._getRequestData()).then(
                            response => {
                                this._afterSubmit();
                                this._handleSuccessSubmit(response);
                            },
                            error => {
                                this._afterSubmit();
                                this._handleErrorSubmit(error);
                            }
                        );
                    } catch (err) {
                        this._onError(err);
                    }
                }
            }
        );

        // prevent default form submit
        return false;
    };

    _handleSuccessSubmit(response) {
        this._hideErrorsSummary();
        this._onSuccessfulSubmit(response);
    }

    _handleErrorSubmit(error) {
        const response = error.response;
        const validationErrors = this._extractValidationErrors(response);
        const fieldsErrors = this._getFieldsConnectedErrors(validationErrors);
        if (Object.keys(fieldsErrors).length > 0) {
            this._applyFieldErrors(fieldsErrors);
        }

        const restErrors = Object.keys(validationErrors).reduce((result, fieldName) => {
            if (!(fieldName in fieldsErrors)) {
                result.push(validationErrors[fieldName]);
            }
            return result;
        }, []);
        this._applyErrorsSummary(restErrors);
        this._onFailedSubmit(response);
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

    _applyFieldErrors(fieldsErrors) {
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
            this._parsleyForm = $(this.element).parsley({
                inputs: constants.PARSLEY_INCLUDE_SELECTOR,
                excluded: (index, element) => {
                    const excludedDefault = Parsley.options.excluded;
                    let defaultExclude = element.matches(excludedDefault);
                    if (defaultExclude) {
                        return true;
                    }

                    let validateAlwaysParent = getParent(
                        element,
                        `[${this.options.validateAlwaysAttribute}]`
                    );
                    return validateAlwaysParent ? false : $(element).is(':hidden');
                },
                classHandler: field => field.$element.closest(this.formControlSelector),
                errorsContainer: field => field.$element.closest(this.formControlSelector),
                errorClass: this.options.parsley.errorClass,
                successClass: this.options.parsley.successClass,
                errorsWrapper: this.options.parsley.errorsWrapper,
                errorTemplate: this.options.parsley.errorTemplate,
                trigger: this.options.parsley.trigger,
            });
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
        this.isSubmiting = false;
        if (this._onAfterSubmit) {
            this._onAfterSubmit();
        }
    }

    _beforeSubmit() {
        this.isSubmiting = true;
        if (this.submitElement) {
            this.submitElement.disabled = true;
        }
        this._onBeforeSubmit();
    }

    destroy() {
        this.getParsleyForm().destroy();
    }

    _onFieldError = field => {
        // a11y fix
        field.$element.attr('aria-describedby', field._ui.errorsWrapperId);
        // global event to notify other components
        let errorEvent = createEvent(constants.EVENT_FIELD_VALIDATION_FAILED);
        errorEvent.failedValidators = field.validationResult.map(res => res.assert.name);
        field.element.dispatchEvent(errorEvent);
    };

    _onFormError = form => {
        let event = createEvent(constants.EVENT_FORM_VALIDATION_FAILED);
        event.failedElements = form.fields
            .filter(field => field.validationResult !== true)
            .map(field => field.element);
        this.element.dispatchEvent(event);
    };

    static hasFieldValue(field) {
        return (
            (field.element.tagName === 'INPUT' && field.element.type !== 'file') ||
            field.element.tagName === 'TEXTAREA' ||
            field.element.tagName === 'SELECT'
        );
    }
}

function handledUntrackedField(field) {
    if (field[PARSLEY_SERVER_ERROR_KEY] !== true) {
        field[PARSLEY_SERVER_ERROR_KEY] = true;
        return false;
    }

    return true;
}

Parsley.addValidator(PARSLEY_SERVER_CONSTRAINT_NAME, {
    validateString: (value, c, field) => {
        // if field cant store value we show error just once
        if (!Form.hasFieldValue(field)) {
            return handledUntrackedField(field);
        }

        // otherwise field is valid only if new value do not matches old one
        if (PARSLEY_SERVER_ERROR_KEY in field) {
            return field[PARSLEY_SERVER_ERROR_KEY] !== field.getValue();
        }

        field[PARSLEY_SERVER_ERROR_KEY] = field.getValue();
        return false;
    },
    validateMultiple: (values, c, field) => {
        return handledUntrackedField(field);
    },
    priority: 1024
});