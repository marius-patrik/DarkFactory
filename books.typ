#import "/DarkFactory/book.typ" as darkfactory

#let default-book = "DarkFactory"
#let available-books = ("DarkFactory",)

#let assert-book(name) = {
  assert(name in available-books, message: "Unknown book " + repr(name) + ". Available books: " + repr(available-books))
  name
}

#let default-template-for(name) = {
  let name = assert-book(name)
  if name == "DarkFactory" { darkfactory.default-template-name }
}

#let render-pdf(name, ..args) = {
  let name = assert-book(name)
  if name == "DarkFactory" { darkfactory.render-pdf(..args) }
}

#let render-web(name, ..args) = {
  let name = assert-book(name)
  if name == "DarkFactory" { darkfactory.render-web(..args) }
}
