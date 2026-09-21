import { DialogSelect, type DialogSelectRef } from "../ui/dialog-select"
import { useLocale, LOCALES, LOCALE_LABEL } from "../context/locale"
import { useDialog } from "../ui/dialog"
import { onCleanup } from "solid-js"

export function DialogLanguageList() {
  const locale = useLocale()
  const options = LOCALES.map((value) => ({
    title: LOCALE_LABEL[value],
    value,
  }))
  const dialog = useDialog()
  let confirmed = false
  let ref: DialogSelectRef<(typeof LOCALES)[number]>
  const initial = locale.locale

  onCleanup(() => {
    if (!confirmed) locale.set(initial)
  })

  return (
    <DialogSelect
      title="Language"
      options={options}
      current={initial}
      onMove={(opt) => {
        locale.set(opt.value)
      }}
      onSelect={(opt) => {
        locale.set(opt.value)
        confirmed = true
        dialog.clear()
      }}
      ref={(r) => {
        ref = r
      }}
      onFilter={(query) => {
        if (query.length === 0) {
          locale.set(initial)
          return
        }

        const first = ref.filtered[0]
        if (first) locale.set(first.value)
      }}
    />
  )
}
