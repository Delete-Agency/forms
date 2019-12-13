import FormWizardStep from "./form-wizard-step";
import constants from "./constants";

export default class FormWizard {
    constructor(element, form, options) {
        this.element = element;

        /**
         * @type {Form}
         */
        this.form = form;
        /**
         * @type {FormWizardStep[]}
         */
        this._steps = [];
        this._currentStepIndex = null;
        this.options = { ...this._getDefaultOptions(), ...options };
        this._onBack = this._onBack.bind(this);
        this._onContinue = this._onContinue.bind(this);
        this._onNavigate = this._onNavigate.bind(this);
        this._onSubmit = this._onSubmit.bind(this);
        this._onFormValidationError = this._onFormValidationError.bind(this);

        this._init();
    }

    _getDefaultOptions() {
        return {
            stepsElements: (element) => [...element.querySelectorAll('[data-step]')],
            createStep: (stepElement) => new FormWizardStep(stepElement),
            onTransitionStart: null,
            onTransitionEnd: null,
            afterStepShown: null,
        };
    }

    _getStepOptions() {
        return {
            parsleyNamespace: this.form.getParsleyForm().options.namespace,
            parsleyInputs: this.form.getParsleyForm().options.inputs,
            onContinue: this._onContinue,
            onBack: this._onBack,
            continueElement: this.options.continueElement,
            backElement: this.options.backElement,
        }
    }

    _buildSteps() {
        return this.options.stepsElements(this.element)
            .map((stepElement, index) => {
                const step = this.options.createStep(stepElement);
                step.setIndex(index);
                step.setOptions(this._getStepOptions());
                step.init();
                return step;
            });
    }

    _init() {
        this._attachListeners();
        this._steps = this._buildSteps();
        if (this._steps.length > 0) {
            this._initStartStep();
        }
    }

    _attachListeners() {
        // add listener to form first in order to be able to prevent event propagation in some cases
        // todo will be called after handler in Form class, should be custom and preventable event
        this.form.element.addEventListener('submit', this._onSubmit);
        this.element.addEventListener(constants.EVENT_FORM_VALIDATION_FAILED, this._onFormValidationError);
    }

    _initStartStep() {
        this._setStep(0);
    }

    /**
     * @return {FormWizardStep}
     * @private
     */
    _getCurrentStep() {
        return this._currentStepIndex !== null ? this._steps[this._currentStepIndex] : null;
    }

    _canGoToStep(nextStepIndex, highlight = false) {
        const promises = [this._isFormStepValid(nextStepIndex, highlight)];

        const currentStepInstance = this._getCurrentStep();
        if (currentStepInstance) {
            const currentStepValidity = currentStepInstance.isValid();
            if (currentStepValidity) {
                promises.push(currentStepValidity);
            }
        }
        return Promise.all(promises);
    }

    _isFormStepValid(newStepIndex, highlight = false) {
        const previousSteps = this._steps.filter((step) => step.getIndex() < newStepIndex);
        if (previousSteps.length > 0) {
            const promises = [];
            previousSteps.forEach((step) => {
                let stepPromise;
                if (highlight) {
                    stepPromise = this.form.getParsleyForm().whenValidate({ group: step.getGroup() });
                } else {
                    stepPromise = this.form.getParsleyForm().whenValid({ group: step.getGroup() });
                }
                promises.push(stepPromise);
            });
            return Promise.all(promises);
        }

        return Promise.resolve();
    }

    _onContinue() {
        this._continue();
    };

    _onBack(e) {
        console.log(e);
        this._back();
    };

    _startTransition() {
        if (this.options.onTransitionStart) {
            this.options.onTransitionStart();
        }
    }

    _stopTransition() {
        if (this.options.onTransitionEnd) {
            this.options.onTransitionStart();
        }
    }

    _continue() {
        const nextStepIndex = this._currentStepIndex + 1;
        this._goTo(nextStepIndex);
    }

    _back() {
        const nextStepIndex = this._currentStepIndex - 1;
        this._goTo(nextStepIndex);
    }

    _goTo(nextStepIndex) {
        this._startTransition();
        this._canGoToStep(nextStepIndex, true).then(() => {
            this._setStep(nextStepIndex);
            this._stopTransition();
        }, (error) => {
            this._stopTransition();
        });
    }

    _onNavigate(newStepIndex) {
        this._canGoToStep(newStepIndex).then(() => {
            this._setStep(newStepIndex);
        }, (error) => {
        });
    };

    _onSubmit(e) {
        // submit is allowed only from the last step
        // in other cases, e.g user clicks on Enter must not trigger submit
        if (this._currentStepIndex !== null && this._currentStepIndex !== (Object.keys(this._steps).length - 1)) {
            e.preventDefault();
            e.stopImmediatePropagation();
            this._continue();
        }
    };

    _onFormValidationError({ failedElements }) {
        if (failedElements.length > 0) {
            const firstFailedElement = failedElements[0];
            const targetStepIndex = this._steps.findIndex(step => step.getElement().contains(firstFailedElement));
            if (targetStepIndex !== -1) {
                this._setStep(targetStepIndex);
            }
        }
    };

    _setStep(newStepIndex) {
        console.log(newStepIndex);
        if (this._currentStepIndex !== newStepIndex) {
            const currentStep = this._getCurrentStep();
            if (currentStep) {
                currentStep.hide()
            }
            const nextStep = this._steps[newStepIndex];
            nextStep.show();
            this._currentStepIndex = newStepIndex;
            this._steps.forEach(step => step.afterStepChange(newStepIndex));
        }
    }
}