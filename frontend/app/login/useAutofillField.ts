"use client";

import { useCallback, useRef, useState, type ChangeEvent, type FormEvent } from "react";

export const AUTOFILL_ANIMATION_NAME = "login-autofill-start";

interface UseAutofillFieldOptions {
  initialValue?: string;
  /** Delay browser autofill overlay until the user focuses the field. */
  readOnlyUntilFocus?: boolean;
}

export function useAutofillField(
  initialValue = "",
  { readOnlyUntilFocus = true }: UseAutofillFieldOptions = {},
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialValue);
  const [readOnly, setReadOnly] = useState(readOnlyUntilFocus);

  const syncFromDom = useCallback(() => {
    const domValue = inputRef.current?.value ?? "";
    setValue((prev) => (domValue !== prev ? domValue : prev));
    return domValue;
  }, []);

  const enableEditing = useCallback(() => {
    setReadOnly(false);
    syncFromDom();
  }, [syncFromDom]);

  const onChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  }, []);

  const onInput = useCallback((e: FormEvent<HTMLInputElement>) => {
    setValue(e.currentTarget.value);
  }, []);

  const onFocus = useCallback(() => {
    enableEditing();
  }, [enableEditing]);

  const onAutofillAnimationStart = useCallback(
    (e: React.AnimationEvent<HTMLInputElement>) => {
      if (e.animationName === AUTOFILL_ANIMATION_NAME) {
        syncFromDom();
        setReadOnly(false);
      }
    },
    [syncFromDom],
  );

  return {
    inputRef,
    value,
    setValue,
    readOnly,
    onChange,
    onInput,
    onFocus,
    onAutofillAnimationStart,
    syncFromDom,
    enableEditing,
  };
}
