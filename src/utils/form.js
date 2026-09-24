/**
 * Class for a form control styled by the shared `.form-input` rules
 * (index.css). Pass the field's error to flag it invalid.
 */
export const controlClass = (error) => `form-input${error ? ' is-error' : ''}`
