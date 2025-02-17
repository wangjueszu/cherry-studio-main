import { FileSearchOutlined, FolderOpenOutlined, SaveOutlined } from '@ant-design/icons'
import { Client } from '@notionhq/client'
import { HStack } from '@renderer/components/Layout'
import { useTheme } from '@renderer/context/ThemeProvider'
import { backup, reset, restore } from '@renderer/services/BackupService'
import { RootState, useAppDispatch } from '@renderer/store'
import { setNotionApiKey, setNotionDatabaseID } from '@renderer/store/settings'
import { AppInfo } from '@renderer/types'
import { Button, Modal, Typography } from 'antd'
import Input from 'antd/es/input/Input'
import { FC, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import styled from 'styled-components'

import { SettingContainer, SettingDivider, SettingGroup, SettingRow, SettingRowTitle, SettingTitle } from '..'
import WebDavSettings from './WebDavSettings'

// 新增的 NotionSettings 组件
const NotionSettings: FC = () => {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const dispatch = useAppDispatch()

  // 这里可以添加 Notion 相关的状态和逻辑
  // 例如：
  const notionApiKey = useSelector((state: RootState) => state.settings.notionApiKey)
  const notionDatabaseID = useSelector((state: RootState) => state.settings.notionDatabaseID)

  const handleNotionTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setNotionApiKey(e.target.value))
  }

  const handleNotionDatabaseIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch(setNotionDatabaseID(e.target.value))
  }
  const handleNotionConnectionCheck = () => {
    if (notionApiKey === null) {
      window.message.error(t('settings.data.notion.check.empty_api_key'))
      return
    }
    if (notionDatabaseID === null) {
      window.message.error(t('settings.data.notion.check.empty_database_id'))
      return
    }
    const notion = new Client({ auth: notionApiKey })
    notion.databases
      .retrieve({
        database_id: notionDatabaseID
      })
      .then((result) => {
        if (result) {
          window.message.success(t('settings.data.notion.check.success'))
        } else {
          window.message.error(t('settings.data.notion.check.fail'))
        }
      })
      .catch(() => {
        window.message.error(t('settings.data.notion.check.error'))
      })
  }

  return (
    <SettingGroup theme={theme}>
      <SettingTitle>{t('settings.data.notion.title')}</SettingTitle>
      <SettingDivider />
      <SettingRow>
        <SettingRowTitle>{t('settings.data.notion.database_id')}</SettingRowTitle>
        <HStack alignItems="center" gap="5px">
          <Input
            type="text"
            value={notionDatabaseID || ''}
            onChange={handleNotionDatabaseIdChange}
            onBlur={handleNotionDatabaseIdChange}
            style={{ width: 315 }}
          />
        </HStack>
      </SettingRow>
      <SettingDivider />
      <SettingRow>
        <SettingRowTitle>{t('settings.data.notion.api_key')}</SettingRowTitle>
        <HStack alignItems="center" gap="5px">
          <Input
            type="password"
            value={notionApiKey || ''}
            onChange={handleNotionTokenChange}
            onBlur={handleNotionTokenChange}
            style={{ width: 250 }}
          />
          <Button onClick={handleNotionConnectionCheck} style={{ width: 60 }}>
            {t('settings.data.notion.check.button')}
          </Button>
        </HStack>
      </SettingRow>
      <SettingDivider /> {/* 添加分割线 */}
    </SettingGroup>
  )
}

const DataSettings: FC = () => {
  const { t } = useTranslation()
  const [appInfo, setAppInfo] = useState<AppInfo>()
  const { theme } = useTheme()

  useEffect(() => {
    window.api.getAppInfo().then(setAppInfo)
  }, [])

  const handleOpenPath = (path?: string) => {
    if (!path) return
    if (path?.endsWith('log')) {
      const dirPath = path.split(/[/\\]/).slice(0, -1).join('/')
      window.api.openPath(dirPath)
    } else {
      window.api.openPath(path)
    }
  }

  const handleClearCache = () => {
    Modal.confirm({
      title: t('settings.data.clear_cache.title'),
      content: t('settings.data.clear_cache.confirm'),
      okText: t('settings.data.clear_cache.button'),
      centered: true,
      okButtonProps: {
        danger: true
      },
      onOk: async () => {
        try {
          await window.api.clearCache()
          window.message.success(t('settings.data.clear_cache.success'))
        } catch (error) {
          window.message.error(t('settings.data.clear_cache.error'))
        }
      }
    })
  }

  return (
    <SettingContainer theme={theme}>
      <SettingGroup theme={theme}>
        <SettingTitle>{t('settings.data.title')}</SettingTitle>
        <SettingDivider />
        <SettingRow>
          <SettingRowTitle>{t('settings.general.backup.title')}</SettingRowTitle>
          <HStack gap="5px" justifyContent="space-between">
            <Button onClick={backup} icon={<SaveOutlined />}>
              {t('settings.general.backup.button')}
            </Button>
            <Button onClick={restore} icon={<FolderOpenOutlined />}>
              {t('settings.general.restore.button')}
            </Button>
          </HStack>
        </SettingRow>
        <SettingDivider />
        <SettingRow>
          <SettingRowTitle>{t('settings.general.reset.title')}</SettingRowTitle>
          <HStack gap="5px">
            <Button onClick={reset} danger>
              {t('settings.general.reset.button')}
            </Button>
          </HStack>
        </SettingRow>
      </SettingGroup>
      <SettingGroup theme={theme}>
        <WebDavSettings />
      </SettingGroup>
      <NotionSettings />
      <SettingGroup theme={theme}>
        <SettingTitle>{t('settings.data.data.title')}</SettingTitle>
        <SettingDivider />
        <SettingRow>
          <SettingRowTitle>{t('settings.data.app_data')}</SettingRowTitle>
          <HStack alignItems="center" gap="5px">
            <Typography.Text style={{ color: 'var(--color-text-3)' }}>{appInfo?.appDataPath}</Typography.Text>
            <StyledIcon onClick={() => handleOpenPath(appInfo?.appDataPath)} />
          </HStack>
        </SettingRow>
        <SettingDivider />
        <SettingRow>
          <SettingRowTitle>{t('settings.data.app_logs')}</SettingRowTitle>
          <HStack alignItems="center" gap="5px">
            <Typography.Text style={{ color: 'var(--color-text-3)' }}>{appInfo?.logsPath}</Typography.Text>
            <StyledIcon onClick={() => handleOpenPath(appInfo?.logsPath)} />
          </HStack>
        </SettingRow>
        <SettingDivider />
        <SettingRow>
          <SettingRowTitle>{t('settings.data.clear_cache.title')}</SettingRowTitle>
          <HStack gap="5px">
            <Button onClick={handleClearCache} danger>
              {t('settings.data.clear_cache.button')}
            </Button>
          </HStack>
        </SettingRow>
      </SettingGroup>
    </SettingContainer>
  )
}

const StyledIcon = styled(FileSearchOutlined)`
  color: var(--color-text-2);
  cursor: pointer;
  transition: color 0.3s;

  &:hover {
    color: var(--color-text-1);
  }
`

export default DataSettings
