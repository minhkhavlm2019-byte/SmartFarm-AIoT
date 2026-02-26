 function Profile(){
    return(
        <img
            src="https://i.imgur.com/MK3eW3As.jpg"
            alt="Katherine Johnson"
        />
    )
}
const person ={
    name: 'Khoa',
    theme:{
        backgroundColor: 'black',
        color: 'pink'
    }
};
export default function ToDoList(){
    return(
        <div style={person.theme}>
            <h1>{person.name}</h1>
            <img src="https://i.imgur.com/7vQD0fPs.jpg" alt={person.name} />
            <ul>
                <li>Improve the videophone</li>
                <li>Prepare aeronautric lecture</li>
                <li>Work on the alcohol-fuelled engine</li>
            </ul>
        </div>
    );
}