// Regression tests for A4 platform fixes in src/App.tsx (TitleManager scroll behavior,
// SkipLink vs HashRouter collision). Plain .ts + createElement to match the vitest include glob.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement as h } from 'react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { SkipLink, TitleManager } from '../App'

function NavProbe() {
  const nav = useNavigate()
  return h('div', null,
    h('button', { onClick: () => nav('/settings') }, 'go-settings'),
    h('button', { onClick: () => nav(-1) }, 'go-back'))
}

afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('TitleManager', () => {
  it('sets the title, scrolls instantly (not animated) on push navigations, and never scrolls on back/forward', () => {
    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    render(h(MemoryRouter, { initialEntries: ['/today'] }, h(TitleManager), h(NavProbe)))
    expect(document.title).toBe('Today · Ten Strong')
    expect(scroll).not.toHaveBeenCalled() // initial load is a POP — leave scroll alone

    fireEvent.click(screen.getByText('go-settings'))
    expect(document.title).toBe('Settings · Ten Strong')
    expect(scroll).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' })

    scroll.mockClear()
    fireEvent.click(screen.getByText('go-back')) // POP: browser restores position, we must not fight it
    expect(document.title).toBe('Today · Ten Strong')
    expect(scroll).not.toHaveBeenCalled()
  })
})

describe('SkipLink', () => {
  it('focuses #main-content and prevents the default hash navigation (HashRouter would treat #main-content as a route)', () => {
    render(h('div', null, h(SkipLink), h('main', { id: 'main-content' }, 'content')))
    const main = document.getElementById('main-content')!
    const notPrevented = fireEvent.click(screen.getByText('Skip to main content'))
    expect(notPrevented).toBe(false) // preventDefault fired — router hash untouched
    expect(main.getAttribute('tabindex')).toBe('-1')
    expect(document.activeElement).toBe(main)
  })

  it('is a no-op (still prevented, no crash) on routes without a #main-content landmark', () => {
    render(h(SkipLink))
    const notPrevented = fireEvent.click(screen.getByText('Skip to main content'))
    expect(notPrevented).toBe(false)
  })
})
