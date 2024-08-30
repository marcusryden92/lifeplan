"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BeatLoader } from "react-spinners";

import { newVerification } from "@/actions/new-verification-action";
import { CardWrapper } from "@/components/auth/card-wrapper";
import { FormError } from "@/components/ui/form-error";
import { FormSuccess } from "@/components/ui/form-success";

export function NewVerificationForm() {
  const [error, setError] = useState<string | undefined>();
  const [success, setSuccess] = useState<string | undefined>();

  const searchParams = useSearchParams();

  const token = searchParams.get("token");

  const onSubmit = useCallback(() => {
    if (!token) {
      setError("Missing token");
      return;
    }

    newVerification(token)
      .then((data) => {
        setSuccess(data.success);
        setError(data.error);
      })
      .catch(() => {
        setError("Something went wrong!");
      });
  }, [token]);

  useEffect(() => {
    onSubmit();
  }, [onSubmit]);

  return (
    <CardWrapper
      headerLabel="Confirming your verification"
      backButtonLabel="Back to login"
      backbuttonHref="/auth/login"
    >
      <div className="flex items-center w-full justify-center">
        {!success && !error ? <BeatLoader /> : ""}
        <FormSuccess message={success} />
        <FormError message={error} />
      </div>
    </CardWrapper>
  );
}
