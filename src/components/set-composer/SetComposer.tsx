import type { CCGSet } from '../../types'
import { SetMetadata } from './SetMetadata'
import { RarityEditor } from './RarityEditor'
import { SlotEditor } from './SlotEditor'
import { CSVUploader } from './CSVUploader'
import { CardList } from './CardList'

interface Props {
  set: CCGSet
}

export function SetComposer({ set }: Props) {
  return (
    <div className="space-y-4 md:space-y-6 max-w-full md:max-w-4xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 items-stretch">
        <SetMetadata set={set} />
        <CSVUploader set={set} />
      </div>
      <RarityEditor set={set} />
      <SlotEditor set={set} />
      <CardList set={set} />
    </div>
  )
}
