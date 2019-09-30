import Parsley from 'parsleyjs';

const PARSLEY_INCLUDE_SELECTOR = Parsley.options.inputs;
const EVENT_FIELD_VALIDATION_FAILED = 'field-validation-failed';
const EVENT_FORM_VALIDATION_FAILED = 'form-validation-failed';

export default {
    PARSLEY_INCLUDE_SELECTOR,
    EVENT_FIELD_VALIDATION_FAILED,
    EVENT_FORM_VALIDATION_FAILED
};
