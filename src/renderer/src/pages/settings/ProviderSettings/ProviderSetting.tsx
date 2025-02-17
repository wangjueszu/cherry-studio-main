import {
  CheckOutlined,
  EditOutlined,
  ExportOutlined,
  LoadingOutlined,
  MinusCircleOutlined,
  PlusOutlined,
  SettingOutlined
} from '@ant-design/icons'
import { HStack } from '@renderer/components/Layout'
import ModelTags from '@renderer/components/ModelTags'
import OAuthButton from '@renderer/components/OAuth/OAuthButton'
import { EMBEDDING_REGEX, getModelLogo, REASONING_REGEX, VISION_REGEX } from '@renderer/config/models'
import { PROVIDER_CONFIG } from '@renderer/config/providers'
import { useTheme } from '@renderer/context/ThemeProvider'
import { useAssistants, useDefaultModel } from '@renderer/hooks/useAssistant'
import { useProvider } from '@renderer/hooks/useProvider'
import i18n from '@renderer/i18n'
import { isOpenAIProvider } from '@renderer/providers/ProviderFactory'
import { checkApi } from '@renderer/services/ApiService'
import { isProviderSupportAuth, isProviderSupportCharge } from '@renderer/services/ProviderService'
import { useAppDispatch } from '@renderer/store'
import { setModel } from '@renderer/store/assistants'
import { Model, ModelType, Provider } from '@renderer/types'
import { providerCharge } from '@renderer/utils/oauth'
import { Avatar, Button, Card, Checkbox, Divider, Flex, Input, Popover, Space, Switch } from 'antd'
import Link from 'antd/es/typography/Link'
import { groupBy, isEmpty } from 'lodash'
import { FC, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import {
  SettingContainer,
  SettingHelpLink,
  SettingHelpText,
  SettingHelpTextRow,
  SettingSubtitle,
  SettingTitle
} from '..'
import AddModelPopup from './AddModelPopup'
import ApiCheckPopup from './ApiCheckPopup'
import EditModelsPopup from './EditModelsPopup'
import GraphRAGSettings from './GraphRAGSettings'
import LMStudioSettings from './LMStudioSettings'
import OllamSettings from './OllamaSettings'
import SelectProviderModelPopup from './SelectProviderModelPopup'

interface Props {
  provider: Provider
}

const ProviderSetting: FC<Props> = ({ provider: _provider }) => {
  const { provider } = useProvider(_provider.id)
  const [apiKey, setApiKey] = useState(provider.apiKey)
  const [apiHost, setApiHost] = useState(provider.apiHost)
  const [apiVersion, setApiVersion] = useState(provider.apiVersion)
  const [apiValid, setApiValid] = useState(false)
  const [apiChecking, setApiChecking] = useState(false)
  const { updateProvider, models, removeModel } = useProvider(provider.id)
  const { assistants } = useAssistants()
  const { t } = useTranslation()
  const { theme } = useTheme()
  const dispatch = useAppDispatch()

  const { defaultModel, setDefaultModel } = useDefaultModel()

  const modelGroups = groupBy(models, 'group')
  const isAzureOpenAI = provider.id === 'azure-openai' || provider.type === 'azure-openai'

  const providerConfig = PROVIDER_CONFIG[provider.id]
  const officialWebsite = providerConfig?.websites?.official
  const apiKeyWebsite = providerConfig?.websites?.apiKey
  const docsWebsite = providerConfig?.websites?.docs
  const modelsWebsite = providerConfig?.websites?.models
  const configedApiHost = providerConfig?.api?.url

  const onUpdateApiKey = () => {
    if (apiKey !== provider.apiKey) {
      updateProvider({ ...provider, apiKey })
    }
  }

  const onUpdateApiHost = () => {
    if (apiHost.trim()) {
      updateProvider({ ...provider, apiHost })
    } else {
      setApiHost(provider.apiHost)
    }
  }

  const onUpdateApiVersion = () => updateProvider({ ...provider, apiVersion })
  const onManageModel = () => EditModelsPopup.show({ provider })
  const onAddModel = () => AddModelPopup.show({ title: t('settings.models.add.add_model'), provider })

  const onCheckApi = async () => {
    if (isEmpty(models)) {
      window.message.error({
        key: 'no-models',
        style: { marginTop: '3vh' },
        duration: 5,
        content: t('settings.provider.no_models')
      })
      return
    }

    const model = await SelectProviderModelPopup.show({ provider })

    if (!model) {
      window.message.error({ content: i18n.t('message.error.enter.model'), key: 'api-check' })
      return
    }

    if (apiKey.includes(',')) {
      const keys = apiKey
        .split(',')
        .map((k) => k.trim())
        .filter((k) => k)

      const result = await ApiCheckPopup.show({
        title: t('settings.provider.check_multiple_keys'),
        provider: { ...provider, apiHost },
        model,
        apiKeys: keys
      })

      if (result?.validKeys) {
        setApiKey(result.validKeys.join(','))
        updateProvider({ ...provider, apiKey: result.validKeys.join(',') })
      }
    } else {
      setApiChecking(true)

      const { valid, error } = await checkApi({ ...provider, apiKey, apiHost }, model)

      const errorMessage = error && error?.message ? ' ' + error?.message : ''

      window.message[valid ? 'success' : 'error']({
        key: 'api-check',
        style: { marginTop: '3vh' },
        duration: valid ? 2 : 8,
        content: valid
          ? i18n.t('message.api.connection.success')
          : i18n.t('message.api.connection.failed') + errorMessage
      })

      setApiValid(valid)
      setApiChecking(false)
      setTimeout(() => setApiValid(false), 3000)
    }
  }

  const onReset = () => {
    setApiHost(configedApiHost)
    updateProvider({ ...provider, apiHost: configedApiHost })
  }

  const hostPreview = () => {
    if (apiHost.endsWith('#')) {
      return apiHost.replace('#', '')
    }

    return (apiHost.endsWith('/') ? apiHost : `${apiHost}/v1/`) + 'chat/completions'
  }

  const onUpdateModelTypes = (model: Model, types: ModelType[]) => {
    const updatedModels = models.map((m) => {
      if (m.id === model.id) {
        return { ...m, type: types }
      }
      return m
    })

    updateProvider({ ...provider, models: updatedModels })

    assistants.forEach((assistant) => {
      if (assistant?.model?.id === model.id && assistant.model.provider === provider.id) {
        dispatch(
          setModel({
            assistantId: assistant.id,
            model: { ...model, type: types }
          })
        )
      }
    })

    if (defaultModel?.id === model.id && defaultModel?.provider === provider.id) {
      setDefaultModel({ ...defaultModel, type: types })
    }
  }

  const modelTypeContent = (model: Model) => {
    // 获取默认选中的类型
    const defaultTypes = [
      ...(VISION_REGEX.test(model.id) ? ['vision'] : []),
      ...(EMBEDDING_REGEX.test(model.id) ? ['embedding'] : []),
      ...(REASONING_REGEX.test(model.id) ? ['reasoning'] : [])
    ] as ModelType[]

    // 合并现有选择和默认类型
    const selectedTypes = [...new Set([...(model.type || []), ...defaultTypes])]

    return (
      <div>
        <Checkbox.Group
          value={selectedTypes}
          onChange={(types) => onUpdateModelTypes(model, types as ModelType[])}
          options={[
            { label: t('models.type.vision'), value: 'vision', disabled: VISION_REGEX.test(model.id) },
            { label: t('models.type.embedding'), value: 'embedding', disabled: EMBEDDING_REGEX.test(model.id) },
            { label: t('models.type.reasoning'), value: 'reasoning', disabled: REASONING_REGEX.test(model.id) }
          ]}
        />
      </div>
    )
  }

  const formatApiKeys = (value: string) => {
    return value.replaceAll('，', ',').replaceAll(' ', ',').replaceAll(' ', '').replaceAll('\n', ',')
  }

  useEffect(() => {
    setApiKey(provider.apiKey)
    setApiHost(provider.apiHost)
  }, [provider.apiKey, provider.apiHost])

  // Save apiKey to provider when unmount
  useEffect(() => {
    return () => {
      if (apiKey.trim() && apiKey !== provider.apiKey) {
        updateProvider({ ...provider, apiKey })
      }
    }
  }, [apiKey, provider, updateProvider])

  return (
    <SettingContainer theme={theme}>
      <SettingTitle>
        <Flex align="center" gap={8}>
          <ProviderName>{provider.isSystem ? t(`provider.${provider.id}`) : provider.name}</ProviderName>
          {officialWebsite! && (
            <Link target="_blank" href={providerConfig.websites.official}>
              <ExportOutlined style={{ color: 'var(--color-text)', fontSize: '12px' }} />
            </Link>
          )}
        </Flex>
        <Switch
          value={provider.enabled}
          key={provider.id}
          onChange={(enabled) => updateProvider({ ...provider, apiKey, apiHost, enabled })}
        />
      </SettingTitle>
      <Divider style={{ width: '100%', margin: '10px 0' }} />
      <SettingSubtitle style={{ marginTop: 5 }}>{t('settings.provider.api_key')}</SettingSubtitle>
      <Space.Compact style={{ width: '100%', marginTop: 5 }}>
        <Input.Password
          value={apiKey}
          placeholder={t('settings.provider.api_key')}
          onChange={(e) => setApiKey(formatApiKeys(e.target.value))}
          onBlur={onUpdateApiKey}
          spellCheck={false}
          type="password"
          autoFocus={provider.enabled && apiKey === ''}
        />
        {isProviderSupportAuth(provider) && <OAuthButton provider={provider} onSuccess={setApiKey} />}
        <Button
          type={apiValid ? 'primary' : 'default'}
          ghost={apiValid}
          onClick={onCheckApi}
          disabled={!apiHost || apiChecking}>
          {apiChecking ? <LoadingOutlined spin /> : apiValid ? <CheckOutlined /> : t('settings.provider.check')}
        </Button>
      </Space.Compact>
      {apiKeyWebsite && (
        <SettingHelpTextRow style={{ justifyContent: 'space-between' }}>
          <HStack gap={5}>
            <SettingHelpLink target="_blank" href={apiKeyWebsite}>
              {t('settings.provider.get_api_key')}
            </SettingHelpLink>
            {isProviderSupportCharge(provider) && (
              <SettingHelpLink onClick={() => providerCharge(provider.id)}>
                {t('settings.provider.charge')}
              </SettingHelpLink>
            )}
          </HStack>
          <SettingHelpText>{t('settings.provider.api_key.tip')}</SettingHelpText>
        </SettingHelpTextRow>
      )}
      <SettingSubtitle>{t('settings.provider.api_host')}</SettingSubtitle>
      <Space.Compact style={{ width: '100%', marginTop: 5 }}>
        <Input
          value={apiHost}
          placeholder={t('settings.provider.api_host')}
          onChange={(e) => setApiHost(e.target.value)}
          onBlur={onUpdateApiHost}
        />
        {!isEmpty(configedApiHost) && apiHost !== configedApiHost && (
          <Button danger onClick={onReset}>
            {t('settings.provider.api.url.reset')}
          </Button>
        )}
      </Space.Compact>
      {isOpenAIProvider(provider) && (
        <SettingHelpTextRow style={{ justifyContent: 'space-between' }}>
          <SettingHelpText style={{ marginLeft: 6 }}>{hostPreview()}</SettingHelpText>
          <SettingHelpText>{t('settings.provider.api.url.tip')}</SettingHelpText>
        </SettingHelpTextRow>
      )}
      {isAzureOpenAI && (
        <>
          <SettingSubtitle>{t('settings.provider.api_version')}</SettingSubtitle>
          <Space.Compact style={{ width: '100%', marginTop: 5 }}>
            <Input
              value={apiVersion}
              placeholder="2024-xx-xx-preview"
              onChange={(e) => setApiVersion(e.target.value)}
              onBlur={onUpdateApiVersion}
            />
          </Space.Compact>
        </>
      )}
      {provider.id === 'ollama' && <OllamSettings />}
      {provider.id === 'lmstudio' && <LMStudioSettings />}
      {provider.id === 'graphrag-kylin-mountain' && provider.models.length > 0 && (
        <GraphRAGSettings provider={provider} />
      )}
      <SettingSubtitle style={{ marginBottom: 5 }}>{t('common.models')}</SettingSubtitle>
      {Object.keys(modelGroups).map((group) => (
        <Card
          key={group}
          type="inner"
          title={group}
          style={{ marginBottom: '10px', border: '0.5px solid var(--color-border)' }}
          size="small">
          {modelGroups[group].map((model) => (
            <ModelListItem key={model.id}>
              <ModelListHeader>
                <Avatar src={getModelLogo(model.id)} size={22} style={{ marginRight: '8px' }}>
                  {model?.name?.[0]?.toUpperCase()}
                </Avatar>
                <ModelNameRow>
                  <span>{model?.name}</span>
                  <ModelTags model={model} />
                </ModelNameRow>
                <Popover content={modelTypeContent(model)} title={t('models.type.select')} trigger="click">
                  <SettingIcon />
                </Popover>
              </ModelListHeader>
              <RemoveIcon onClick={() => removeModel(model)} />
            </ModelListItem>
          ))}
        </Card>
      ))}
      {docsWebsite && (
        <SettingHelpTextRow>
          <SettingHelpText>{t('settings.provider.docs_check')} </SettingHelpText>
          <SettingHelpLink target="_blank" href={docsWebsite}>
            {t(`provider.${provider.id}`) + ' '}
            {t('common.docs')}
          </SettingHelpLink>
          <SettingHelpText>{t('common.and')}</SettingHelpText>
          <SettingHelpLink target="_blank" href={modelsWebsite}>
            {t('common.models')}
          </SettingHelpLink>
          <SettingHelpText>{t('settings.provider.docs_more_details')}</SettingHelpText>
        </SettingHelpTextRow>
      )}
      <Flex gap={10} style={{ marginTop: '10px' }}>
        <Button type="primary" onClick={onManageModel} icon={<EditOutlined />}>
          {t('button.manage')}
        </Button>
        <Button type="default" onClick={onAddModel} icon={<PlusOutlined />}>
          {t('button.add')}
        </Button>
      </Flex>
    </SettingContainer>
  )
}

const ModelListItem = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 5px 0;
`

const ModelListHeader = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
`

const ModelNameRow = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
`

const RemoveIcon = styled(MinusCircleOutlined)`
  font-size: 18px;
  margin-left: 10px;
  color: var(--color-error);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
`

const SettingIcon = styled(SettingOutlined)`
  margin-left: 2px;
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  &:hover {
    color: var(--color-text-2);
  }
`

const ProviderName = styled.span`
  font-size: 14px;
  font-weight: 500;
`

export default ProviderSetting
