const myBtn = document.querySelector('#myBtn');
const demo = document.querySelector('#demo');

let count = 0;

myBtn.addEventListener('click', () => {
	count++;
	demo.textContent = count;
});

