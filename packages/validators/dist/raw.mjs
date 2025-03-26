import { unref } from 'vue-demi';

function isFunction(val) {
  return typeof val === 'function';
}
function isObject(o) {
  return o !== null && typeof o === 'object' && !Array.isArray(o);
}
function normalizeValidatorObject(validator) {
  return isFunction(validator.$validator) ? {
    ...validator
  } : {
    $validator: validator
  };
}
function isPromise(object) {
  return isObject(object) && isFunction(object.then);
}
function unwrapValidatorResponse(result) {
  if (typeof result === 'object') return result.$valid;
  return result;
}
function unwrapNormalizedValidator(validator) {
  return validator.$validator || validator;
}

function withParams($params, $validator) {
  if (!isObject($params)) throw new Error(`[@vuelidate/validators]: First parameter to "withParams" should be an object, provided ${typeof $params}`);
  if (!isObject($validator) && !isFunction($validator)) throw new Error(`[@vuelidate/validators]: Validator must be a function or object with $validator parameter`);
  const validatorObj = normalizeValidatorObject($validator);
  validatorObj.$params = {
    ...(validatorObj.$params || {}),
    ...$params
  };
  return validatorObj;
}

function withMessage($message, $validator) {
  if (!isFunction($message) && typeof unref($message) !== 'string') throw new Error(`[@vuelidate/validators]: First parameter to "withMessage" should be string or a function returning a string, provided ${typeof $message}`);
  if (!isObject($validator) && !isFunction($validator)) throw new Error(`[@vuelidate/validators]: Validator must be a function or object with $validator parameter`);
  const validatorObj = normalizeValidatorObject($validator);
  validatorObj.$message = $message;
  return validatorObj;
}

function withAsync($validator, $watchTargets = []) {
  const validatorObj = normalizeValidatorObject($validator);
  return {
    ...validatorObj,
    $async: true,
    $watchTargets
  };
}

function forEach(validators) {
  return {
    $validator(collection, ...others) {
      return unref(collection).reduce((previous, collectionItem, index) => {
        const collectionEntryResult = Object.entries(collectionItem).reduce((all, [property, $model]) => {
          const innerValidators = validators[property] || {};
          const propertyResult = Object.entries(innerValidators).reduce((all, [validatorName, currentValidator]) => {
            const validatorFunction = unwrapNormalizedValidator(currentValidator);
            const $response = validatorFunction.call(this, $model, collectionItem, index, ...others);
            const $valid = unwrapValidatorResponse($response);
            all.$data[validatorName] = $response;
            all.$data.$invalid = !$valid || !!all.$data.$invalid;
            all.$data.$error = all.$data.$invalid;
            if (!$valid) {
              let $message = currentValidator.$message || '';
              const $params = currentValidator.$params || {};
              if (typeof $message === 'function') {
                $message = $message({
                  $pending: false,
                  $invalid: !$valid,
                  $params,
                  $model,
                  $response
                });
              }
              all.$errors.push({
                $property: property,
                $message,
                $params,
                $response,
                $model,
                $pending: false,
                $validator: validatorName
              });
            }
            return {
              $valid: all.$valid && $valid,
              $data: all.$data,
              $errors: all.$errors
            };
          }, {
            $valid: true,
            $data: {},
            $errors: []
          });
          all.$data[property] = propertyResult.$data;
          all.$errors[property] = propertyResult.$errors;
          return {
            $valid: all.$valid && propertyResult.$valid,
            $data: all.$data,
            $errors: all.$errors
          };
        }, {
          $valid: true,
          $data: {},
          $errors: {}
        });
        return {
          $valid: previous.$valid && collectionEntryResult.$valid,
          $data: previous.$data.concat(collectionEntryResult.$data),
          $errors: previous.$errors.concat(collectionEntryResult.$errors)
        };
      }, {
        $valid: true,
        $data: [],
        $errors: []
      });
    },
    $message: ({
      $response
    }) => $response ? $response.$errors.map(context => {
      return Object.values(context).map(errors => errors.map(error => error.$message)).reduce((a, b) => a.concat(b), []);
    }) : []
  };
}

const req = value => {
  value = unref(value);
  if (Array.isArray(value)) return !!value.length;
  if (value === undefined || value === null) {
    return false;
  }
  if (value === false) {
    return true;
  }
  if (value instanceof Date) {
    return !isNaN(value.getTime());
  }
  if (typeof value === 'object') {
    for (let _ in value) return true;
    return false;
  }
  return !!String(value).length;
};
const len = value => {
  value = unref(value);
  if (Array.isArray(value)) return value.length;
  if (typeof value === 'object') {
    return Object.keys(value).length;
  }
  return String(value).length;
};
function regex(...expr) {
  return value => {
    value = unref(value);
    return !req(value) || expr.every(reg => {
      reg.lastIndex = 0;
      return reg.test(value);
    });
  };
}

var common = /*#__PURE__*/Object.freeze({
  __proto__: null,
  forEach: forEach,
  len: len,
  normalizeValidatorObject: normalizeValidatorObject,
  regex: regex,
  req: req,
  unwrap: unref,
  unwrapNormalizedValidator: unwrapNormalizedValidator,
  unwrapValidatorResponse: unwrapValidatorResponse,
  withAsync: withAsync,
  withMessage: withMessage,
  withParams: withParams
});

var alpha = regex(/^[a-zA-Z]*$/);

var alphaNum = regex(/^[a-zA-Z0-9]*$/);

var numeric = regex(/^\d*(\.\d+)?$/);

function between (min, max) {
  return value => !req(value) || (!/\s/.test(value) || value instanceof Date) && +unref(min) <= +value && +unref(max) >= +value;
}

