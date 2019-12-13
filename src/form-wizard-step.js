const PARSLEY_GROUP_ATTRIBUTE = 'group';

export default class FormWizardStep {
    constructor(element) {
        this.element = element;
        this.options = {
            parsleyInputs: null,
            parsleyNamespace: null,
            onContinue: null,
            onBack: null,
            continueElement: null,
            backElement: null,
            activeClass: 'is-active',
            inactiveClass: 'is-inactive',
            validClass: 'is-valid',
        };
    }

    getElement() {
        return this.element;
    }

    setIndex(index) {
        this._index = index;
        this._group = `group-${index}`;
    }

    setOptions(options) {
        this.options = { ...this.options, ...options };
    }

    _findContinueElement() {
        const continueElement = this.options.continueElement;
        if (!continueElement) {
            return null;
        }

        switch (typeof continueElement) {
            case "string":
                return this.element.querySelector(continueElement);
            case "function":
                return continueElement(this.element);
            case "object":
                return continueElement;
            default:
                return null;
        }
    }

    _findBackElement() {
        const backElement = this.options.backElement;
        if (!backElement) {
            return null;
        }

        switch (typeof backElement) {
            case "string":
                return this.element.querySelector(backElement);
            case "function":
                return backElement(this.element);
            case "object":
                return backElement;
            default:
                return null;
        }
    }

    init() {
        this.continueElement = this._findContinueElement();
        this.backElement = this._findBackElement();

        if (this.continueElement && this.options.onContinue) {
            this.continueElement.addEventListener('click', this.options.onContinue);
        }
        if (this.backElement && this.options.onBack) {
            this.backElement.addEventListener('click', this.options.onBack);
        }

        const inputs = [...this.element.querySelectorAll(this.options.parsleyInputs)];
        inputs.forEach((inputNode) => {
            inputNode.setAttribute(`${this.options.parsleyNamespace}${PARSLEY_GROUP_ATTRIBUTE}`, this.getGroup());
        });

        this.hide();
    }

    getGroup() {
        return this._group;
    }

    getIndex() {
        return this._index;
    }

    show() {
        this.element.classList.add(this.options.activeClass);
        this.element.classList.remove(this.options.inactiveClass);

        // todo possible onShow handler here
    }

    hide() {
        this.element.classList.remove(this.options.activeClass);
        this.element.classList.add(this.options.inactiveClass);
    }

    afterStepChange(newStepIndex) {
        if (this._index < newStepIndex) {
            this.element.classList.add(this.options.validClass);
        } else {
            this.element.classList.remove(this.options.validClass);
        }
    }

    /**
     * @return {?Promise}
     */
    isValid() {
        return null;
    }
}