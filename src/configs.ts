export const configs = {
    localhost: {
        port: 8443,
        localhost: 'https://localhost:8443/api/v1/',
        frontend: 'http://localhost:4200',
        debug: true,
        fork: false,
        https: true,
        migrations: '/../psql-migrations/',
        min_fe_version: 1,
        aws: {
            jwtKey: `-----BEGIN RSA PRIVATE KEY-----
MIICWwIBAAKBgQCmL1BWiJEUXOrOPAnMM6VM7Iy3mAV5hOsP1lIj/6lDzpQ3Q+7f
PkG8jBHHoSJM3wLWNtKQMBpu0VsxFnoMIuwkVc/+vZj7nlYMBLrSqOZfY8FBSrOt
7Xv+IvgiYgShBAG4L9bVp5ABJGcsoZnEDa1TfW2HlwoPk7sd5wmY7J6f9wIDAQAB
AoGAHLJs6BR7IQ4OigB6HKYKdGcgwY9h2qMmSDzVQFwkqY3hsE1t0WUZyupRI6zi
lG2qOr2KzNVRqzNB0Q81kiTxq+lIqDNVzpWVfQU7qDQ+MDDp3AmJKdsdUVLUtm1o
TdP6M6MtjASZwezsnbx5V7Lcn+osoVEHAbVrjpFRd8LEVOECQQDYTwRmGQg1zFkc
xzD/Lw+KeVACpQ7p9XYB4NDeswFiU8FZFY4X4knEzVXU9T2Cbj0Cn385VWcsAvv+
1LSJ6keRAkEAxK3Blhdr9/PMrXBaV3r+tJyLqORyccaJ74FhtO6yg3rlJAvVWGX5
Rm8vEFhVraU51zLXt2PW7TLlYGPrR5R7BwJAOdh3vq33ChwJwK5sJfH53/gtM2fc
oyhnVH1Ani2Usyzeyen/w9daDu0yhO7Icjb0zdzFcxmpq5Voum87kJ48YQJAOeSX
ljGgw2TNO8RVo2h97vYhmf5cvabeVVS1SQf2HgOfzWN6UkH6BUSXCu2lkq6O/wxl
OQM3cazInf3rdK99IwJAVKYi2RLe5rflCLslT8tpZ5gQZrysTjl6h50UA7QjlHS5
yS5Q3QkH1/Ltfp3q+CFRFylfP/2BEnDTVKShi2RbAw==
-----END RSA PRIVATE KEY-----`,
            jwtCertificate: `-----BEGIN CERTIFICATE-----
MIICQTCCAaoCCQDqhDzmFLYtSzANBgkqhkiG9w0BAQsFADBkMQswCQYDVQQGEwJC
RTETMBEGA1UECAwKU29tZS1TdGF0ZTEUMBIGA1UEBwwLTG9kZWxpbnNhcnQxFDAS
BgNVBAoMC3doaWdpLXdpc3NsMRQwEgYDVQQDDAt3aGlnaS13aXNzbDAgFw0xNzAy
MDMxMDU0NDZaGA8zMDE2MDYwNjEwNTQ0NlowZDELMAkGA1UEBhMCQkUxEzARBgNV
BAgMClNvbWUtU3RhdGUxFDASBgNVBAcMC0xvZGVsaW5zYXJ0MRQwEgYDVQQKDAt3
aGlnaS13aXNzbDEUMBIGA1UEAwwLd2hpZ2ktd2lzc2wwgZ8wDQYJKoZIhvcNAQEB
BQADgY0AMIGJAoGBAKYvUFaIkRRc6s48CcwzpUzsjLeYBXmE6w/WUiP/qUPOlDdD
7t8+QbyMEcehIkzfAtY20pAwGm7RWzEWegwi7CRVz/69mPueVgwEutKo5l9jwUFK
s63te/4i+CJiBKEEAbgv1tWnkAEkZyyhmcQNrVN9bYeXCg+Tux3nCZjsnp/3AgMB
AAEwDQYJKoZIhvcNAQELBQADgYEAmVo6El6WptLSsA94DLAc65KLTOIl5jxEPSer
NUKiAFsqJhI251+Mb8XW4Yo9hDrjMNYWTkyS3h2wQnRK7zjh0JFkN6BX18gafq8B
Ze3NZy+J1erX9gjTm9fD/+V4GxjyexP2rlvzJbLKdOwxPjW2R0WBVJCjyjraaV2c
T5QylRM=
-----END CERTIFICATE-----`,
            jwtValiditySeconds: 365 * 86400,
            memcached: <string>undefined,
            memcachedTimeout: 30
        },
        server: {
            pluginsDir: 'services/plugins',
            blockchain: {
                rpc: 'https://infrachain-bc.intech.lu/rpc',
                address: '0x0cb3926685f4ef0c081965d9630f1b8203f011b7',
                privateKey: '0x44f1b9ecc22636811620701133ab9689e207b87b9fb8569ba24b9e38c7cc9941'
            },
            contractVoteDecypher: `-----BEGIN RSA PRIVATE KEY-----
MIICWwIBAAKBgQCmL1BWiJEUXOrOPAnMM6VM7Iy3mAV5hOsP1lIj/6lDzpQ3Q+7f
PkG8jBHHoSJM3wLWNtKQMBpu0VsxFnoMIuwkVc/+vZj7nlYMBLrSqOZfY8FBSrOt
7Xv+IvgiYgShBAG4L9bVp5ABJGcsoZnEDa1TfW2HlwoPk7sd5wmY7J6f9wIDAQAB
AoGAHLJs6BR7IQ4OigB6HKYKdGcgwY9h2qMmSDzVQFwkqY3hsE1t0WUZyupRI6zi
lG2qOr2KzNVRqzNB0Q81kiTxq+lIqDNVzpWVfQU7qDQ+MDDp3AmJKdsdUVLUtm1o
TdP6M6MtjASZwezsnbx5V7Lcn+osoVEHAbVrjpFRd8LEVOECQQDYTwRmGQg1zFkc
xzD/Lw+KeVACpQ7p9XYB4NDeswFiU8FZFY4X4knEzVXU9T2Cbj0Cn385VWcsAvv+
1LSJ6keRAkEAxK3Blhdr9/PMrXBaV3r+tJyLqORyccaJ74FhtO6yg3rlJAvVWGX5
Rm8vEFhVraU51zLXt2PW7TLlYGPrR5R7BwJAOdh3vq33ChwJwK5sJfH53/gtM2fc
oyhnVH1Ani2Usyzeyen/w9daDu0yhO7Icjb0zdzFcxmpq5Voum87kJ48YQJAOeSX
ljGgw2TNO8RVo2h97vYhmf5cvabeVVS1SQf2HgOfzWN6UkH6BUSXCu2lkq6O/wxl
OQM3cazInf3rdK99IwJAVKYi2RLe5rflCLslT8tpZ5gQZrysTjl6h50UA7QjlHS5
yS5Q3QkH1/Ltfp3q+CFRFylfP/2BEnDTVKShi2RbAw==
-----END RSA PRIVATE KEY-----`
        },
        app: {
            blockchain: {
                rpc: 'https://infrachain-bc.intech.lu/rpc'
            },
            contractVoteCypher: `-----BEGIN CERTIFICATE-----
MIICQTCCAaoCCQDqhDzmFLYtSzANBgkqhkiG9w0BAQsFADBkMQswCQYDVQQGEwJC
RTETMBEGA1UECAwKU29tZS1TdGF0ZTEUMBIGA1UEBwwLTG9kZWxpbnNhcnQxFDAS
BgNVBAoMC3doaWdpLXdpc3NsMRQwEgYDVQQDDAt3aGlnaS13aXNzbDAgFw0xNzAy
MDMxMDU0NDZaGA8zMDE2MDYwNjEwNTQ0NlowZDELMAkGA1UEBhMCQkUxEzARBgNV
BAgMClNvbWUtU3RhdGUxFDASBgNVBAcMC0xvZGVsaW5zYXJ0MRQwEgYDVQQKDAt3
aGlnaS13aXNzbDEUMBIGA1UEAwwLd2hpZ2ktd2lzc2wwgZ8wDQYJKoZIhvcNAQEB
BQADgY0AMIGJAoGBAKYvUFaIkRRc6s48CcwzpUzsjLeYBXmE6w/WUiP/qUPOlDdD
7t8+QbyMEcehIkzfAtY20pAwGm7RWzEWegwi7CRVz/69mPueVgwEutKo5l9jwUFK
s63te/4i+CJiBKEEAbgv1tWnkAEkZyyhmcQNrVN9bYeXCg+Tux3nCZjsnp/3AgMB
AAEwDQYJKoZIhvcNAQELBQADgYEAmVo6El6WptLSsA94DLAc65KLTOIl5jxEPSer
NUKiAFsqJhI251+Mb8XW4Yo9hDrjMNYWTkyS3h2wQnRK7zjh0JFkN6BX18gafq8B
Ze3NZy+J1erX9gjTm9fD/+V4GxjyexP2rlvzJbLKdOwxPjW2R0WBVJCjyjraaV2c
T5QylRM=
-----END CERTIFICATE-----`
        },
        db: {
            host: 'localhost',
            port: 5432,
            user: 'postgres',
            password: 'postgres',
            database: 'infrachain',
            client_encoding: 'utf8',
            max: 30
        },
        keypem: '/../ca-key.pem',
        certpem: '/../ca-cert.pem',
        cacertpem: '/../ca-cert.pem'
    },
    production: {
        port: 5000,
        localhost: 'http://3.122.243.96:5000/api/v1/',
        frontend: 'http://3.122.243.96:4200',
        debug: false,
        fork: true,
        https: false,
        migrations: '/../psql-migrations/',
        min_fe_version: 1,
        aws: {
            jwtKey: `-----BEGIN RSA PRIVATE KEY-----
MIICWwIBAAKBgQCmL1BWiJEUXOrOPAnMM6VM7Iy3mAV5hOsP1lIj/6lDzpQ3Q+7f
PkG8jBHHoSJM3wLWNtKQMBpu0VsxFnoMIuwkVc/+vZj7nlYMBLrSqOZfY8FBSrOt
7Xv+IvgiYgShBAG4L9bVp5ABJGcsoZnEDa1TfW2HlwoPk7sd5wmY7J6f9wIDAQAB
AoGAHLJs6BR7IQ4OigB6HKYKdGcgwY9h2qMmSDzVQFwkqY3hsE1t0WUZyupRI6zi
lG2qOr2KzNVRqzNB0Q81kiTxq+lIqDNVzpWVfQU7qDQ+MDDp3AmJKdsdUVLUtm1o
TdP6M6MtjASZwezsnbx5V7Lcn+osoVEHAbVrjpFRd8LEVOECQQDYTwRmGQg1zFkc
xzD/Lw+KeVACpQ7p9XYB4NDeswFiU8FZFY4X4knEzVXU9T2Cbj0Cn385VWcsAvv+
1LSJ6keRAkEAxK3Blhdr9/PMrXBaV3r+tJyLqORyccaJ74FhtO6yg3rlJAvVWGX5
Rm8vEFhVraU51zLXt2PW7TLlYGPrR5R7BwJAOdh3vq33ChwJwK5sJfH53/gtM2fc
oyhnVH1Ani2Usyzeyen/w9daDu0yhO7Icjb0zdzFcxmpq5Voum87kJ48YQJAOeSX
ljGgw2TNO8RVo2h97vYhmf5cvabeVVS1SQf2HgOfzWN6UkH6BUSXCu2lkq6O/wxl
OQM3cazInf3rdK99IwJAVKYi2RLe5rflCLslT8tpZ5gQZrysTjl6h50UA7QjlHS5
yS5Q3QkH1/Ltfp3q+CFRFylfP/2BEnDTVKShi2RbAw==
-----END RSA PRIVATE KEY-----`,
            jwtCertificate: `-----BEGIN CERTIFICATE-----
MIICQTCCAaoCCQDqhDzmFLYtSzANBgkqhkiG9w0BAQsFADBkMQswCQYDVQQGEwJC
RTETMBEGA1UECAwKU29tZS1TdGF0ZTEUMBIGA1UEBwwLTG9kZWxpbnNhcnQxFDAS
BgNVBAoMC3doaWdpLXdpc3NsMRQwEgYDVQQDDAt3aGlnaS13aXNzbDAgFw0xNzAy
MDMxMDU0NDZaGA8zMDE2MDYwNjEwNTQ0NlowZDELMAkGA1UEBhMCQkUxEzARBgNV
BAgMClNvbWUtU3RhdGUxFDASBgNVBAcMC0xvZGVsaW5zYXJ0MRQwEgYDVQQKDAt3
aGlnaS13aXNzbDEUMBIGA1UEAwwLd2hpZ2ktd2lzc2wwgZ8wDQYJKoZIhvcNAQEB
BQADgY0AMIGJAoGBAKYvUFaIkRRc6s48CcwzpUzsjLeYBXmE6w/WUiP/qUPOlDdD
7t8+QbyMEcehIkzfAtY20pAwGm7RWzEWegwi7CRVz/69mPueVgwEutKo5l9jwUFK
s63te/4i+CJiBKEEAbgv1tWnkAEkZyyhmcQNrVN9bYeXCg+Tux3nCZjsnp/3AgMB
AAEwDQYJKoZIhvcNAQELBQADgYEAmVo6El6WptLSsA94DLAc65KLTOIl5jxEPSer
NUKiAFsqJhI251+Mb8XW4Yo9hDrjMNYWTkyS3h2wQnRK7zjh0JFkN6BX18gafq8B
Ze3NZy+J1erX9gjTm9fD/+V4GxjyexP2rlvzJbLKdOwxPjW2R0WBVJCjyjraaV2c
T5QylRM=
-----END CERTIFICATE-----`,
            jwtValiditySeconds: 86400,
            memcached: <string>undefined,
            memcachedTimeout: 30
        },
        server: {
            pluginsDir: 'services/plugins',
            blockchain: {
                rpc: 'https://infrachain-bc.intech.lu/rpc',
                address: '0x0cb3926685f4ef0c081965d9630f1b8203f011b7',
                privateKey: '0x44f1b9ecc22636811620701133ab9689e207b87b9fb8569ba24b9e38c7cc9941'
            },
            contractVoteDecypher: `-----BEGIN RSA PRIVATE KEY-----
MIICWwIBAAKBgQCmL1BWiJEUXOrOPAnMM6VM7Iy3mAV5hOsP1lIj/6lDzpQ3Q+7f
PkG8jBHHoSJM3wLWNtKQMBpu0VsxFnoMIuwkVc/+vZj7nlYMBLrSqOZfY8FBSrOt
7Xv+IvgiYgShBAG4L9bVp5ABJGcsoZnEDa1TfW2HlwoPk7sd5wmY7J6f9wIDAQAB
AoGAHLJs6BR7IQ4OigB6HKYKdGcgwY9h2qMmSDzVQFwkqY3hsE1t0WUZyupRI6zi
lG2qOr2KzNVRqzNB0Q81kiTxq+lIqDNVzpWVfQU7qDQ+MDDp3AmJKdsdUVLUtm1o
TdP6M6MtjASZwezsnbx5V7Lcn+osoVEHAbVrjpFRd8LEVOECQQDYTwRmGQg1zFkc
xzD/Lw+KeVACpQ7p9XYB4NDeswFiU8FZFY4X4knEzVXU9T2Cbj0Cn385VWcsAvv+
1LSJ6keRAkEAxK3Blhdr9/PMrXBaV3r+tJyLqORyccaJ74FhtO6yg3rlJAvVWGX5
Rm8vEFhVraU51zLXt2PW7TLlYGPrR5R7BwJAOdh3vq33ChwJwK5sJfH53/gtM2fc
oyhnVH1Ani2Usyzeyen/w9daDu0yhO7Icjb0zdzFcxmpq5Voum87kJ48YQJAOeSX
ljGgw2TNO8RVo2h97vYhmf5cvabeVVS1SQf2HgOfzWN6UkH6BUSXCu2lkq6O/wxl
OQM3cazInf3rdK99IwJAVKYi2RLe5rflCLslT8tpZ5gQZrysTjl6h50UA7QjlHS5
yS5Q3QkH1/Ltfp3q+CFRFylfP/2BEnDTVKShi2RbAw==
-----END RSA PRIVATE KEY-----`
        },
        app: {
            blockchain: {
                rpc: 'https://infrachain-bc.intech.lu/rpc'
            },
            contractVoteCypher: `-----BEGIN CERTIFICATE-----
MIICQTCCAaoCCQDqhDzmFLYtSzANBgkqhkiG9w0BAQsFADBkMQswCQYDVQQGEwJC
RTETMBEGA1UECAwKU29tZS1TdGF0ZTEUMBIGA1UEBwwLTG9kZWxpbnNhcnQxFDAS
BgNVBAoMC3doaWdpLXdpc3NsMRQwEgYDVQQDDAt3aGlnaS13aXNzbDAgFw0xNzAy
MDMxMDU0NDZaGA8zMDE2MDYwNjEwNTQ0NlowZDELMAkGA1UEBhMCQkUxEzARBgNV
BAgMClNvbWUtU3RhdGUxFDASBgNVBAcMC0xvZGVsaW5zYXJ0MRQwEgYDVQQKDAt3
aGlnaS13aXNzbDEUMBIGA1UEAwwLd2hpZ2ktd2lzc2wwgZ8wDQYJKoZIhvcNAQEB
BQADgY0AMIGJAoGBAKYvUFaIkRRc6s48CcwzpUzsjLeYBXmE6w/WUiP/qUPOlDdD
7t8+QbyMEcehIkzfAtY20pAwGm7RWzEWegwi7CRVz/69mPueVgwEutKo5l9jwUFK
s63te/4i+CJiBKEEAbgv1tWnkAEkZyyhmcQNrVN9bYeXCg+Tux3nCZjsnp/3AgMB
AAEwDQYJKoZIhvcNAQELBQADgYEAmVo6El6WptLSsA94DLAc65KLTOIl5jxEPSer
NUKiAFsqJhI251+Mb8XW4Yo9hDrjMNYWTkyS3h2wQnRK7zjh0JFkN6BX18gafq8B
Ze3NZy+J1erX9gjTm9fD/+V4GxjyexP2rlvzJbLKdOwxPjW2R0WBVJCjyjraaV2c
T5QylRM=
-----END CERTIFICATE-----`
        },
        db: {
            host: '127.0.0.1',
            port: 5432,
            user: 'stampify',
            password: 'postgres',
            database: 'infrachain',
            client_encoding: 'utf8',
            max: 30
        },
        keypem: '/../ca-key.pem',
        certpem: '/../ca-cert.pem',
        cacertpem: '/../ca-cert.pem'
    }
};
