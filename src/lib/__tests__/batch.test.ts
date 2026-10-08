import { describe, expect, it } from 'vitest'
import type { StoredImage } from '../db'
import { zipEntryName, zipFileName, zipFolderName } from '../batch'

function img(id: string, name: string): StoredImage {
  return { id, name, blob: new Blob(), createdAt: 0 }
}

describe('zipFolderName', () => {
  it('strips the extension', () => {
    const taken = new Set<string>()
    expect(zipFolderName(img('a1b2c3d4e5f6', 'photo.png'), taken)).toBe('photo')
  })

  it('replaces illegal characters with underscores', () => {
    const taken = new Set<string>()
    expect(zipFolderName(img('a1b2c3d4e5f6', 'a/b:c*d.png'), taken)).toBe('a_b_c_d')
  })

  it('appends id prefix on case-insensitive duplicates, leaves others alone', () => {
    const taken = new Set<string>()
    const first = zipFolderName(img('aaaaaabbbbbb', 'Photo.png'), taken)
    expect(first).toBe('Photo')
    const second = zipFolderName(img('ccddeeff0011', 'photo.png'), taken)
    expect(second).toBe('photo-ccddee')
    const third = zipFolderName(img('112233445566', 'other.png'), taken)
    expect(third).toBe('other')
  })

  it('falls back to "image" when the name is empty after stripping the extension', () => {
    expect(zipFolderName(img('a1b2c3d4e5f6', '.png'), new Set())).toBe('image')
    expect(zipFolderName(img('b2c3d4e5f6a1', '.hidden'), new Set())).toBe('image')
    expect(zipFolderName(img('c3d4e5f6a1b2', ''), new Set())).toBe('image')
  })
})

describe('zipEntryName', () => {
  it('builds folder/prefix-tag-base.png', () => {
    expect(zipEntryName('seller', 'iphone', 'my pic.png', 'folder')).toBe(
      'folder/seller-iphone-my pic.png',
    )
  })
})

describe('zipFileName', () => {
  it('formats a fixed date as mockups-YYYYMMDD-HHmmss.zip', () => {
    expect(zipFileName(new Date(2026, 9, 8, 7, 5, 3))).toBe('mockups-20261008-070503.zip')
  })

  it('matches the pattern for a fresh call', () => {
    expect(zipFileName()).toMatch(/^mockups-\d{8}-\d{6}\.zip$/)
  })
})
