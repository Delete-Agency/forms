# Forms

[Live Demo](https://delete-agency.github.io/forms/)

## Motivation

TODO


## Installation

Use the package manager [npm](https://docs.npmjs.com/about-npm/) for installation.

```
$ npm install @deleteagency/forms
```

## Usage

```js
import {Form} from  '@deleteagency/forms';

let formElement1 = document.getElementById('form1');

// Extending with options example
const form1 = new Form(formElement1, {
    submitElement: formElement1.querySelector('button[type="submit"]'),
    errorsSummary: formElement1.querySelector('[data-errors-summary]'),
    onSuccessfulSubmit: (response) => {
        console.log(response);
    },
    onFailedSubmit: (error) => {
        console.error(error);
    },
    errorsSummaryTemplate: (errors) => {
        return `<div class="alert alert-danger" role="alert">${errors.map(error => `<div>${error}</div>`).join()}</div>`;
    },
    parsley: {
        errorClass: 'is-invalid',
        successClass: 'is-valid',
        errorsWrapper: '<div class="invalid-feedback" aria-live="assertive"></div>',
        errorTemplate: '<div></div>',
    },
});

// Extending with inheritance example
class BaseForm extends Form {
    constructor(el, options) {
        options = {
            ...options,
            submitElement: el.querySelector('button[type="submit"]'),
            errorsSummary: el.querySelector('[data-errors-summary]'),
            parsley: {
                errorClass: 'is-invalid',
                successClass: 'is-valid',
                errorsWrapper: '<div class="invalid-feedback" aria-live="assertive"></div>',
                errorTemplate: '<div></div>',
            },
        };
        super(el, options);
    }

    onSuccessfulSubmit(response) {
        console.log(response);
    }

    onFailedSubmit(error) {
        console.error(error);
    }

    errorsSummaryTemplate(errors) {
        return `<div class="alert alert-danger" role="alert">${errors.map(error => `<div>${error}</div>`).join()}</div>`;
    }
}

let formElement2 = document.getElementById('form2');
const form2 = new BaseForm(formElement2);
```

## Options

### async

Type: `boolean`<br>
Default: `true`

Should form be submitted via XHR (axios) or natively.

### errorsSummaryElement

Type: `HTMLElement`<br>
Default: `null`

todo

### submitElement

Type: `HTMLElement`<br>
Default: `null`

todo

### axiosInstance

Type: `Axios`<br>
Default: `require('axios')`

todo

### formControlAttribute

Type: `string`<br>
Default: `data-form-control`

todo

### formControlAttributeCustom

Type: `string`<br>
Default: `data-form-control-name`

todo

### validateAlwaysAttribute

Type: `string`<br>
Default: `data-validate-always`

todo

### parsley

Type: `Parsley settings`<br>
Default: `{
    errorClass: 'is-invalid',
    successClass: 'is-valid',
    errorsWrapper: '<ul aria-live="assertive"></ul>',
    errorTemplate: '<li></li>',
}`

todo

### extractValidationErrors (inheritable)

Type: `Function`<br>

todo

### errorsSummaryTemplate (inheritable)

Type: `Function`<br>

todo

### beforeSubmitPromise (inheritable)

Type: `Function`<br>

tod

### onBeforeSubmit (inheritable)

Type: `Function`<br>

todo

### onAfterSubmit (inheritable)

Type: `Function`<br>

todo

### onSuccessfulSubmit (inheritable)

Type: `Function`<br>

todo

### onFailedSubmit (inheritable)

Type: `Function`<br>

todo

### onError (inheritable)

Type: `Function`<br>

todo

## License
[MIT](https://choosealicense.com/licenses/mit/)