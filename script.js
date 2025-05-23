// FAQ Section //

const q = document.querySelectorAll('.q');
const a = document.querySelectorAll('.a');
const arr = document.querySelectorAll('.arrows');


for(let i = 0; i < q.length; i++) {
   q[i].addEventListener('click', () => {
    a[i].classList.toggle('a-opened');
    arr[i].classList.toggle('arrows-rotated');
   });
}
   