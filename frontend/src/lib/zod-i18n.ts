import i18next from "i18next";
import { z } from "zod";
import { zodI18nMap } from "zod-i18n-map";
import translation from "zod-i18n-map/locales/pt/zod.json";

// Initialize i18next
i18next.init({
  lng: "pt",
  resources: {
    pt: {
      zod: {
        ...translation,
        "invalid_type": "O tipo do campo é inválido",
        "invalid_type_received_undefined": "Obrigatório",
        "invalid_type_received_null": "Obrigatório",
        "invalid_literal": "Valor inválido",
        "custom": "Valor inválido",
        "invalid_union": "Valor inválido",
        "invalid_union_discriminator": "Valor inválido",
        "invalid_enum_value": "Valor inválido",
        "unrecognized_keys": "Chave não reconhecida",
        "invalid_arguments": "Argumentos inválidos",
        "invalid_return_type": "Tipo de retorno inválido",
        "invalid_date": "Data inválida",
        "invalid_string": {
          "email": "Email inválido",
          "url": "URL inválida",
          "uuid": "UUID inválido",
          "datetime": "Data e hora inválidas",
          "startsWith": "Deve começar com \"{{startsWith}}\"",
          "endsWith": "Deve terminar com \"{{endsWith}}\""
        },
        "too_small": {
          "string": {
            "exact": "Deve ter exatamente {{minimum}} caracteres",
            "inclusive": "Deve ter no mínimo {{minimum}} caracteres",
            "not_inclusive": "Deve ter mais de {{minimum}} caracteres"
          },
          "number": {
            "exact": "Deve ser exatamente {{minimum}}",
            "inclusive": "Deve ser no mínimo {{minimum}}",
            "not_inclusive": "Deve ser maior que {{minimum}}"
          },
          "array": {
            "exact": "Deve ter exatamente {{minimum}} itens",
            "inclusive": "Deve ter no mínimo {{minimum}} itens",
            "not_inclusive": "Deve ter mais de {{minimum}} itens"
          },
          "set": {
            "exact": "Deve ter exatamente {{minimum}} itens",
            "inclusive": "Deve ter no mínimo {{minimum}} itens",
            "not_inclusive": "Deve ter mais de {{minimum}} itens"
          }
        },
        "too_big": {
          "string": {
            "exact": "Deve ter exatamente {{maximum}} caracteres",
            "inclusive": "Deve ter no máximo {{maximum}} caracteres",
            "not_inclusive": "Deve ter menos de {{maximum}} caracteres"
          },
          "number": {
            "exact": "Deve ser exatamente {{maximum}}",
            "inclusive": "Deve ser no máximo {{maximum}}",
            "not_inclusive": "Deve ser menor que {{maximum}}"
          },
          "array": {
            "exact": "Deve ter exatamente {{maximum}} itens",
            "inclusive": "Deve ter no máximo {{maximum}} itens",
            "not_inclusive": "Deve ter menos de {{maximum}} itens"
          },
          "set": {
            "exact": "Deve ter exatamente {{maximum}} itens",
            "inclusive": "Deve ter no máximo {{maximum}} itens",
            "not_inclusive": "Deve ter menos de {{maximum}} itens"
          }
        }
      }
    },
  },
});

// Set Zod error map
z.setErrorMap(zodI18nMap);

export default z;
