import { isMac } from '@renderer/config/constant'
import { useDefaultAssistant, useDefaultModel } from '@renderer/hooks/useAssistant'
import { useSettings } from '@renderer/hooks/useSettings'
import i18n from '@renderer/i18n'
import { EVENT_NAMES } from '@renderer/services/EventService'
import { EventEmitter } from '@renderer/services/EventService'
import { uuid } from '@renderer/utils'
import { Divider } from 'antd'
import dayjs from 'dayjs'
import { isEmpty } from 'lodash'
import { FC, useCallback, useEffect, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { useTranslation } from 'react-i18next'
import styled from 'styled-components'

import ChatWindow from '../chat/ChatWindow'
import TranslateWindow from '../translate/TranslateWindow'
import ClipboardPreview from './components/ClipboardPreview'
import FeatureMenus from './components/FeatureMenus'
import Footer from './components/Footer'
import InputBar from './components/InputBar'

const HomeWindow: FC = () => {
  const [route, setRoute] = useState<'home' | 'chat' | 'translate' | 'summary' | 'explanation'>('home')
  const [clipboardText, setClipboardText] = useState('')
  const [selectedText, setSelectedText] = useState('')
  const [text, setText] = useState('')
  const { defaultAssistant } = useDefaultAssistant()
  const { defaultModel: model } = useDefaultModel()
  const { language } = useSettings()
  const { t } = useTranslation()

  const referenceText = selectedText || clipboardText || text

  const content = (referenceText === text ? text : `${referenceText}\n\n${text}`).trim()

  const onReadClipboard = useCallback(async () => {
    const text = await navigator.clipboard.readText()
    setClipboardText(text.trim())
  }, [])

  useEffect(() => {
    onReadClipboard()
  }, [onReadClipboard])

  useEffect(() => {
    i18n.changeLanguage(language || navigator.language || 'en-US')
  }, [language])

  const onCloseWindow = () => window.api.miniWindow.hide()

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const isEnterPressed = e.keyCode == 13

    if (e.key === 'Escape') {
      setText('')
      setRoute('home')
      route === 'home' && onCloseWindow()
      return
    }

    if (isEnterPressed) {
      e.preventDefault()
      if (content) {
        setRoute('chat')
        onSendMessage()
        setTimeout(() => setText(''), 100)
      }
    }
  }

  const onSendMessage = useCallback(
    async (prompt?: string) => {
      if (isEmpty(content)) {
        return
      }

      setTimeout(() => {
        const message = {
          id: uuid(),
          role: 'user',
          content: prompt ? `${prompt}\n\n${content}` : content,
          assistantId: defaultAssistant.id,
          topicId: defaultAssistant.topics[0].id || uuid(),
          createdAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
          type: 'text',
          status: 'success'
        }
        EventEmitter.emit(EVENT_NAMES.SEND_MESSAGE, message)
      }, 0)
    },
    [content, defaultAssistant.id, defaultAssistant.topics]
  )

  const clearClipboard = () => {
    setClipboardText('')
    setSelectedText('')
    navigator.clipboard.writeText('')
  }

  useHotkeys('esc', () => {
    if (route === 'home') {
      onCloseWindow()
    } else {
      setRoute('home')
      setText('')
    }
  })

  useEffect(() => {
    window.electron.ipcRenderer.on('show-mini-window', onReadClipboard)
    window.electron.ipcRenderer.on('selection-action', (_, { action, selectedText }) => {
      selectedText && setSelectedText(selectedText)
      action && setRoute(action)
      action === 'chat' && onSendMessage()
    })

    return () => {
      window.electron.ipcRenderer.removeAllListeners('show-mini-window')
      window.electron.ipcRenderer.removeAllListeners('selection-action')
    }
  }, [onReadClipboard, onSendMessage, setRoute])

  if (['chat', 'summary', 'explanation'].includes(route)) {
    return (
      <Container>
        {route === 'chat' && (
          <>
            <InputBar
              text={text}
              model={model}
              referenceText={referenceText}
              placeholder={t('miniwindow.input.placeholder.empty', { model: model.name })}
              handleKeyDown={handleKeyDown}
              setText={setText}
            />
            <Divider style={{ margin: '10px 0' }} />
          </>
        )}
        {['summary', 'explanation'].includes(route) && (
          <div style={{ marginTop: 10 }}>
            <ClipboardPreview referenceText={referenceText} clearClipboard={clearClipboard} t={t} />
          </div>
        )}
        <ChatWindow route={route} />
        <Divider style={{ margin: '10px 0' }} />
        <Footer route={route} onExit={() => setRoute('home')} />
      </Container>
    )
  }

  if (route === 'translate') {
    return (
      <Container>
        <TranslateWindow text={referenceText} />
        <Divider style={{ margin: '10px 0' }} />
        <Footer route={route} onExit={() => setRoute('home')} />
      </Container>
    )
  }

  return (
    <Container>
      <InputBar
        text={text}
        model={model}
        referenceText={referenceText}
        placeholder={
          referenceText && route === 'home'
            ? t('miniwindow.input.placeholder.title')
            : t('miniwindow.input.placeholder.empty', { model: model.name })
        }
        handleKeyDown={handleKeyDown}
        setText={setText}
      />
      <Divider style={{ margin: '10px 0' }} />
      <ClipboardPreview referenceText={referenceText} clearClipboard={clearClipboard} t={t} />
      <Main>
        <FeatureMenus setRoute={setRoute} onSendMessage={onSendMessage} text={content} />
      </Main>
      <Divider style={{ margin: '10px 0' }} />
      <Footer
        route={route}
        onExit={() => {
          setRoute('home')
          setText('')
          onCloseWindow()
        }}
      />
    </Container>
  )
}

const Container = styled.div`
  display: flex;
  flex: 1;
  height: 100%;
  flex-direction: column;
  -webkit-app-region: drag;
  padding: 8px 10px;
  background-color: ${isMac ? 'transparent' : 'var(--color-background)'};
`

const Main = styled.main`
  display: flex;
  flex: 1;
  overflow: hidden;
`

export default HomeWindow
