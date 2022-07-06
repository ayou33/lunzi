import useEvent from '../src/event'

const { on, countEvents } = useEvent()

describe('1', () => {
  test('2', () => {
    
    const handler = () => {}
    on('joj', handler)
    on('joj', handler)
    expect(countEvents()).toBe(0)
  })
})