db-> postgres ->atomicity -> persist
arbitary inMemory db-> during booking for claim(not sure aboy redis because single treaded nature)
a table for each theatre 


Theatere Id

movie
->moviesId

screen
->theatere id

show time
->moviesId
->times
->screen

user
->userId
->phone
->gmail
->show timeId
