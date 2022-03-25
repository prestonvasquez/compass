import React, { useCallback } from 'react';
import type { AutoEncryptionOptions, AutoEncryptionTlsOptions } from 'mongodb';

import TLSCertificateAuthority from '../tls-ssl-tab/tls-certificate-authority';
import TLSClientCertificate from '../tls-ssl-tab/tls-client-certificate';
import type { UpdateConnectionFormField } from '../../../hooks/use-connect-form';

function KMSTLSOptions({
  updateConnectionFormField,
  autoEncryptionOptions,
  kmsProvider,
}: {
  updateConnectionFormField: UpdateConnectionFormField;
  autoEncryptionOptions: AutoEncryptionOptions;
  kmsProvider: keyof NonNullable<AutoEncryptionOptions['tlsOptions']>;
}): React.ReactElement {
  const currentOptions: AutoEncryptionTlsOptions =
    autoEncryptionOptions.tlsOptions?.[kmsProvider] ?? {};

  const handleFieldChanged = useCallback(
    (key: keyof AutoEncryptionTlsOptions, value?: string) => {
      return updateConnectionFormField({
        type: 'update-csfle-kms-tls-param',
        kms: kmsProvider,
        key: key,
        value,
      });
    },
    [updateConnectionFormField]
  );

  return (
    <>
      <TLSCertificateAuthority
        tlsCAFile={currentOptions.tlsCAFile}
        useSystemCA={false /* COMPASS-5635 */}
        disabled={false}
        handleTlsOptionChanged={(key, value) =>
          handleFieldChanged(
            key as 'tlsCAFile' /* COMPASS-5635 */,
            value ?? undefined
          )
        }
      />
      {/* TODO: Update UI messages for TLS situation (e.g. drop reference to X.509 auth) */}
      <TLSClientCertificate
        tlsCertificateKeyFile={currentOptions.tlsCertificateKeyFile}
        tlsCertificateKeyFilePassword={
          currentOptions.tlsCertificateKeyFilePassword
        }
        disabled={false}
        updateTLSClientCertificate={(newCertificatePath: string | null) => {
          handleFieldChanged(
            'tlsCertificateKeyFile',
            newCertificatePath ?? undefined
          );
        }}
        updateTLSClientCertificatePassword={(newPassword: string | null) => {
          handleFieldChanged(
            'tlsCertificateKeyFilePassword',
            newPassword ?? undefined
          );
        }}
      />
    </>
  );
}

export default KMSTLSOptions;
