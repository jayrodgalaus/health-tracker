import { describe, expect, it } from 'vitest'
import { calculatedPaceValue, hasTwoPaceInputs, initialPaceInputs, updatePaceInputs } from './paceInputs'

const blank = () => initialPaceInputs({ duration:'', distance:'', speed:'' })

describe('walking and running pace entry', () => {
  it('derives each of the three fields from either of the other two', () => {
    const timed = updatePaceInputs(updatePaceInputs(blank(),'duration','30'),'distance','3')
    expect(timed.values).toEqual({duration:'30', distance:'3', speed:'6'})
    expect(hasTwoPaceInputs(timed)).toBe(true)

    const distanced = updatePaceInputs(updatePaceInputs(blank(),'distance','4'),'speed','8')
    expect(distanced.values).toEqual({duration:'30', distance:'4', speed:'8'})

    const paced = updatePaceInputs(updatePaceInputs(blank(),'speed','5'),'duration','30')
    expect(paced.values).toEqual({duration:'30', distance:'2.5', speed:'5'})
  })

  it('switches the derived field when a person edits it', () => {
    let draft = updatePaceInputs(updatePaceInputs(blank(),'duration','30'),'distance','3')
    draft = updatePaceInputs(draft,'speed','5')
    expect(draft.entered).toEqual(['distance','speed'])
    expect(draft.values).toEqual({duration:'36',distance:'3',speed:'5'})
    draft = updatePaceInputs(draft,'duration','24')
    expect(draft.entered).toEqual(['speed','duration'])
    expect(draft.values).toEqual({duration:'24',distance:'2',speed:'5'})
  })

  it('does not invent values from missing, malformed, negative or zero entries', () => {
    const onlyOne = updatePaceInputs(blank(),'distance','3')
    expect(onlyOne.values).toEqual({duration:'',distance:'3',speed:''})
    expect(hasTwoPaceInputs(onlyOne)).toBe(false)
    const invalid = updatePaceInputs(onlyOne,'duration','0')
    expect(invalid.values.speed).toBe('')
    expect(hasTwoPaceInputs(invalid)).toBe(false)
    expect(calculatedPaceValue({duration:'0', distance:'3', speed:''},'speed')).toBeNull()
    expect(calculatedPaceValue({duration:'NaN', distance:'3', speed:''},'speed')).toBeNull()
    const valid = updatePaceInputs(invalid,'duration','30')
    expect(valid.values.speed).toBe('6')
    const cleared = updatePaceInputs(valid,'duration','')
    expect(cleared.values).toEqual({duration:'',distance:'3',speed:''})
    expect(hasTwoPaceInputs(cleared)).toBe(false)
  })

  it('rounds only the displayed derived value and accepts decimal commas', () => {
    const state = updatePaceInputs(updatePaceInputs(blank(),'duration','25'),'distance','2,6')
    expect(state.values.speed).toBe('6.24')
    const other = updatePaceInputs(updatePaceInputs(blank(),'distance','1'),'speed','7')
    expect(other.values.duration).toBe('8.571429')
  })

  it('keeps legacy single-value entries incomplete until a second value is entered', () => {
    const legacy = initialPaceInputs({duration:'',distance:'5',speed:''})
    expect(legacy.values).toEqual({duration:'',distance:'5',speed:''})
    expect(hasTwoPaceInputs(legacy)).toBe(false)
    const completed = updatePaceInputs(legacy,'speed','5')
    expect(completed.values.duration).toBe('60')
    expect(hasTwoPaceInputs(completed)).toBe(true)
  })
})
