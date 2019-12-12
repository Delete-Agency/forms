# Forms

[Live Demo](https://delete-agency.github.io/forms/)

## About

This package is built with tree main parts:
- [Parsley](https://github.com/guillaumepotier/Parsley.js) for client side validation
- [Axios](https://github.com/axios/axios) for sending asynchronous requests when form is submitted
- `Form` class itself that implements form logic and provides a few callbacks and options to customize your form behaviour 

## Key concepts

### Only visible fields should be validated

By default Parsley is configured with the overridden [excluded](https://parsleyjs.org/doc/annotated-source/defaults.html#section-5)
inputs the way hidden inputs is ignored in validation process. Assumption behind that is very simple: 
 you shouldn't validate the field if the user can't see it(and can't correct).
 It's particularly useful if you have additional logic of showing/hiding fields based on the current values of some other fields.
 If you want to turn this logic off just explicitly pass validateVisibleOnly: false to the `Forms` options.

### Server errors

Parsley is great for the client validation but when it comes to handling server validation it has no built-in mechanism.
Having server validation and be able to tell user precisely what input is invalid sometimes is very important.
So there is an additional custom validator (like `Required`, `Minlength` or [any other](https://parsleyjs.org/doc/index.html#validators))
implemented within `Form` which is responsible to apply server errors the same way standard parsley validators are applied.
By default if response data has `errors` key which is not empty object it will be treated as a collections of errors where keys
are input names and values are corresponding errors. These errors will become messages for server validators of every found inputs of the given names.

### Errors summary

If the server responds with the validation errors but some of the keys of the errors object don't have inputs with the same names within your form
additional fallback mechanism will try to combine them and render in the special place called `errors summary`.
Basically it is just a DOM element where you want to render such unhandled errors (ideally you shouldn't have them at all).
Check `errorsSummaryElement` and `errorsSummaryTemplate` options

### Success/failed form submission

The main callbacks are `onSuccessfulSubmit` and `onFailedSubmit`.

`onSuccessfulSubmit` will be called only when:
- Successful response is received (axios default is: "status >= 200 && status < 300", you can customize that
 passing custom axios instance with "validateStatus" option, read here https://github.com/axios/axios)
- extractValidationErrors callback returns falsy value or empty object

`onFailedSubmit` will be called only when:
- Error response is received

### Two ways of extending `Form`

To extend your forms logic you can either pass options as the second argument to the `Form` constructor or create a child class
and implement some of the options as methods of this class. Options which are possible to inherit in children classes are marked with 
`(inheritable)` below

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
    errorsSummaryElement: formElement1.querySelector('[data-errors-summary]'),
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

## API

### new Form(element, options = {})

#### element

*Required*<br>
Type: `HTMLFormElement`

#### options

*Optional*<br>
Type: `Object`

## Options

### async

Type: `boolean`<br>
Default: `true`

Should form be submitted via XHR (axios) or natively.

### errorsSummaryElement

Type: `HTMLElement`<br>
Default: `null`

### submitElement

Type: `HTMLElement`<br>
Default: `null`

Submit element which should be disabled while form is being submitted.

### axiosInstance

Type: `Axios`<br>
Default: `require('axios')`

### validateVisibleOnly

Type: `boolean`<br>
Default: `true`

Excludes hidden inputs ($.is(':hidden')) from the validation process

### parsley

Type: `Parsley settings`<br>
Default: `{
    errorClass: 'is-invalid',
    successClass: 'is-valid',
    errorsWrapper: '<ul aria-live="assertive"></ul>',
    errorTemplate: '<li></li>',
}`

`excluded` option of Parsley config is also extended to support `validateVisibleOnly` logic

### extractValidationErrors (inheritable)

Type: `Function`<br>
Returns: `{Object<string,string>}`

Receives a server response as the argument and must return collection of errors.
Falsy returned value or empty object will be treated as an errors absence.
Returns content of `response.data.errors` by default.

### sendRequest (inheritable)

Type: `Function`<br>

Must return Promise<AxiosResponse>

### errorsSummaryTemplate (inheritable)

Type: `Function`<br>

### beforeSubmitPromise (inheritable)

Type: `Function`<br>

Returns promise that must be fulfilled before submit request is sent

### onBeforeSubmit (inheritable)

Type: `Function`<br>

### onAfterSubmit (inheritable)

Type: `Function`<br>

### onSuccessfulSubmit (inheritable)

Type: `Function`<br>

### onFailedSubmit (inheritable)

Type: `Function`<br>

### onError (inheritable)

Type: `Function`<br>

## License
[MIT](https://choosealicense.com/licenses/mit/)