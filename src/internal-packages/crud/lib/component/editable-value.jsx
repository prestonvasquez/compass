const _ = require('lodash');
const moment = require('moment');
const app = require('ampersand-app');
const React = require('react');
const inputSize = require('./utils').inputSize;
const TypeChecker = require('hadron-type-checker');

/* eslint no-return-assign:0 */

/**
 * Escape key code.
 */
const ESC = 27;

/**
 * The editing class constant.
 */
const EDITING = 'is-editing';

/**
 * The document value class.
 */
const VALUE_CLASS = 'editable-element-value';

/**
 * The version at which high precision values are available.
 */
const HP_VERSION = '3.4.0';

/**
 * The date format.
 */
const FORMAT = 'YYYY-MM-DD HH:mm:ss.SSS';

/**
 * General editable value component.
 */
class EditableValue extends React.Component {

  /**
   * The component constructor.
   *
   * @param {Object} props - The properties.
   */
  constructor(props) {
    super(props);
    this.element = props.element;
    this.state = { editing: false };
    this._pasting = false;
    this._version = app.instance.build.version;
  }

  /**
   * Focus on this field on mount, so the tab can do it's job and move
   * to the value field.
   */
  componentDidMount() {
    if (this.isAutoFocusable()) {
      this._node.focus();
    }
  }

  /**
   * Get the value for the element.
   *
   * @returns {String} The value.
   */
  getValue() {
    const value = this.element.currentValue;
    if (this.element.currentType === 'Date') {
      return moment(value).format(FORMAT);
    }
    return value;
  }

  /**
   * Is the element auto-focusable?
   *
   * @returns {Boolean} If the element can be focused automatically.
   */
  isAutoFocusable() {
    return !this.element.isKeyEditable() ||
      this.element.parent.currentType === 'Array';
  }

  /**
   * Are high precision values available?
   *
   * @returns {boolean} if high precision values are available.
   */
  isHighPrecision() {
    return this._version >= HP_VERSION;
  }

  /**
   * When hitting a key on the last element some special things may happen.
   *
   * @param {Event} evt - The event.
   */
  handleKeyDown(evt) {
    if (evt.keyCode === 9 && !evt.shiftKey) {
      if (this.isTabable()) {
        if (!this.element.nextElement) {
          this.element.next();
          evt.preventDefault();
          evt.stopPropagation();
        }
      } else {
        // We don't want to create another element when the current one is blank.
        evt.preventDefault();
        evt.stopPropagation();
      }
    } else if (evt.keyCode === ESC) {
      const value = evt.target.value;
      if (value.length === 0 && this.element.currentKey.length === 0) {
        this.element.remove();
      } else {
        this._node.blur();
      }
    }
  }

  /**
   * Sets the flag that the user pasted the value. The reason for this is that
   * the onpaste event that is passed does not have consistent behaviour with
   * respect to event.target.value - it is sometimes undefined. The onchange
   * event always gets fired after this to we can set the flag and then check
   * for it in that event.
   */
  handlePaste() {
    this._pasting = true;
  }

  /**
   * Is the element tabbable.
   *
   * @returns {Boolean} If the element is tabbable.
   */
  isTabable() {
    if (this.element.parent.currentType === 'Array') {
      return this.element.currentValue !== '';
    }
    return this.element.currentKey.length !== 0;
  }

  /**
   * Handles changes to the element value.
   *
   * @param {Event} evt - The event.
   */
  handleChange(evt) {
    const value = evt.target.value;
    if (this._pasting) {
      this.element.bulkEdit(value);
      this._pasting = false;
    } else {
      this._node.size = inputSize(value);
      const currentType = this.element.currentType;
      const castableTypes = TypeChecker.castableTypes(value, this.isHighPrecision());
      if (_.includes(castableTypes, currentType)) {
        this.element.edit(TypeChecker.cast(value, currentType));
      } else {
        this.element.edit(TypeChecker.cast(value, castableTypes[0]));
      }
    }
  }

  /**
   * Handle focus on the value.
   */
  handleFocus() {
    this.setState({ editing: true });
  }

  /**
   * Handle blur from the value.
   */
  handleBlur() {
    this.setState({ editing: false });
  }

  /**
   * Get the style for the value of the element.
   *
   * @returns {String} The value style.
   */
  style() {
    const typeClass = `${VALUE_CLASS}-is-${this.element.currentType.toLowerCase()}`;
    if (this.state.editing) {
      return `${VALUE_CLASS} ${VALUE_CLASS}-${EDITING} ${typeClass}`;
    }
    return `${VALUE_CLASS} ${typeClass}`;
  }

  /**
   * Get the style for the input wrapper.
   *
   * @returns {String} The class name.
   */
  wrapperStyle() {
    return `${VALUE_CLASS}-wrapper-is-${this.element.currentType.toLowerCase()}`;
  }

  /**
   * Render a single editable value.
   *
   * @returns {React.Component} The element component.
   */
  render() {
    return (
      <span className={this.wrapperStyle()}>
        <input
          ref={(c) => this._node = c}
          type="text"
          size={inputSize(this.element.currentValue, this.element.currentType)}
          className={this.style()}
          onBlur={this.handleBlur.bind(this)}
          onFocus={this.handleFocus.bind(this)}
          onChange={this.handleChange.bind(this)}
          onKeyDown={this.handleKeyDown.bind(this)}
          onPaste={this.handlePaste.bind(this)}
          value={this.getValue()} />
      </span>
    );
  }
}

EditableValue.displayName = 'EditableValue';

EditableValue.propTypes = {
  element: React.PropTypes.object.isRequired
};

module.exports = EditableValue;