const emailRegex = /^(?:[A-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9]{2,}(?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/i;
var email = regex(emailRegex);

function ipAddress (value) {
  if (!req(value)) {
    return true;
  }
  if (typeof value !== 'string') {
    return false;
  }
  const nibbles = value.split('.');
  return nibbles.length === 4 && nibbles.every(nibbleValid);
}
const nibbleValid = nibble => {
  if (nibble.length > 3 || nibble.length === 0) {
    return false;
  }
  if (nibble[0] === '0' && nibble !== '0') {
    return false;
  }
  if (!nibble.match(/^\d+$/)) {
    return false;
  }
  const numeric = +nibble | 0;
  return numeric >= 0 && numeric <= 255;
};

function macAddress (separator = ':') {
  return value => {
    separator = unref(separator);
    if (!req(value)) {
      return true;
    }
    if (typeof value !== 'string') {
      return false;
    }
    const parts = typeof separator === 'string' && separator !== '' ? value.split(separator) : value.length === 12 || value.length === 16 ? value.match(/.{2}/g) : null;
    return parts !== null && (parts.length === 6 || parts.length === 8) && parts.every(hexValid);
  };
}
const hexValid = hex => hex.toLowerCase().match(/^[0-9a-f]{2}$/);

function maxLength (length) {
  return value => !req(value) || len(value) <= unref(length);
}

function minLength (length) {
  return value => !req(value) || len(value) >= unref(length);
}

function required (value) {
  if (typeof value === 'string') {
    value = value.trim();
  }
  return req(value);
}

const validate$1 = (prop, val) => prop ? req(typeof val === 'string' ? val.trim() : val) : true;
function requiredIf(propOrFunction) {
  return function (value, parentVM) {
    if (typeof propOrFunction !== 'function') {
      return validate$1(unref(propOrFunction), value);
    }
    const result = propOrFunction.call(this, value, parentVM);
    return validate$1(result, value);
  };
}

const validate = (prop, val) => !prop ? req(typeof val === 'string' ? val.trim() : val) : true;
function requiredUnless(propOrFunction) {
  return function (value, parentVM) {
    if (typeof propOrFunction !== 'function') {
      return validate(unref(propOrFunction), value);
    }
    const result = propOrFunction.call(this, value, parentVM);
    return validate(result, value);
  };
}

function sameAs (equalTo) {
  return value => unref(value) === unref(equalTo);
}

const urlRegex = /^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u00a1-\uffff][a-z0-9\u00a1-\uffff_-]{0,62})?[a-z0-9\u00a1-\uffff]\.)+(?:[a-z\u00a1-\uffff]{2,}\.?))(?::\d{2,5})?(?:[/?#]\S*)?$/i;
var url = regex(urlRegex);

function syncOr(validators) {
  return function (...args) {
    return validators.reduce((valid, fn) => {
      if (unwrapValidatorResponse(valid)) return valid;
      return unwrapNormalizedValidator(fn).apply(this, args);
    }, false);
  };
}
function asyncOr(validators) {
  return function (...args) {
    return validators.reduce(async (valid, fn) => {
      const r = await valid;
      if (unwrapValidatorResponse(r)) return r;
      return unwrapNormalizedValidator(fn).apply(this, args);
    }, Promise.resolve(false));
  };
}
function or(...validators) {
  const $async = validators.some(v => v.$async);
  const $watchTargets = validators.reduce((all, v) => {
    if (!v.$watchTargets) return all;
    return all.concat(v.$watchTargets);
  }, []);
  let $validator = () => false;
  if (validators.length) $validator = $async ? asyncOr(validators) : syncOr(validators);
  return {
    $async,
    $validator,
    $watchTargets
  };
}

function syncAnd(validators) {
  return function (...args) {
    return validators.reduce((valid, fn) => {
      if (!unwrapValidatorResponse(valid)) return valid;
      return unwrapNormalizedValidator(fn).apply(this, args);
    }, true);
  };
}
function asyncAnd(validators) {
  return function (...args) {
    return validators.reduce(async (valid, fn) => {
      const r = await valid;
      if (!unwrapValidatorResponse(r)) return r;
      return unwrapNormalizedValidator(fn).apply(this, args);
    }, Promise.resolve(true));
  };
}
function and(...validators) {
  const $async = validators.some(v => v.$async);
  const $watchTargets = validators.reduce((all, v) => {
    if (!v.$watchTargets) return all;
    return all.concat(v.$watchTargets);
  }, []);
  let $validator = () => false;
  if (validators.length) $validator = $async ? asyncAnd(validators) : syncAnd(validators);
  return {
    $async,
    $validator,
    $watchTargets
  };
}

function not (validator) {
  return function (value, vm) {
    if (!req(value)) return true;
    const response = unwrapNormalizedValidator(validator).call(this, value, vm);
    if (!isPromise(response)) return !unwrapValidatorResponse(response);
    return response.then(r => !unwrapValidatorResponse(r));
  };
}

function minValue (min) {
  return value => !req(value) || (!/\s/.test(value) || value instanceof Date) && +value >= +unref(min);
}

function maxValue (max) {
  return value => !req(value) || (!/\s/.test(value) || value instanceof Date) && +value <= +unref(max);
}

var integer = regex(/(^[0-9]*$)|(^-[0-9]+$)/);

var decimal = regex(/^[-]?\d*(\.\d+)?$/);

export { alpha, alphaNum, and, between, decimal, email, common as helpers, integer, ipAddress, macAddress, maxLength, maxValue, minLength, minValue, not, numeric, or, required, requiredIf, requiredUnless, sameAs, url };
